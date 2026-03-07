import React, { useState, useEffect, useCallback } from 'react';
import { Sun, Moon, Monitor, User, Bell, Save, Check, Terminal, Shield, Download, Lock, AlertTriangle, KeyRound, QrCode, ShieldCheck, ShieldOff, Mail, Smartphone, LogOut, Trash2, RefreshCw, Eye, EyeOff, Github, Globe, ExternalLink } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ─── Tab Navigation ───
function SettingsTabs({ activeTab, setActiveTab, t, isLoggedIn }) {
  const tabs = [
    { id: 'profile', label: t('settings_tab_profile'), icon: User },
    { id: 'security', label: t('settings_tab_security'), icon: Shield },
    { id: 'notifications', label: t('settings_tab_notifications'), icon: Bell },
    { id: 'privacy', label: t('settings_tab_privacy'), icon: Lock },
  ];
  return (
    <div data-testid="settings-tabs" className="flex gap-1 mb-8 p-1 rounded-lg bg-muted/30 border border-border/30 overflow-x-auto">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const disabled = tab.id !== 'profile' && !isLoggedIn;
        return (
          <button
            key={tab.id}
            data-testid={`settings-tab-${tab.id}`}
            onClick={() => !disabled && setActiveTab(tab.id)}
            disabled={disabled}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#1793D1]/10 text-[#1793D1] border border-[#1793D1]/30'
                : disabled
                  ? 'text-muted-foreground/40 cursor-not-allowed'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Profile Tab ───
function ProfileTab({ user, authHeaders, t, theme, setTheme, lang, setLang }) {
  const [bio, setBio] = useState(user?.bio || '');
  const [email, setEmail] = useState(user?.email || '');
  const [socialLinks, setSocialLinks] = useState(user?.social_links || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) { setBio(user.bio || ''); setEmail(user.email || ''); setSocialLinks(user.social_links || {}); }
  }, [user]);

  const saveProfile = async () => {
    setSaving(true); setSaved(false);
    try {
      await axios.put(`${API}/auth/profile`, { bio, email: email || null, social_links: socialLinks }, { headers: authHeaders });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const updateLink = (key, value) => setSocialLinks(prev => ({ ...prev, [key]: value }));

  const socialFields = [
    { key: 'github', label: 'GitHub', placeholder: 'username', prefix: 'github.com/' },
    { key: 'gitlab', label: 'GitLab', placeholder: 'username', prefix: 'gitlab.com/' },
    { key: 'reddit', label: 'Reddit', placeholder: 'u/username', prefix: 'reddit.com/' },
    { key: 'xing', label: 'Xing', placeholder: 'profile-url', prefix: 'xing.com/profile/' },
    { key: 'mastodon', label: 'Mastodon', placeholder: '@user@instance.social', prefix: '' },
    { key: 'arch_wiki', label: 'Arch Wiki/Forum', placeholder: 'username', prefix: '' },
    { key: 'website', label: t('social_website'), placeholder: 'https://...', prefix: '' },
  ];

  const themes = [
    { value: 'dark', label: t('settings_theme_dark'), icon: Moon },
    { value: 'light', label: t('settings_theme_light'), icon: Sun },
    { value: 'system', label: t('settings_theme_system'), icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      {user && (
        <div data-testid="settings-profile-section" className="rounded-lg border border-border/50 bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-[#1793D1]" />
            <h2 className="text-sm font-bold">{t('settings_profile')}</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5">{t('profile_bio')}</label>
              <textarea
                data-testid="settings-bio"
                value={bio} onChange={(e) => setBio(e.target.value)}
                placeholder={t('settings_bio_placeholder')}
                className="w-full h-24 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1]"
                maxLength={500}
              />
              <div className="text-right text-[10px] text-muted-foreground mt-0.5">{bio.length}/500</div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">{t('auth_email')}</label>
              <input
                data-testid="settings-email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('settings_email_placeholder')}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1]"
              />
              <p className="text-[10px] text-muted-foreground mt-1">{t('auth_email_hint')}</p>
            </div>
            {/* Social Links */}
            <div className="pt-2 border-t border-border/30">
              <div className="flex items-center gap-2 mb-3">
                <ExternalLink className="w-3.5 h-3.5 text-[#1793D1]" />
                <label className="text-xs font-bold">{t('social_links_title')}</label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {socialFields.map(f => (
                  <div key={f.key}>
                    <label className="block text-[10px] font-medium text-muted-foreground mb-1">{f.label}</label>
                    <div className="relative">
                      {f.prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/50 font-mono">{f.prefix}</span>}
                      <input
                        data-testid={`social-${f.key}`}
                        type="text"
                        value={socialLinks[f.key] || ''}
                        onChange={(e) => updateLink(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        className={`w-full h-8 rounded-md border border-input bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1] ${f.prefix ? 'pl-[' + (f.prefix.length * 5.5 + 16) + 'px]' : 'px-3'}`}
                        style={f.prefix ? { paddingLeft: `${f.prefix.length * 6.5 + 16}px` } : {}}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button data-testid="settings-save-profile" onClick={saveProfile} disabled={saving}
              className="flex items-center gap-1.5 h-8 px-4 rounded-md bg-[#1793D1] text-white text-xs font-medium hover:bg-[#126A9A] transition-colors active:scale-95 disabled:opacity-50">
              {saved ? <><Check className="w-3.5 h-3.5" /> {t('settings_saved')}</> : <><Save className="w-3.5 h-3.5" /> {t('settings_save')}</>}
            </button>
          </div>
        </div>
      )}

      {/* Theme */}
      <div className="rounded-lg border border-border/50 bg-card p-5">
        <h2 className="text-sm font-bold mb-4">{t('settings_theme')}</h2>
        <div className="grid grid-cols-3 gap-3">
          {themes.map(({ value, label, icon: Icon }) => (
            <button key={value} data-testid={`theme-${value}`} onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                theme === value ? 'border-[#1793D1] bg-[#1793D1]/5 text-[#1793D1]' : 'border-border hover:border-border/80 text-muted-foreground hover:text-foreground'
              }`}>
              <Icon className="w-5 h-5" /><span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="rounded-lg border border-border/50 bg-card p-5">
        <h2 className="text-sm font-bold mb-4">{t('settings_language')}</h2>
        <div className="grid grid-cols-2 gap-3">
          {[{ code: 'en', label: 'English' }, { code: 'de', label: 'Deutsch' }].map(l => (
            <button key={l.code} data-testid={`lang-${l.code}`} onClick={() => setLang(l.code)}
              className={`flex items-center justify-center gap-2 p-4 rounded-lg border transition-all ${
                lang === l.code ? 'border-[#1793D1] bg-[#1793D1]/5 text-[#1793D1]' : 'border-border hover:border-border/80 text-muted-foreground hover:text-foreground'
              }`}>
              <span className="text-lg">{l.code.toUpperCase()}</span>
              <span className="text-sm font-medium">{l.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Security Tab ───
function SecurityTab({ user, authHeaders, t, onLogout }) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const [newUsername, setNewUsername] = useState('');
  const [usernamePw, setUsernamePw] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const [twoFASetup, setTwoFASetup] = useState(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAError, setTwoFAError] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await axios.get(`${API}/auth/sessions`, { headers: authHeaders });
      setSessions(res.data);
    } catch { setSessions([]); }
    setSessionsLoading(false);
  }, [authHeaders]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const changePassword = async () => {
    setPwError(''); setPwSuccess(false);
    if (newPw !== confirmPw) { setPwError(t('settings_password_mismatch')); return; }
    setPwLoading(true);
    try {
      await axios.put(`${API}/auth/change-password`, { current_password: currentPw, new_password: newPw }, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      setPwSuccess(true); setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err) { setPwError(err.response?.data?.detail || 'Error'); }
    setPwLoading(false);
  };

  const changeUsername = async () => {
    setUsernameError(''); setUsernameSuccess('');
    setUsernameLoading(true);
    try {
      const res = await axios.put(`${API}/auth/change-username`, { new_username: newUsername, password: usernamePw }, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      setUsernameSuccess(res.data.new_username);
      setNewUsername(''); setUsernamePw('');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) { setUsernameError(err.response?.data?.detail || 'Error'); }
    setUsernameLoading(false);
  };

  const revokeSession = async (sid) => {
    try {
      await axios.delete(`${API}/auth/sessions/${sid}`, { headers: authHeaders });
      setSessions(prev => prev.filter(s => s.id !== sid));
    } catch {}
  };

  const revokeAllSessions = async () => {
    try {
      await axios.delete(`${API}/auth/sessions`, { headers: authHeaders });
      loadSessions();
    } catch {}
  };

  const start2FASetup = async () => {
    setTwoFAError('');
    try {
      const res = await axios.post(`${API}/auth/2fa/setup`, {}, { headers: authHeaders });
      setTwoFASetup(res.data);
    } catch (err) { setTwoFAError(err.response?.data?.detail || 'Error'); }
  };

  const enable2FA = async () => {
    if (!twoFACode) return;
    setTwoFALoading(true); setTwoFAError('');
    try {
      await axios.post(`${API}/auth/2fa/enable`, { code: twoFACode }, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      setTwoFASetup(null); setTwoFACode(''); window.location.reload();
    } catch (err) { setTwoFAError(err.response?.data?.detail || 'Invalid code'); }
    setTwoFALoading(false);
  };

  const disable2FA = async () => {
    if (!disableCode) return;
    setDisableLoading(true); setTwoFAError('');
    try {
      await axios.post(`${API}/auth/2fa/disable`, { code: disableCode }, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      setDisableCode(''); window.location.reload();
    } catch (err) { setTwoFAError(err.response?.data?.detail || 'Invalid code'); }
    setDisableLoading(false);
  };

  const parseUA = (ua) => {
    if (!ua) return 'Unknown';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('curl')) return 'curl (CLI)';
    return ua.substring(0, 40);
  };

  return (
    <div className="space-y-6">
      {/* 2FA */}
      <div data-testid="settings-2fa-section" className="rounded-lg border border-border/50 bg-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="w-4 h-4 text-[#1793D1]" />
          <h2 className="text-sm font-bold">{t('twofa_title')}</h2>
          {user.totp_enabled ? (
            <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> {t('twofa_active')}
            </span>
          ) : (
            <span className="ml-auto flex items-center gap-1 text-xs text-amber-400 font-medium">
              <ShieldOff className="w-3.5 h-3.5" /> {t('twofa_inactive')}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4">{t('twofa_desc')}</p>
        {!user.totp_enabled && !twoFASetup && (
          <button data-testid="2fa-setup-btn" onClick={start2FASetup}
            className="flex items-center gap-1.5 h-8 px-4 rounded-md bg-[#1793D1] text-white text-xs font-medium hover:bg-[#126A9A] transition-colors active:scale-95">
            <QrCode className="w-3.5 h-3.5" /> {t('twofa_setup_btn')}
          </button>
        )}
        {twoFASetup && (
          <div data-testid="2fa-qr-section" className="space-y-3">
            <div className="flex justify-center p-3 bg-white rounded-md w-fit mx-auto">
              <img src={twoFASetup.qr_code} alt="2FA QR Code" className="w-40 h-40" />
            </div>
            <p className="text-xs text-center text-muted-foreground">{t('twofa_scan_qr')}</p>
            <div className="text-xs font-mono text-center p-2 rounded bg-muted/30 break-all">{twoFASetup.secret}</div>
            <div className="flex items-center gap-2">
              <input data-testid="2fa-verify-input" type="text" value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456" maxLength={6}
                className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm text-center font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
                onKeyDown={(e) => e.key === 'Enter' && enable2FA()} />
              <button data-testid="2fa-verify-btn" onClick={enable2FA} disabled={twoFALoading || twoFACode.length !== 6}
                className="h-9 px-4 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50">
                {twoFALoading ? '...' : t('twofa_verify_btn')}
              </button>
            </div>
          </div>
        )}
        {user.totp_enabled && (
          <div data-testid="2fa-disable-section" className="space-y-2">
            <label className="block text-xs font-medium">{t('twofa_disable_label')}</label>
            <div className="flex items-center gap-2">
              <input data-testid="2fa-disable-input" type="text" value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456" maxLength={6}
                className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm text-center font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
                onKeyDown={(e) => e.key === 'Enter' && disable2FA()} />
              <button data-testid="2fa-disable-btn" onClick={disable2FA} disabled={disableLoading || disableCode.length !== 6}
                className="h-9 px-4 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50">
                {disableLoading ? '...' : t('twofa_disable_btn')}
              </button>
            </div>
          </div>
        )}
        {twoFAError && <p className="text-xs text-red-400 mt-2">{twoFAError}</p>}
      </div>

      {/* Change Password */}
      <div data-testid="settings-change-password" className="rounded-lg border border-border/50 bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-[#1793D1]" />
          <h2 className="text-sm font-bold">{t('settings_change_password')}</h2>
        </div>
        <div className="space-y-3">
          <div className="relative">
            <input data-testid="current-password-input" type={showCurrentPw ? 'text' : 'password'} value={currentPw}
              onChange={e => setCurrentPw(e.target.value)} placeholder={t('settings_current_password')}
              className="w-full h-9 px-3 pr-9 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1]" />
            <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="relative">
            <input data-testid="new-password-input" type={showNewPw ? 'text' : 'password'} value={newPw}
              onChange={e => setNewPw(e.target.value)} placeholder={t('settings_new_password')}
              className="w-full h-9 px-3 pr-9 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1]" />
            <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <input data-testid="confirm-password-input" type="password" value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)} placeholder={t('settings_confirm_new_password')}
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1]" />
          {pwError && <p data-testid="password-error" className="text-xs text-red-400">{pwError}</p>}
          {pwSuccess && <p data-testid="password-success" className="text-xs text-emerald-400">{t('settings_password_changed')}</p>}
          <button data-testid="change-password-btn" onClick={changePassword}
            disabled={pwLoading || !currentPw || !newPw || !confirmPw}
            className="flex items-center gap-1.5 h-8 px-4 rounded-md bg-[#1793D1] text-white text-xs font-medium hover:bg-[#126A9A] transition-colors active:scale-95 disabled:opacity-50">
            {pwLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
            {t('settings_change_password')}
          </button>
        </div>
      </div>

      {/* Change Username */}
      <div data-testid="settings-change-username" className="rounded-lg border border-border/50 bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-[#1793D1]" />
          <h2 className="text-sm font-bold">{t('settings_change_username')}</h2>
        </div>
        <div className="space-y-3">
          <input data-testid="new-username-input" type="text" value={newUsername}
            onChange={e => setNewUsername(e.target.value)} placeholder={t('settings_new_username')}
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1]" />
          <input data-testid="username-password-input" type="password" value={usernamePw}
            onChange={e => setUsernamePw(e.target.value)} placeholder={t('settings_confirm_password')}
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1]" />
          {usernameError && <p data-testid="username-error" className="text-xs text-red-400">{usernameError}</p>}
          {usernameSuccess && <p data-testid="username-success" className="text-xs text-emerald-400">{t('settings_username_changed')} → {usernameSuccess}</p>}
          <button data-testid="change-username-btn" onClick={changeUsername}
            disabled={usernameLoading || !newUsername || !usernamePw}
            className="flex items-center gap-1.5 h-8 px-4 rounded-md bg-[#1793D1] text-white text-xs font-medium hover:bg-[#126A9A] transition-colors active:scale-95 disabled:opacity-50">
            {usernameLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <User className="w-3.5 h-3.5" />}
            {t('settings_change_username')}
          </button>
        </div>
      </div>

      {/* Sessions */}
      <div data-testid="settings-sessions" className="rounded-lg border border-border/50 bg-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Smartphone className="w-4 h-4 text-[#1793D1]" />
          <h2 className="text-sm font-bold">{t('settings_sessions')}</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{t('settings_sessions_desc')}</p>
        {sessionsLoading ? (
          <div className="flex justify-center py-4"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <div key={s.id} data-testid={`session-${s.id}`}
                className={`flex items-center justify-between p-3 rounded-md border ${s.is_current ? 'border-[#1793D1]/40 bg-[#1793D1]/5' : 'border-border/30 bg-background/50'}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{parseUA(s.user_agent)}</span>
                    {s.is_current && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#1793D1]/20 text-[#1793D1]">
                        {t('settings_current_session')}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    IP: {s.ip} &middot; {new Date(s.last_active).toLocaleString()}
                  </div>
                </div>
                {!s.is_current && (
                  <button data-testid={`revoke-session-${s.id}`} onClick={() => revokeSession(s.id)}
                    className="shrink-0 ml-3 flex items-center gap-1 h-7 px-3 rounded-md text-xs font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors">
                    <LogOut className="w-3 h-3" /> {t('settings_revoke_session')}
                  </button>
                )}
              </div>
            ))}
            {sessions.filter(s => !s.is_current).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">{t('settings_no_other_sessions')}</p>
            )}
            {sessions.filter(s => !s.is_current).length > 0 && (
              <button data-testid="revoke-all-sessions-btn" onClick={revokeAllSessions}
                className="flex items-center gap-1.5 h-8 px-4 rounded-md text-xs font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors mt-2">
                <LogOut className="w-3.5 h-3.5" /> {t('settings_revoke_all')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Notifications Tab ───
function NotificationsTab({ user, authHeaders, t }) {
  const [notifPrefs, setNotifPrefs] = useState({ articles: true, comments: true, votes: true, badges: true, moderation: true, system: true });
  const [emailPrefs, setEmailPrefs] = useState({ articles: true, comments: true, votes: false, badges: true, moderation: true, system: true });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const email = user?.email;

  useEffect(() => {
    if (user?.notification_prefs) {
      const { email: ep, ...inApp } = user.notification_prefs;
      setNotifPrefs(prev => ({ ...prev, ...inApp }));
      if (ep) setEmailPrefs(prev => ({ ...prev, ...ep }));
    }
  }, [user]);

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      await axios.put(`${API}/auth/profile`, { notification_prefs: { ...notifPrefs, email: emailPrefs } }, { headers: authHeaders });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const notifOptions = [
    { key: 'articles', label: t('settings_notif_articles'), desc: t('settings_notif_articles_desc') },
    { key: 'comments', label: t('settings_notif_comments'), desc: t('settings_notif_comments_desc') },
    { key: 'votes', label: t('settings_notif_votes'), desc: t('settings_notif_votes_desc') },
    { key: 'badges', label: t('settings_notif_badges'), desc: t('settings_notif_badges_desc') },
    { key: 'moderation', label: t('settings_notif_moderation'), desc: t('settings_notif_moderation_desc') },
    { key: 'system', label: t('settings_notif_system'), desc: t('settings_notif_system_desc') },
  ];

  const Toggle = ({ on, onClick, testId }) => (
    <button data-testid={testId} onClick={onClick}
      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${on ? 'bg-[#1793D1]' : 'bg-muted-foreground/30'}`}>
      <span className={`absolute left-[3px] top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );

  return (
    <div className="space-y-6">
      {/* In-App */}
      <div data-testid="settings-notifications-section" className="rounded-lg border border-border/50 bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-[#1793D1]" />
          <h2 className="text-sm font-bold">{t('settings_notifications')}</h2>
        </div>
        <div className="space-y-3">
          {notifOptions.map(opt => (
            <div key={opt.key} className="flex items-center justify-between py-2">
              <div><div className="text-sm font-medium">{opt.label}</div><div className="text-xs text-muted-foreground">{opt.desc}</div></div>
              <Toggle on={notifPrefs[opt.key]} onClick={() => setNotifPrefs(p => ({ ...p, [opt.key]: !p[opt.key] }))} testId={`notif-toggle-${opt.key}`} />
            </div>
          ))}
        </div>
        <button data-testid="settings-save-notifications" onClick={save} disabled={saving}
          className="flex items-center gap-1.5 h-8 px-4 rounded-md bg-[#1793D1] text-white text-xs font-medium hover:bg-[#126A9A] transition-colors active:scale-95 disabled:opacity-50 mt-4">
          {saved ? <><Check className="w-3.5 h-3.5" /> {t('settings_saved')}</> : <><Save className="w-3.5 h-3.5" /> {t('settings_save')}</>}
        </button>
      </div>

      {/* Email */}
      <div data-testid="settings-email-notifications-section" className="rounded-lg border border-border/50 bg-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Mail className="w-4 h-4 text-[#1793D1]" />
          <h2 className="text-sm font-bold">{t('settings_email_notifications')}</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{t('settings_email_notifications_desc')}</p>
        {!email && (
          <div className="mb-4 p-3 rounded-md border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-400">{t('settings_email_no_email_hint')}</span>
            </div>
          </div>
        )}
        <div className={`space-y-3 ${!email ? 'opacity-50 pointer-events-none' : ''}`}>
          {[
            { key: 'articles', label: t('settings_email_notif_articles'), desc: t('settings_email_notif_articles_desc') },
            { key: 'comments', label: t('settings_email_notif_comments'), desc: t('settings_email_notif_comments_desc') },
            { key: 'votes', label: t('settings_email_notif_votes'), desc: t('settings_email_notif_votes_desc') },
            { key: 'badges', label: t('settings_email_notif_badges'), desc: t('settings_email_notif_badges_desc') },
            { key: 'moderation', label: t('settings_email_notif_moderation'), desc: t('settings_email_notif_moderation_desc') },
            { key: 'system', label: t('settings_email_notif_system'), desc: t('settings_email_notif_system_desc') },
          ].map(opt => (
            <div key={opt.key} className="flex items-center justify-between py-2">
              <div><div className="text-sm font-medium">{opt.label}</div><div className="text-xs text-muted-foreground">{opt.desc}</div></div>
              <Toggle on={emailPrefs[opt.key]} onClick={() => setEmailPrefs(p => ({ ...p, [opt.key]: !p[opt.key] }))} testId={`email-notif-toggle-${opt.key}`} />
            </div>
          ))}
        </div>
        <button data-testid="settings-save-email-notifications" onClick={save} disabled={saving || !email}
          className="flex items-center gap-1.5 h-8 px-4 rounded-md bg-[#1793D1] text-white text-xs font-medium hover:bg-[#126A9A] transition-colors active:scale-95 disabled:opacity-50 mt-4">
          {saved ? <><Check className="w-3.5 h-3.5" /> {t('settings_saved')}</> : <><Save className="w-3.5 h-3.5" /> {t('settings_save')}</>}
        </button>
      </div>
    </div>
  );
}

// ─── Privacy Tab ───
function PrivacyTab({ user, authHeaders, t, onLogout }) {
  const [exportStatus, setExportStatus] = useState('none');
  const [exportId, setExportId] = useState(null);
  const [exportExpires, setExportExpires] = useState(null);
  const [exportPassword, setExportPassword] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState('');

  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeletePanel, setShowDeletePanel] = useState(false);

  useEffect(() => {
    if (user) {
      axios.get(`${API}/auth/data-export/status`, { headers: authHeaders })
        .then(res => {
          setExportStatus(res.data.status);
          if (res.data.export_id) setExportId(res.data.export_id);
          if (res.data.expires_at) setExportExpires(res.data.expires_at);
        }).catch(() => {});
    }
  }, [user, authHeaders]);

  const requestExport = async () => {
    if (!exportPassword) return;
    setExportLoading(true); setExportError('');
    try {
      const res = await axios.post(`${API}/auth/data-export/request`, { password: exportPassword }, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      setExportStatus('ready'); setExportId(res.data.export_id); setExportExpires(res.data.expires_at); setExportPassword('');
    } catch { setExportError(t('gdpr_export_error')); }
    setExportLoading(false);
  };

  const downloadExport = async () => {
    try {
      const res = await axios.get(`${API}/auth/data-export/download`, { headers: authHeaders });
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `archhub-data-export-${user.username}.json`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { console.error(err); }
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleteLoading(true); setDeleteError('');
    try {
      await axios.delete(`${API}/auth/delete-account`, { headers: { ...authHeaders, 'Content-Type': 'application/json' }, data: { password: deletePassword, confirmation: deleteConfirm } });
      onLogout();
    } catch (err) { setDeleteError(err.response?.data?.detail || 'Error'); }
    setDeleteLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Data Export */}
      <div data-testid="settings-privacy-section" className="rounded-lg border border-border/50 bg-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <Download className="w-4 h-4 text-[#1793D1]" />
          <h2 className="text-sm font-bold">{t('gdpr_export_title')}</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{t('gdpr_export_desc')}</p>
        {exportStatus === 'ready' && exportExpires && (
          <div data-testid="export-ready-section" className="mb-4 p-3 rounded-md border border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-center gap-2 mb-1">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">{t('gdpr_export_ready')}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{t('gdpr_export_ready_desc')}: {new Date(exportExpires).toLocaleString()}</p>
            <button data-testid="export-download-btn" onClick={downloadExport}
              className="flex items-center gap-1.5 h-8 px-4 rounded-md bg-[#1793D1] text-white text-xs font-medium hover:bg-[#126A9A] transition-colors active:scale-95">
              <Download className="w-3.5 h-3.5" /> {t('gdpr_export_download')}
            </button>
          </div>
        )}
        {exportStatus === 'expired' && (
          <div className="mb-4 p-3 rounded-md border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-400">{t('gdpr_export_expired')}</span>
            </div>
          </div>
        )}
        {(exportStatus === 'none' || exportStatus === 'expired') && (
          <div data-testid="export-request-section">
            <label className="block text-xs font-medium mb-1.5">{t('gdpr_export_password')}</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input data-testid="export-password-input" type="password" value={exportPassword}
                  onChange={(e) => setExportPassword(e.target.value)} placeholder={t('gdpr_export_password_placeholder')}
                  className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1]"
                  onKeyDown={(e) => e.key === 'Enter' && requestExport()} />
              </div>
              <button data-testid="export-request-btn" onClick={requestExport} disabled={exportLoading || !exportPassword}
                className="flex items-center gap-1.5 h-9 px-4 rounded-md bg-[#1793D1] text-white text-xs font-medium hover:bg-[#126A9A] transition-colors active:scale-95 disabled:opacity-50 whitespace-nowrap">
                {exportLoading ? t('gdpr_export_requesting') : t('gdpr_export_btn')}
              </button>
            </div>
            {exportError && <p data-testid="export-error" className="text-xs text-red-400 mt-2">{exportError}</p>}
          </div>
        )}
      </div>

      {/* Delete Account */}
      <div data-testid="settings-delete-account" className="rounded-lg border border-red-500/30 bg-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <Trash2 className="w-4 h-4 text-red-400" />
          <h2 className="text-sm font-bold text-red-400">{t('settings_delete_account')}</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{t('settings_delete_account_desc')}</p>
        {user?.role === 'admin' ? (
          <div className="p-3 rounded-md border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-400">{t('settings_delete_admin_warning')}</span>
            </div>
          </div>
        ) : !showDeletePanel ? (
          <button data-testid="show-delete-panel-btn" onClick={() => setShowDeletePanel(true)}
            className="flex items-center gap-1.5 h-8 px-4 rounded-md text-xs font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> {t('settings_delete_account')}
          </button>
        ) : (
          <div className="space-y-3 p-4 rounded-md border border-red-500/20 bg-red-500/5">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{t('settings_delete_account_desc')}</p>
            </div>
            <input data-testid="delete-password-input" type="password" value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)} placeholder={t('settings_confirm_password')}
              className="w-full h-9 px-3 rounded-md border border-red-500/30 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50" />
            <input data-testid="delete-confirm-input" type="text" value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)} placeholder={t('settings_delete_confirm_text')}
              className="w-full h-9 px-3 rounded-md border border-red-500/30 bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500/50" />
            {deleteError && <p data-testid="delete-error" className="text-xs text-red-400">{deleteError}</p>}
            <div className="flex gap-2">
              <button data-testid="cancel-delete-btn" onClick={() => { setShowDeletePanel(false); setDeletePassword(''); setDeleteConfirm(''); setDeleteError(''); }}
                className="h-8 px-4 rounded-md text-xs font-medium border border-border hover:bg-muted/50 transition-colors">
                {t('admin_gdpr_cancel')}
              </button>
              <button data-testid="confirm-delete-btn" onClick={deleteAccount}
                disabled={deleteLoading || deleteConfirm !== 'DELETE' || !deletePassword}
                className="flex items-center gap-1.5 h-8 px-4 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50">
                {deleteLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {t('settings_delete_btn')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Settings Page ───
export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const { user, authHeaders, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div data-testid="settings-page" className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 mb-2 text-[#1793D1] font-mono text-sm">
        <Terminal className="w-4 h-4" />
        <span className="opacity-70">$</span>
        <span className="typing-animation">archhub --config</span>
      </div>
      <h1 className="text-2xl font-extrabold tracking-tighter mb-6">{t('settings_title')}</h1>

      <SettingsTabs activeTab={activeTab} setActiveTab={setActiveTab} t={t} isLoggedIn={!!user} />

      {activeTab === 'profile' && <ProfileTab user={user} authHeaders={authHeaders} t={t} theme={theme} setTheme={setTheme} lang={lang} setLang={setLang} />}
      {activeTab === 'security' && user && <SecurityTab user={user} authHeaders={authHeaders} t={t} onLogout={logout} />}
      {activeTab === 'notifications' && user && <NotificationsTab user={user} authHeaders={authHeaders} t={t} />}
      {activeTab === 'privacy' && user && <PrivacyTab user={user} authHeaders={authHeaders} t={t} onLogout={logout} />}
    </div>
  );
}
