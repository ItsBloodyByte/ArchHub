import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Settings, Users, BookOpen, MessageSquare, Vote, Shield, Ban, ChevronDown, Trash2, AlertTriangle, X, Search, Megaphone, Info, Link2, Eye, EyeOff, Mail, Server, FileText, Send, Check, Pencil, Power, PowerOff, BarChart3, ShieldBan, Plus, Palette, Upload, Globe, Image, Package, FileSignature } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import UserAvatar from '../components/UserAvatar';
import TerminalHeader from '../components/TerminalHeader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminDashboard() {
  const { authHeaders } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [roleDropdown, setRoleDropdown] = useState(null);
  const [dropdownPos, setDropdownPos] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annType, setAnnType] = useState('info');
  const [annLinkUrl, setAnnLinkUrl] = useState('');
  const [annLinkText, setAnnLinkText] = useState('');
  const [annActive, setAnnActive] = useState(false);
  const [annSaving, setAnnSaving] = useState(false);
  const [annSaved, setAnnSaved] = useState(false);

  // SMTP state
  const [smtp, setSmtp] = useState({ host: '', port: 587, username: '', password: '', from_name: 'ArchHub', from_email: '' });
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpSaved, setSmtpSaved] = useState(false);
  const [smtpTestEmail, setSmtpTestEmail] = useState('');
  const [smtpTestStatus, setSmtpTestStatus] = useState('');
  const [smtpTesting, setSmtpTesting] = useState(false);

  // Email templates state
  const [templates, setTemplates] = useState([]);
  const [editTpl, setEditTpl] = useState(null);
  const [tplSaving, setTplSaving] = useState(false);
  const [tplSaved, setTplSaved] = useState(false);
  const [tplLang, setTplLang] = useState('de');
  const [tplDeleteConfirm, setTplDeleteConfirm] = useState(null);

  // Blocked usernames state
  const [blockedNames, setBlockedNames] = useState([]);
  const [newBlockedName, setNewBlockedName] = useState('');
  const [blockLoading, setBlockLoading] = useState(false);

  // Design settings state
  const [design, setDesign] = useState({ site_title: 'ArchHub', favicon_url: null, logo_url: null, seo: {}, geo_aio: {} });
  const [designSaving, setDesignSaving] = useState(false);
  const [designSaved, setDesignSaved] = useState(false);

  // Package API settings state
  const [pkgApiUrl, setPkgApiUrl] = useState('https://archlinux.org/packages/search/json/');
  const [pkgSaving, setPkgSaving] = useState(false);
  const [pkgSaved, setPkgSaved] = useState(false);
  const [pkgTesting, setPkgTesting] = useState(false);
  const [pkgTestStatus, setPkgTestStatus] = useState('');

  // Footer settings state
  const [footerDE, setFooterDE] = useState('© 2026 ArchHub Contributors. Veröffentlicht unter der AGPL v3.');
  const [footerEN, setFooterEN] = useState('© 2026 ArchHub Contributors. Released under the AGPL v3.');
  const [footerSaving, setFooterSaving] = useState(false);
  const [footerSaved, setFooterSaved] = useState(false);

  // Contributors state
  const [contributors, setContributors] = useState([]);
  const [contribSaving, setContribSaving] = useState(false);
  const [contribSaved, setContribSaved] = useState(false);

  useEffect(() => { loadData(); }, [page, userSearch]);

  useEffect(() => {
    axios.get(`${API}/announcement`).then(res => {
      if (res.data.active !== undefined) {
        setAnnTitle(res.data.title || '');
        setAnnMessage(res.data.message || '');
        setAnnType(res.data.type || 'info');
        setAnnLinkUrl(res.data.link_url || '');
        setAnnLinkText(res.data.link_text || '');
        setAnnActive(res.data.active || false);
      }
    }).catch(() => {});
    // Load SMTP settings
    axios.get(`${API}/admin/smtp`, { headers: authHeaders }).then(res => {
      if (res.data) setSmtp(prev => ({ ...prev, ...res.data }));
    }).catch(() => {});
    // Load email templates
    loadTemplates();
    loadBlockedNames();
    loadDesign();
    loadPackageSettings();
    loadFooterSettings();
    loadContributors();
  }, []);

  const loadData = async () => {
    try {
      const searchParam = userSearch ? `&search=${encodeURIComponent(userSearch)}` : '';
      const [statsRes, usersRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers: authHeaders }),
        axios.get(`${API}/admin/users?page=${page}${searchParam}`, { headers: authHeaders })
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setTotalUsers(usersRes.data.total);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const changeRole = async (userId, newRole) => {
    try {
      await axios.put(`${API}/admin/users/${userId}/role`, { role: newRole }, {
        headers: { ...authHeaders, 'Content-Type': 'application/json' }
      });
      setRoleDropdown(null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleBan = async (userId, banned) => {
    try {
      await axios.put(`${API}/admin/users/${userId}/ban`, { banned, reason: 'Admin action' }, {
        headers: { ...authHeaders, 'Content-Type': 'application/json' }
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const gdprDeleteUser = async (userId) => {
    try {
      await axios.delete(`${API}/admin/users/${userId}/gdpr`, { headers: authHeaders });
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const saveAnnouncement = async () => {
    setAnnSaving(true);
    try {
      await axios.put(`${API}/admin/announcement`, {
        active: annActive,
        title: annTitle,
        message: annMessage,
        type: annType,
        link_url: annLinkUrl,
        link_text: annLinkText
      }, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      setAnnSaved(true);
      setTimeout(() => setAnnSaved(false), 2000);
    } catch (err) {
      console.error(err);
    }
    setAnnSaving(false);
  };

  // ─── SMTP Handlers ───
  const saveSmtp = async () => {
    setSmtpSaving(true);
    try {
      await axios.put(`${API}/admin/smtp`, smtp, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      setSmtpSaved(true);
      setTimeout(() => setSmtpSaved(false), 2000);
    } catch (err) {
      console.error(err);
    }
    setSmtpSaving(false);
  };

  const testSmtp = async () => {
    setSmtpTesting(true);
    setSmtpTestStatus('');
    try {
      const res = await axios.post(`${API}/admin/smtp/test`, { email: smtpTestEmail }, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      setSmtpTestStatus('success');
    } catch (err) {
      setSmtpTestStatus(err.response?.data?.detail || 'Error');
    }
    setSmtpTesting(false);
  };

  // ─── Template Handlers ───
  const loadTemplates = async () => {
    try {
      const res = await axios.get(`${API}/admin/email-templates`, { headers: authHeaders });
      setTemplates(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const saveTemplate = async () => {
    if (!editTpl) return;
    setTplSaving(true);
    try {
      await axios.put(`${API}/admin/email-templates/${editTpl.trigger}`, editTpl, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      setTplSaved(true);
      setTimeout(() => setTplSaved(false), 2000);
      loadTemplates();
    } catch (err) {
      console.error(err);
    }
    setTplSaving(false);
  };

  const deleteTemplate = async (trigger) => {
    try {
      await axios.delete(`${API}/admin/email-templates/${trigger}`, { headers: authHeaders });
      setTplDeleteConfirm(null);
      if (editTpl?.trigger === trigger) setEditTpl(null);
      loadTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Blocked Usernames Handlers ───
  const loadBlockedNames = async () => {
    try {
      const res = await axios.get(`${API}/admin/blocked-usernames`, { headers: authHeaders });
      setBlockedNames(res.data || []);
    } catch { setBlockedNames([]); }
  };

  const addBlockedName = async () => {
    if (!newBlockedName.trim()) return;
    setBlockLoading(true);
    try {
      await axios.post(`${API}/admin/blocked-usernames`, { username: newBlockedName.trim() }, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      setNewBlockedName('');
      loadBlockedNames();
    } catch (err) { console.error(err); }
    setBlockLoading(false);
  };

  const removeBlockedName = async (username) => {
    try {
      await axios.delete(`${API}/admin/blocked-usernames/${username}`, { headers: authHeaders });
      setBlockedNames(prev => prev.filter(b => b.username !== username));
    } catch (err) { console.error(err); }
  };

  // ─── Design Handlers ───
  const loadDesign = async () => {
    try {
      const res = await axios.get(`${API}/site/design`);
      setDesign(prev => ({ ...prev, ...res.data }));
    } catch {}
  };

  // ─── Package Settings Handlers ───
  const loadPackageSettings = async () => {
    try {
      const res = await axios.get(`${API}/admin/package-settings`, { headers: authHeaders });
      if (res.data?.api_url) setPkgApiUrl(res.data.api_url);
    } catch {}
  };

  const savePackageSettings = async () => {
    setPkgSaving(true);
    try {
      await axios.put(`${API}/admin/package-settings`, { api_url: pkgApiUrl }, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      setPkgSaved(true);
      setTimeout(() => setPkgSaved(false), 2000);
    } catch (err) { console.error(err); }
    setPkgSaving(false);
  };

  const testPackageApi = async () => {
    setPkgTesting(true);
    setPkgTestStatus('');
    try {
      const res = await axios.get(`${API}/packages/search`, { params: { q: 'linux' } });
      setPkgTestStatus(res.data.total > 0 ? 'success' : 'error');
    } catch {
      setPkgTestStatus('error');
    }
    setPkgTesting(false);
  };

  // ─── Footer Handlers ───
  const loadFooterSettings = async () => {
    try {
      const res = await axios.get(`${API}/admin/footer-settings`, { headers: authHeaders });
      if (res.data) {
        setFooterDE(res.data.copyright_de || '');
        setFooterEN(res.data.copyright_en || '');
      }
    } catch {}
  };

  const saveFooterSettings = async () => {
    setFooterSaving(true);
    try {
      await axios.put(`${API}/admin/footer-settings`,
        { copyright_de: footerDE, copyright_en: footerEN },
        { headers: { ...authHeaders, 'Content-Type': 'application/json' } }
      );
      setFooterSaved(true);
      setTimeout(() => setFooterSaved(false), 2000);
    } catch (err) { console.error(err); }
    setFooterSaving(false);
  };

  // ─── Contributors Handlers ───
  const loadContributors = async () => {
    try {
      const res = await axios.get(`${API}/admin/contributors`, { headers: authHeaders });
      setContributors(res.data.contributors || []);
    } catch {}
  };

  const saveContributors = async () => {
    setContribSaving(true);
    try {
      const res = await axios.put(`${API}/admin/contributors`,
        { contributors },
        { headers: { ...authHeaders, 'Content-Type': 'application/json' } }
      );
      setContributors(res.data.contributors || []);
      setContribSaved(true);
      setTimeout(() => setContribSaved(false), 2000);
    } catch (err) { console.error(err); }
    setContribSaving(false);
  };

  const addContributor = () => {
    setContributors(prev => [...prev, { username: '', title_de: '', title_en: '', order: prev.length }]);
  };

  const updateContributor = (idx, field, value) => {
    setContributors(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const removeContributor = (idx) => {
    setContributors(prev => prev.filter((_, i) => i !== idx));
  };

  const saveDesign = async () => {
    setDesignSaving(true); setDesignSaved(false);
    try {
      await axios.put(`${API}/admin/design`, design, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      setDesignSaved(true); setTimeout(() => setDesignSaved(false), 2000);
    } catch (err) { console.error(err); }
    setDesignSaving(false);
  };

  const uploadAsset = async (type) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'favicon' ? '.ico,.png,.svg,.jpg' : '.png,.svg,.jpg,.webp';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await axios.post(`${API}/admin/upload-asset`, formData, { headers: { ...authHeaders, 'Content-Type': 'multipart/form-data' } });
        setDesign(prev => ({ ...prev, [type === 'favicon' ? 'favicon_url' : 'logo_url']: res.data.url }));
      } catch (err) { console.error(err); }
    };
    input.click();
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-8 text-muted-foreground">{t('misc_loading')}</div>;
  }

  const roleColors = {
    admin: 'text-red-400 bg-red-500/10 border-red-500/20',
    moderator: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    user: 'text-muted-foreground bg-muted border-border',
  };

  return (
    <div data-testid="admin-dashboard" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TerminalHeader command="sudo pacman -Syu archhub-admin" />
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-[#1793D1]" />
        <h1 className="text-2xl font-extrabold tracking-tighter">{t('admin_dashboard')}</h1>
      </div>

      {/* Tab Navigation */}
      <div data-testid="admin-tabs" className="flex gap-1 mb-8 p-1 rounded-lg bg-muted/30 border border-border/30 overflow-x-auto">
        {[
          { id: 'overview', label: t('admin_tab_overview'), icon: BarChart3 },
          { id: 'users', label: t('admin_tab_users'), icon: Users },
          { id: 'announcements', label: t('admin_tab_announcements'), icon: Megaphone },
          { id: 'email', label: t('admin_tab_email'), icon: Mail },
          { id: 'blocklist', label: t('admin_tab_blocklist'), icon: ShieldBan },
          { id: 'design', label: t('admin_tab_design'), icon: Palette },
          { id: 'packages', label: t('admin_tab_packages'), icon: Package },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              data-testid={`admin-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#1793D1]/10 text-[#1793D1] border border-[#1793D1]/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Overview Tab ─── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
            { label: t('admin_total_users'), value: stats.users, icon: Users, color: 'text-[#1793D1]' },
            { label: t('admin_total_articles'), value: stats.articles, icon: BookOpen, color: 'text-[#1793D1]' },
            { label: t('admin_published'), value: stats.published, icon: BookOpen, color: 'text-emerald-400' },
            { label: t('admin_drafts'), value: stats.drafts, icon: BookOpen, color: 'text-muted-foreground' },
            { label: t('admin_submitted'), value: stats.submitted, icon: BookOpen, color: 'text-amber-400' },
            { label: t('admin_total_comments'), value: stats.comments, icon: MessageSquare, color: 'text-[#1793D1]' },
            { label: t('admin_total_votes'), value: stats.votes, icon: Vote, color: 'text-[#1793D1]' },
          ].map((stat, i) => (
            <div key={i} className="p-4 rounded-lg border border-border/50 bg-card">
              <stat.icon className={`w-4 h-4 ${stat.color} mb-2`} />
              <div className="text-xl font-extrabold font-mono">{stat.value || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Users Tab ─── */}
      {activeTab === 'users' && (
        <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#1793D1]" />
          {t('admin_users')} ({totalUsers})
        </h2>

        {/* User Search */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            data-testid="admin-user-search"
            type="text"
            value={userSearch}
            onChange={(e) => { setUserSearch(e.target.value); setPage(1); }}
            placeholder={t('admin_search_users')}
            className="w-full max-w-sm h-9 pl-9 pr-3 rounded-md border border-input bg-background/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1]"
          />
        </div>

        <div className="rounded-lg border border-border/50">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left px-4 py-3 font-mono text-xs text-muted-foreground">{t('admin_col_user')}</th>
                  <th className="text-left px-4 py-3 font-mono text-xs text-muted-foreground">{t('admin_col_role')}</th>
                  <th className="text-left px-4 py-3 font-mono text-xs text-muted-foreground">{t('admin_col_rep')}</th>
                  <th className="text-left px-4 py-3 font-mono text-xs text-muted-foreground">{t('admin_col_articles')}</th>
                  <th className="text-left px-4 py-3 font-mono text-xs text-muted-foreground">{t('admin_col_joined')}</th>
                  <th className="text-right px-4 py-3 font-mono text-xs text-muted-foreground">{t('admin_col_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} data-testid={`admin-user-${u.username}`} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <UserAvatar username={u.username} size={28} />
                        <div>
                          <span className="font-mono text-sm font-medium">{u.username}</span>
                          {u.banned && <span className="ml-2 text-xs text-red-400 font-mono">[BANNED]</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded border ${roleColors[u.role] || roleColors.user}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{u.reputation}</td>
                    <td className="px-4 py-3 font-mono text-xs">{u.article_count}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Role dropdown */}
                        <div className="relative" ref={el => { if (roleDropdown === u.id) el && el.setAttribute('data-open', 'true'); }}>
                          <button
                            data-testid={`role-btn-${u.id}`}
                            onClick={(e) => {
                              if (roleDropdown === u.id) { setRoleDropdown(null); setDropdownPos(null); }
                              else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                                setRoleDropdown(u.id);
                              }
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-input hover:bg-accent transition-colors"
                          >
                            <Shield className="w-3 h-3" />
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                        {/* Ban button */}
                        <button
                          onClick={() => toggleBan(u.id, !u.banned)}
                          className={`px-2 py-1 rounded text-xs transition-colors ${
                            u.banned
                              ? 'text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10'
                              : 'text-red-400 border border-red-500/30 hover:bg-red-500/10'
                          }`}
                        >
                          {u.banned ? t('admin_unban') : t('admin_ban')}
                        </button>
                        {/* GDPR Delete button */}
                        {u.role !== 'admin' && (
                          <button
                            data-testid={`admin-delete-${u.username}`}
                            onClick={() => setDeleteTarget(u)}
                            className="px-2 py-1 rounded text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* ─── Announcements Tab ─── */}
      {activeTab === 'announcements' && (
      <div data-testid="admin-announcement-editor" className="rounded-lg border border-border/50 bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#1793D1]" />
            {t('admin_announcement_title')}
          </h2>
          <div className="flex items-center gap-2">
            {annSaved && <span className="text-xs text-emerald-400 font-medium">Gespeichert!</span>}
            <button
              data-testid="announcement-toggle-active"
              onClick={() => setAnnActive(!annActive)}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border transition-colors ${
                annActive ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-border text-muted-foreground'
              }`}
            >
              {annActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {annActive ? t('admin_announcement_active') : t('admin_announcement_inactive')}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">{t('admin_announcement_type')}</label>
            <div className="flex gap-2">
              {[
                { val: 'info', label: t('ann_type_info'), icon: Info, color: 'text-[#1793D1] border-[#1793D1]/30 bg-[#1793D1]/5' },
                { val: 'warning', label: t('ann_type_warning'), icon: AlertTriangle, color: 'text-amber-400 border-amber-500/30 bg-amber-500/5' },
                { val: 'important', label: t('ann_type_important'), icon: Megaphone, color: 'text-red-400 border-red-500/30 bg-red-500/5' },
              ].map(opt => (
                <button
                  key={opt.val}
                  data-testid={`announcement-type-${opt.val}`}
                  onClick={() => setAnnType(opt.val)}
                  className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border transition-colors ${
                    annType === opt.val ? opt.color : 'border-input text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <opt.icon className="w-3.5 h-3.5" /> {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">{t('ann_label_title')}</label>
            <input
              data-testid="announcement-title-input"
              type="text"
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              placeholder={t('ann_title_placeholder')}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">{t('ann_label_message')}</label>
            <textarea
              data-testid="announcement-message-input"
              value={annMessage}
              onChange={(e) => setAnnMessage(e.target.value)}
              placeholder={t('ann_message_placeholder')}
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Link2 className="w-3 h-3" /> {t('ann_link_url')}</label>
              <input
                data-testid="announcement-link-url"
                type="text"
                value={annLinkUrl}
                onChange={(e) => setAnnLinkUrl(e.target.value)}
                placeholder="/tutorials oder https://..."
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">{t('ann_link_text')}</label>
              <input
                data-testid="announcement-link-text"
                type="text"
                value={annLinkText}
                onChange={(e) => setAnnLinkText(e.target.value)}
                placeholder={t('ann_link_text_placeholder')}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
              />
            </div>
          </div>

          <button
            data-testid="announcement-save-btn"
            onClick={saveAnnouncement}
            disabled={annSaving || !annTitle.trim()}
            className="flex items-center gap-1.5 h-9 px-5 rounded-md bg-[#1793D1] text-white text-xs font-medium hover:bg-[#126A9A] transition-colors disabled:opacity-50 active:scale-95"
          >
            {annSaving ? '...' : t('settings_save')}
          </button>
        </div>
      </div>
      )}

      {/* ─── Email Tab ─── */}
      {activeTab === 'email' && (
      <div className="space-y-8">
      {/* SMTP Configuration */}
      <div data-testid="admin-smtp-section" className="rounded-lg border border-border/50 bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Server className="w-5 h-5 text-[#1793D1]" />
            {t('admin_smtp_title')}
          </h2>
          {smtpSaved && <span className="text-xs text-emerald-400 font-medium">{t('admin_smtp_saved')}</span>}
        </div>
        <p className="text-xs text-muted-foreground mb-4">{t('admin_smtp_hint')}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium mb-1">{t('admin_smtp_host')}</label>
            <input data-testid="smtp-host" type="text" value={smtp.host} onChange={e => setSmtp(p => ({...p, host: e.target.value}))} placeholder="smtp.protonmail.ch" className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">{t('admin_smtp_port')}</label>
            <input data-testid="smtp-port" type="number" value={smtp.port} onChange={e => setSmtp(p => ({...p, port: parseInt(e.target.value) || 587}))} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">{t('admin_smtp_username')}</label>
            <input data-testid="smtp-username" type="text" value={smtp.username} onChange={e => setSmtp(p => ({...p, username: e.target.value}))} placeholder="user@protonmail.com" className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">{t('admin_smtp_password')}</label>
            <input data-testid="smtp-password" type="password" value={smtp.password} onChange={e => setSmtp(p => ({...p, password: e.target.value}))} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">{t('admin_smtp_from_name')}</label>
            <input data-testid="smtp-from-name" type="text" value={smtp.from_name} onChange={e => setSmtp(p => ({...p, from_name: e.target.value}))} placeholder="ArchHub" className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">{t('admin_smtp_from_email')}</label>
            <input data-testid="smtp-from-email" type="email" value={smtp.from_email} onChange={e => setSmtp(p => ({...p, from_email: e.target.value}))} placeholder="noreply@archhub.dev" className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button data-testid="smtp-save-btn" onClick={saveSmtp} disabled={smtpSaving} className="flex items-center gap-1.5 h-9 px-5 rounded-md bg-[#1793D1] text-white text-xs font-medium hover:bg-[#126A9A] transition-colors disabled:opacity-50 active:scale-95">
            {smtpSaving ? '...' : t('settings_save')}
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <input data-testid="smtp-test-email" type="email" value={smtpTestEmail} onChange={e => setSmtpTestEmail(e.target.value)} placeholder={t('admin_smtp_test_email')} className="h-9 w-56 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
            <button data-testid="smtp-test-btn" onClick={testSmtp} disabled={smtpTesting || !smtpTestEmail} className="flex items-center gap-1.5 h-9 px-4 rounded-md border border-[#1793D1]/30 text-[#1793D1] text-xs font-medium hover:bg-[#1793D1]/5 transition-colors disabled:opacity-50">
              <Send className="w-3.5 h-3.5" /> {smtpTesting ? '...' : t('admin_smtp_test')}
            </button>
          </div>
        </div>
        {smtpTestStatus === 'success' && <p className="text-xs text-emerald-400 mt-2">{t('admin_smtp_test_success')}</p>}
        {smtpTestStatus && smtpTestStatus !== 'success' && <p className="text-xs text-red-400 mt-2">{t('admin_smtp_test_error')}: {smtpTestStatus}</p>}
      </div>

      {/* Email Templates Editor */}
      <div data-testid="admin-templates-section" className="rounded-lg border border-border/50 bg-card p-5">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-[#1793D1]" />
          {t('admin_templates_title')}
        </h2>

        {templates.length === 0 && <p className="text-sm text-muted-foreground">{t('admin_templates_empty')}</p>}

        {/* Template List */}
        {templates.length > 0 && !editTpl && (
          <div className="space-y-2">
            {templates.map(tpl => (
              <div key={tpl.trigger} data-testid={`tpl-row-${tpl.trigger}`} className="flex items-center justify-between p-3 rounded-md border border-border/30 bg-background/50 hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tpl.active ? 'bg-emerald-400' : 'bg-muted-foreground/40'}`} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{tpl.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{tpl.trigger}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {tpl.placeholders?.length > 0 && (
                    <div className="hidden md:flex items-center gap-1">
                      {tpl.placeholders.map(p => (
                        <span key={p} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">{`{{${p}}}`}</span>
                      ))}
                    </div>
                  )}
                  <button data-testid={`tpl-edit-${tpl.trigger}`} onClick={() => { setEditTpl({...tpl}); setTplLang('de'); }} className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-input hover:bg-accent transition-colors">
                    <Pencil className="w-3 h-3" /> {t('admin_templates_edit')}
                  </button>
                  {tplDeleteConfirm === tpl.trigger ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => deleteTemplate(tpl.trigger)} className="px-2 py-1 rounded text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10">{t('admin_templates_delete')}</button>
                      <button onClick={() => setTplDeleteConfirm(null)} className="px-2 py-1 rounded text-xs border border-input hover:bg-accent"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <button onClick={() => setTplDeleteConfirm(tpl.trigger)} className="px-2 py-1 rounded text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Template Editor */}
        {editTpl && (
          <div data-testid="tpl-editor" className="space-y-4 mt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">{editTpl.name}</h3>
                <span className="text-xs font-mono text-muted-foreground">{editTpl.trigger}</span>
              </div>
              <div className="flex items-center gap-2">
                {tplSaved && <span className="text-xs text-emerald-400">{t('admin_templates_saved')}</span>}
                <button onClick={() => setEditTpl({...editTpl, active: !editTpl.active})} className={`flex items-center gap-1 h-7 px-2.5 rounded text-xs border transition-colors ${editTpl.active ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-border text-muted-foreground'}`}>
                  {editTpl.active ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
                  {editTpl.active ? t('admin_templates_active') : t('admin_templates_inactive')}
                </button>
              </div>
            </div>

            {/* Language Tabs */}
            <div className="flex gap-1 border-b border-border/50 pb-1">
              {['de', 'en'].map(l => (
                <button key={l} data-testid={`tpl-lang-${l}`} onClick={() => setTplLang(l)} className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${tplLang === l ? 'bg-[#1793D1]/10 text-[#1793D1] border-b-2 border-[#1793D1]' : 'text-muted-foreground hover:text-foreground'}`}>
                  {l === 'de' ? t('admin_templates_lang_de') : t('admin_templates_lang_en')}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">{t('admin_templates_subject')}</label>
              <input data-testid={`tpl-subject-${tplLang}`} type="text" value={editTpl[`subject_${tplLang}`] || ''} onChange={e => setEditTpl({...editTpl, [`subject_${tplLang}`]: e.target.value})} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">{t('admin_templates_body')}</label>
              <textarea data-testid={`tpl-body-${tplLang}`} value={editTpl[`body_html_${tplLang}`] || ''} onChange={e => setEditTpl({...editTpl, [`body_html_${tplLang}`]: e.target.value})} rows={8} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
            </div>

            {editTpl.placeholders?.length > 0 && (
              <div>
                <label className="block text-xs font-medium mb-1">{t('admin_templates_placeholders')}</label>
                <div className="flex flex-wrap gap-1">
                  {editTpl.placeholders.map(p => (
                    <span key={p} className="text-xs font-mono px-2 py-1 rounded bg-muted/50 text-muted-foreground border border-border/30">{`{{${p}}}`}</span>
                  ))}
                </div>
              </div>
            )}

            {/* HTML Preview */}
            <div>
              <label className="block text-xs font-medium mb-1">{t('admin_templates_preview')}</label>
              <div data-testid="tpl-preview" className="rounded-md border border-border/30 bg-background/50 p-3 overflow-auto max-h-48" dangerouslySetInnerHTML={{ __html: editTpl[`body_html_${tplLang}`] || '' }} />
            </div>

            <div className="flex items-center gap-2">
              <button data-testid="tpl-save-btn" onClick={saveTemplate} disabled={tplSaving} className="flex items-center gap-1.5 h-9 px-5 rounded-md bg-[#1793D1] text-white text-xs font-medium hover:bg-[#126A9A] transition-colors disabled:opacity-50 active:scale-95">
                <Check className="w-3.5 h-3.5" /> {tplSaving ? '...' : t('admin_templates_save')}
              </button>
              <button data-testid="tpl-cancel-btn" onClick={() => setEditTpl(null)} className="flex items-center gap-1.5 h-9 px-4 rounded-md border border-input text-xs font-medium hover:bg-accent transition-colors">
                <X className="w-3.5 h-3.5" /> {t('admin_templates_cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
      )}

      {/* ─── Blocklist Tab ─── */}
      {activeTab === 'blocklist' && (
        <div data-testid="admin-blocklist-section" className="rounded-lg border border-border/50 bg-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <ShieldBan className="w-5 h-5 text-[#1793D1]" />
            <h2 className="text-lg font-bold">{t('admin_blocklist_title')}</h2>
            <span className="ml-auto text-xs font-mono text-muted-foreground">{blockedNames.length}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-5">{t('admin_blocklist_desc')}</p>

          {/* Add new */}
          <div className="flex items-center gap-2 mb-5">
            <div className="relative flex-1 max-w-sm">
              <ShieldBan className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                data-testid="blocklist-add-input"
                type="text"
                value={newBlockedName}
                onChange={e => setNewBlockedName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                onKeyDown={e => e.key === 'Enter' && addBlockedName()}
                placeholder={t('admin_blocklist_add_placeholder')}
                className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background/50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1]"
              />
            </div>
            <button
              data-testid="blocklist-add-btn"
              onClick={addBlockedName}
              disabled={blockLoading || !newBlockedName.trim()}
              className="flex items-center gap-1.5 h-9 px-4 rounded-md bg-[#1793D1] text-white text-xs font-medium hover:bg-[#126A9A] transition-colors disabled:opacity-50 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> {t('admin_blocklist_add_btn')}
            </button>
          </div>

          {/* List */}
          {blockedNames.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('admin_blocklist_empty')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {blockedNames.map(b => (
                <div
                  key={b.username}
                  data-testid={`blocked-${b.username}`}
                  className="group flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border/50 bg-background/50 hover:border-red-500/30 transition-colors"
                >
                  <span className="text-sm font-mono">{b.username}</span>
                  <button
                    data-testid={`unblock-${b.username}`}
                    onClick={() => removeBlockedName(b.username)}
                    className="opacity-0 group-hover:opacity-100 ml-0.5 text-red-400 hover:text-red-300 transition-all"
                    title={t('admin_blocklist_remove')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Design Tab ─── */}
      {activeTab === 'design' && (
        <div className="space-y-6">
          {/* Branding */}
          <div className="rounded-lg border border-border/50 bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-[#1793D1]" />
              <h2 className="text-lg font-bold">{t('admin_design_title')}</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5">{t('admin_design_site_title')}</label>
                <input data-testid="design-site-title" type="text" value={design.site_title || ''}
                  onChange={e => setDesign(p => ({ ...p, site_title: e.target.value }))}
                  className="w-full max-w-md h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5">{t('admin_design_favicon')}</label>
                  <div className="flex items-center gap-3">
                    {design.favicon_url ? (
                      <div className="w-10 h-10 rounded border border-border flex items-center justify-center bg-background">
                        <img src={design.favicon_url} alt="Favicon" className="w-6 h-6 object-contain" />
                      </div>
                    ) : <div className="w-10 h-10 rounded border border-dashed border-border flex items-center justify-center text-muted-foreground"><Image className="w-4 h-4" /></div>}
                    <button data-testid="upload-favicon-btn" onClick={() => uploadAsset('favicon')}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-input hover:bg-muted/50 transition-colors">
                      <Upload className="w-3.5 h-3.5" /> {t('admin_design_upload')}
                    </button>
                    {design.favicon_url && (
                      <button onClick={() => setDesign(p => ({ ...p, favicon_url: null }))}
                        className="text-xs text-red-400 hover:text-red-300">{t('admin_design_remove')}</button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">{t('admin_design_logo')}</label>
                  <div className="flex items-center gap-3">
                    {design.logo_url ? (
                      <div className="h-10 rounded border border-border flex items-center justify-center bg-background px-2">
                        <img src={design.logo_url} alt="Logo" className="h-7 object-contain" />
                      </div>
                    ) : <div className="w-10 h-10 rounded border border-dashed border-border flex items-center justify-center text-muted-foreground"><Image className="w-4 h-4" /></div>}
                    <button data-testid="upload-logo-btn" onClick={() => uploadAsset('logo')}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-input hover:bg-muted/50 transition-colors">
                      <Upload className="w-3.5 h-3.5" /> {t('admin_design_upload')}
                    </button>
                    {design.logo_url && (
                      <button onClick={() => setDesign(p => ({ ...p, logo_url: null }))}
                        className="text-xs text-red-400 hover:text-red-300">{t('admin_design_remove')}</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SEO */}
          <div className="rounded-lg border border-border/50 bg-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <Search className="w-5 h-5 text-[#1793D1]" />
              <h2 className="text-lg font-bold">{t('admin_design_seo_title')}</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t('admin_design_seo_desc')}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">{t('admin_design_seo_description')}</label>
                <textarea data-testid="seo-description" value={design.seo?.description || ''}
                  onChange={e => setDesign(p => ({ ...p, seo: { ...p.seo, description: e.target.value } }))}
                  className="w-full h-20 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
                  maxLength={320} placeholder="Arch Linux community platform..." />
                <div className="text-right text-[10px] text-muted-foreground">{(design.seo?.description || '').length}/320</div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{t('admin_design_seo_keywords')}</label>
                <input data-testid="seo-keywords" type="text" value={design.seo?.keywords || ''}
                  onChange={e => setDesign(p => ({ ...p, seo: { ...p.seo, keywords: e.target.value } }))}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
                  placeholder="arch linux, community, tutorials, scripts" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{t('admin_design_seo_og_image')}</label>
                <input data-testid="seo-og-image" type="text" value={design.seo?.og_image || ''}
                  onChange={e => setDesign(p => ({ ...p, seo: { ...p.seo, og_image: e.target.value } }))}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
                  placeholder="https://..." />
              </div>
            </div>
          </div>

          {/* GEO/AIO */}
          <div className="rounded-lg border border-border/50 bg-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-5 h-5 text-[#1793D1]" />
              <h2 className="text-lg font-bold">{t('admin_design_geo_title')}</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t('admin_design_geo_desc')}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">{t('admin_design_geo_site_type')}</label>
                <select data-testid="geo-site-type" value={design.geo_aio?.site_type || 'WebSite'}
                  onChange={e => setDesign(p => ({ ...p, geo_aio: { ...p.geo_aio, site_type: e.target.value } }))}
                  className="w-full max-w-sm h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50">
                  <option value="WebSite">WebSite</option>
                  <option value="WebApplication">WebApplication</option>
                  <option value="Organization">Organization</option>
                  <option value="EducationalOrganization">EducationalOrganization</option>
                  <option value="CollectionPage">CollectionPage</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{t('admin_design_geo_org_name')}</label>
                <input data-testid="geo-org-name" type="text" value={design.geo_aio?.org_name || ''}
                  onChange={e => setDesign(p => ({ ...p, geo_aio: { ...p.geo_aio, org_name: e.target.value } }))}
                  className="w-full max-w-sm h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
                  placeholder="ArchHub" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{t('admin_design_geo_site_desc')}</label>
                <textarea data-testid="geo-site-desc" value={design.geo_aio?.site_desc || ''}
                  onChange={e => setDesign(p => ({ ...p, geo_aio: { ...p.geo_aio, site_desc: e.target.value } }))}
                  className="w-full h-20 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
                  maxLength={500} placeholder="A community platform for Arch Linux enthusiasts..." />
              </div>
            </div>
          </div>

          {/* Footer Copyright */}
          <div className="rounded-lg border border-border/50 bg-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <FileSignature className="w-5 h-5 text-[#1793D1]" />
              <h2 className="text-lg font-bold">{t('admin_footer_title')}</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t('admin_footer_desc')}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">{t('admin_footer_de')}</label>
                <input data-testid="footer-de-input" type="text" value={footerDE} onChange={(e) => setFooterDE(e.target.value)}
                  placeholder="© 2026 ArchHub Contributors..."
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{t('admin_footer_en')}</label>
                <input data-testid="footer-en-input" type="text" value={footerEN} onChange={(e) => setFooterEN(e.target.value)}
                  placeholder="© 2026 ArchHub Contributors..."
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
              </div>
            </div>
            <button data-testid="footer-save-btn" onClick={saveFooterSettings} disabled={footerSaving}
              className="flex items-center gap-1.5 h-9 px-5 rounded-md bg-[#1793D1] text-white text-xs font-medium hover:bg-[#126A9A] transition-colors disabled:opacity-50 active:scale-95 mt-4">
              {footerSaving ? '...' : footerSaved ? <><Check className="w-3.5 h-3.5" /> {t('admin_pkg_saved')}</> : t('settings_save')}
            </button>
          </div>

          {/* Contributors */}
          <div className="rounded-lg border border-border/50 bg-card p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#1793D1]" />
                <h2 className="text-lg font-bold">{t('admin_contrib_title')}</h2>
              </div>
              <button data-testid="contrib-add-btn" onClick={addContributor}
                className="flex items-center gap-1 h-7 px-3 rounded-md border border-[#1793D1]/30 text-[#1793D1] text-xs font-medium hover:bg-[#1793D1]/5 transition-colors">
                <Plus className="w-3 h-3" /> {t('admin_contrib_add')}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t('admin_contrib_desc')}</p>

            {contributors.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">{t('admin_contrib_empty')}</p>
            ) : (
              <div className="space-y-3">
                {contributors.map((c, idx) => (
                  <div key={idx} data-testid={`contrib-row-${idx}`} className="flex gap-2 items-start p-3 rounded-md border border-border/30 bg-muted/5">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input data-testid={`contrib-username-${idx}`} type="text" value={c.username} onChange={(e) => updateContributor(idx, 'username', e.target.value)}
                        placeholder={t('admin_contrib_username')} className="h-8 px-2.5 rounded-md border border-input bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
                      <input data-testid={`contrib-title-de-${idx}`} type="text" value={c.title_de} onChange={(e) => updateContributor(idx, 'title_de', e.target.value)}
                        placeholder={t('admin_contrib_title_de')} className="h-8 px-2.5 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
                      <input data-testid={`contrib-title-en-${idx}`} type="text" value={c.title_en} onChange={(e) => updateContributor(idx, 'title_en', e.target.value)}
                        placeholder={t('admin_contrib_title_en')} className="h-8 px-2.5 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
                    </div>
                    <button data-testid={`contrib-remove-${idx}`} onClick={() => removeContributor(idx)}
                      className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button data-testid="contrib-save-btn" onClick={saveContributors} disabled={contribSaving}
              className="flex items-center gap-1.5 h-9 px-5 rounded-md bg-[#1793D1] text-white text-xs font-medium hover:bg-[#126A9A] transition-colors disabled:opacity-50 active:scale-95 mt-4">
              {contribSaving ? '...' : contribSaved ? <><Check className="w-3.5 h-3.5" /> {t('admin_pkg_saved')}</> : t('settings_save')}
            </button>
          </div>

          {/* Save Design */}
          <button data-testid="save-design-btn" onClick={saveDesign} disabled={designSaving}
            className="flex items-center gap-1.5 h-9 px-5 rounded-md bg-[#1793D1] text-white text-sm font-medium hover:bg-[#126A9A] transition-colors active:scale-95 disabled:opacity-50">
            {designSaved ? <><Check className="w-4 h-4" /> {t('admin_design_saved')}</> : <><Pencil className="w-4 h-4" /> {t('settings_save')}</>}
          </button>
        </div>
      )}

      {/* ─── Packages Tab ─── */}
      {activeTab === 'packages' && (
        <div data-testid="admin-packages-section" className="rounded-lg border border-border/50 bg-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-5 h-5 text-[#1793D1]" />
            <h2 className="text-lg font-bold">{t('admin_pkg_title')}</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-5">{t('admin_pkg_desc')}</p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5">{t('admin_pkg_url_label')}</label>
              <input
                data-testid="pkg-api-url-input"
                type="text"
                value={pkgApiUrl}
                onChange={(e) => setPkgApiUrl(e.target.value)}
                placeholder={t('admin_pkg_url_placeholder')}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                data-testid="pkg-settings-save-btn"
                onClick={savePackageSettings}
                disabled={pkgSaving || !pkgApiUrl.trim()}
                className="flex items-center gap-1.5 h-9 px-5 rounded-md bg-[#1793D1] text-white text-xs font-medium hover:bg-[#126A9A] transition-colors disabled:opacity-50 active:scale-95"
              >
                {pkgSaving ? '...' : pkgSaved ? <><Check className="w-3.5 h-3.5" /> {t('admin_pkg_saved')}</> : t('settings_save')}
              </button>
              <button
                data-testid="pkg-settings-test-btn"
                onClick={testPackageApi}
                disabled={pkgTesting}
                className="flex items-center gap-1.5 h-9 px-4 rounded-md border border-[#1793D1]/30 text-[#1793D1] text-xs font-medium hover:bg-[#1793D1]/5 transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" /> {pkgTesting ? '...' : t('admin_pkg_test')}
              </button>
            </div>
            {pkgTestStatus === 'success' && <p className="text-xs text-emerald-400">{t('admin_pkg_test_success')}</p>}
            {pkgTestStatus === 'error' && <p className="text-xs text-red-400">{t('admin_pkg_test_error')}</p>}
          </div>
        </div>
      )}

      {/* GDPR Delete Confirmation Dialog */}
      {deleteTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div data-testid="gdpr-delete-dialog" className="w-full max-w-md rounded-lg border border-red-500/30 bg-card p-6 mx-4 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold">{t('admin_gdpr_delete_title')}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {t('admin_gdpr_delete_confirm')}
            </p>
            <div className="text-sm font-mono text-red-400 mb-6 p-2 rounded bg-red-500/5 border border-red-500/20">
              {deleteTarget.username} ({deleteTarget.role})
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                data-testid="gdpr-delete-cancel-btn"
                onClick={() => setDeleteTarget(null)}
                className="flex items-center gap-1.5 h-9 px-4 rounded-md border border-input text-xs font-medium hover:bg-accent transition-colors"
              >
                <X className="w-3.5 h-3.5" /> {t('admin_gdpr_cancel')}
              </button>
              <button
                data-testid="gdpr-delete-confirm-btn"
                onClick={() => gdprDeleteUser(deleteTarget.id)}
                className="flex items-center gap-1.5 h-9 px-4 rounded-md bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> {t('admin_gdpr_delete_btn')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Role dropdown portal */}
      {roleDropdown && dropdownPos && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => { setRoleDropdown(null); setDropdownPos(null); }} />
          <div className="fixed w-36 rounded-md border bg-popover shadow-lg z-[9999] py-1" style={{ top: dropdownPos.top, right: dropdownPos.right }}>
            {['user', 'moderator', 'admin'].map(role => (
              <button
                key={role}
                data-testid={`role-option-${role}`}
                onClick={() => { changeRole(users.find(u => u.id === roleDropdown)?.id, role); setRoleDropdown(null); setDropdownPos(null); }}
                className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors ${users.find(u => u.id === roleDropdown)?.role === role ? 'text-[#1793D1] font-bold' : ''}`}
              >
                {role}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
