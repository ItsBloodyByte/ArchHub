import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { BookOpen, Search, Clock, Eye, Tag, Plus, ChevronDown, Layers } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import TerminalHeader from '../components/TerminalHeader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const difficultyColors = {
  beginner: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  intermediate: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  advanced: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  expert: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function CollectionsPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchCollections = async () => {
      setLoading(true);
      try {
        const params = { page, limit: 12, sort };
        if (search) params.search = search;
        const res = await axios.get(`${API}/collections`, { params });
        setCollections(res.data.collections);
        setTotalPages(res.data.pages);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchCollections();
  }, [page, sort, search]);

  return (
    <div data-testid="collections-page" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TerminalHeader command="ls /etc/archhub/collections/" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tighter">{t('collection_title')}</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{t('collection_subtitle')}</p>
        </div>
        {user && (
          <Link data-testid="create-collection-btn" to="/collections/create"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[#1793D1] text-white hover:bg-[#1793D1]/90 transition-colors">
            <Plus className="w-4 h-4" /> {t('collection_create')}
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input data-testid="collections-search" type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder={`${t('search_btn')}...`}
            className="w-full h-10 pl-10 pr-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
        </div>
        <div className="relative">
          <select data-testid="collections-sort" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}
            className="h-10 pl-3 pr-8 rounded-md border border-input bg-background text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50">
            <option value="newest">{t('article_sort_newest')}</option>
            <option value="oldest">{t('search_sort_oldest')}</option>
            <option value="popular">{t('article_sort_popular')}</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse rounded-lg border border-border/30 bg-card p-5 space-y-3">
              <div className="h-5 bg-muted/30 rounded w-2/3" />
              <div className="h-3 bg-muted/20 rounded w-full" />
              <div className="h-3 bg-muted/20 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : collections.length === 0 ? (
        <div data-testid="collections-empty" className="text-center py-16">
          <Layers className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">{t('collection_empty')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map(col => (
              <Link key={col.id} to={`/collections/${col.slug}`} data-testid={`collection-card-${col.slug}`}
                className="group rounded-lg border border-border/30 bg-card hover:border-[#1793D1]/30 hover:bg-[#1793D1]/5 transition-all p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#1793D1]" />
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${difficultyColors[col.difficulty] || difficultyColors.beginner}`}>
                      {col.difficulty}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> {col.item_count} {t('collection_items')}
                  </span>
                </div>
                <h3 className="text-base font-bold mb-2 group-hover:text-[#1793D1] transition-colors line-clamp-2">
                  {(lang === 'en' && col.title_en) ? col.title_en : col.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {(lang === 'en' && col.description_en) ? col.description_en : col.description}
                </p>
                {col.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {col.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] font-mono text-[#1793D1]/60 bg-[#1793D1]/5 px-1.5 py-0.5 rounded">#{tag}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground font-mono pt-2 border-t border-border/20">
                  <span>{col.author_username}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {col.view_count || 0}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(col.created_at).toLocaleDateString('de-DE')}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`h-8 w-8 rounded text-xs font-mono ${p === page ? 'bg-[#1793D1] text-white' : 'bg-muted/10 text-muted-foreground hover:bg-muted/20'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
