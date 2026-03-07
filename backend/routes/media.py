"""Media upload and serving routes."""
import io
import uuid
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse

from deps import get_current_user
from config import MEDIA_DIR, MAX_MEDIA_SIZE

router = APIRouter()


@router.post("/media/upload")
async def upload_media(file: UploadFile = File(...), user=Depends(get_current_user)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files allowed")
    content = await file.read()
    if len(content) > MAX_MEDIA_SIZE:
        raise HTTPException(status_code=400, detail=f"File must be under {MAX_MEDIA_SIZE // 1024 // 1024}MB")
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(content))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")
        max_dim = 1920
        if img.width > max_dim or img.height > max_dim:
            img.thumbnail((max_dim, max_dim), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="WEBP", quality=82, method=4)
        compressed = buf.getvalue()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot process image: {str(e)}")
    file_id = str(uuid.uuid4())[:12]
    filename = f"{file_id}.webp"
    filepath = MEDIA_DIR / filename
    with open(filepath, "wb") as f:
        f.write(compressed)
    url = f"/api/media/{filename}"
    size_reduction = round((1 - len(compressed) / len(content)) * 100)
    return {
        "url": url, "filename": filename,
        "size_original": len(content), "size_compressed": len(compressed),
        "reduction_percent": max(size_reduction, 0),
        "width": img.width, "height": img.height
    }


@router.get("/media/{filename}")
async def serve_media(filename: str):
    filepath = MEDIA_DIR / filename
    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath, media_type="image/webp", headers={"Cache-Control": "public, max-age=31536000, immutable"})


@router.get("/media")
async def list_media(user=Depends(get_current_user)):
    files = sorted(MEDIA_DIR.glob("*.webp"), key=lambda f: f.stat().st_mtime, reverse=True)
    items = []
    for f in files[:100]:
        stat = f.stat()
        items.append({
            "filename": f.name, "url": f"/api/media/{f.name}",
            "size": stat.st_size, "uploaded_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
        })
    return {"media": items, "total": len(items)}
