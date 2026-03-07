import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { HelpCircle, MessageSquare, CheckCircle, Eye, ArrowUp, Clock, Plus, Filter, Bug } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import UserAvatar from '../components/UserAvatar';
import TerminalHeader from '../components/TerminalHeader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function QAListPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, unanswered: 0, solved: 0, bugs: { total: 0, open: 0, confirmed: 0, fixed: 0 } });
  const [loading, setLoading] = useState(true);

  const page = parseInt(searchParams.get('page') || '1');
  const sort = searchParams.get('sort') || 'newest';
  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';
  const langFilter = searchParams.get('lang') || '';
  const bugOnly = searchParams.get('bugs') === 'true';

  useEffect(() => {
    loadData();
  }, [page, sort, status, search, langFilter, bugOnly]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15, sort };
      if (status) params.status = status;
      if (search) params.search = search;
      if (langFilter) params.lang = langFilter;
      if (bugOnly) params.bug_reports = true;
      const [qRes, sRes] = await Promise.all([
        axios.get(`${API}/questions`, { params }),
        axios.get(`${API}/questions/stats/overview`)
      ]);
      setQuestions(qRes.data.questions);
      setTotal(qRes.data.total);
      setPages(qRes.data.pages);
      setStats(sRes.data);
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
    <div data-testid="qa-list-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Terminal Header */}
      <TerminalHeader command="man archhub-questions" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tighter flex items-center gap-3">
            <HelpCircle className="w-8 h-8 text-[#1793D1]" />
            Q&A
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{total} {t('qa_questions_count')}</p>
        </div>
        {user && (
          <div className="flex items-center gap-2">
            <Link to="/questions/ask?bug=true" data-testid="report-bug-btn"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-sm border-2 border-red-500/30 bg-red-500/5 text-red-400 font-medium hover:bg-red-500/10 transition-colors active:scale-95">
              <Bug className="w-4 h-4" /> {t('bug_report_btn')}
            </Link>
            <Link to="/questions/ask" data-testid="ask-question-btn"
              className="inline-flex items-center gap-1.5 h-10 px-5 rounded-sm bg-[#1793D1] text-white font-medium hover:bg-[#126A9A] transition-colors active:scale-95">
              <Plus className="w-4 h-4" /> {t('qa_ask_btn')}
            </Link>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <button onClick={() => updateFilter('status', '')} className={`p-3 rounded-lg border text-center transition-colors ${!status && !bugOnly ? 'border-[#1793D1] bg-[#1793D1]/5' : 'border-border/50 bg-card hover:border-border'}`}>
          <div className="text-xl font-extrabold font-mono">{stats.total}</div>
          <div className="text-xs text-muted-foreground">{t('qa_total')}</div>
        </button>
        <button onClick={() => updateFilter('status', 'unanswered')} className={`p-3 rounded-lg border text-center transition-colors ${status === 'unanswered' ? 'border-amber-500 bg-amber-500/5' : 'border-border/50 bg-card hover:border-border'}`}>
          <div className="text-xl font-extrabold font-mono text-amber-400">{stats.unanswered}</div>
          <div className="text-xs text-muted-foreground">{t('qa_unanswered')}</div>
        </button>
        <button onClick={() => updateFilter('status', 'solved')} className={`p-3 rounded-lg border text-center transition-colors ${status === 'solved' ? 'border-emerald-500 bg-emerald-500/5' : 'border-border/50 bg-card hover:border-border'}`}>
          <div className="text-xl font-extrabold font-mono text-emerald-400">{stats.solved}</div>
          <div className="text-xs text-muted-foreground">{t('qa_solved')}</div>
        </button>
        <button onClick={() => { updateFilter('bugs', bugOnly ? '' : 'true'); }} className={`p-3 rounded-lg border text-center transition-colors ${bugOnly ? 'border-red-500 bg-red-500/5' : 'border-border/50 bg-card hover:border-border'}`}>
          <div className="text-xl font-extrabold font-mono text-red-400 flex items-center justify-center gap-1"><Bug className="w-4 h-4" /> {stats.bugs?.total || 0}</div>
          <div className="text-xs text-muted-foreground">{t('bug_report_title')}</div>
        </button>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {['newest', 'most_voted', 'unanswered'].map(s => (
          <button key={s} onClick={() => updateFilter('sort', s)} className={`px-3 py-1.5 rounded-sm text-xs font-mono transition-colors ${sort === s ? 'bg-[#1793D1] text-white' : 'border border-input hover:bg-accent'}`}>
            {s === 'newest' ? t('qa_sort_newest') : s === 'most_voted' ? t('qa_sort_top') : t('qa_sort_unanswered')}
          </button>
        ))}
        <span className="w-px h-5 bg-border/50 mx-1" />
        <span className="text-xs text-muted-foreground font-mono">{t('lang_filter')}:</span>
        <button onClick={() => updateFilter('lang', '')}
          className={`px-3 py-1.5 rounded-sm text-xs font-mono transition-colors ${!langFilter ? 'bg-[#1793D1] text-white' : 'border border-input hover:bg-accent'}`}>
          {t('lang_all')}
        </button>
        <button onClick={() => updateFilter('lang', 'de')}
          className={`px-3 py-1.5 rounded-sm text-xs font-mono transition-colors ${langFilter === 'de' ? 'bg-[#1793D1] text-white' : 'border border-input hover:bg-accent'}`}>
          DE
        </button>
        <button onClick={() => updateFilter('lang', 'en')}
          className={`px-3 py-1.5 rounded-sm text-xs font-mono transition-colors ${langFilter === 'en' ? 'bg-[#1793D1] text-white' : 'border border-input hover:bg-accent'}`}>
          EN
        </button>
      </div>

      {/* Questions list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 rounded-lg border border-border/50 bg-muted/20 animate-pulse" />)}
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">{t('misc_no_results')}</div>
      ) : (
        <div className="space-y-3">
          {questions.map(q => (
            <Link key={q.id} to={`/questions/${q.id}`} data-testid={`question-${q.id}`}
              className={`block p-4 rounded-lg border transition-all duration-200 hover:-translate-y-[1px] ${
                q.is_bug_report
                  ? 'border-red-500/30 bg-red-500/[0.02] hover:border-red-500/50'
                  : 'border-border/50 bg-card hover:border-[#1793D1]/30'
              }`}>
              <div className="flex gap-4">
                {/* Stats column */}
                <div className="hidden sm:flex flex-col items-center gap-2 shrink-0 min-w-[80px]">
                  <div className={`text-center px-2 py-1 rounded text-xs font-mono ${q.vote_score > 0 ? 'text-[#1793D1]' : 'text-muted-foreground'}`}>
                    <ArrowUp className="w-3 h-3 mx-auto" />
                    {q.vote_score}
                  </div>
                  <div className={`text-center px-2 py-1 rounded text-xs font-mono ${q.accepted_answer_id ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : q.answer_count > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                    <MessageSquare className="w-3 h-3 mx-auto mb-0.5" />
                    {q.answer_count}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {q.is_bug_report && (
                      <span className={`flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        q.bug_status === 'fixed' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                        q.bug_status === 'confirmed' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                        'text-red-400 bg-red-500/10 border-red-500/20'
                      }`}>
                        <Bug className="w-3 h-3" />
                        {q.bug_status === 'fixed' ? t('bug_status_fixed') : q.bug_status === 'confirmed' ? t('bug_status_confirmed') : t('bug_status_open')}
                      </span>
                    )}
                    {q.accepted_answer_id && (
                      <span className="flex items-center gap-0.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        <CheckCircle className="w-3 h-3" /> {t('qa_solved')}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm hover:text-[#1793D1] transition-colors line-clamp-2">{(lang === 'en' && q.title_en) ? q.title_en : q.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {q.tags?.slice(0, 4).map(tag => (
                      <span key={tag} className="text-[10px] font-mono text-[#1793D1]/70 bg-[#1793D1]/5 px-1.5 py-0.5 rounded">#{tag}</span>
                    ))}
                    <span className="text-xs font-mono text-muted-foreground ml-auto flex items-center gap-1">
                      <UserAvatar username={q.author_username} size={18} />
                      {q.author_username} <Clock className="w-3 h-3" /> {new Date(q.created_at).toLocaleDateString()}
                    </span>
                  </div>
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
            <button key={p} onClick={() => updateFilter('page', String(p))} className={`w-9 h-9 rounded-sm text-sm font-mono transition-colors ${p === page ? 'bg-[#1793D1] text-white' : 'border border-input hover:bg-accent'}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
