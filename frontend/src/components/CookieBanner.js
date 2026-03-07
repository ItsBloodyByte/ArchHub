import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Cookie, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const CONSENT_KEY = 'archhub_cookie_consent';

function getConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function hasConsent(category) {
  const consent = getConsent();
  if (!consent) return false;
  if (category === 'essential') return true;
  return consent[category] === true;
}

export default function CookieBanner() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [prefs, setPrefs] = useState({
    essential: true,
    functional: true,
    analytics: false,
  });

  useEffect(() => {
    const consent = getConsent();
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = (consent) => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    setVisible(false);
  };

  const acceptAll = () => {
    saveConsent({ essential: true, functional: true, analytics: true, timestamp: new Date().toISOString() });
  };

  const acceptEssential = () => {
    saveConsent({ essential: true, functional: false, analytics: false, timestamp: new Date().toISOString() });
  };

  const acceptCustom = () => {
    saveConsent({ ...prefs, timestamp: new Date().toISOString() });
  };

  if (!visible) return null;

  const cookieTypes = [
    {
      key: 'essential',
      label: t('cookie_essential'),
      desc: t('cookie_essential_desc'),
      locked: true,
    },
    {
      key: 'functional',
      label: t('cookie_functional'),
      desc: t('cookie_functional_desc'),
      locked: false,
    },
    {
      key: 'analytics',
      label: t('cookie_analytics'),
      desc: t('cookie_analytics_desc'),
      locked: false,
    },
  ];

  return (
    <div data-testid="cookie-banner" className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto rounded-xl border border-border bg-card shadow-2xl shadow-black/40 overflow-hidden">
        {/* Header */}
        <div className="p-5 pb-3">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-lg bg-[#1793D1]/15 border border-[#1793D1]/25 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#1793D1]" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold">{t('cookie_title')}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t('cookie_text')}{' '}
                <Link to="/privacy" data-testid="cookie-privacy-link" className="text-[#1793D1] hover:underline underline-offset-2">
                  {t('cookie_privacy_link')}
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Details Toggle */}
        <div className="px-5">
          <button
            data-testid="cookie-details-toggle"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {t('cookie_details')}
          </button>
        </div>

        {/* Details Panel */}
        {showDetails && (
          <div data-testid="cookie-details-panel" className="mx-5 mt-2 p-3 rounded-lg border border-border/50 bg-muted/10 space-y-2.5">
            {cookieTypes.map(ct => (
              <div key={ct.key} className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">{ct.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{ct.desc}</div>
                </div>
                <button
                  data-testid={`cookie-toggle-${ct.key}`}
                  disabled={ct.locked}
                  onClick={() => !ct.locked && setPrefs(p => ({ ...p, [ct.key]: !p[ct.key] }))}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${
                    ct.locked ? 'bg-[#1793D1] cursor-not-allowed' : prefs[ct.key] ? 'bg-[#1793D1] cursor-pointer' : 'bg-muted-foreground/30 cursor-pointer'
                  }`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    (ct.locked || prefs[ct.key]) ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="p-5 pt-3 flex flex-col sm:flex-row gap-2">
          <button
            data-testid="cookie-accept-all"
            onClick={acceptAll}
            className="flex-1 h-9 rounded-md bg-[#1793D1] text-white text-xs font-medium hover:bg-[#126A9A] transition-colors active:scale-[0.98]"
          >
            {t('cookie_accept_all')}
          </button>
          {showDetails ? (
            <button
              data-testid="cookie-accept-custom"
              onClick={acceptCustom}
              className="flex-1 h-9 rounded-md border border-input text-xs font-medium hover:bg-accent transition-colors active:scale-[0.98]"
            >
              {t('cookie_save_prefs')}
            </button>
          ) : (
            <button
              data-testid="cookie-accept-essential"
              onClick={acceptEssential}
              className="flex-1 h-9 rounded-md border border-input text-xs font-medium hover:bg-accent transition-colors active:scale-[0.98]"
            >
              {t('cookie_essential_only')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
