import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { HelpCircle, Globe, X, Cpu, Monitor, Server, Bug } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import MarkdownRenderer from '../components/MarkdownRenderer';
import TerminalHeader from '../components/TerminalHeader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AskQuestionPage() {
  const { authHeaders } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isBugReport = searchParams.get('bug') === 'true';
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState(isBugReport ? 'archhub-bug' : '');
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Multilingual
  const [contentLanguage, setContentLanguage] = useState('de');
  const [titleEn, setTitleEn] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [showTranslation, setShowTranslation] = useState(false);

  // System Metadata
  const [kernelVersion, setKernelVersion] = useState('');
  const [gpuVendor, setGpuVendor] = useState('');
  const [cpuVendor, setCpuVendor] = useState('');
  const [desktopEnv, setDesktopEnv] = useState('');
  const [initSystem, setInitSystem] = useState('');

  const GPU_OPTIONS = ['', 'NVIDIA', 'AMD', 'Intel', 'AMD + NVIDIA', 'Intel + NVIDIA', 'Other'];
  const CPU_OPTIONS = ['', 'AMD', 'Intel', 'ARM', 'Other'];
  const DE_OPTIONS = ['', 'KDE Plasma', 'GNOME', 'Hyprland', 'Sway', 'i3', 'bspwm', 'dwm', 'Xfce', 'Cinnamon', 'MATE', 'Budgie', 'Openbox', 'Awesome', 'Wayfire', 'TTY / None', 'Other'];
  const INIT_OPTIONS = ['', 'systemd', 'openrc', 'runit', 'dinit', 'Other'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/questions`, {
        title,
        body_markdown: body,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        language: contentLanguage,
        title_en: showTranslation ? titleEn || null : null,
        body_markdown_en: showTranslation ? bodyEn || null : null,
        kernel_version: kernelVersion || null,
        gpu_vendor: gpuVendor || null,
        cpu_vendor: cpuVendor || null,
        desktop_environment: desktopEnv || null,
        init_system: initSystem || null,
      }, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      navigate(`/questions/${res.data.id}`);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail === '2FA_REQUIRED' ? t('twofa_required_msg') : (detail || t('qa_error_create')));
    }
    setLoading(false);
  };

  return (
    <div data-testid="ask-question-page" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TerminalHeader command={isBugReport ? "nano /etc/archhub/bug-report" : "nano /etc/archhub/new-question"} />
      <div className="flex items-center gap-3 mb-4">
        {isBugReport ? <Bug className="w-6 h-6 text-red-400" /> : <HelpCircle className="w-6 h-6 text-[#1793D1]" />}
        <h1 className="text-2xl font-extrabold tracking-tighter">{isBugReport ? t('bug_report_btn') : t('qa_ask_title')}</h1>
      </div>
      {isBugReport && (
        <div data-testid="bug-report-notice" className="mb-6 p-3 rounded-lg border-2 border-red-500/30 bg-red-500/5 text-sm text-red-300 flex items-start gap-2">
          <Bug className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <span>{t('bug_report_subtitle')}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1.5">{t('qa_title_label')}</label>
          <input
            data-testid="question-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('qa_title_placeholder')}
            className="w-full h-11 px-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1]"
            required
            minLength={5}
          />
        </div>

        {/* Language & Translation */}
        <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#1793D1]" />
              <label className="text-sm font-medium">{t('content_language_primary')}</label>
              <select
                data-testid="question-content-language"
                value={contentLanguage}
                onChange={(e) => setContentLanguage(e.target.value)}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
              >
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </div>
            {!showTranslation ? (
              <button
                type="button"
                data-testid="question-add-translation-btn"
                onClick={() => setShowTranslation(true)}
                className="h-9 px-3 text-sm font-medium text-[#1793D1] border border-[#1793D1]/30 rounded-md hover:bg-[#1793D1]/5 transition-colors flex items-center gap-1.5"
              >
                <Globe className="w-3.5 h-3.5" />
                {contentLanguage === 'de' ? t('content_add_translation') : t('content_add_translation_de')}
              </button>
            ) : (
              <button
                type="button"
                data-testid="question-remove-translation-btn"
                onClick={() => { setShowTranslation(false); setTitleEn(''); setBodyEn(''); }}
                className="h-9 px-3 text-sm font-medium text-red-400 border border-red-400/30 rounded-md hover:bg-red-400/5 transition-colors flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> {t('content_remove_translation')}
              </button>
            )}
          </div>

          {showTranslation && (
            <div data-testid="question-translation-fields" className="space-y-3 p-4 rounded-lg border border-[#1793D1]/20 bg-[#1793D1]/5">
              <div className="text-xs font-mono text-[#1793D1] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                {contentLanguage === 'de' ? 'English Translation' : 'Deutsche Uebersetzung'}
              </div>
              <input
                data-testid="question-title-en"
                type="text" value={titleEn} onChange={(e) => setTitleEn(e.target.value)}
                placeholder={t('content_title_en')}
                className="w-full h-10 px-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
              />
              <textarea
                data-testid="question-body-en"
                value={bodyEn} onChange={(e) => setBodyEn(e.target.value)}
                placeholder={t('content_body_en')}
                rows={6}
                className="w-full px-4 py-3 rounded-md border border-input bg-background font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 resize-y"
              />
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-1 border-b border-border mb-0">
            <button type="button" onClick={() => setPreview(false)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${!preview ? 'border-[#1793D1] text-foreground' : 'border-transparent text-muted-foreground'}`}>
              {t('qa_write')}
            </button>
            <button type="button" onClick={() => setPreview(true)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${preview ? 'border-[#1793D1] text-foreground' : 'border-transparent text-muted-foreground'}`}>
              {t('qa_preview')}
            </button>
          </div>
          {preview ? (
            <div className="min-h-[250px] p-6 rounded-b-md border border-t-0 border-border bg-card">
              <MarkdownRenderer content={body} />
            </div>
          ) : (
            <textarea
              data-testid="question-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('qa_body_placeholder')}
              rows={10}
              className="w-full px-4 py-3 rounded-b-md border border-t-0 border-input bg-background font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 resize-y"
              required
              minLength={10}
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">{t('qa_tags_label')}</label>
          <input
            data-testid="question-tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder={t('qa_tags_placeholder')}
            className="w-full h-10 px-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
          />
          <p className="text-xs text-muted-foreground mt-1">{t('qa_tags_hint')}</p>
        </div>

        {/* System Metadata */}
        <div data-testid="system-metadata-section" className="rounded-lg border border-border/50 bg-card p-4 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Monitor className="w-4 h-4 text-[#1793D1]" />
            <h3 className="text-sm font-bold">{t('qa_system_info')}</h3>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">{t('qa_system_info_desc')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">{t('qa_kernel')}</label>
              <input
                data-testid="question-kernel"
                type="text" value={kernelVersion} onChange={e => setKernelVersion(e.target.value)}
                placeholder={t('qa_kernel_placeholder')}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">{t('qa_gpu')}</label>
              <select data-testid="question-gpu" value={gpuVendor} onChange={e => setGpuVendor(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50">
                {GPU_OPTIONS.map(o => <option key={o} value={o}>{o || '—'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">{t('qa_cpu')}</label>
              <select data-testid="question-cpu" value={cpuVendor} onChange={e => setCpuVendor(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50">
                {CPU_OPTIONS.map(o => <option key={o} value={o}>{o || '—'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">{t('qa_desktop_env')}</label>
              <select data-testid="question-desktop-env" value={desktopEnv} onChange={e => setDesktopEnv(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50">
                {DE_OPTIONS.map(o => <option key={o} value={o}>{o || '—'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">{t('qa_init_system')}</label>
              <select data-testid="question-init-system" value={initSystem} onChange={e => setInitSystem(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50">
                {INIT_OPTIONS.map(o => <option key={o} value={o}>{o || '—'}</option>)}
              </select>
            </div>
          </div>
        </div>

        <button
          data-testid="submit-question-btn"
          type="submit"
          disabled={loading}
          className="h-10 px-6 rounded-sm bg-[#1793D1] text-white font-medium hover:bg-[#126A9A] transition-colors disabled:opacity-50 active:scale-95"
        >
          {loading ? t('misc_loading') : t('qa_submit')}
        </button>
      </form>
    </div>
  );
}
