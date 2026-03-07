import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Copy, Check, Eye, Clock, Code2, Flag, Trash2, GitFork, History, Pencil, BookOpen, X, Save, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import VoteButtons from '../components/VoteButtons';
import ReportModal from '../components/ReportModal';
import UserAvatar from '../components/UserAvatar';
import TerminalHeader from '../components/TerminalHeader';
import ScriptPackageSidebar from '../components/ScriptPackageSidebar';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ScriptDetailPage() {
  const { scriptId } = useParams();
  const { user, authHeaders } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [script, setScript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [dangerConfirmed, setDangerConfirmed] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editLang, setEditLang] = useState('bash');
  const [editCategory, setEditCategory] = useState('utility');
  const [editTags, setEditTags] = useState('');
  const [editComment, setEditComment] = useState('');
  const [saving, setSaving] = useState(false);

  // Extra data
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const [forks, setForks] = useState([]);
  const [tutorials, setTutorials] = useState([]);
  const [forking, setForking] = useState(false);

  useEffect(() => { loadScript(); }, [scriptId]);

  const loadScript = async () => {
    try {
      const [sRes, vRes, fRes, tRes] = await Promise.all([
        axios.get(`${API}/scripts/${scriptId}`, { headers: authHeaders }),
        axios.get(`${API}/scripts/${scriptId}/versions`).catch(() => ({ data: [] })),
        axios.get(`${API}/scripts/${scriptId}/forks`).catch(() => ({ data: [] })),
        axios.get(`${API}/scripts/${scriptId}/tutorials`).catch(() => ({ data: [] })),
      ]);
      setScript(sRes.data);
      setVersions(vRes.data || []);
      setForks(fRes.data || []);
      setTutorials(tRes.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleVote = async (value) => {
    if (!user) { navigate('/login'); return; }
    try {
      const res = await axios.post(`${API}/scripts/${scriptId}/vote`, { value }, {
        headers: { ...authHeaders, 'Content-Type': 'application/json' }
      });
      setScript(prev => ({ ...prev, ...res.data }));
    } catch (err) { console.error(err); }
  };

  const handleCopy = async () => {
    if (!script) return;
    const hasWarnings = script.destructive_warnings?.length > 0;
    if (hasWarnings && !dangerConfirmed) {
      setDangerConfirmed(true);
      return;
    }
    navigator.clipboard.writeText(script.code);
    setCopied(true);
    setDangerConfirmed(false);
    setTimeout(() => setCopied(false), 2000);
    try {
      await axios.post(`${API}/scripts/${scriptId}/copy`);
      setScript(prev => ({ ...prev, copy_count: (prev.copy_count || 0) + 1 }));
    } catch {}
  };

  const startEdit = () => {
    setEditTitle(script.title);
    setEditDesc(script.description);
    setEditCode(script.code);
    setEditLang(script.language);
    setEditCategory(script.category);
    setEditTags(script.tags?.join(', ') || '');
    setEditComment('');
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/scripts/${scriptId}`, {
        title: editTitle, description: editDesc, code: editCode,
        language: editLang, category: editCategory,
        tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
        editor_comment: editComment
      }, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      setEditing(false);
      await loadScript();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const handleFork = async () => {
    if (!user) { navigate('/login'); return; }
    setForking(true);
    try {
      const res = await axios.post(`${API}/scripts/${scriptId}/fork`, {}, {
        headers: { ...authHeaders, 'Content-Type': 'application/json' }
      });
      navigate(`/scripts/${res.data.id}`);
    } catch (err) { console.error(err); }
    setForking(false);
  };

  const canEdit = user && script && (script.author_id === user.id || user.role === 'admin' || user.role === 'moderator');

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-8"><div className="animate-pulse space-y-4"><div className="h-8 bg-muted/30 rounded w-1/3" /><div className="h-96 bg-muted/10 rounded" /></div></div>;
  }

  if (!script) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-muted-foreground">{t('script_not_found')}</div>;
  }

  return (
    <div data-testid="script-detail-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TerminalHeader command={`cat /usr/share/archhub/scripts/${script.title?.toLowerCase().replace(/\s+/g,'-')}.sh`} />
      <Link to="/scripts" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t('nav_scripts')}
      </Link>

      <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0">

      {/* Forked-from notice */}
      {script.forked_from && (
        <div data-testid="script-forked-from" className="mb-4 p-2.5 rounded-md border border-[#1793D1]/20 bg-[#1793D1]/5 text-xs font-mono">
          <GitFork className="w-3 h-3 inline mr-1.5 text-[#1793D1]" />
          {t('script_forked_from')}{' '}
          <Link to={`/scripts/${script.forked_from.script_id}`} className="text-[#1793D1] hover:underline">
            {script.forked_from.title}
          </Link>
          {' '}{t('qa_asked_by').toLowerCase()} {script.forked_from.author_username}
        </div>
      )}

      {/* Language Fallback Notice */}
      {lang === 'en' && !script.title_en && !script.description_en && (
        <div data-testid="language-fallback-notice" className="flex items-center gap-2 mb-4 p-2.5 rounded-md border border-amber-500/20 bg-amber-500/5 text-xs font-mono text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {t('content_fallback_notice')}
        </div>
      )}

      {/* Editing mode */}
      {editing ? (
        <div data-testid="script-edit-form" className="space-y-4 mb-8">
          <div>
            <label className="block text-xs font-medium mb-1">{t('script_title_label')}</label>
            <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">{t('script_description_label')}</label>
            <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">{t('script_language')}</label>
              <select value={editLang} onChange={e => setEditLang(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                {['bash', 'python', 'zsh', 'fish', 'perl', 'ruby', 'javascript', 'c', 'rust', 'go'].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">{t('script_category')}</label>
              <select value={editCategory} onChange={e => setEditCategory(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                {['utility', 'system', 'network', 'security', 'automation', 'backup', 'development', 'monitoring', 'fun'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">{t('script_code_label')}</label>
            <textarea value={editCode} onChange={e => setEditCode(e.target.value)} rows={16} className="w-full px-3 py-2 rounded-md border border-input bg-[#0d0d1a] text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 text-foreground" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">{t('script_tags_label')}</label>
            <input type="text" value={editTags} onChange={e => setEditTags(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">{t('script_version_comment')}</label>
            <input type="text" value={editComment} onChange={e => setEditComment(e.target.value)} placeholder={t('script_version_comment_placeholder')} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
          </div>
          <div className="flex gap-2">
            <button data-testid="script-save-edit-btn" onClick={saveEdit} disabled={saving} className="flex items-center gap-1.5 h-9 px-5 rounded-md bg-[#1793D1] text-white text-xs font-medium hover:bg-[#126A9A] transition-colors disabled:opacity-50 active:scale-95">
              <Save className="w-3.5 h-3.5" /> {saving ? '...' : t('script_save_changes')}
            </button>
            <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 h-9 px-4 rounded-md border border-input text-xs font-medium hover:bg-accent transition-colors">
              <X className="w-3.5 h-3.5" /> {t('report_cancel')}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1793D1]/10 text-[#1793D1] border border-[#1793D1]/20">{script.language}</span>
              <span className="text-xs font-mono text-muted-foreground">{script.category}</span>
              {script.version > 1 && <span className="text-xs font-mono text-muted-foreground">v{script.version}</span>}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tighter mb-3">{(lang === 'en' && script.title_en) ? script.title_en : script.title}</h1>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">{(lang === 'en' && script.description_en) ? script.description_en : script.description}</p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-mono">
              <Link to={`/user/${script.author_username}`} className="hover:text-[#1793D1] transition-colors flex items-center gap-1.5">
                <UserAvatar username={script.author_username} size={22} />
                {script.author_username}
              </Link>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(script.created_at).toLocaleDateString()}</span>
              <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {script.view_count}</span>
              <span className="flex items-center gap-1"><Copy className="w-3.5 h-3.5" /> {script.copy_count}</span>
            </div>

            {script.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {script.tags.map(tag => (
                  <span key={tag} className="text-xs font-mono text-[#1793D1]/70 bg-[#1793D1]/5 px-2 py-1 rounded">#{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Voting + Code */}
          <div className="flex gap-4">
            <div className="shrink-0">
              <VoteButtons score={script.vote_score} userVote={script.user_vote || 0} onVote={handleVote} />
            </div>
            <div className="flex-1 min-w-0">
              {/* Destructive Command Warning */}
              {script.destructive_warnings?.length > 0 && (
                <div data-testid="destructive-warning-banner" className="mb-4 rounded-lg border-2 border-red-500/40 bg-red-500/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert className="w-5 h-5 text-red-400" />
                    <h3 className="text-sm font-bold text-red-400">{t('danger_warning_title')}</h3>
                  </div>
                  <p className="text-xs text-red-300/80 mb-3">{t('danger_warning_desc')}</p>
                  <div className="space-y-1.5">
                    {script.destructive_warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs font-mono bg-red-500/10 rounded px-3 py-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        <span className="text-red-300">
                          <span className="text-red-400/70">{t('danger_line')} {w.line}:</span> {w.description}
                          <span className="block text-red-400/50 mt-0.5">{w.matched}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-border/50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#1A1A2E] border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[#1793D1]" />
                    <span className="text-xs font-mono text-muted-foreground">{script.language}</span>
                  </div>
                  {script.destructive_warnings?.length > 0 && !dangerConfirmed ? (
                    <button data-testid="copy-script-btn" onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-mono bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/30">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {t('danger_copy_btn')}
                    </button>
                  ) : dangerConfirmed ? (
                    <button data-testid="copy-script-confirm-btn" onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-mono bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors border border-red-500/40 animate-pulse">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {t('danger_copy_confirm')}
                    </button>
                  ) : (
                    <button data-testid="copy-script-btn" onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-mono bg-[#1793D1]/10 text-[#1793D1] hover:bg-[#1793D1]/20 transition-colors">
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? t('script_copied') : t('script_copy')}
                    </button>
                  )}
                </div>
                <SyntaxHighlighter
                  language={script.language === 'bash' ? 'bash' : script.language}
                  style={atomDark}
                  customStyle={{ margin: 0, padding: '1.5rem', background: '#0d0d1a', fontSize: '0.875rem', borderRadius: 0 }}
                  showLineNumbers
                >
                  {script.code}
                </SyntaxHighlighter>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Actions Bar */}
      {!editing && (
        <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-border/30">
          {canEdit && (
            <button data-testid="edit-script-btn" onClick={startEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium border border-input hover:bg-accent transition-colors">
              <Pencil className="w-3 h-3" /> {t('script_edit')}
            </button>
          )}
          {user && (
            <button data-testid="fork-script-btn" onClick={handleFork} disabled={forking} className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium border border-[#1793D1]/30 text-[#1793D1] hover:bg-[#1793D1]/5 transition-colors disabled:opacity-50">
              <GitFork className="w-3 h-3" /> {forking ? '...' : t('script_fork')}
            </button>
          )}
          <button data-testid="script-versions-btn" onClick={() => setShowVersions(!showVersions)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors ${showVersions ? 'border-[#1793D1] bg-[#1793D1]/5 text-[#1793D1]' : 'border-input hover:bg-accent'}`}>
            <History className="w-3 h-3" /> {t('script_versions')} ({versions.length})
          </button>
          {user && (
            <button onClick={() => setShowReport(true)} className="text-xs text-muted-foreground hover:text-amber-400 flex items-center gap-1 transition-colors ml-auto">
              <Flag className="w-3 h-3" /> {t('report_submit')}
            </button>
          )}
          {user && (user.role === 'admin' || user.role === 'moderator') && (
            <button data-testid="delete-script-btn" onClick={async () => {
              if (!window.confirm(t('mod_delete_content') + '?')) return;
              try { await axios.delete(`${API}/mod/scripts/${script.id}`, { headers: authHeaders }); navigate('/scripts'); } catch {}
            }} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
              <Trash2 className="w-3 h-3" /> {t('mod_delete_content')}
            </button>
          )}
        </div>
      )}

      {/* Version History */}
      {showVersions && (
        <div data-testid="script-versions-panel" className="mt-6 rounded-lg border border-border/50 bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30 bg-muted/5">
            <h3 className="text-sm font-bold flex items-center gap-2"><History className="w-4 h-4 text-[#1793D1]" /> {t('script_versions')}</h3>
          </div>
          {versions.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">{t('script_no_versions')}</div>
          ) : (
            <div className="divide-y divide-border/20">
              {versions.map(v => (
                <div key={v.id} className="px-4 py-3 hover:bg-muted/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#1793D1]">v{v.version_number}</span>
                      {v.editor_comment && <span className="text-xs text-muted-foreground">{v.editor_comment}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">{new Date(v.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Forks */}
      {forks.length > 0 && (
        <div data-testid="script-forks-panel" className="mt-6 rounded-lg border border-border/50 bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30 bg-muted/5">
            <h3 className="text-sm font-bold flex items-center gap-2"><GitFork className="w-4 h-4 text-[#1793D1]" /> {t('script_forks')} ({forks.length})</h3>
          </div>
          <div className="divide-y divide-border/20">
            {forks.map(f => (
              <Link key={f.id} to={`/scripts/${f.id}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/5 transition-colors">
                <div className="flex items-center gap-2">
                  <UserAvatar username={f.author_username} size={18} />
                  <span className="text-sm font-medium hover:text-[#1793D1]">{f.title}</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">{f.author_username}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tutorials referencing this script */}
      {tutorials.length > 0 && (
        <div data-testid="script-tutorials-panel" className="mt-6 rounded-lg border border-border/50 bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30 bg-muted/5">
            <h3 className="text-sm font-bold flex items-center gap-2"><BookOpen className="w-4 h-4 text-[#1793D1]" /> {t('script_used_in_tutorials')}</h3>
          </div>
          <div className="divide-y divide-border/20">
            {tutorials.map(a => (
              <Link key={a.id} to={`/article/${a.slug}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/5 transition-colors">
                <span className="text-sm font-medium hover:text-[#1793D1]">{a.title}</span>
                <span className="text-xs text-muted-foreground font-mono">{a.author_username}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* Right Sidebar: Referenced Packages */}
      {!editing && script?.code && (
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-24">
            <ScriptPackageSidebar code={script.code} />
          </div>
        </aside>
      )}
      </div>

      {showReport && (
        <ReportModal targetType="script" targetId={script.id} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}
