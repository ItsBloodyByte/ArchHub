import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Search, FileText, HelpCircle, Terminal, ArrowRight, Tag, ThumbsUp, Clock, SlidersHorizontal, X, ArrowUpDown, Calendar } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = [
  'general', 'installation', 'package-management', 'system-administration',
  'security', 'desktop', 'kernel', 'networking', 'scripting'
];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'expert'];
const SORT_OPTIONS = ['relevance', 'newest', 'oldest', 'most_voted'];
const DATE_PRESETS = ['any', 'week', 'month', 'year'];

function getDateFrom(preset) {
  if (preset === 'any') return '';
  const d = new Date();
  if (preset === 'week') d.setDate(d.getDate() - 7);
  else if (preset === 'month') d.setMonth(d.getMonth() - 1);
  else if (preset === 'year') d.setFullYear(d.getFullYear() - 1);
  return d.toISOString();
}

function ResultCard({ type, item }) {
  const cfg = {
    article: { icon: FileText, color: 'text-[#1793D1]', bg: 'bg-[#1793D1]/10', border: 'border-[#1793D1]/20', link: `/article/${item.slug}`, label: 'Tutorial' },
    question: { icon: HelpCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', link: `/questions/${item.id}`, label: 'Q&A' },
    script: { icon: Terminal, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', link: `/scripts/${item.id}`, label: 'Script' },
  }[type];
  const Icon = cfg.icon;

  return (
    <Link to={cfg.link} data-testid={`search-result-${type}-${item.id || item.slug}`} className="group block p-4 rounded-lg border border-border/50 bg-card hover:border-[#1793D1]/30 transition-all hover:shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-9 h-9 rounded-md ${cfg.bg} ${cfg.border} border flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
            {item.category && <span className="text-[10px] text-muted-foreground capitalize">{item.category.replace(/-/g, ' ')}</span>}
            {item.difficulty && <span className="text-[10px] text-muted-foreground capitalize">{item.difficulty}</span>}
            {item.created_at && <span className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>}
          </div>
          <h3 className="text-sm font-semibold truncate group-hover:text-[#1793D1] transition-colors">{item.title}</h3>
          {(item.summary || item.description) && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.summary || item.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {item.author_username && (
              <span className="text-xs text-muted-foreground font-mono">{item.author_username}</span>
            )}
            {item.vote_score !== undefined && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><ThumbsUp className="w-3 h-3" /> {item.vote_score}</span>
            )}
            {item.tags && item.tags.length > 0 && (
              <div className="flex items-center gap-1 overflow-hidden">
                <Tag className="w-3 h-3 text-muted-foreground shrink-0" />
                {item.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
      </div>
    </Link>
  );
}

export default function SearchPage() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [inputValue, setInputValue] = useState(query);
  const [results, setResults] = useState({ articles: [], questions: [], scripts: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [datePreset, setDatePreset] = useState('any');
  const [tagFilter, setTagFilter] = useState('');
  const [popularTags, setPopularTags] = useState([]);

  useEffect(() => {
    axios.get(`${API}/search/tags`).then(res => setPopularTags(res.data.tags || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (query) performSearch(query);
  }, [query, category, difficulty, sortBy, datePreset, tagFilter]);

  const performSearch = async (q) => {
    setLoading(true);
    setSearched(true);
    try {
      const params = { q, limit: 25, sort: sortBy };
      if (category) params.category = category;
      if (difficulty) params.difficulty = difficulty;
      if (tagFilter) params.tag = tagFilter;
      const df = getDateFrom(datePreset);
      if (df) params.date_from = df;
      const res = await axios.get(`${API}/search/all`, { params });
      setResults(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) setSearchParams({ q: inputValue.trim() });
  };

  const clearFilters = () => {
    setCategory('');
    setDifficulty('');
    setSortBy('relevance');
    setDatePreset('any');
    setTagFilter('');
  };

  const hasFilters = category || difficulty || sortBy !== 'relevance' || datePreset !== 'any' || tagFilter;
  const totalResults = results.articles.length + results.questions.length + results.scripts.length;

  const filteredResults = () => {
    if (activeTab === 'articles') return { articles: results.articles, questions: [], scripts: [] };
    if (activeTab === 'questions') return { articles: [], questions: results.questions, scripts: [] };
    if (activeTab === 'scripts') return { articles: [], questions: [], scripts: results.scripts };
    return results;
  };
  const filtered = filteredResults();
  const shownCount = filtered.articles.length + filtered.questions.length + filtered.scripts.length;

  const tabs = [
    { key: 'all', label: t('search_tab_all'), count: totalResults },
    { key: 'articles', label: t('nav_tutorials'), count: results.articles.length },
    { key: 'questions', label: 'Q&A', count: results.questions.length },
    { key: 'scripts', label: 'Scripts', count: results.scripts.length },
  ];

  return (
    <div data-testid="search-page" className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 text-[#1793D1] font-mono text-sm">
            <Terminal className="w-4 h-4" />
            <span className="opacity-70">$</span>
            <span className="typing-animation">grep -r "{query || '...'}" /archhub {sortBy !== 'relevance' ? `--sort=${sortBy}` : ''}</span>
          </div>
          <h1 data-testid="search-page-title" className="text-3xl sm:text-4xl font-extrabold tracking-tighter mb-6">
            {t('search_title')}
          </h1>

          {/* Search Form */}
          <form onSubmit={handleSubmit} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              data-testid="search-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t('search_placeholder')}
              className="w-full h-12 pl-12 pr-28 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1] font-mono"
              autoFocus
            />
            <button data-testid="search-submit-btn" type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-4 rounded-md bg-[#1793D1] text-white text-sm font-medium hover:bg-[#126A9A] transition-colors active:scale-95">
              {t('search_btn')}
            </button>
          </form>

          {/* Filter + Sort Controls */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button
              data-testid="search-filter-toggle"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border transition-colors ${
                showFilters || hasFilters ? 'border-[#1793D1]/40 bg-[#1793D1]/10 text-[#1793D1]' : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {t('search_filters')}
              {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-[#1793D1]" />}
            </button>

            {/* Quick sort pills */}
            <div className="flex items-center gap-1 ml-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
              {SORT_OPTIONS.map(s => (
                <button
                  key={s}
                  data-testid={`search-sort-${s}`}
                  onClick={() => setSortBy(s)}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors ${
                    sortBy === s ? 'bg-[#1793D1]/15 text-[#1793D1] border border-[#1793D1]/30' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {t(`search_sort_${s}`)}
                </button>
              ))}
            </div>

            {hasFilters && (
              <button data-testid="search-clear-filters" onClick={clearFilters} className="flex items-center gap-1 h-7 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-3 h-3" /> {t('search_clear_filters')}
              </button>
            )}
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div data-testid="search-filters-panel" className="mt-3 p-4 rounded-lg border border-border/50 bg-card space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5">{t('search_filter_category')}</label>
                  <select data-testid="search-filter-category" value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50">
                    <option value="">{t('article_filter_all')}</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/-/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">{t('search_filter_difficulty')}</label>
                  <select data-testid="search-filter-difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50">
                    <option value="">{t('article_filter_all')}</option>
                    {DIFFICULTIES.map(d => <option key={d} value={d}>{t(`article_difficulty_${d}`)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">{t('search_filter_date')}</label>
                  <select data-testid="search-filter-date" value={datePreset} onChange={(e) => setDatePreset(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50">
                    {DATE_PRESETS.map(d => <option key={d} value={d}>{t(`search_date_${d}`)}</option>)}
                  </select>
                </div>
              </div>

              {/* Popular Tags */}
              {popularTags.length > 0 && (
                <div>
                  <label className="block text-xs font-medium mb-2">{t('search_filter_tags')}</label>
                  <div className="flex flex-wrap gap-1.5">
                    {popularTags.slice(0, 15).map(pt => (
                      <button
                        key={pt.name}
                        type="button"
                        data-testid={`search-tag-${pt.name}`}
                        onClick={() => setTagFilter(tagFilter === pt.name ? '' : pt.name)}
                        className={`text-[11px] font-mono px-2 py-1 rounded-md border transition-colors ${
                          tagFilter === pt.name
                            ? 'border-[#1793D1]/40 bg-[#1793D1]/15 text-[#1793D1]'
                            : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                        }`}
                      >
                        #{pt.name} <span className="opacity-60">{pt.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        {searched && (
          <>
            <div className="flex items-center gap-1 mb-6 border-b border-border/40 overflow-x-auto">
              {tabs.map(tab => (
                <button key={tab.key} data-testid={`search-tab-${tab.key}`} onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.key ? 'border-[#1793D1] text-[#1793D1]' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}>
                  {tab.label}
                  <span className={`ml-1.5 text-xs font-mono ${activeTab === tab.key ? 'text-[#1793D1]' : 'text-muted-foreground'}`}>{tab.count}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground font-mono">
              <Clock className="w-3 h-3" />
              <span>{t('search_results_count').replace('{count}', shownCount).replace('{query}', query)}</span>
              {hasFilters && <span className="text-[#1793D1]">({t('search_filtered')})</span>}
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-lg border border-border/50 bg-muted/20 animate-pulse" />)}
              </div>
            ) : shownCount === 0 ? (
              <div data-testid="search-no-results" className="text-center py-16">
                <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">{t('misc_no_results')}</p>
                <p className="text-sm text-muted-foreground font-mono">$ grep "{query}" -- {t('search_no_match')}</p>
                {hasFilters && (
                  <button onClick={clearFilters} className="mt-4 text-sm text-[#1793D1] hover:underline underline-offset-4">
                    {t('search_clear_filters')}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.articles.map(a => <ResultCard key={a.id || a.slug} type="article" item={a} />)}
                {filtered.questions.map(q => <ResultCard key={q.id} type="question" item={q} />)}
                {filtered.scripts.map(s => <ResultCard key={s.id} type="script" item={s} />)}
              </div>
            )}
          </>
        )}

        {!searched && (
          <div data-testid="search-empty-state" className="text-center py-16">
            <Search className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">{t('search_empty_title')}</p>
            <p className="text-sm text-muted-foreground">{t('search_empty_subtitle')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
