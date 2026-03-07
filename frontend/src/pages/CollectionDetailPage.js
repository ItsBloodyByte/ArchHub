import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, BookOpen, Eye, Clock, Tag, Layers, ChevronRight, ChevronLeft, Trash2, Edit, Code2, FileText, AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import MarkdownRenderer from '../components/MarkdownRenderer';
import TerminalHeader from '../components/TerminalHeader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const difficultyColors = {
  beginner: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  intermediate: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  advanced: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  expert: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function CollectionDetailPage() {
  const { slug } = useParams();
  const { user, authHeaders } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedItems, setCompletedItems] = useState([]);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/collections/${slug}`);
        setCollection(res.data);
        if (user) {
          try {
            const pRes = await axios.get(`${API}/collections/${slug}/progress`, { headers: authHeaders });
            setCompletedItems(pRes.data.completed_items || []);
          } catch {}
        }
      } catch { }
      setLoading(false);
    };
    fetch();
  }, [slug, user]);

  const handleDelete = async () => {
    if (!window.confirm(t('collection_delete') + '?')) return;
    try {
      await axios.delete(`${API}/collections/${collection.id}`, { headers: authHeaders });
      navigate('/collections');
    } catch { }
  };

  const toggleProgress = async (contentId) => {
    if (!user) return;
    setTogglingId(contentId);
    try {
      const res = await axios.post(`${API}/collections/${slug}/progress`,
        { content_id: contentId },
        { headers: { ...authHeaders, 'Content-Type': 'application/json' } }
      );
      setCompletedItems(res.data.completed_items || []);
    } catch {}
    setTogglingId(null);
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-8"><div className="animate-pulse space-y-4"><div className="h-8 bg-muted/30 rounded w-1/3" /><div className="h-4 bg-muted/20 rounded w-2/3" /><div className="h-64 bg-muted/10 rounded" /></div></div>;
  }

  if (!collection) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-muted-foreground">Collection not found</div>;
  }

  const isAuthor = user && user.id === collection.author_id;
  const isMod = user && ['admin', 'moderator'].includes(user.role);
  const items = collection.items || [];

  return (
    <div data-testid="collection-detail-page" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TerminalHeader command={`cat /etc/archhub/collections/${collection.slug}`} />
      <Link to="/collections" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t('nav_collections')}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-5 h-5 text-[#1793D1]" />
          <span className={`text-xs font-mono px-2 py-0.5 rounded border ${difficultyColors[collection.difficulty] || difficultyColors.beginner}`}>
            {collection.difficulty}
          </span>
          <span className="text-xs font-mono text-muted-foreground">{items.length} {t('collection_items')}</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tighter mb-3">
          {(lang === 'en' && collection.title_en) ? collection.title_en : collection.title}
        </h1>

        {/* Language Fallback */}
        {lang === 'en' && !collection.title_en && (
          <div data-testid="language-fallback-notice" className="flex items-center gap-2 mb-3 p-2.5 rounded-md border border-amber-500/20 bg-amber-500/5 text-xs font-mono text-amber-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {t('content_fallback_notice')}
          </div>
        )}

        <p className="text-sm text-muted-foreground mb-4">
          {(lang === 'en' && collection.description_en) ? collection.description_en : collection.description}
        </p>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-mono">
          <Link to={`/user/${collection.author_username}`} className="hover:text-[#1793D1]">{collection.author_username}</Link>
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {collection.view_count}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(collection.created_at).toLocaleDateString('de-DE')}</span>
          {(isAuthor || isMod) && (
            <div className="flex items-center gap-2 ml-auto">
              <Link to={`/collections/${collection.id}/edit`} className="flex items-center gap-1 px-2 py-1 rounded text-[#1793D1] hover:bg-[#1793D1]/10 transition-colors">
                <Edit className="w-3 h-3" /> {t('collection_edit')}
              </Link>
              <button onClick={handleDelete} className="flex items-center gap-1 px-2 py-1 rounded text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-3 h-3" /> {t('collection_delete')}
              </button>
            </div>
          )}
        </div>

        {collection.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {collection.tags.map(tag => (
              <span key={tag} className="text-xs font-mono text-[#1793D1]/70 bg-[#1793D1]/5 px-2 py-0.5 rounded">#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {user && items.length > 0 && (
        <div data-testid="collection-progress-bar" className="mb-6 rounded-lg border border-border/30 bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1793D1]" />
              {t('collection_progress')}
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              {completedItems.length}/{items.length} ({items.length > 0 ? Math.round(completedItems.length / items.length * 100) : 0}%)
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
            <div
              data-testid="collection-progress-fill"
              className="h-full rounded-full bg-[#1793D1] transition-all duration-500 ease-out"
              style={{ width: `${items.length > 0 ? (completedItems.length / items.length * 100) : 0}%` }}
            />
          </div>
          {completedItems.length === items.length && items.length > 0 && (
            <p data-testid="collection-completed-msg" className="text-xs text-emerald-400 font-medium mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {t('collection_completed')}
            </p>
          )}
        </div>
      )}

      {/* Items List */}
      <div className="space-y-3">
        {items.map((item, idx) => {
          const isCompleted = completedItems.includes(item.content_id);
          return (
          <div key={idx} data-testid={`collection-item-${idx}`}
            className={`group flex items-center gap-4 p-4 rounded-lg border transition-all ${
              isCompleted
                ? 'border-emerald-500/20 bg-emerald-500/5'
                : 'border-border/30 bg-card hover:border-[#1793D1]/30 hover:bg-[#1793D1]/5'
            }`}>
            {/* Progress Check */}
            {user ? (
              <button
                data-testid={`collection-toggle-${idx}`}
                onClick={() => toggleProgress(item.content_id)}
                disabled={togglingId === item.content_id}
                className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all disabled:opacity-50"
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 group-hover:border-[#1793D1]/50 transition-colors flex items-center justify-center">
                    <span className="text-xs font-mono text-muted-foreground">{idx + 1}</span>
                  </div>
                )}
              </button>
            ) : (
              <div className="shrink-0 w-10 h-10 rounded-lg bg-[#1793D1]/10 border border-[#1793D1]/20 flex items-center justify-center text-sm font-bold text-[#1793D1] font-mono">
                {idx + 1}
              </div>
            )}

            {/* Icon */}
            <div className="shrink-0">
              {item.content_type === 'article' ? (
                <FileText className="w-5 h-5 text-emerald-400" />
              ) : (
                <Code2 className="w-5 h-5 text-amber-400" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  item.content_type === 'article' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {item.content_type === 'article' ? t('collection_item_article') : t('collection_item_script')}
                </span>
                {item.difficulty && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${difficultyColors[item.difficulty] || ''}`}>
                    {item.difficulty}
                  </span>
                )}
                {isCompleted && (
                  <span className="text-[10px] font-mono text-emerald-400">{t('collection_item_done')}</span>
                )}
              </div>
              <h3 className={`text-sm font-bold truncate transition-colors ${
                isCompleted ? 'text-muted-foreground line-through decoration-emerald-500/30' : 'group-hover:text-[#1793D1]'
              }`}>
                {(lang === 'en' && item.title_en) ? item.title_en : (item.title || 'Untitled')}
              </h3>
              {item.author_username && (
                <span className="text-xs text-muted-foreground font-mono">{item.author_username}</span>
              )}
            </div>

            {/* Arrow */}
            <Link
              to={item.content_type === 'article' ? `/article/${item.slug}` : `/scripts/${item.content_id}`}
              className="shrink-0 w-8 h-8 rounded-md bg-[#1793D1]/10 flex items-center justify-center text-[#1793D1] hover:bg-[#1793D1]/20 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t('collection_empty')}</p>
        </div>
      )}
    </div>
  );
}
