import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Eye, Clock, Tag, Edit, BookOpen, Bookmark, BookmarkCheck, Flag, GitBranch, GitFork, Trash2, Terminal, Code2, Users, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import MarkdownRenderer from '../components/MarkdownRenderer';
import VoteButtons from '../components/VoteButtons';
import CommentSection from '../components/CommentSection';
import ReportModal from '../components/ReportModal';
import UserAvatar from '../components/UserAvatar';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const difficultyColors = {
  beginner: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  intermediate: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  advanced: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  expert: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function ArticleDetail() {
  const { slug } = useParams();
  const { user, authHeaders } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookmarked, setBookmarked] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [forking, setForking] = useState(false);
  const [forks, setForks] = useState([]);
  const [forksCount, setForksCount] = useState(0);
  const [linkedScripts, setLinkedScripts] = useState([]);

  useEffect(() => {
    loadArticle();
  }, [slug]);

  const loadArticle = async () => {
    try {
      const res = await axios.get(`${API}/articles/${slug}`, { headers: authHeaders });
      setArticle(res.data);
      // Check bookmark
      if (user) {
        try {
          const bRes = await axios.get(`${API}/bookmarks/${res.data.id}/check`, { headers: authHeaders });
          setBookmarked(bRes.data.bookmarked);
        } catch {}
      }
      // Load forks
      try {
        const fRes = await axios.get(`${API}/articles/${res.data.id}/forks`);
        setForks(fRes.data.forks);
        setForksCount(fRes.data.count);
      } catch {}
      // Load linked scripts
      const scriptIds = res.data.referenced_scripts || [];
      if (scriptIds.length > 0) {
        const scriptDocs = await Promise.all(
          scriptIds.map(sid => axios.get(`${API}/scripts/${sid}`).then(r => r.data).catch(() => null))
        );
        setLinkedScripts(scriptDocs.filter(Boolean));
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Article not found');
    }
    setLoading(false);
  };

  const toggleBookmark = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      const res = await axios.post(`${API}/bookmarks/${article.id}`, {}, { headers: authHeaders });
      setBookmarked(res.data.bookmarked);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVote = async (value) => {
    if (!user) { navigate('/login'); return; }
    try {
      const res = await axios.post(`${API}/articles/${article.id}/vote`, { value }, {
        headers: { ...authHeaders, 'Content-Type': 'application/json' }
      });
      setArticle(prev => ({ ...prev, ...res.data }));
    } catch (err) {
      console.error('Vote failed', err);
    }
  };

  const handleFork = async () => {
    if (!user) { navigate('/login'); return; }
    setForking(true);
    try {
      const res = await axios.post(`${API}/articles/${article.id}/fork`, {}, { headers: authHeaders });
      navigate(`/editor/${res.data.id}`);
    } catch (err) {
      console.error('Fork failed', err);
    }
    setForking(false);
  };

  // Resolve displayed content based on user language
  const displayContent = (lang === 'en' && article?.content_markdown_en) ? article.content_markdown_en : article?.content_markdown;

  // Extract TOC from markdown headings
  const toc = useMemo(() => {
    if (!displayContent) return [];
    const headings = [];
    const lines = displayContent.split('\n');
    for (const line of lines) {
      const match = line.match(/^(#{1,3})\s+(.+)/);
      if (match) {
        const level = match[1].length;
        const text = match[2].replace(/[*_`]/g, '');
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        headings.push({ level, text, id });
      }
    }
    return headings;
  }, [displayContent]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted/30 rounded w-1/3" />
          <div className="h-4 bg-muted/20 rounded w-2/3" />
          <div className="h-96 bg-muted/10 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">{error}</p>
        <Link to="/tutorials" className="text-[#1793D1] mt-4 inline-block hover:underline">{t('article_back')}</Link>
      </div>
    );
  }

  return (
    <div data-testid="article-detail-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <Link to="/tutorials" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {t('article_back')}
      </Link>

      <div className="flex gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Terminal Header */}
          <div className="flex items-center gap-2 mb-4 text-[#1793D1] font-mono text-sm">
            <Terminal className="w-4 h-4 shrink-0" />
            <span className="opacity-70">$</span>
            <span className="typing-animation">cat /etc/archhub/articles/{article.slug}</span>
          </div>

          {/* Article Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${difficultyColors[article.difficulty] || difficultyColors.beginner}`}>
                {t(`article_difficulty_${article.difficulty}`)}
              </span>
              <span className="text-xs font-mono text-muted-foreground">{article.category}</span>
              <span className="text-xs font-mono text-muted-foreground">v{article.version}</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-4">{(lang === 'en' && article.title_en) ? article.title_en : article.title}</h1>

            {/* Forked from notice */}
            {article.forked_from && (
              <div data-testid="forked-from-notice" className="flex items-center gap-2 mb-4 text-xs font-mono text-muted-foreground bg-muted/20 px-3 py-2 rounded-md border border-border/30">
                <GitFork className="w-3.5 h-3.5 text-[#1793D1]" />
                <span>{t('article_forked_from')}</span>
                <Link to={`/article/${article.forked_from.slug}`} className="text-[#1793D1] hover:underline underline-offset-2">
                  {article.forked_from.title}
                </Link>
                <span>{t('article_forked_by')}</span>
                <Link to={`/user/${article.forked_from.author_username}`} className="text-[#1793D1] hover:underline underline-offset-2">
                  {article.forked_from.author_username}
                </Link>
              </div>
            )}

            {/* Language Fallback Notice */}
            {lang === 'en' && !article.content_markdown_en && !article.title_en && (
              <div data-testid="language-fallback-notice" className="flex items-center gap-2 mb-4 p-2.5 rounded-md border border-amber-500/20 bg-amber-500/5 text-xs font-mono text-amber-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {t('content_fallback_notice')}
              </div>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-mono">
              <Link to={`/user/${article.author_username}`} className="flex items-center gap-1.5 hover:text-[#1793D1] transition-colors">
                <UserAvatar username={article.author_username} size={24} />
                {article.author_username}
              </Link>
              {(article.collaborators || []).length > 0 && (
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#1793D1]" />
                  {article.collaborators.map(c => (
                    <Link key={c.user_id} to={`/user/${c.username}`} className="hover:text-[#1793D1] transition-colors">{c.username}</Link>
                  ))}
                </span>
              )}
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(article.created_at).toLocaleDateString()}</span>
              <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {article.view_count} {t('article_views')}</span>
            </div>

            {/* Tags */}
            {article.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {article.tags.map(tag => (
                  <Link key={tag} to={`/tutorials?tag=${tag}`} className="flex items-center gap-1 text-xs font-mono text-[#1793D1]/70 bg-[#1793D1]/5 px-2 py-1 rounded hover:bg-[#1793D1]/10 transition-colors">
                    <Tag className="w-3 h-3" /> {tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Edit button & Bookmark */}
            <div className="flex items-center gap-3 mt-4">
              {user && (
                <button
                  data-testid="bookmark-btn"
                  onClick={toggleBookmark}
                  className={`inline-flex items-center gap-1.5 text-sm transition-colors ${
                    bookmarked ? 'text-[#1793D1]' : 'text-muted-foreground hover:text-[#1793D1]'
                  }`}
                >
                  {bookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  {bookmarked ? t('bookmark_remove') : t('bookmark_add')}
                </button>
              )}
              {user && (user.id === article.author_id || user.role === 'admin' || (article.collaborators || []).some(c => c.user_id === user.id && c.can_edit)) && (
                <Link
                  to={`/editor/${article.id}`}
                  data-testid="edit-article-btn"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#1793D1] transition-colors"
                >
                  <Edit className="w-4 h-4" /> {t('article_edit')}
                </Link>
              )}
              {article.version > 1 && (
                <Link
                  to={`/versions/${article.id}`}
                  data-testid="version-history-link"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#1793D1] transition-colors"
                >
                  <GitBranch className="w-4 h-4" /> v{article.version}
                </Link>
              )}
              {user && (
                <button
                  data-testid="report-article-btn"
                  onClick={() => setShowReport(true)}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-amber-400 transition-colors"
                >
                  <Flag className="w-4 h-4" /> Report
                </button>
              )}
              {user && (
                <button
                  data-testid="fork-article-btn"
                  onClick={handleFork}
                  disabled={forking}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#1793D1] transition-colors disabled:opacity-50"
                >
                  <GitFork className="w-4 h-4" /> {forking ? t('misc_loading') : t('article_fork')}
                  {forksCount > 0 && <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{forksCount}</span>}
                </button>
              )}
              {user && (user.role === 'admin' || user.role === 'moderator') && (
                <button
                  data-testid="delete-article-btn"
                  onClick={async () => {
                    if (!window.confirm(t('mod_delete_content') + '?')) return;
                    try {
                      await axios.delete(`${API}/mod/articles/${article.id}`, { headers: authHeaders });
                      navigate('/tutorials');
                    } catch (err) { console.error(err); }
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> {t('mod_delete_content')}
                </button>
              )}
            </div>
          </div>

          {/* Vote + Content */}
          <div className="flex gap-4">
            <div className="hidden md:block pt-2 shrink-0">
              <div className="sticky top-24">
                <VoteButtons
                  score={article.vote_score}
                  userVote={article.user_vote || 0}
                  onVote={handleVote}
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <MarkdownRenderer content={displayContent} />
            </div>
          </div>

          {/* Mobile vote bar */}
          <div className="md:hidden mt-6 p-3 rounded-lg border border-border/50 bg-card flex items-center justify-center">
            <VoteButtons
              score={article.vote_score}
              userVote={article.user_vote || 0}
              onVote={handleVote}
              vertical={false}
            />
          </div>

          {/* Comments */}
          <CommentSection articleId={article.id} />

          {/* Linked Scripts */}
          {linkedScripts.length > 0 && (
            <div data-testid="article-linked-scripts" className="mt-10 pt-8 border-t border-border/40">
              <div className="flex items-center gap-2 mb-4">
                <Code2 className="w-4 h-4 text-[#1793D1]" />
                <h3 className="text-sm font-bold">{t('script_linked')}</h3>
              </div>
              <div className="space-y-2">
                {linkedScripts.map(s => (
                  <Link key={s.id} to={`/scripts/${s.id}`} className="group flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card hover:border-[#1793D1]/30 transition-all">
                    <div className="shrink-0 w-8 h-8 rounded-md bg-[#1793D1]/10 flex items-center justify-center">
                      <Code2 className="w-4 h-4 text-[#1793D1]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate group-hover:text-[#1793D1] transition-colors">{s.title}</div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground font-mono">
                        <span>{s.language}</span>
                        <span>{s.author_username}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Fork Network */}
          {forksCount > 0 && (
            <div data-testid="fork-network" className="mt-10 pt-8 border-t border-border/40">
              <div className="flex items-center gap-2 mb-4">
                <GitFork className="w-4 h-4 text-[#1793D1]" />
                <h3 className="text-sm font-bold">{t('fork_network')}</h3>
                <span className="text-xs font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                  {t('fork_network_count').replace('{count}', forksCount)}
                </span>
              </div>
              <div className="space-y-2">
                {forks.map(fork => (
                  <Link
                    key={fork.id}
                    to={`/article/${fork.slug}`}
                    data-testid={`fork-item-${fork.id}`}
                    className="group flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card hover:border-[#1793D1]/30 transition-all"
                  >
                    <div className="shrink-0 w-8 h-8 rounded-md bg-[#1793D1]/10 flex items-center justify-center">
                      <GitFork className="w-4 h-4 text-[#1793D1]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate group-hover:text-[#1793D1] transition-colors">{fork.title}</div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <Link to={`/user/${fork.author_username}`} className="font-mono hover:text-[#1793D1]" onClick={(e) => e.stopPropagation()}>
                          {fork.author_username}
                        </Link>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${fork.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {fork.status}
                        </span>
                        {fork.vote_score > 0 && <span>{fork.vote_score} {t('article_votes')}</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - TOC */}
        {toc.length > 2 && (
          <aside className="hidden xl:block w-64 shrink-0">
            <div className="sticky top-24">
              <h4 className="text-sm font-bold mb-3 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#1793D1]" />
                {t('article_toc')}
              </h4>
              <nav className="space-y-1 max-h-[calc(100vh-10rem)] overflow-y-auto">
                {toc.map((heading, i) => (
                  <a
                    key={i}
                    href={`#${heading.id}`}
                    data-testid={`toc-link-${heading.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const el = document.getElementById(heading.id);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={`block text-xs font-mono text-muted-foreground hover:text-[#1793D1] transition-colors truncate ${
                      heading.level === 2 ? 'pl-0' : heading.level === 3 ? 'pl-3' : ''
                    }`}
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        )}
      </div>

      {/* Report Modal */}
      {showReport && (
        <ReportModal
          targetType="article"
          targetId={article.id}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
