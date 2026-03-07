import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Package, AlertTriangle, User, ExternalLink, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Only match explicit package manager install commands — nothing else
const INSTALL_RE = /(?:sudo\s+)?(?:pacman\s+-S(?:yu?)?\s+|yay\s+-S(?:a)?\s+|paru\s+-S(?:a)?\s+|trizen\s+-S\s+|pikaur\s+-S\s+)([a-zA-Z0-9_.+-]+(?:\s+[a-zA-Z0-9_.+-]+)*)/gm;

export function extractPackagesFromScript(code) {
  const names = new Set();
  const lines = (code || '').split('\n');
  for (const line of lines) {
    // Skip comments and variable assignments
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;
    let m;
    const re = new RegExp(INSTALL_RE.source, 'gm');
    while ((m = re.exec(trimmed)) !== null) {
      m[1].split(/\s+/).forEach(n => {
        const c = n.trim();
        if (c && !c.startsWith('-') && c.length > 1) names.add(c);
      });
    }
  }
  return [...names];
}

export default function ScriptPackageSidebar({ code }) {
  const { t } = useLanguage();
  const [packages, setPackages] = useState(null);
  const [loading, setLoading] = useState(false);
  const names = useMemo(() => extractPackagesFromScript(code || ''), [code]);

  useEffect(() => {
    if (names.length === 0) return;
    let cancelled = false;
    setLoading(true);
    axios.get(`${API}/packages/check`, { params: { names: names.join(',') } })
      .then(res => { if (!cancelled) setPackages(res.data.packages); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [names.join(',')]);

  if (names.length === 0) return null;

  const hasWarnings = packages && Object.values(packages).some(p => p.found && (p.is_outdated || p.is_orphaned));

  return (
    <div data-testid="script-packages-sidebar" className="rounded-lg border border-border/50 bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border/30 bg-muted/5 flex items-center gap-2">
        <Package className="w-4 h-4 text-[#1793D1]" />
        <h3 className="text-sm font-bold">{t('pkg_sidebar_title')}</h3>
        <span className="text-xs font-mono text-muted-foreground ml-auto">{names.length}</span>
      </div>

      {loading && (
        <div className="px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" /> {t('pkg_inline_checking')}
        </div>
      )}

      {hasWarnings && (
        <div className="px-3 py-1.5 bg-amber-500/5 border-b border-amber-500/15 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-mono text-amber-400">{t('pkg_sidebar_has_warnings')}</span>
        </div>
      )}

      {packages && (
        <div className="divide-y divide-border/20">
          {names.map(name => {
            const info = packages[name];
            if (!info) return null;
            const warn = info.found && (info.is_outdated || info.is_orphaned);
            return (
              <div key={name} data-testid={`script-pkg-${name}`}
                className={`px-4 py-2.5 flex items-center gap-2 ${warn ? 'bg-amber-500/5' : 'hover:bg-muted/5'} transition-colors`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-mono font-bold truncate">{name}</span>
                    {info.found && (
                      <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${
                        info.source === 'aur'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {info.source === 'aur' ? 'AUR' : info.repo}
                      </span>
                    )}
                  </div>
                  {info.found && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground">{info.version}</span>
                      {info.is_outdated && (
                        <span data-testid={`script-pkg-outdated-${name}`} className="flex items-center gap-0.5 text-[9px] font-mono text-amber-400">
                          <AlertTriangle className="w-2.5 h-2.5" /> {t('pkg_outdated')}
                        </span>
                      )}
                      {info.is_orphaned && (
                        <span data-testid={`script-pkg-orphaned-${name}`} className="flex items-center gap-0.5 text-[9px] font-mono text-red-400">
                          <User className="w-2.5 h-2.5" /> {t('pkg_orphaned')}
                        </span>
                      )}
                    </div>
                  )}
                  {!info.found && (
                    <span className="text-[10px] font-mono text-muted-foreground/50">{t('pkg_sidebar_not_found')}</span>
                  )}
                </div>
                {info.found && (
                  <a
                    href={info.source === 'aur' ? `https://aur.archlinux.org/packages/${name}` : `https://archlinux.org/packages/?q=${name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground hover:text-[#1793D1] transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="px-4 py-2 border-t border-border/20 bg-muted/5">
        <Link to={`/packages`} className="text-[10px] font-mono text-[#1793D1] hover:underline">
          {t('pkg_sidebar_search_more')}
        </Link>
      </div>
    </div>
  );
}
