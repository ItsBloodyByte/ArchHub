import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Code2, ArrowUp, Eye, Copy, Plus, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import UserAvatar from '../components/UserAvatar';
import TerminalHeader from '../components/TerminalHeader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CATEGORIES = ['utility', 'backup', 'package-management', 'maintenance', 'monitoring', 'networking', 'security', 'automation'];
const LANGUAGES = ['bash', 'python', 'fish', 'zsh', 'perl'];

export default function ScriptLibraryPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [scripts, setScripts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const page = parseInt(searchParams.get('page') || '1');
  const sort = searchParams.get('sort') || 'newest';
  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const contentLang = searchParams.get('content_lang') || '';

  useEffect(() => { loadScripts(); }, [page, sort, category, search, contentLang]);

  const loadScripts = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 12, sort };
      if (category) params.category = category;
      if (search) params.search = search;
      if (contentLang) params.content_lang = contentLang;
      const res = await axios.get(`${API}/scripts`, { params });
      setScripts(res.data.scripts);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    setSearchParams(params);
  };

  return (
    <div data-testid="script-library-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TerminalHeader command="ls /usr/share/archhub/scripts" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tighter flex items-center gap-3">
            <Code2 className="w-8 h-8 text-[#1793D1]" />
            Script Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{total} Scripts</p>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <Link to="/scripts/new" data-testid="new-script-btn" className="inline-flex items-center gap-1.5 h-10 px-5 rounded-sm bg-[#1793D1] text-white font-medium hover:bg-[#126A9A] transition-colors active:scale-95">
              <Plus className="w-4 h-4" /> Skript teilen
            </Link>
          )}
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1.5 h-9 px-3 rounded-sm border border-input text-sm hover:bg-accent transition-colors">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>
      </div>

      {/* Sort + Filters */}
      <div className="flex items-center gap-2 mb-6">
        {['newest', 'popular', 'most_copied'].map(s => (
          <button key={s} onClick={() => updateFilter('sort', s)} className={`px-3 py-1.5 rounded-sm text-xs font-mono transition-colors ${sort === s ? 'bg-[#1793D1] text-white' : 'border border-input hover:bg-accent'}`}>
            {s === 'newest' ? 'Neueste' : s === 'popular' ? 'Beliebteste' : 'Meist kopiert'}
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="mb-6 p-4 rounded-lg border border-border/50 bg-card space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">{t('script_filter_category')}</label>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => updateFilter('category', '')} className={`px-3 py-1.5 rounded-sm text-xs font-mono ${!category ? 'bg-[#1793D1] text-white' : 'border border-input hover:bg-accent'}`}>{t('script_all')}</button>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => updateFilter('category', c)} className={`px-3 py-1.5 rounded-sm text-xs font-mono ${category === c ? 'bg-[#1793D1] text-white' : 'border border-input hover:bg-accent'}`}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">{t('lang_filter')}</label>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => updateFilter('content_lang', '')}
                className={`px-3 py-1.5 rounded-sm text-xs font-mono transition-colors ${!contentLang ? 'bg-[#1793D1] text-white' : 'border border-input hover:bg-accent'}`}>
                {t('lang_all')}
              </button>
              <button onClick={() => updateFilter('content_lang', 'de')}
                className={`px-3 py-1.5 rounded-sm text-xs font-mono transition-colors ${contentLang === 'de' ? 'bg-[#1793D1] text-white' : 'border border-input hover:bg-accent'}`}>
                Deutsch
              </button>
              <button onClick={() => updateFilter('content_lang', 'en')}
                className={`px-3 py-1.5 rounded-sm text-xs font-mono transition-colors ${contentLang === 'en' ? 'bg-[#1793D1] text-white' : 'border border-input hover:bg-accent'}`}>
                English
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scripts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 rounded-lg border border-border/50 bg-muted/20 animate-pulse" />)}
        </div>
      ) : scripts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">{t('misc_no_results')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scripts.map(script => (
            <Link key={script.id} to={`/scripts/${script.id}`} data-testid={`script-card-${script.id}`} className="group block rounded-lg border border-border/50 bg-card hover:border-[#1793D1]/30 transition-all duration-200 hover:-translate-y-[2px]">
              <div className="p-5">
                {/* Language badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1793D1]/10 text-[#1793D1] border border-[#1793D1]/20">{script.language}</span>
                  <span className="text-xs font-mono text-muted-foreground">{script.category}</span>
                </div>

                {/* Title */}
                <h3 className="font-bold text-sm group-hover:text-[#1793D1] transition-colors mb-2">{(lang === 'en' && script.title_en) ? script.title_en : script.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{(lang === 'en' && script.description_en) ? script.description_en : script.description}</p>

                {/* Tags */}
                {script.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {script.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] font-mono text-[#1793D1]/60 bg-[#1793D1]/5 px-1.5 py-0.5 rounded">#{tag}</span>
                    ))}
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 pt-3 border-t border-border/30 text-xs font-mono text-muted-foreground">
                  <span className="flex items-center gap-1"><ArrowUp className="w-3 h-3" /> {script.vote_score}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {script.view_count}</span>
                  <span className="flex items-center gap-1"><Copy className="w-3 h-3" /> {script.copy_count}</span>
                  <span className="ml-auto flex items-center gap-1"><UserAvatar username={script.author_username} size={16} /> {script.author_username}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => updateFilter('page', String(p))} className={`w-9 h-9 rounded-sm text-sm font-mono ${p === page ? 'bg-[#1793D1] text-white' : 'border border-input hover:bg-accent'}`}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}
