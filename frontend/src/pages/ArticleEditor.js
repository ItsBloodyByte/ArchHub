import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Eye, PenLine, Columns, Terminal, FileText, Hash, AlignLeft, Code2, Search, X, Globe, Lock, Unlock, Users, UserPlus, Trash2, ImagePlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import MarkdownRenderer from '../components/MarkdownRenderer';
import MarkdownToolbar from '../components/MarkdownToolbar';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = ['general', 'tutorial', 'installation', 'package-management', 'system-administration', 'security', 'desktop', 'kernel', 'networking', 'scripting'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'expert'];

function EditorStats({ content }) {
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const chars = content.length;
  const lines = content ? content.split('\n').length : 0;
  const readMin = Math.max(1, Math.ceil(words / 200));

  return (
    <div data-testid="editor-stats" className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground py-1.5 px-2 border-t border-border/30 bg-muted/10">
      <span className="flex items-center gap-1"><AlignLeft className="w-3 h-3" />{words} words</span>
      <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{chars} chars</span>
      <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{lines} lines</span>
      <span>~{readMin} min read</span>
    </div>
  );
}

export default function ArticleEditor() {
  const { articleId } = useParams();
  const { user, authHeaders } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [difficulty, setDifficulty] = useState('beginner');
  const [tags, setTags] = useState('');
  const [summary, setSummary] = useState('');
  const [viewMode, setViewMode] = useState('write'); // write, preview, split
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isEditing = !!articleId;
  const contentRef = useRef(null);

  // Multilingual & fork protection
  const [contentLanguage, setContentLanguage] = useState('de');
  const [titleEn, setTitleEn] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [summaryEn, setSummaryEn] = useState('');
  const [showTranslation, setShowTranslation] = useState(false);
  const [forkable, setForkable] = useState(true);
  const isAdminOrMod = user?.role === 'admin' || user?.role === 'moderator';

  // Media upload
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${API}/media/upload`, formData, { headers: { ...authHeaders, 'Content-Type': 'multipart/form-data' } });
      const mdImage = `![${file.name}](${res.data.url})`;
      if (contentRef.current) {
        const ta = contentRef.current;
        const start = ta.selectionStart;
        const before = content.slice(0, start);
        const after = content.slice(ta.selectionEnd);
        setContent(before + mdImage + '\n' + after);
        setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + mdImage.length + 1; ta.focus(); }, 0);
      } else {
        setContent(prev => prev + '\n' + mdImage + '\n');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Collaboration
  const [collaborators, setCollaborators] = useState([]);
  const [newCollabName, setNewCollabName] = useState('');
  const [collabError, setCollabError] = useState('');
  const [newCollabPerms, setNewCollabPerms] = useState({ can_edit: true, can_publish: false, can_invite: false, can_delete: false });

  const loadCollaborators = useCallback(async () => {
    if (!articleId) return;
    try {
      const res = await axios.get(`${API}/articles/${articleId}/collaborators`, { headers: authHeaders });
      setCollaborators(res.data.collaborators || []);
    } catch (err) { /* ignore */ }
  }, [articleId, authHeaders]);

  const addCollaborator = async () => {
    if (!newCollabName.trim()) return;
    setCollabError('');
    try {
      await axios.post(`${API}/articles/${articleId}/collaborators`, { username: newCollabName.trim(), ...newCollabPerms }, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      setNewCollabName('');
      setNewCollabPerms({ can_edit: true, can_publish: false, can_invite: false, can_delete: false });
      loadCollaborators();
    } catch (err) { setCollabError(err.response?.data?.detail || 'Error'); }
  };

  const removeCollaborator = async (userId) => {
    try {
      await axios.delete(`${API}/articles/${articleId}/collaborators/${userId}`, { headers: authHeaders });
      loadCollaborators();
    } catch (err) { /* ignore */ }
  };

  const updateCollabPerms = async (userId, perms) => {
    try {
      await axios.put(`${API}/articles/${articleId}/collaborators/${userId}`, perms, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      loadCollaborators();
    } catch (err) { /* ignore */ }
  };

  // Script linking
  const [linkedScripts, setLinkedScripts] = useState([]);
  const [scriptSearch, setScriptSearch] = useState('');
  const [scriptResults, setScriptResults] = useState([]);
  const [scriptSearching, setScriptSearching] = useState(false);

  useEffect(() => {
    if (isEditing) {
      loadArticle();
      loadCollaborators();
    }
  }, [articleId]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      wrapSelection('**', '**');
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      wrapSelection('_', '_');
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      wrapSelection('[', '](url)');
    }
  }, [content]);

  const wrapSelection = (prefix, suffix) => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end) || 'text';
    const newContent = content.substring(0, start) + prefix + selected + suffix + content.substring(end);
    setContent(newContent);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  };

  // Check if user is trusted (can publish directly)
  const isTrusted = isAdminOrMod || (user?.badges || []).includes('trusted_voice');

  const loadArticle = async () => {
    try {
      // First try to load from published articles
      let article = null;
      let res = await axios.get(`${API}/articles`, { params: { limit: 50 }, headers: authHeaders });
      article = res.data.articles.find(a => a.id === articleId);
      
      // If not found in published, check user's drafts
      if (!article) {
        const draftsRes = await axios.get(`${API}/users/me/drafts`, { headers: authHeaders });
        article = draftsRes.data.articles?.find(a => a.id === articleId);
      }
      
      if (article) {
        setTitle(article.title);
        setCategory(article.category);
        setDifficulty(article.difficulty);
        setTags(article.tags?.join(', ') || '');
        setSummary(article.summary || '');
        setContentLanguage(article.language || 'de');
        setForkable(article.forkable !== false);
        if (article.title_en) {
          setTitleEn(article.title_en);
          setShowTranslation(true);
        }
        if (article.summary_en) setSummaryEn(article.summary_en);
        const detail = await axios.get(`${API}/articles/${article.slug}`, { headers: authHeaders });
        setContent(detail.data.content_markdown);
        if (detail.data.content_markdown_en) {
          setContentEn(detail.data.content_markdown_en);
          setShowTranslation(true);
        }
        // Load linked scripts info
        const scriptIds = article.referenced_scripts || detail.data.referenced_scripts || [];
        if (scriptIds.length > 0) {
          const scriptDocs = await Promise.all(
            scriptIds.map(sid => axios.get(`${API}/scripts/${sid}`, { headers: authHeaders }).then(r => r.data).catch(() => null))
          );
          setLinkedScripts(scriptDocs.filter(Boolean));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e, publishMode = 'published') => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = {
        title,
        content_markdown: content,
        category,
        difficulty,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        summary: summary || content.slice(0, 200),
        status: publishMode,
        referenced_scripts: linkedScripts.map(s => s.id),
        language: contentLanguage,
        title_en: showTranslation ? titleEn || null : null,
        content_markdown_en: showTranslation ? contentEn || null : null,
        summary_en: showTranslation ? summaryEn || null : null,
        forkable: isAdminOrMod ? forkable : true
      };

      if (isEditing) {
        await axios.put(`${API}/articles/${articleId}`, data, {
          headers: { ...authHeaders, 'Content-Type': 'application/json' }
        });
        navigate(publishMode === 'published' ? '/tutorials' : '/my-drafts');
      } else {
        const res = await axios.post(`${API}/articles`, data, {
          headers: { ...authHeaders, 'Content-Type': 'application/json' }
        });
        navigate(res.data.status === 'published' ? `/article/${res.data.slug}` : '/my-drafts');
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail === '2FA_REQUIRED') {
        setError(t('twofa_required_msg'));
      } else {
        setError(detail || 'Failed to save article');
      }
    }
    setLoading(false);
  };

  const renderEditor = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-0">
        <div className="flex-1">
          <MarkdownToolbar textareaRef={contentRef} value={content} onChange={setContent} />
        </div>
        <div className="flex items-center border border-l-0 border-input bg-background px-1">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          <button
            type="button"
            data-testid="image-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-[#1793D1] transition-colors disabled:opacity-50"
            title={t('editor_upload_image')}
          >
            <ImagePlus className="w-4 h-4" />
            {uploading && <span className="text-[10px] animate-pulse">...</span>}
          </button>
        </div>
      </div>
      <textarea
        ref={contentRef}
        data-testid="editor-content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`# ${t('editor_title')}\n\n${t('editor_preview_empty')}\n\nCtrl+B = ${t('editor_bold')}, Ctrl+I = ${t('editor_italic')}, Ctrl+K = ${t('editor_link')}`}
        className="w-full flex-1 min-h-[400px] px-4 py-3 border border-t-0 border-input bg-background font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1] resize-y"
        required
      />
      <EditorStats content={content} />
    </div>
  );

  const renderPreview = () => (
    <div className="min-h-[400px] p-6 border border-border bg-card overflow-y-auto">
      {content ? (
        <MarkdownRenderer content={content} />
      ) : (
        <p className="text-muted-foreground text-sm italic">{t('editor_preview_empty')}</p>
      )}
    </div>
  );

  return (
    <div data-testid="article-editor-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 text-[#1793D1] font-mono text-sm">
        <Terminal className="w-4 h-4" />
        <span className="opacity-70">$</span>
        <span className="typing-animation">vim {isEditing ? 'edit' : 'new'}-article.md</span>
      </div>
      <h1 className="text-2xl font-extrabold tracking-tighter mb-6">
        {isEditing ? t('editor_edit_title') : t('editor_create_title')}
      </h1>

      {error && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, 'published')}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main editor area */}
          <div className="lg:col-span-3 space-y-4">
            <input
              data-testid="editor-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('editor_title_placeholder')}
              className="w-full h-12 px-4 rounded-md border border-input bg-background text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1]"
              required
            />

            {/* Translation fields */}
            {showTranslation && (
              <div data-testid="translation-fields" className="space-y-3 p-4 rounded-lg border border-[#1793D1]/20 bg-[#1793D1]/5">
                <div className="flex items-center gap-2 text-xs font-mono text-[#1793D1]">
                  <Globe className="w-3.5 h-3.5" />
                  {contentLanguage === 'de' ? 'English Translation' : 'Deutsche Uebersetzung'}
                </div>
                <input
                  data-testid="editor-title-en"
                  type="text"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder={t('content_title_en')}
                  className="w-full h-10 px-4 rounded-md border border-input bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
                />
                <textarea
                  data-testid="editor-content-en"
                  value={contentEn}
                  onChange={(e) => setContentEn(e.target.value)}
                  placeholder={t('content_body_en')}
                  rows={8}
                  className="w-full px-4 py-3 rounded-md border border-input bg-background font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 resize-y"
                />
                <input
                  data-testid="editor-summary-en"
                  type="text"
                  value={summaryEn}
                  onChange={(e) => setSummaryEn(e.target.value)}
                  placeholder={t('content_summary_en')}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
                />
              </div>
            )}

            {/* View Mode Tabs */}
            <div className="flex items-center gap-1 border-b border-border">
              <button
                type="button"
                data-testid="editor-write-tab"
                onClick={() => setViewMode('write')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  viewMode === 'write' ? 'border-[#1793D1] text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <PenLine className="w-4 h-4" /> {t('editor_write')}
              </button>
              <button
                type="button"
                data-testid="editor-preview-tab"
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  viewMode === 'preview' ? 'border-[#1793D1] text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Eye className="w-4 h-4" /> {t('editor_preview')}
              </button>
              <button
                type="button"
                data-testid="editor-split-tab"
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  viewMode === 'split' ? 'border-[#1793D1] text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Columns className="w-4 h-4" /> Split
              </button>
            </div>

            {/* Editor Content */}
            {viewMode === 'write' && (
              <div className="rounded-md overflow-hidden">
                {renderEditor()}
              </div>
            )}

            {viewMode === 'preview' && (
              <div className="rounded-md overflow-hidden">
                {renderPreview()}
              </div>
            )}

            {viewMode === 'split' && (
              <div data-testid="editor-split-view" className="grid grid-cols-2 gap-3">
                <div className="rounded-md overflow-hidden">
                  {renderEditor()}
                </div>
                <div className="rounded-md overflow-hidden">
                  {renderPreview()}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar settings */}
          <div className="space-y-4">
            <div className="rounded-lg border border-border/50 bg-card p-4 space-y-4">
              {/* Language & Translation */}
              <div>
                <label className="block text-xs font-medium mb-1.5 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> {t('content_language_primary')}
                </label>
                <select
                  data-testid="editor-content-language"
                  value={contentLanguage}
                  onChange={(e) => setContentLanguage(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
                >
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                </select>
              </div>

              {!showTranslation ? (
                <button
                  type="button"
                  data-testid="add-translation-btn"
                  onClick={() => setShowTranslation(true)}
                  className="w-full h-8 text-xs font-medium text-[#1793D1] border border-[#1793D1]/30 rounded-md hover:bg-[#1793D1]/5 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {contentLanguage === 'de' ? t('content_add_translation') : t('content_add_translation_de')}
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="remove-translation-btn"
                  onClick={() => { setShowTranslation(false); setTitleEn(''); setContentEn(''); setSummaryEn(''); }}
                  className="w-full h-8 text-xs font-medium text-red-400 border border-red-400/30 rounded-md hover:bg-red-400/5 transition-colors flex items-center justify-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" /> {t('content_remove_translation')}
                </button>
              )}

              {/* Fork Protection (Admin/Mod only) */}
              {isAdminOrMod && (
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <div>
                    <label className="text-xs font-medium flex items-center gap-1">
                      {forkable ? <Unlock className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
                      {t('content_forkable')}
                    </label>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t('content_forkable_desc')}</p>
                  </div>
                  <button
                    type="button"
                    data-testid="forkable-toggle"
                    onClick={() => setForkable(!forkable)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${forkable ? 'bg-emerald-500' : 'bg-muted'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${forkable ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1.5">{t('editor_category')}</label>
                <select
                  data-testid="editor-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.replace(/-/g, ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">{t('editor_difficulty')}</label>
                <select
                  data-testid="editor-difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
                >
                  {DIFFICULTIES.map(d => (
                    <option key={d} value={d}>{t(`article_difficulty_${d}`)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">{t('editor_tags')}</label>
                <input
                  data-testid="editor-tags"
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder={t('editor_tags_placeholder')}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">{t('editor_summary')}</label>
                <textarea
                  data-testid="editor-summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder={t('editor_summary_placeholder')}
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 resize-none"
                />
              </div>
            </div>

            {/* Keyboard Shortcuts Info */}
            <div className="rounded-lg border border-border/50 bg-card p-4">
              <h4 className="text-xs font-bold mb-2 text-muted-foreground">{t('editor_shortcuts')}</h4>
              <div className="space-y-1 text-[10px] font-mono text-muted-foreground">
                <div className="flex justify-between"><span>Ctrl+B</span><span>{t('editor_bold')}</span></div>
                <div className="flex justify-between"><span>Ctrl+I</span><span>{t('editor_italic')}</span></div>
                <div className="flex justify-between"><span>Ctrl+K</span><span>{t('editor_link')}</span></div>
              </div>
            </div>

            {/* Collaboration Panel */}
            <div data-testid="collab-panel" className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
              <h4 className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground">
                <Users className="w-3.5 h-3.5 text-[#1793D1]" /> {t('collab_title')}
              </h4>

              {!isEditing ? (
                <p className="text-[10px] text-muted-foreground italic">{t('collab_save_first')}</p>
              ) : (
                <>
                  {/* Existing collaborators */}
                  {collaborators.length > 0 ? (
                    <div className="space-y-2">
                      {collaborators.map(c => (
                        <div key={c.user_id} data-testid={`collab-${c.username}`} className="p-2 rounded border border-border/30 bg-background/50">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-mono font-medium">{c.username}</span>
                            <button onClick={() => removeCollaborator(c.user_id)} className="text-red-400 hover:text-red-300 transition-colors" title={t('collab_remove')}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {['can_edit', 'can_publish', 'can_invite', 'can_delete'].map(perm => (
                              <button
                                key={perm}
                                data-testid={`collab-perm-${c.username}-${perm}`}
                                onClick={() => updateCollabPerms(c.user_id, { ...{ can_edit: c.can_edit, can_publish: c.can_publish, can_invite: c.can_invite, can_delete: c.can_delete }, [perm]: !c[perm] })}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${c[perm] ? 'bg-[#1793D1]/20 text-[#1793D1] border border-[#1793D1]/30' : 'bg-muted/30 text-muted-foreground border border-transparent'}`}
                              >
                                {t(`collab_${perm}`)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">{t('collab_empty')}</p>
                  )}

                  {/* Add collaborator */}
                  <div className="space-y-2">
                    <div className="flex gap-1.5">
                      <input
                        data-testid="collab-username-input"
                        type="text"
                        value={newCollabName}
                        onChange={(e) => { setNewCollabName(e.target.value); setCollabError(''); }}
                        placeholder={t('collab_add_placeholder')}
                        className="min-w-0 flex-1 h-7 px-2 rounded border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-[#1793D1]/50"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCollaborator())}
                      />
                      <button
                        data-testid="collab-add-btn"
                        type="button"
                        onClick={addCollaborator}
                        className="shrink-0 h-7 px-2 rounded bg-[#1793D1] text-white text-[10px] font-medium hover:bg-[#1793D1]/80 transition-colors flex items-center gap-1"
                      >
                        <UserPlus className="w-3 h-3" /> +
                      </button>
                    </div>
                    {newCollabName && (
                      <div className="flex flex-wrap gap-1">
                        {['can_edit', 'can_publish', 'can_invite', 'can_delete'].map(perm => (
                          <button
                            key={perm}
                            type="button"
                            onClick={() => setNewCollabPerms(p => ({ ...p, [perm]: !p[perm] }))}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${newCollabPerms[perm] ? 'bg-[#1793D1]/20 text-[#1793D1] border border-[#1793D1]/30' : 'bg-muted/30 text-muted-foreground border border-transparent'}`}
                          >
                            {t(`collab_${perm}`)}
                          </button>
                        ))}
                      </div>
                    )}
                    {collabError && <p className="text-[10px] text-red-400">{collabError}</p>}
                  </div>
                </>
              )}
            </div>

            {/* Script Linking Panel */}
            <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
              <h4 className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground"><Code2 className="w-3.5 h-3.5" /> {t('script_link_scripts')}</h4>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  data-testid="script-link-search"
                  type="text"
                  value={scriptSearch}
                  onChange={async (e) => {
                    const q = e.target.value;
                    setScriptSearch(q);
                    if (q.length >= 2) {
                      setScriptSearching(true);
                      try {
                        const res = await axios.get(`${API}/scripts/search/quick`, { params: { q } });
                        setScriptResults((res.data || []).filter(s => !linkedScripts.some(ls => ls.id === s.id)));
                      } catch {}
                      setScriptSearching(false);
                    } else {
                      setScriptResults([]);
                    }
                  }}
                  placeholder={t('script_link_search_placeholder')}
                  className="w-full h-8 pl-8 pr-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
                />
              </div>
              {scriptResults.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {scriptResults.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setLinkedScripts(prev => [...prev, s]);
                        setScriptResults(prev => prev.filter(r => r.id !== s.id));
                        setScriptSearch('');
                      }}
                      className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors flex items-center justify-between"
                    >
                      <span className="truncate font-medium">{s.title}</span>
                      <span className="text-[10px] text-muted-foreground font-mono ml-2 flex-shrink-0">{s.language}</span>
                    </button>
                  ))}
                </div>
              )}
              {linkedScripts.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-border/30">
                  <label className="text-[10px] text-muted-foreground font-medium">{t('script_linked')}</label>
                  {linkedScripts.map(s => (
                    <div key={s.id} className="flex items-center justify-between px-2 py-1 rounded bg-[#1793D1]/5 border border-[#1793D1]/10">
                      <span className="text-xs font-medium truncate">{s.title}</span>
                      <button type="button" onClick={() => setLinkedScripts(prev => prev.filter(ls => ls.id !== s.id))} className="p-0.5 rounded hover:bg-muted/50 transition-colors flex-shrink-0">
                        <X className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              data-testid="editor-publish"
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-md bg-[#1793D1] text-white font-medium hover:bg-[#126A9A] transition-colors disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? t('misc_loading') : t('editor_publish')}
            </button>
            <p className={`text-[10px] text-center mt-1 ${isTrusted ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isTrusted ? t('editor_publish_note_trusted') : t('editor_publish_note_review')}
            </p>
            <button
              data-testid="editor-save-draft"
              type="button"
              disabled={loading}
              onClick={(e) => handleSubmit(e, 'draft')}
              className="w-full h-10 rounded-md border border-input text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50 active:scale-[0.98]"
            >
              {t('editor_save_draft')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
