import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FileText, Clock, Send, AlertCircle, CheckCircle, Edit } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import TerminalHeader from '../components/TerminalHeader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusConfig = {
  draft: { color: 'bg-muted text-muted-foreground border-border', icon: FileText },
  submitted: { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Send },
  in_review: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Clock },
  published: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle },
  rejected: { color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertCircle },
};

export default function MyDraftsPage() {
  const { authHeaders } = useAuth();
  const { t } = useLanguage();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDrafts = async () => {
      try {
        const res = await axios.get(`${API}/users/me/drafts`, { headers: authHeaders });
        setArticles(res.data.articles);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    loadDrafts();
  }, []);

  const submitForReview = async (articleId) => {
    try {
      await axios.post(`${API}/articles/${articleId}/submit`, {}, { headers: authHeaders });
      setArticles(articles.map(a => a.id === articleId ? { ...a, status: 'submitted' } : a));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div data-testid="my-drafts-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TerminalHeader command="ls ~/archhub/drafts" />
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-[#1793D1]" />
          <h1 className="text-2xl font-extrabold tracking-tighter">{t('editor_my_drafts')}</h1>
        </div>
        <Link
          to="/editor"
          className="flex items-center gap-1.5 h-9 px-4 rounded-sm bg-[#1793D1] text-white text-sm font-medium hover:bg-[#126A9A] transition-colors"
        >
          + {t('nav_new_article')}
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-lg border border-border/50 bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p>{t('misc_no_results')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map(article => {
            const config = statusConfig[article.status] || statusConfig.draft;
            const StatusIcon = config.icon;
            return (
              <div key={article.id} data-testid={`draft-${article.id}`} className="p-4 rounded-lg border border-border/50 bg-card hover:border-[#1793D1]/30 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded border ${config.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {t(`status_${article.status}`)}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">{article.category}</span>
                    </div>
                    <h3 className="font-bold text-sm truncate">{article.title}</h3>
                    {article.review_feedback && (
                      <p className="text-xs text-amber-400 mt-1 font-mono">
                        {t('editor_feedback')}: {article.review_feedback}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      Updated: {new Date(article.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link
                      to={`/editor/${article.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-sm text-xs border border-input hover:bg-accent transition-colors"
                    >
                      <Edit className="w-3 h-3" /> {t('article_edit')}
                    </Link>
                    {(article.status === 'draft' || article.status === 'rejected') && (
                      <button
                        onClick={() => submitForReview(article.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-sm text-xs bg-[#1793D1] text-white hover:bg-[#126A9A] transition-colors"
                      >
                        <Send className="w-3 h-3" /> {t('editor_submit_review')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
