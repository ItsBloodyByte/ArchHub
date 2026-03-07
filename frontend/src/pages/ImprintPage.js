import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Scale, Terminal, Edit, Save, Check, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import MarkdownRenderer from '../components/MarkdownRenderer';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ImprintPage() {
  const { t } = useLanguage();
  const { user, authHeaders } = useAuth();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    axios.get(`${API}/pages/imprint`)
      .then(res => {
        setPage(res.data);
        setEditContent(res.data.content_markdown);
        setEditTitle(res.data.title);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/pages/imprint`, {
        title: editTitle,
        content_markdown: editContent
      }, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      setPage(prev => ({ ...prev, title: editTitle, content_markdown: editContent, updated_by: user.username }));
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-64 bg-muted/20 rounded" />
          <div className="h-4 w-full bg-muted/15 rounded" />
          <div className="h-4 w-3/4 bg-muted/15 rounded" />
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <div data-testid="imprint-page" className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-2 mb-2 text-[#1793D1] font-mono text-sm">
          <Terminal className="w-4 h-4" />
          <span className="opacity-70">$</span>
          <span className="typing-animation">cat /etc/archhub/imprint.md</span>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Scale className="w-6 h-6 text-[#1793D1]" />
            <h1 data-testid="imprint-page-title" className="text-2xl sm:text-3xl font-extrabold tracking-tighter">
              {page?.title || t('imprint_title')}
            </h1>
          </div>
          {isAdmin && !editing && (
            <button
              data-testid="imprint-edit-btn"
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
            >
              <Edit className="w-3.5 h-3.5" /> {t('privacy_edit')}
            </button>
          )}
          {saved && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <Check className="w-3.5 h-3.5" /> {t('settings_saved')}
            </span>
          )}
        </div>

        {page?.updated_by && (
          <div className="text-xs text-muted-foreground mb-6 font-mono">
            {t('privacy_last_updated')}: {page.updated_by} &middot; {page.updated_at ? new Date(page.updated_at).toLocaleDateString() : ''}
          </div>
        )}

        {editing ? (
          <div data-testid="imprint-editor" className="space-y-4">
            <input
              data-testid="imprint-title-input"
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full h-10 px-4 rounded-md border border-input bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
            />
            <textarea
              data-testid="imprint-content-editor"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[500px] px-4 py-3 rounded-md border border-input bg-background font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 resize-y"
            />
            <div className="flex items-center gap-2">
              <button
                data-testid="imprint-save-btn"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 h-9 px-4 rounded-md bg-[#1793D1] text-white text-xs font-medium hover:bg-[#126A9A] transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" /> {saving ? t('misc_loading') : t('settings_save')}
              </button>
              <button
                data-testid="imprint-cancel-btn"
                onClick={() => { setEditing(false); setEditContent(page.content_markdown); setEditTitle(page.title); }}
                className="flex items-center gap-1.5 h-9 px-4 rounded-md border border-input text-xs font-medium hover:bg-accent transition-colors"
              >
                <X className="w-3.5 h-3.5" /> {t('privacy_cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border/50 bg-card p-6 md:p-8">
            <MarkdownRenderer content={page?.content_markdown || ''} />
          </div>
        )}
      </div>
    </div>
  );
}
