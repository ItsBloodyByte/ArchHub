import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, BookOpen, Users, MessageSquare, Terminal, Shield, Zap, HelpCircle, Sparkles, Code2, Trophy, BarChart3, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import ArticleCard from '../components/ArticleCard';
import AnnouncementBanner from '../components/AnnouncementBanner';
import InteractiveTerminal from '../components/InteractiveTerminal';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Home() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [featured, setFeatured] = useState([]);
  const [stats, setStats] = useState({ articles: 0, users: 0, comments: 0 });
  const [recentQuestions, setRecentQuestions] = useState([]);
  const [scriptOfTheDay, setScriptOfTheDay] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [featuredRes, statsRes, qaRes, sotdRes] = await Promise.all([
          axios.get(`${API}/articles/featured`),
          axios.get(`${API}/stats`),
          axios.get(`${API}/questions?limit=3&sort=newest`),
          axios.get(`${API}/script-of-the-day`).catch(() => ({ data: {} }))
        ]);
        setFeatured(featuredRes.data.articles);
        setStats(statsRes.data);
        setRecentQuestions(qaRes.data.questions || []);
        if (sotdRes.data?.script) setScriptOfTheDay(sotdRes.data.script);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div data-testid="home-page" className="min-h-screen">
      {/* Admin Announcement Banner */}
      <AnnouncementBanner />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 relative">
          <div className="max-w-3xl">
            {/* Terminal prompt decorator */}
            <div className="flex items-center gap-2 mb-6 text-[#1793D1] font-mono text-sm">
              <Terminal className="w-4 h-4" />
              <span className="opacity-70">$</span>
              <span className="typing-animation">welcome --to archhub</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter mb-6">
              {t('home_hero_title').split('Arch Linux').map((part, i) => (
                <React.Fragment key={i}>
                  {part}
                  {i === 0 && <span className="text-[#1793D1]">Arch Linux</span>}
                </React.Fragment>
              ))}
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 max-w-2xl">
              {t('home_hero_subtitle')}
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/tutorials"
                data-testid="hero-cta"
                className="inline-flex items-center gap-2 h-11 px-6 rounded-sm bg-[#1793D1] text-white font-medium hover:bg-[#126A9A] transition-all active:scale-95 shadow-sm"
              >
                {t('home_hero_cta')}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/register"
                data-testid="hero-secondary"
                className="inline-flex items-center gap-2 h-11 px-6 rounded-sm border border-[#1793D1] text-[#1793D1] font-medium hover:bg-[#1793D1]/10 transition-all"
              >
                {t('home_hero_secondary')}
              </Link>
            </div>
          </div>

          {/* Interactive terminal window */}
          <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 w-96">
            <InteractiveTerminal />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-3 gap-8">
            <div data-testid="stat-articles" className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <BookOpen className="w-5 h-5 text-[#1793D1]" />
                <span className="text-2xl md:text-3xl font-extrabold font-mono">{stats.articles}</span>
              </div>
              <span className="text-sm text-muted-foreground">{t('home_stats_articles')}</span>
            </div>
            <div data-testid="stat-users" className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="w-5 h-5 text-[#1793D1]" />
                <span className="text-2xl md:text-3xl font-extrabold font-mono">{stats.users}</span>
              </div>
              <span className="text-sm text-muted-foreground">{t('home_stats_users')}</span>
            </div>
            <div data-testid="stat-comments" className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <MessageSquare className="w-5 h-5 text-[#1793D1]" />
                <span className="text-2xl md:text-3xl font-extrabold font-mono">{stats.comments}</span>
              </div>
              <span className="text-sm text-muted-foreground">{t('home_stats_comments')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg border border-border/50 bg-card hover:border-[#1793D1]/30 transition-colors">
              <Shield className="w-8 h-8 text-[#1793D1] mb-4" />
              <h3 className="font-bold tracking-tight mb-2">{t('home_feature_privacy')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('auth_privacy_note')}
              </p>
            </div>
            <div className="p-6 rounded-lg border border-border/50 bg-card hover:border-[#1793D1]/30 transition-colors">
              <Users className="w-8 h-8 text-[#1793D1] mb-4" />
              <h3 className="font-bold tracking-tight mb-2">{t('home_feature_community_title')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('home_feature_community')}
              </p>
            </div>
            <div className="p-6 rounded-lg border border-border/50 bg-card hover:border-[#1793D1]/30 transition-colors">
              <Zap className="w-8 h-8 text-[#1793D1] mb-4" />
              <h3 className="font-bold tracking-tight mb-2">{t('home_feature_opensource_title')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('home_feature_opensource')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Script of the Day */}
      {scriptOfTheDay && (
        <section data-testid="script-of-the-day" className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-xl border border-[#1793D1]/20 bg-gradient-to-r from-[#1793D1]/5 via-transparent to-transparent overflow-hidden">
              <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start">
                <div className="shrink-0 flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-xl bg-[#1793D1]/10 border border-[#1793D1]/20 flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-[#1793D1]" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#1793D1] bg-[#1793D1]/10 px-2 py-0.5 rounded-full">{t('sotd_badge')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1793D1] mb-2">{t('sotd_title')}</h3>
                  <Link to={`/scripts/${scriptOfTheDay.id}`} className="block group">
                    <h4 className="text-xl md:text-2xl font-extrabold tracking-tight group-hover:text-[#1793D1] transition-colors mb-2">
                      {scriptOfTheDay.title}
                    </h4>
                  </Link>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-2">
                    {scriptOfTheDay.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-mono">
                    <Link to={`/user/${scriptOfTheDay.author_username}`} className="hover:text-[#1793D1] transition-colors">
                      {t('sotd_by')} {scriptOfTheDay.author_username}
                    </Link>
                    <span>{scriptOfTheDay.language}</span>
                    <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> {scriptOfTheDay.vote_score} votes</span>
                    <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {scriptOfTheDay.view_count} views</span>
                  </div>
                  {scriptOfTheDay.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {scriptOfTheDay.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-mono text-[#1793D1]/60 bg-[#1793D1]/5 px-1.5 py-0.5 rounded">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <Link to={`/scripts/${scriptOfTheDay.id}`} className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1793D1] text-white text-xs font-medium hover:bg-[#126A9A] transition-colors self-center">
                  <Code2 className="w-3.5 h-3.5" /> {t('home_explore')}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quick Links */}
      <section data-testid="home-quick-links" className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg font-bold tracking-tight mb-5">{t('home_explore')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to="/questions" data-testid="quick-link-qa" className="group flex items-center gap-3 p-4 rounded-lg border border-border/50 bg-card hover:border-emerald-400/30 transition-all">
              <div className="w-10 h-10 rounded-md bg-emerald-400/10 flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-bold group-hover:text-emerald-400 transition-colors">Q&A</div>
                <div className="text-xs text-muted-foreground">{t('home_quick_qa')}</div>
              </div>
            </Link>
            <Link to="/scripts" data-testid="quick-link-scripts" className="group flex items-center gap-3 p-4 rounded-lg border border-border/50 bg-card hover:border-amber-400/30 transition-all">
              <div className="w-10 h-10 rounded-md bg-amber-400/10 flex items-center justify-center shrink-0">
                <Code2 className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-sm font-bold group-hover:text-amber-400 transition-colors">{t('home_scripts')}</div>
                <div className="text-xs text-muted-foreground">{t('home_quick_scripts')}</div>
              </div>
            </Link>
            <Link to="/leaderboard" data-testid="quick-link-leaderboard" className="group flex items-center gap-3 p-4 rounded-lg border border-border/50 bg-card hover:border-[#1793D1]/30 transition-all">
              <div className="w-10 h-10 rounded-md bg-[#1793D1]/10 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-[#1793D1]" />
              </div>
              <div>
                <div className="text-sm font-bold group-hover:text-[#1793D1] transition-colors">{t('home_leaderboard')}</div>
                <div className="text-xs text-muted-foreground">{t('home_quick_leaderboard')}</div>
              </div>
            </Link>
            <Link to="/stats" data-testid="quick-link-stats" className="group flex items-center gap-3 p-4 rounded-lg border border-border/50 bg-card hover:border-violet-400/30 transition-all">
              <div className="w-10 h-10 rounded-md bg-violet-400/10 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <div className="text-sm font-bold group-hover:text-violet-400 transition-colors">{t('stats_title')}</div>
                <div className="text-xs text-muted-foreground">{t('home_quick_stats')}</div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Latest Questions */}
      {recentQuestions.length > 0 && (
        <section data-testid="home-latest-questions" className="py-12 border-b border-border/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold tracking-tight">{t('home_latest_questions')}</h2>
              <Link to="/questions" className="text-sm text-[#1793D1] hover:underline underline-offset-4 flex items-center gap-1">
                {t('home_view_all')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-2">
              {recentQuestions.map(q => (
                <Link
                  key={q.id}
                  to={`/questions/${q.id}`}
                  data-testid={`home-question-${q.id}`}
                  className="group flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:border-emerald-400/30 bg-card transition-all"
                >
                  <div className={`shrink-0 w-8 h-8 rounded-md flex items-center justify-center ${q.accepted_answer_id ? 'bg-emerald-400/15' : 'bg-muted/30'}`}>
                    {q.accepted_answer_id
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      : <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium truncate group-hover:text-[#1793D1] transition-colors">{q.title}</h3>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="font-mono">{q.author_username}</span>
                      <span>{q.answer_count} {t('home_answers')}</span>
                      <span>{q.vote_score} {t('article_votes')}</span>
                    </div>
                  </div>
                  {q.tags?.slice(0, 2).map(tag => (
                    <span key={tag} className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Articles */}
      {featured.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t('home_featured')}</h2>
              <Link to="/tutorials" className="text-sm text-[#1793D1] hover:underline underline-offset-4 flex items-center gap-1">
                {t('home_view_all')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-64 rounded-lg border border-border/50 bg-muted/20 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featured.slice(0, 6).map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
