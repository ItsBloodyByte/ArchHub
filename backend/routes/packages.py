"""Package search and status check routes for Arch Linux integration.

Caching strategy:
- /packages/check results are cached in MongoDB (collection: package_cache)
- Cache TTL: 4 hours per package
- Cache key: package name
- On cache hit: return from DB, zero external API calls
- On cache miss: fetch from Arch/AUR API, store in DB
"""
import httpx
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Query
from database import db

router = APIRouter()

DEFAULT_ARCH_API = "https://archlinux.org/packages/search/json/"
AUR_RPC_URL = "https://aur.archlinux.org/rpc/v5"
CACHE_TTL_HOURS = 4


async def get_package_api_url() -> str:
    doc = await db.site_settings.find_one({"key": "arch_package_api_url"}, {"_id": 0})
    if doc and doc.get("value"):
        return doc["value"]
    return DEFAULT_ARCH_API


async def get_cached_packages(names: list[str]) -> tuple[dict, list[str]]:
    """Return (cached_results, uncached_names) from MongoDB."""
    cached = {}
    uncached = []
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=CACHE_TTL_HOURS)).isoformat()

    cursor = db.package_cache.find(
        {"name": {"$in": names}, "cached_at": {"$gt": cutoff}},
        {"_id": 0}
    )
    docs = await cursor.to_list(len(names))
    found_names = set()
    for doc in docs:
        cached[doc["name"]] = doc["data"]
        found_names.add(doc["name"])

    uncached = [n for n in names if n not in found_names]
    return cached, uncached


async def cache_package(name: str, data: dict):
    """Store or update a package in the cache."""
    await db.package_cache.update_one(
        {"name": name},
        {"$set": {
            "name": name,
            "data": data,
            "cached_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True
    )


@router.get("/packages/search")
async def search_packages(q: str = Query(..., min_length=1, max_length=100)):
    """Search both official Arch repos and AUR for packages."""
    api_url = await get_package_api_url()

    official = []
    aur = []

    async with httpx.AsyncClient(timeout=10) as client:
        # Search official repos
        try:
            resp = await client.get(api_url, params={"q": q})
            if resp.status_code == 200:
                data = resp.json()
                for pkg in data.get("results", [])[:20]:
                    official.append({
                        "name": pkg.get("pkgname", ""),
                        "version": pkg.get("pkgver", "") + "-" + pkg.get("pkgrel", ""),
                        "description": pkg.get("pkgdesc", ""),
                        "repo": pkg.get("repo", ""),
                        "arch": pkg.get("arch", ""),
                        "maintainers": pkg.get("maintainers", []),
                        "last_update": pkg.get("last_update", ""),
                        "flag_date": pkg.get("flag_date"),
                        "url": pkg.get("url", ""),
                        "source": "official",
                        "is_outdated": pkg.get("flag_date") is not None,
                        "is_orphaned": len(pkg.get("maintainers", [])) == 0,
                    })
        except Exception:
            pass

        # Search AUR
        try:
            resp = await client.get(f"{AUR_RPC_URL}/search/{q}")
            if resp.status_code == 200:
                data = resp.json()
                for pkg in data.get("results", [])[:20]:
                    aur.append({
                        "name": pkg.get("Name", ""),
                        "version": pkg.get("Version", ""),
                        "description": pkg.get("Description", ""),
                        "repo": "aur",
                        "arch": "",
                        "maintainers": [pkg["Maintainer"]] if pkg.get("Maintainer") else [],
                        "last_update": pkg.get("LastModified", ""),
                        "flag_date": pkg.get("OutOfDate"),
                        "url": pkg.get("URL", ""),
                        "source": "aur",
                        "is_outdated": pkg.get("OutOfDate") is not None,
                        "is_orphaned": pkg.get("Maintainer") is None,
                        "votes": pkg.get("NumVotes", 0),
                        "popularity": pkg.get("Popularity", 0),
                    })
        except Exception:
            pass

    return {
        "query": q,
        "official": official,
        "aur": aur,
        "total": len(official) + len(aur),
    }


@router.get("/packages/check")
async def check_packages(names: str = Query(..., min_length=1, max_length=500)):
    """Check status of specific packages (comma-separated). Uses 4h MongoDB cache."""
    pkg_names = [n.strip() for n in names.split(",") if n.strip()]
    if not pkg_names or len(pkg_names) > 20:
        raise HTTPException(status_code=400, detail="Provide 1-20 package names")

    # 1. Check cache first
    results, uncached = await get_cached_packages(pkg_names)

    if not uncached:
        return {"packages": results}

    # 2. Fetch uncached packages from external APIs
    async with httpx.AsyncClient(timeout=10) as client:
        # Check official repos
        for name in uncached:
            try:
                api_url = await get_package_api_url()
                resp = await client.get(api_url, params={"name": name})
                if resp.status_code == 200:
                    data = resp.json()
                    pkgs = data.get("results", [])
                    if pkgs:
                        pkg = pkgs[0]
                        pkg_data = {
                            "found": True,
                            "source": "official",
                            "version": pkg.get("pkgver", "") + "-" + pkg.get("pkgrel", ""),
                            "repo": pkg.get("repo", ""),
                            "is_outdated": pkg.get("flag_date") is not None,
                            "is_orphaned": len(pkg.get("maintainers", [])) == 0,
                            "flag_date": pkg.get("flag_date"),
                            "maintainers": pkg.get("maintainers", []),
                        }
                        results[name] = pkg_data
                        await cache_package(name, pkg_data)
            except Exception:
                pass

        # Check AUR for packages not found in official repos
        aur_check = [n for n in uncached if n not in results]
        if aur_check:
            try:
                params = "&".join([f"arg[]={n}" for n in aur_check])
                resp = await client.get(f"{AUR_RPC_URL}/info?{params}")
                if resp.status_code == 200:
                    data = resp.json()
                    for pkg in data.get("results", []):
                        name = pkg.get("Name", "")
                        pkg_data = {
                            "found": True,
                            "source": "aur",
                            "version": pkg.get("Version", ""),
                            "repo": "aur",
                            "is_outdated": pkg.get("OutOfDate") is not None,
                            "is_orphaned": pkg.get("Maintainer") is None,
                            "flag_date": pkg.get("OutOfDate"),
                            "maintainers": [pkg["Maintainer"]] if pkg.get("Maintainer") else [],
                        }
                        results[name] = pkg_data
                        await cache_package(name, pkg_data)
            except Exception:
                pass

    # 3. Mark packages not found — also cache to avoid re-fetching
    for name in pkg_names:
        if name not in results:
            not_found = {"found": False, "source": None}
            results[name] = not_found
            await cache_package(name, not_found)

    return {"packages": results}
