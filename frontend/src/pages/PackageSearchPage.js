import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Search, Package, AlertTriangle, ExternalLink, Archive, User, Clock, Star, TrendingUp, Terminal } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import TerminalHeader from '../components/TerminalHeader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PackageSearchPage() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('all');

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/packages/search`, { params: { q: q.trim() } });
      setResults(res.data);
    } catch {
      setResults({ official: [], aur: [], total: 0 });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      doSearch(q);
    }
  }, [searchParams, doSearch]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
      doSearch(query.trim());
    }
  };

  const filtered = results ? (
    tab === 'official' ? results.official :
    tab === 'aur' ? results.aur :
    [...results.official, ...results.aur]
  ) : [];

  return (
    <div data-testid="package-search-page" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TerminalHeader command="pacman -Ss" />

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Package className="w-6 h-6 text-[#1793D1]" />
          <h1 className="text-2xl font-extrabold tracking-tighter">{t('pkg_title')}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{t('pkg_subtitle')}</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            data-testid="pkg-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('pkg_search_placeholder')}
            className="w-full h-12 pl-12 pr-4 rounded-lg border border-input bg-background/50 text-base font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1] transition-all"
          />
          <button
            data-testid="pkg-search-btn"
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-4 rounded-md bg-[#1793D1] text-white text-sm font-medium hover:bg-[#126A9A] transition-colors disabled:opacity-50"
          >
            {loading ? '...' : t('nav_packages')}
          </button>
        </div>
      </form>

      {/* Results */}
      {results && (
        <>
          {/* Tabs */}
          <div data-testid="pkg-tabs" className="flex gap-1 mb-6 p-1 rounded-lg bg-muted/30 border border-border/30">
            {[
              { id: 'all', label: `${t('pkg_tab_all')} (${results.total})` },
              { id: 'official', label: `${t('pkg_tab_official')} (${results.official.length})` },
              { id: 'aur', label: `${t('pkg_tab_aur')} (${results.aur.length})` },
            ].map(t2 => (
              <button
                key={t2.id}
                data-testid={`pkg-tab-${t2.id}`}
                onClick={() => setTab(t2.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  tab === t2.id
                    ? 'bg-[#1793D1]/10 text-[#1793D1] border border-[#1793D1]/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {t2.label}
              </button>
            ))}
          </div>

          {/* Package List */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>{t('pkg_no_results')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((pkg, i) => (
                <PackageCard key={`${pkg.source}-${pkg.name}-${i}`} pkg={pkg} t={t} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Initial state */}
      {!results && !loading && (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-[#1793D1]/10 flex items-center justify-center">
            <Terminal className="w-8 h-8 text-[#1793D1]" />
          </div>
          <p className="text-lg font-mono text-muted-foreground mb-2">pacman -Ss &lt;query&gt;</p>
          <p className="text-sm text-muted-foreground/60">{t('pkg_subtitle')}</p>
        </div>
      )}
    </div>
  );
}

function PackageCard({ pkg, t }) {
  const hasWarning = pkg.is_outdated || pkg.is_orphaned;

  return (
    <div
      data-testid={`pkg-card-${pkg.name}`}
      className={`rounded-lg border p-4 transition-all hover:border-[#1793D1]/30 ${
        hasWarning
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-border/50 bg-card'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-base font-bold font-mono">{pkg.name}</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
              pkg.source === 'aur'
                ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
            }`}>
              {pkg.source === 'aur' ? t('pkg_source_aur') : t('pkg_source_official')}
            </span>
            {pkg.repo && pkg.repo !== 'aur' && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground">
                {pkg.repo}
              </span>
            )}
            {pkg.is_outdated && (
              <span data-testid={`pkg-warn-outdated-${pkg.name}`} className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <AlertTriangle className="w-3 h-3" /> {t('pkg_outdated')}
              </span>
            )}
            {pkg.is_orphaned && (
              <span data-testid={`pkg-warn-orphaned-${pkg.name}`} className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border border-red-500/30 bg-red-500/10 text-red-400">
                <User className="w-3 h-3" /> {t('pkg_orphaned')}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{pkg.description}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono flex-wrap">
            <span className="flex items-center gap-1">
              <Archive className="w-3 h-3" /> {pkg.version}
            </span>
            {pkg.maintainers && pkg.maintainers.length > 0 ? (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" /> {pkg.maintainers.join(', ')}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-400">
                <User className="w-3 h-3" /> {t('pkg_no_maintainer')}
              </span>
            )}
            {pkg.votes !== undefined && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" /> {pkg.votes}
              </span>
            )}
            {pkg.popularity !== undefined && pkg.popularity > 0 && (
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> {pkg.popularity.toFixed(2)}
              </span>
            )}
          </div>
        </div>
        {pkg.url && (
          <a
            href={pkg.source === 'aur' ? `https://aur.archlinux.org/packages/${pkg.name}` : `https://archlinux.org/packages/?q=${pkg.name}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`pkg-link-${pkg.name}`}
            className="shrink-0 p-2 rounded-md border border-border/50 text-muted-foreground hover:text-[#1793D1] hover:border-[#1793D1]/30 transition-all"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Warnings */}
      {hasWarning && (
        <div className="mt-3 pt-3 border-t border-amber-500/20 space-y-1">
          {pkg.is_outdated && (
            <p data-testid={`pkg-warn-detail-outdated-${pkg.name}`} className="text-xs text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 shrink-0" /> {t('pkg_warn_outdated')}
            </p>
          )}
          {pkg.is_orphaned && (
            <p data-testid={`pkg-warn-detail-orphaned-${pkg.name}`} className="text-xs text-red-400 flex items-center gap-1.5">
              <User className="w-3 h-3 shrink-0" /> {t('pkg_warn_orphaned')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
