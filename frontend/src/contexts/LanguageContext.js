import React, { createContext, useContext, useState, useCallback } from 'react';
import translations from '../i18n/translations';
import { hasConsent } from '../components/CookieBanner';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    if (hasConsent('functional')) {
      const saved = localStorage.getItem('archhub_lang');
      if (saved) return saved;
    }
    const browserLang = navigator.language.slice(0, 2);
    return browserLang === 'de' ? 'de' : 'en';
  });

  const setLang = (l) => {
    setLangState(l);
    if (hasConsent('functional')) {
      localStorage.setItem('archhub_lang', l);
    }
  };

  const t = useCallback((key) => {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
