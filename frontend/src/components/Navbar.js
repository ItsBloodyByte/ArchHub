import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Menu, X, Plus, Sun, Moon, ChevronDown, LogOut, User, Settings, Globe, Shield, Bookmark, FileText, Trophy, BarChart3, Bug } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import NotificationBell from './NotificationBell';
import UserAvatar from './UserAvatar';
import axios from 'axios';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [siteLogo, setSiteLogo] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/site/design`).then(res => {
      if (res.data?.logo_url) setSiteLogo(res.data.logo_url);
    }).catch(() => {});
  }, []);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navLinkClass = (path) =>
    `px-3 py-2 text-sm font-medium transition-colors ${
      isActive(path)
        ? 'text-[#1793D1]'
        : 'text-muted-foreground hover:text-foreground'
    }`;

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileOpen(false);
    }
  };

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <nav data-testid="main-navbar" className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" data-testid="nav-logo" className="flex items-center gap-2 shrink-0">
            {siteLogo ? (
              <img src={siteLogo} alt="Logo" className="h-7 object-contain" />
            ) : null}
            <span className="font-bold text-lg tracking-tight font-mono">
              Arch<span className="text-[#1793D1]">Hub</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link to="/" data-testid="nav-home" className={navLinkClass('/')}>
              {t('nav_home')}
            </Link>
            <Link to="/tutorials" data-testid="nav-tutorials" className={navLinkClass('/tutorials')}>
              {t('nav_tutorials')}
            </Link>
            <Link to="/questions" data-testid="nav-qa" className={navLinkClass('/questions')}>
              {t('nav_qa')}
            </Link>
            <Link to="/scripts" data-testid="nav-scripts" className={navLinkClass('/scripts')}>
              {t('nav_scripts')}
            </Link>
            <Link to="/collections" data-testid="nav-collections" className={navLinkClass('/collections')}>
              {t('nav_collections')}
            </Link>
            <Link to="/packages" data-testid="nav-packages" className={navLinkClass('/packages')}>
              {t('nav_packages')}
            </Link>
            <Link to="/stats" data-testid="nav-stats" className={navLinkClass('/stats')}>
              <BarChart3 className="w-4 h-4" />
            </Link>
            <Link to="/leaderboard" data-testid="nav-leaderboard" className={navLinkClass('/leaderboard')}>
              <Trophy className="w-4 h-4" />
            </Link>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                data-testid="nav-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search_placeholder')}
                className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1]"
              />
            </div>
          </form>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <button
              data-testid="lang-toggle"
              onClick={() => setLang(lang === 'en' ? 'de' : 'en')}
              className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title={lang === 'en' ? 'Deutsch' : 'English'}
            >
              <Globe className="w-4 h-4" />
            </button>

            {/* Theme Toggle */}
            <button
              data-testid="theme-toggle"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {user ? (
              <>
                <NotificationBell />
                <Link
                  to="/editor"
                  data-testid="nav-new-article"
                  className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-sm bg-[#1793D1] text-white text-sm font-medium hover:bg-[#126A9A] transition-colors active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('nav_new_article')}</span>
                </Link>

                {/* User Menu */}
                <div className="relative">
                  <button
                    data-testid="user-menu-trigger"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 h-9 px-2 rounded-md hover:bg-accent transition-colors"
                  >
                    <UserAvatar username={user.username} size={28} />
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </button>

                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <div data-testid="user-menu-dropdown" className="absolute right-0 top-full mt-1 w-52 rounded-md border bg-popover shadow-lg z-50 py-1">
                        <div className="px-3 py-2 border-b border-border">
                          <p className="text-sm font-medium font-mono">{user.username}</p>
                          <p className="text-xs text-muted-foreground">{t('profile_reputation')}: {user.reputation}</p>
                        </div>
                        <Link to={`/user/${user.username}`} onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors">
                          <User className="w-4 h-4" /> {t('nav_profile')}
                        </Link>
                        <Link to="/my-drafts" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors">
                          <FileText className="w-4 h-4" /> {t('editor_my_drafts')}
                        </Link>
                        <Link to="/bookmarks" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors">
                          <Bookmark className="w-4 h-4" /> {t('bookmark_list')}
                        </Link>
                        {(user.role === 'moderator' || user.role === 'admin') && (
                          <Link to="/moderation" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-amber-400">
                            <Shield className="w-4 h-4" /> {t('mod_dashboard')}
                          </Link>
                        )}
                        {user.role === 'admin' && (
                          <Link to="/admin" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-red-400">
                            <Settings className="w-4 h-4" /> {t('admin_dashboard')}
                          </Link>
                        )}
                        <div className="border-t border-border my-1" />
                        <Link to="/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors">
                          <Settings className="w-4 h-4" /> {t('nav_settings')}
                        </Link>
                        <button onClick={() => { logout(); setUserMenuOpen(false); navigate('/'); }} data-testid="nav-logout" className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-destructive">
                          <LogOut className="w-4 h-4" /> {t('nav_logout')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" data-testid="nav-login" className="h-9 px-3 rounded-sm text-sm font-medium hover:bg-accent transition-colors flex items-center">
                  {t('nav_login')}
                </Link>
                <Link to="/register" data-testid="nav-register" className="hidden sm:flex h-9 px-3 rounded-sm bg-[#1793D1] text-white text-sm font-medium hover:bg-[#126A9A] transition-colors items-center active:scale-95">
                  {t('nav_register')}
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              data-testid="mobile-menu-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-md hover:bg-accent"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div data-testid="mobile-menu" className="md:hidden border-t border-border bg-background/95 backdrop-blur-md">
          <div className="px-4 py-3 space-y-2">
            <form onSubmit={handleSearch} className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('search_placeholder')}
                  className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm"
                />
              </div>
            </form>
            <Link to="/" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm rounded-md hover:bg-accent">{t('nav_home')}</Link>
            <Link to="/tutorials" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm rounded-md hover:bg-accent">{t('nav_tutorials')}</Link>
            <Link to="/questions" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm rounded-md hover:bg-accent">{t('nav_qa')}</Link>
            <Link to="/scripts" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm rounded-md hover:bg-accent">{t('nav_scripts')}</Link>
            <Link to="/collections" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm rounded-md hover:bg-accent">{t('nav_collections')}</Link>
            <Link to="/packages" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm rounded-md hover:bg-accent">{t('nav_packages')}</Link>
            <Link to="/stats" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm rounded-md hover:bg-accent">{t('stats_title')}</Link>
            <Link to="/leaderboard" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm rounded-md hover:bg-accent">{t('home_leaderboard')}</Link>
            {user && (
              <Link to="/editor" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm rounded-md hover:bg-accent text-[#1793D1]">
                + {t('nav_new_article')}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
