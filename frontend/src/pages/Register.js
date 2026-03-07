import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, User, Mail, Shield, CheckSquare, Square } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import TerminalHeader from '../components/TerminalHeader';

export default function Register() {
  const { register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [formLoadedAt] = useState(() => Date.now());
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (honeypot) return; // bot detected
    setLoading(true);
    try {
      await register(username, password, email, honeypot, formLoadedAt);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div data-testid="register-page" className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <TerminalHeader command="useradd --archhub" />
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold tracking-tighter mb-2">{t('auth_register_title')}</h1>
          <p className="text-sm text-muted-foreground">{t('auth_register_subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div data-testid="register-error" className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">{t('auth_username')}</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                data-testid="register-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1]"
                placeholder="your-pseudonym"
                required
                minLength={3}
                maxLength={30}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t('auth_password')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                data-testid="register-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1]"
                placeholder="********"
                required
                minLength={6}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t('auth_email')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                data-testid="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1]"
                placeholder="optional@mail.com"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('auth_email_hint')}</p>
          </div>

          {/* Honeypot - hidden anti-bot field */}
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          {/* Terms & Privacy Consent */}
          <div data-testid="register-terms-consent" className="flex items-start gap-3 p-3 rounded-md border border-border/50 bg-muted/5">
            <button
              type="button"
              data-testid="register-terms-checkbox"
              onClick={() => setTermsAccepted(!termsAccepted)}
              className="shrink-0 mt-0.5 text-[#1793D1] transition-transform active:scale-90"
            >
              {termsAccepted
                ? <CheckSquare className="w-5 h-5" />
                : <Square className="w-5 h-5 text-muted-foreground" />
              }
            </button>
            <label className="text-xs text-muted-foreground leading-relaxed cursor-pointer" onClick={() => setTermsAccepted(!termsAccepted)}>
              {t('auth_terms_agree_prefix')}{' '}
              <Link to="/terms" target="_blank" className="text-[#1793D1] hover:underline underline-offset-2">{t('footer_terms')}</Link>
              {' '}{t('auth_terms_agree_and')}{' '}
              <Link to="/privacy" target="_blank" className="text-[#1793D1] hover:underline underline-offset-2">{t('footer_privacy_policy')}</Link>
              {' '}{t('auth_terms_agree_suffix')}
            </label>
          </div>

          <button
            data-testid="register-submit"
            type="submit"
            disabled={loading || !termsAccepted}
            className="w-full h-10 rounded-sm bg-[#1793D1] text-white font-medium hover:bg-[#126A9A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {loading ? t('misc_loading') : t('auth_register_btn')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {t('auth_has_account')}{' '}
          <Link to="/login" className="text-[#1793D1] hover:underline underline-offset-4">{t('nav_login')}</Link>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3.5 h-3.5" />
          {t('auth_privacy_note')}
        </div>
      </div>
    </div>
  );
}
