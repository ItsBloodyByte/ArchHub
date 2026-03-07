import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, User, Package, Loader2, ExternalLink } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Only match explicit package manager install commands — nothing else
const INSTALL_CMD_RE = /(?:sudo\s+)?(?:pacman\s+-S(?:yu?)?\s+|yay\s+-S(?:a)?\s+|paru\s+-S(?:a)?\s+|trizen\s+-S\s+|pikaur\s+-S\s+)([a-zA-Z0-9_.+-]+(?:\s+[a-zA-Z0-9_.+-]+)*)/g;

export function extractPackageNames(code) {
  const names = new Set();
  const lines = (code || '').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;
    let match;
    const regex = new RegExp(INSTALL_CMD_RE.source, 'gm');
    while ((match = regex.exec(trimmed)) !== null) {
      match[1].split(/\s+/).forEach(name => {
        const clean = name.trim();
        if (clean && !clean.startsWith('-') && clean.length > 1) {
          names.add(clean);
        }
      });
    }
  }
  return [...names];
}

export default function PackageWarnings({ code }) {
  const { t } = useLanguage();
  const [packages, setPackages] = useState(null);
  const [loading, setLoading] = useState(false);
  const names = React.useMemo(() => extractPackageNames(code), [code]);

  useEffect(() => {
    if (names.length === 0) return;
    let cancelled = false;
    setLoading(true);
    axios.get(`${API}/packages/check`, { params: { names: names.join(',') } })
      .then(res => {
        if (!cancelled) setPackages(res.data.packages);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [names.join(',')]);

  if (names.length === 0) return null;

  const warnings = packages ? Object.entries(packages).filter(
    ([, v]) => v.found && (v.is_outdated || v.is_orphaned)
  ) : [];

  if (loading) {
    return (
      <div data-testid="pkg-inline-loading" className="flex items-center gap-2 px-3 py-2 my-1 rounded-md bg-muted/20 border border-border/30 text-xs text-muted-foreground font-mono">
        <Loader2 className="w-3 h-3 animate-spin" />
        {t('pkg_inline_checking')}
      </div>
    );
  }

  if (warnings.length === 0) return null;

  return (
    <div data-testid="pkg-inline-warnings" className="my-2 rounded-md border border-amber-500/30 bg-amber-500/5 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-xs font-bold text-amber-400">{t('pkg_inline_warn')}</span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        {warnings.map(([name, info]) => (
          <div key={name} className="flex items-center gap-2 flex-wrap">
            <a
              href={info.source === 'aur' ? `https://aur.archlinux.org/packages/${name}` : `https://archlinux.org/packages/?q=${name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono font-bold text-foreground hover:text-[#1793D1] transition-colors flex items-center gap-1"
            >
              <Package className="w-3 h-3" /> {name}
              <ExternalLink className="w-2.5 h-2.5 opacity-50" />
            </a>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground">
              {info.source === 'aur' ? 'AUR' : info.repo}
            </span>
            {info.is_outdated && (
              <span data-testid={`pkg-inline-outdated-${name}`} className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <AlertTriangle className="w-2.5 h-2.5" /> {t('pkg_outdated')}
              </span>
            )}
            {info.is_orphaned && (
              <span data-testid={`pkg-inline-orphaned-${name}`} className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border border-red-500/30 bg-red-500/10 text-red-400">
                <User className="w-2.5 h-2.5" /> {t('pkg_orphaned')}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
