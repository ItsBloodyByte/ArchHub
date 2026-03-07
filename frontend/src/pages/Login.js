import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, User, Shield, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import TerminalHeader from '../components/TerminalHeader';

export default function Login() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needs2FA, setNeeds2FA] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(username, password, needs2FA ? totpCode : null);
      if (result?.requires_2fa) {
        setNeeds2FA(true);
        setLoading(false);
        return;
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div data-testid="login-page" className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <TerminalHeader command="ssh archhub@login" />
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold tracking-tighter mb-2">{t('auth_login_title')}</h1>
          <p className="text-sm text-muted-foreground">{t('auth_login_subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div data-testid="login-error" className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">{t('auth_username')}</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                data-testid="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1]"
                placeholder="archuser"
                required
                disabled={needs2FA}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t('auth_password')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                data-testid="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1]"
                placeholder="********"
                required
                disabled={needs2FA}
              />
            </div>
          </div>

          {needs2FA && (
            <div data-testid="login-2fa-section" className="p-4 rounded-md border border-[#1793D1]/30 bg-[#1793D1]/5">
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <KeyRound className="w-4 h-4 text-[#1793D1]" />
                {t('login_2fa_label')}
              </label>
              <input
                data-testid="login-2fa-code"
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-center font-mono tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1]"
                placeholder="000000"
                maxLength={6}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-2">{t('login_2fa_hint')}</p>
            </div>
          )}

          <button
            data-testid="login-submit"
            type="submit"
            disabled={loading || (needs2FA && totpCode.length !== 6)}
            className="w-full h-10 rounded-sm bg-[#1793D1] text-white font-medium hover:bg-[#126A9A] transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? t('misc_loading') : needs2FA ? t('login_2fa_verify') : t('auth_login_btn')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {t('auth_no_account')}{' '}
          <Link to="/register" className="text-[#1793D1] hover:underline underline-offset-4">{t('nav_register')}</Link>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3.5 h-3.5" />
          {t('auth_privacy_note')}
        </div>

      </div>
    </div>
  );
}
