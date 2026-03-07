import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Filter, SortAsc } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import ArticleCard from '../components/ArticleCard';
import TerminalHeader from '../components/TerminalHeader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = ['general', 'installation', 'package-management', 'system-administration', 'security', 'desktop', 'kernel', 'networking', 'scripting'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'expert'];

export default function TutorialList() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const page = parseInt(searchParams.get('page') || '1');
  const difficulty = searchParams.get('difficulty') || '';
  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'newest';
  const search = searchParams.get('search') || '';
  const langFilter = searchParams.get('lang') || '';

  useEffect(() => {
    loadArticles();
  }, [page, difficulty, category, sort, search, langFilter]);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 12, sort };
      if (difficulty) params.difficulty = difficulty;
      if (category) params.category = category;
      if (search) params.search = search;
      if (langFilter) params.lang = langFilter;
      const res = await axios.get(`${API}/articles`, { params });
      setArticles(res.data.articles);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== 'page') params.set('page', '1');
    setSearchParams(params);
  };

  return (
    <div data-testid="tutorial-list-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TerminalHeader command="ls /etc/archhub/articles" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tighter">{t('nav_tutorials')}</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{total} {t('home_stats_articles')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="toggle-filters"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 h-9 px-3 rounded-sm border border-input text-sm hover:bg-accent transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <select
            data-testid="sort-select"
            value={sort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            className="h-9 px-3 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
          >
            <option value="newest">{t('article_sort_newest')}</option>
            <option value="popular">{t('article_sort_popular')}</option>
            <option value="most_voted">{t('article_sort_voted')}</option>
          </select>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div data-testid="filter-panel" className="mb-8 p-4 rounded-lg border border-border/50 bg-card space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">{t('editor_difficulty')}</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => updateFilter('difficulty', '')}
                className={`px-3 py-1.5 rounded-sm text-xs font-mono transition-colors ${!difficulty ? 'bg-[#1793D1] text-white' : 'border border-input hover:bg-accent'}`}
              >
                {t('article_filter_all')}
              </button>
              {DIFFICULTIES.map(d => (
                <button
                  key={d}
                  onClick={() => updateFilter('difficulty', d)}
                  className={`px-3 py-1.5 rounded-sm text-xs font-mono transition-colors ${difficulty === d ? 'bg-[#1793D1] text-white' : 'border border-input hover:bg-accent'}`}
                >
                  {t(`article_difficulty_${d}`)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">{t('editor_category')}</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => updateFilter('category', '')}
                className={`px-3 py-1.5 rounded-sm text-xs font-mono transition-colors ${!category ? 'bg-[#1793D1] text-white' : 'border border-input hover:bg-accent'}`}
              >
                {t('article_filter_all')}
              </button>
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => updateFilter('category', c)}
                  className={`px-3 py-1.5 rounded-sm text-xs font-mono transition-colors ${category === c ? 'bg-[#1793D1] text-white' : 'border border-input hover:bg-accent'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">{t('lang_filter')}</label>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => updateFilter('lang', '')}
                className={`px-3 py-1.5 rounded-sm text-xs font-mono transition-colors ${!langFilter ? 'bg-[#1793D1] text-white' : 'border border-input hover:bg-accent'}`}>
                {t('lang_all')}
              </button>
              <button onClick={() => updateFilter('lang', 'de')}
                className={`px-3 py-1.5 rounded-sm text-xs font-mono transition-colors ${langFilter === 'de' ? 'bg-[#1793D1] text-white' : 'border border-input hover:bg-accent'}`}>
                Deutsch
              </button>
              <button onClick={() => updateFilter('lang', 'en')}
                className={`px-3 py-1.5 rounded-sm text-xs font-mono transition-colors ${langFilter === 'en' ? 'bg-[#1793D1] text-white' : 'border border-input hover:bg-accent'}`}>
                English
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search indicator */}
      {search && (
        <div className="mb-6 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Results for:</span>
          <span className="text-sm font-mono text-[#1793D1]">"{search}"</span>
          <button onClick={() => updateFilter('search', '')} className="text-xs text-muted-foreground hover:text-foreground ml-2">[clear]</button>
        </div>
      )}

      {/* Articles Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 rounded-lg border border-border/50 bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">{t('misc_no_results')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map(article => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => updateFilter('page', String(p))}
              data-testid={`page-${p}`}
              className={`w-9 h-9 rounded-sm text-sm font-mono transition-colors ${
                p === page ? 'bg-[#1793D1] text-white' : 'border border-input hover:bg-accent'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
