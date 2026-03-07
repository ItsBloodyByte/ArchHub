import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Terminal, Heart } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Footer() {
  const { t, lang } = useLanguage();
  const [logo, setLogo] = useState(null);
  const [footer, setFooter] = useState(null);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_BASE}/site/design`).catch(() => ({ data: {} })),
      axios.get(`${API_BASE}/site/footer`).catch(() => ({ data: null })),
    ]).then(([dRes, fRes]) => {
      if (dRes.data?.logo_url) setLogo(dRes.data.logo_url);
      if (fRes.data) setFooter(fRes.data);
    });
  }, []);

  const copyrightText = footer
    ? (lang === 'en' ? footer.copyright_en : footer.copyright_de) || footer.copyright_de
    : '© 2026 ArchHub Contributors. Released under the AGPL v3.';

  return (
    <footer data-testid="main-footer" className="border-t border-border/40 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Branding */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-3">
              {logo && <img src={logo} alt="Logo" className="h-6 object-contain" />}
              <span className="font-bold tracking-tight font-mono">Arch<span className="text-[#1793D1]">Hub</span></span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('footer_description')}
            </p>
            <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground font-mono">
              <Terminal className="w-3 h-3" />
              <span>AGPL v3 Licensed</span>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-medium mb-3">{t('footer_platform')}</h4>
            <ul className="space-y-2">
              <li><Link to="/tutorials" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t('nav_tutorials')}</Link></li>
              <li><Link to="/questions" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t('nav_qa')}</Link></li>
              <li><Link to="/scripts" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t('footer_script_library')}</Link></li>
              <li><Link to="/packages" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t('nav_packages')}</Link></li>
              <li><Link to="/leaderboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t('home_leaderboard')}</Link></li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="text-sm font-medium mb-3">{t('footer_community')}</h4>
            <ul className="space-y-2">
              <li><Link to="/register" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t('nav_register')}</Link></li>
              <li><Link to="/contributors" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t('contributors_title')}</Link></li>
              <li><a href="https://wiki.archlinux.org" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Arch Wiki</a></li>
              <li><a href="https://archlinux.org" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">archlinux.org</a></li>
              <li><a href="https://aur.archlinux.org" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">AUR</a></li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="text-sm font-medium mb-3">{t('footer_legal')}</h4>
            <ul className="space-y-2">
              <li><Link to="/privacy" data-testid="footer-privacy-link" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t('footer_privacy_policy')}</Link></li>
              <li><Link to="/terms" data-testid="footer-terms-link" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t('footer_terms')}</Link></li>
              <li><Link to="/imprint" data-testid="footer-imprint-link" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t('footer_imprint')}</Link></li>
              <li className="text-xs text-muted-foreground">{t('footer_no_tracking')}</li>
              <li className="text-xs text-muted-foreground">{t('footer_no_ads')}</li>
            </ul>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="mt-10 pt-6 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div data-testid="footer-copyright" className="text-xs text-muted-foreground font-mono">
            <CopyrightLine text={copyrightText} />
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
            <span>{t('footer_built_with')}</span>
            <Heart className="w-3 h-3 text-[#1793D1]" />
            <span>{t('footer_built_by')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function CopyrightLine({ text }) {
  if (!text) return null;
  // Link "ArchHub Contributors" (or similar) to the contributors page
  const pattern = 'ArchHub Contributors';
  const idx = text.indexOf(pattern);
  if (idx === -1) return <span>{text}</span>;
  return (
    <>
      {text.slice(0, idx)}
      <Link to="/contributors" className="text-[#1793D1] hover:underline transition-colors">
        {pattern}
      </Link>
      {text.slice(idx + pattern.length)}
    </>
  );
}
