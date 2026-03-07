import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Code2, Globe, Lock, Unlock, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import TerminalHeader from '../components/TerminalHeader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CATEGORIES = ['utility', 'backup', 'package-management', 'maintenance', 'monitoring', 'networking', 'security', 'automation'];
const LANGUAGES = ['bash', 'python', 'fish', 'zsh', 'perl'];

export default function CreateScriptPage() {
  const { user, authHeaders } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('bash');
  const [category, setCategory] = useState('utility');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Multilingual & fork protection
  const [contentLanguage, setContentLanguage] = useState('de');
  const [titleEn, setTitleEn] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [showTranslation, setShowTranslation] = useState(false);
  const [forkable, setForkable] = useState(true);
  const isAdminOrMod = user?.role === 'admin' || user?.role === 'moderator';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/scripts`, {
        title, description, code, language, category,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        content_language: contentLanguage,
        title_en: showTranslation ? titleEn || null : null,
        description_en: showTranslation ? descriptionEn || null : null,
        forkable: isAdminOrMod ? forkable : true
      }, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      navigate(`/scripts/${res.data.id}`);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail === '2FA_REQUIRED' ? t('twofa_required_msg') : (detail || t('script_error_create')));
    }
    setLoading(false);
  };

  return (
    <div data-testid="create-script-page" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TerminalHeader command="vim /usr/share/archhub/new-script.sh" />
      <div className="flex items-center gap-3 mb-8">
        <Code2 className="w-6 h-6 text-[#1793D1]" />
        <h1 className="text-2xl font-extrabold tracking-tighter">{t('script_share_title')}</h1>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">{t('script_title_label')}</label>
            <input
              data-testid="script-title"
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={t('script_title_placeholder')}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
              required minLength={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('script_language')}</label>
              <select data-testid="script-language" value={language} onChange={(e) => setLanguage(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50">
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('script_category')}</label>
              <select data-testid="script-category" value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">{t('script_description_label')}</label>
          <textarea
            data-testid="script-description"
            value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder={t('script_description_placeholder')}
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
            required minLength={5}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">{t('script_code_label')}</label>
          <textarea
            data-testid="script-code"
            value={code} onChange={(e) => setCode(e.target.value)}
            placeholder="#!/bin/bash&#10;# Your script here..."
            rows={15}
            className="w-full px-4 py-3 rounded-md border border-input bg-[#0d0d1a] text-emerald-300 font-mono text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
            required minLength={5}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">{t('script_tags_label')}</label>
          <input
            data-testid="script-tags"
            type="text" value={tags} onChange={(e) => setTags(e.target.value)}
            placeholder={t('script_tags_placeholder')}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
          />
        </div>

        {/* Language & Translation Section */}
        <div className="rounded-lg border border-border/50 bg-card p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-[#1793D1]" /> {t('content_language_primary')}
              </label>
              <select
                data-testid="script-content-language"
                value={contentLanguage}
                onChange={(e) => setContentLanguage(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
              >
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="flex items-end">
              {!showTranslation ? (
                <button
                  type="button"
                  data-testid="script-add-translation-btn"
                  onClick={() => setShowTranslation(true)}
                  className="h-10 px-4 text-sm font-medium text-[#1793D1] border border-[#1793D1]/30 rounded-md hover:bg-[#1793D1]/5 transition-colors flex items-center gap-1.5"
                >
                  <Globe className="w-4 h-4" />
                  {contentLanguage === 'de' ? t('content_add_translation') : t('content_add_translation_de')}
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="script-remove-translation-btn"
                  onClick={() => { setShowTranslation(false); setTitleEn(''); setDescriptionEn(''); }}
                  className="h-10 px-4 text-sm font-medium text-red-400 border border-red-400/30 rounded-md hover:bg-red-400/5 transition-colors flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" /> {t('content_remove_translation')}
                </button>
              )}
            </div>
          </div>

          {showTranslation && (
            <div data-testid="script-translation-fields" className="space-y-3 p-4 rounded-lg border border-[#1793D1]/20 bg-[#1793D1]/5">
              <div className="text-xs font-mono text-[#1793D1] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                {contentLanguage === 'de' ? 'English Translation' : 'Deutsche Uebersetzung'}
              </div>
              <input
                data-testid="script-title-en"
                type="text" value={titleEn} onChange={(e) => setTitleEn(e.target.value)}
                placeholder={t('content_title_en')}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
              />
              <textarea
                data-testid="script-description-en"
                value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)}
                placeholder={t('content_description_en')}
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
              />
            </div>
          )}

          {/* Fork Protection (Admin/Mod only) */}
          {isAdminOrMod && (
            <div className="flex items-center justify-between pt-3 border-t border-border/30">
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5">
                  {forkable ? <Unlock className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-amber-400" />}
                  {t('content_forkable')}
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">{t('content_forkable_desc')}</p>
              </div>
              <button
                type="button"
                data-testid="script-forkable-toggle"
                onClick={() => setForkable(!forkable)}
                className={`relative w-10 h-5 rounded-full transition-colors ${forkable ? 'bg-emerald-500' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${forkable ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          )}
        </div>

        <button
          data-testid="submit-script-btn"
          type="submit" disabled={loading}
          className="h-10 px-6 rounded-sm bg-[#1793D1] text-white font-medium hover:bg-[#126A9A] transition-colors disabled:opacity-50 active:scale-95"
        >
          {loading ? t('misc_loading') : t('script_publish')}
        </button>
      </form>
    </div>
  );
}
