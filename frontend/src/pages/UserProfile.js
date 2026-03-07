import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Award, Calendar, BookOpen, MessageSquare, Star, Shield, HelpCircle, Terminal, Code2, CheckCircle2, ThumbsUp, ArrowRight, Flag, Trophy, Sparkles, Rocket, Github, Globe, ExternalLink } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import ArticleCard from '../components/ArticleCard';
import UserAvatar from '../components/UserAvatar';
import ReportModal from '../components/ReportModal';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TRUST_LEVELS = {
  0: { en: 'Newcomer', de: 'Neuankömmling' },
  1: { en: 'Contributor', de: 'Mitwirkender' },
  2: { en: 'Trusted', de: 'Vertrauenswürdig' },
  3: { en: 'Experienced', de: 'Erfahren' },
  4: { en: 'Veteran', de: 'Veteran' },
};

const BADGE_NAMES = {
  first_article: { en: 'First Article', de: 'Erster Artikel', icon: BookOpen },
  helpful_10: { en: '10 Helpful Comments', de: '10 hilfreiche Kommentare', icon: MessageSquare },
  reviewer: { en: 'Reviewer', de: 'Reviewer', icon: Star },
  bug_reporter: { en: 'Bug Reporter', de: 'Bug Reporter', icon: Shield },
  first_question: { en: 'First Question', de: 'Erste Frage', icon: HelpCircle },
  first_answer: { en: 'First Answer', de: 'Erste Antwort', icon: MessageSquare },
  first_script: { en: 'First Script', de: 'Erstes Skript', icon: Code2 },
  popular_article: { en: 'Popular Article', de: 'Beliebter Artikel', icon: Star },
  top_voter: { en: 'Top Voter', de: 'Top-Abstimmer', icon: ThumbsUp },
  prolific_author: { en: 'Prolific Author', de: 'Vielschreiber', icon: BookOpen },
  community_helper: { en: 'Community Helper', de: 'Community-Helfer', icon: Award },
  moderator_badge: { en: 'Moderator', de: 'Moderator', icon: Shield },
  script_of_the_day: { en: 'Script of the Day', de: 'Skript des Tages', icon: Trophy },
  prolific_writer: { en: 'Prolific Writer', de: 'Vielschreiber', icon: BookOpen },
  accepted_answer: { en: 'Accepted Answer', de: 'Akzeptierte Antwort', icon: CheckCircle2 },
  arch_btw: { en: 'I use Arch btw', de: 'Ich benutze Arch btw', icon: Sparkles, animated: true },
  pioneer: { en: 'ArchHub Pioneer', de: 'ArchHub Pionier', icon: Rocket, legendary: true },
};

export default function UserProfile() {
  const { username } = useParams();
  const { lang, t } = useLanguage();
  const { user: currentUser, authHeaders } = useAuth();
  const [profile, setProfile] = useState(null);
  const [articles, setArticles] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('articles');
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    try {
      const res = await axios.get(`${API}/users/${username}/profile`);
      setProfile(res.data.user);
      setArticles(res.data.articles || []);
      setQuestions(res.data.questions || []);
      setAnswers(res.data.answers || []);
      setScripts(res.data.scripts || []);
    } catch (err) {
      setError('User not found');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="flex gap-4">
            <div className="w-20 h-20 bg-muted/30 rounded-lg" />
            <div className="space-y-2 flex-1">
              <div className="h-6 bg-muted/30 rounded w-1/4" />
              <div className="h-4 bg-muted/20 rounded w-1/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">{error || 'User not found'}</p>
      </div>
    );
  }

  const trustLevel = TRUST_LEVELS[profile.trust_level] || TRUST_LEVELS[0];

  const tabs = [
    { key: 'articles', label: t('profile_articles'), count: articles.length, icon: BookOpen },
    { key: 'questions', label: t('profile_questions'), count: questions.length, icon: HelpCircle },
    { key: 'answers', label: t('profile_answers'), count: answers.length, icon: MessageSquare },
    { key: 'scripts', label: t('profile_scripts'), count: scripts.length, icon: Code2 },
  ];

  return (
    <div data-testid="user-profile-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Terminal decoration */}
      <div className="flex items-center gap-2 mb-2 text-[#1793D1] font-mono text-sm">
        <Terminal className="w-4 h-4" />
        <span className="opacity-70">$</span>
        <span className="typing-animation">whoami --profile {username}</span>
      </div>

      {/* Profile Header */}
      <div className="rounded-lg border border-border/50 bg-card p-6 md:p-8 mb-8">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          <UserAvatar username={profile.username} size={80} className="border border-border/50" />

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tighter">{profile.username}</h1>
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-xs font-mono px-2 py-0.5 rounded border border-[#1793D1]/30 text-[#1793D1] bg-[#1793D1]/5">
                  {trustLevel[lang] || trustLevel.en}
                </span>
                {profile.role !== 'user' && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded border border-amber-500/30 text-amber-400 bg-amber-500/5">
                    {profile.role}
                  </span>
                )}
              </div>
            </div>

            {profile.bio && (
              <p data-testid="profile-bio" className="text-sm text-muted-foreground mt-3 max-w-xl leading-relaxed">{profile.bio}</p>
            )}

            {/* Stats */}
            <div className="flex flex-wrap gap-6 mt-4">
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#1793D1]" />
                <span className="text-sm font-mono font-bold">{profile.reputation}</span>
                <span className="text-xs text-muted-foreground">{t('profile_reputation')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-mono font-bold">{articles.length}</span>
                <span className="text-xs text-muted-foreground">{t('profile_articles')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-mono font-bold">{questions.length}</span>
                <span className="text-xs text-muted-foreground">{t('profile_questions')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-mono font-bold">{scripts.length}</span>
                <span className="text-xs text-muted-foreground">{t('profile_scripts')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{t('profile_member_since')} {new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Badges */}
            {profile.badges?.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">{t('profile_badges')}</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.badges.map(badge => {
                    const badgeInfo = BADGE_NAMES[badge];
                    const Icon = badgeInfo?.icon || Star;
                    const isAnimated = badgeInfo?.animated;
                    const isLegendary = badgeInfo?.legendary;
                    return (
                      <span key={badge} data-testid={`badge-${badge}`} className={`flex items-center gap-1 text-xs font-mono px-2 py-1 rounded border ${
                        isLegendary ? 'border-[#1793D1]/50 bg-gradient-to-r from-[#1793D1]/20 via-emerald-500/10 to-[#1793D1]/20 text-[#1793D1] shadow-sm shadow-[#1793D1]/10' :
                        isAnimated ? 'border-[#1793D1]/40 bg-gradient-to-r from-[#1793D1]/10 via-amber-500/10 to-[#1793D1]/10' :
                        'border-amber-500/20 bg-amber-500/5 text-amber-400'
                      }`}>
                        <Icon className={`w-3 h-3 ${isAnimated ? 'badge-arch-btw-icon' : ''} ${isLegendary ? 'text-[#1793D1]' : ''}`} />
                        <span className={isAnimated ? 'badge-arch-btw' : ''}>{badgeInfo?.[lang] || badge}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Social Links */}
            {profile.social_links && Object.values(profile.social_links).some(v => v) && (
              <div data-testid="profile-social-links" className="mt-4">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">{t('social_links_title')}</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.social_links.github && (
                    <a data-testid="social-link-github" href={`https://github.com/${profile.social_links.github}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded border border-border/40 bg-background/50 text-muted-foreground hover:text-foreground hover:border-[#1793D1]/40 transition-colors">
                      <Github className="w-3.5 h-3.5" /> {profile.social_links.github}
                    </a>
                  )}
                  {profile.social_links.gitlab && (
                    <a data-testid="social-link-gitlab" href={`https://gitlab.com/${profile.social_links.gitlab}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded border border-border/40 bg-background/50 text-muted-foreground hover:text-foreground hover:border-[#1793D1]/40 transition-colors">
                      <Code2 className="w-3.5 h-3.5" /> {profile.social_links.gitlab}
                    </a>
                  )}
                  {profile.social_links.reddit && (
                    <a data-testid="social-link-reddit" href={`https://reddit.com/u/${profile.social_links.reddit.replace(/^u\//, '')}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded border border-border/40 bg-background/50 text-muted-foreground hover:text-foreground hover:border-orange-500/40 transition-colors">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
                      {profile.social_links.reddit}
                    </a>
                  )}
                  {profile.social_links.xing && (
                    <a data-testid="social-link-xing" href={`https://www.xing.com/profile/${profile.social_links.xing}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded border border-border/40 bg-background/50 text-muted-foreground hover:text-foreground hover:border-emerald-500/40 transition-colors">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.188 0c-.517 0-.741.325-.927.66 0 0-7.455 13.224-7.702 13.657.015.024 4.919 9.023 4.919 9.023.17.308.436.66.967.66h3.454c.211 0 .375-.078.463-.22.089-.151.089-.346-.009-.536l-4.879-8.916c-.004-.006-.004-.016 0-.022L22.139.756c.095-.191.097-.387.006-.535C22.056.078 21.894 0 21.686 0h-3.498zM3.648 4.74c-.211 0-.385.074-.473.216-.09.149-.078.339.02.531l2.34 4.05c.004.01.004.016 0 .021L3.169 13.82c-.09.186-.089.381 0 .529.085.142.239.234.45.234h3.461c.518 0 .766-.348.945-.667l2.435-4.347c-.016-.028-2.354-4.107-2.354-4.107-.175-.318-.424-.669-.957-.669z"/></svg>
                      {profile.social_links.xing}
                    </a>
                  )}
                  {profile.social_links.mastodon && (
                    <a data-testid="social-link-mastodon" href={profile.social_links.mastodon.startsWith('http') ? profile.social_links.mastodon : `https://${profile.social_links.mastodon.replace(/^@/, '').split('@').reverse().join('/@')}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded border border-border/40 bg-background/50 text-muted-foreground hover:text-foreground hover:border-purple-500/40 transition-colors">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054 19.648 19.648 0 0 0 4.638.536c.564 0 1.132 0 1.7-.026 1.853-.074 3.806-.264 5.612-.814a4.68 4.68 0 0 0 .171-.052c2.397-.727 4.477-2.99 4.608-8.583.005-.194.043-2.023.043-2.226 0-.664.196-4.708-.262-7.19zM19.69 13.302h-2.87v-5.73c0-1.207-.502-1.82-1.508-1.82-1.11 0-1.668.727-1.668 2.166v3.134h-2.854V7.918c0-1.44-.558-2.166-1.668-2.166-1.006 0-1.508.613-1.508 1.82v5.73H4.744V7.702c0-1.207.306-2.166.92-2.876.632-.71 1.46-1.074 2.49-1.074 1.19 0 2.09.457 2.684 1.373l.579.97.579-.97c.594-.916 1.494-1.373 2.684-1.373 1.03 0 1.858.364 2.49 1.074.614.71.92 1.669.92 2.876z"/></svg>
                      {profile.social_links.mastodon}
                    </a>
                  )}
                  {profile.social_links.arch_wiki && (
                    <a data-testid="social-link-arch" href={`https://wiki.archlinux.org/title/User:${profile.social_links.arch_wiki}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded border border-[#1793D1]/20 bg-[#1793D1]/5 text-[#1793D1]/80 hover:text-[#1793D1] hover:border-[#1793D1]/40 transition-colors">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.39.11A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12.61.11zm.31 3.05c.7.01 1.38.16 2.05.46-.55 1.09-1.02 2.22-1.52 3.35-.6-.67-.92-1.54-1.37-2.33l-.76.59c.63 1.29 1.04 2.66 1.48 4.03.29-.73.63-1.45.94-2.17.52.55.88 1.22 1.24 1.9-.86 1.88-1.65 3.79-2.46 5.69-.58-2.07-1.24-4.12-1.9-6.16C8.3 6.95 7.26 5.37 6.2 3.82c.79-.33 1.61-.55 2.45-.61.35-.03.7-.05 1.05-.05zm4.25 1.67c.76 1.37 1.3 2.85 1.81 4.34-.82.01-1.63-.04-2.44-.15.39-1.39.65-2.8.63-4.19zM7.02 5.13c.77 1.24 1.49 2.5 2 3.86-1.08.17-2.17.26-3.26.29.33-1.42.67-2.83 1.26-4.15zm13.08 3.22c.19 1.14.24 2.3.16 3.45-.84-.5-1.82-.7-2.77-.86.82-.81 1.62-1.65 2.61-2.59zM3.51 9.15c1.3.05 2.6-.1 3.87-.36.36 1.42.83 2.8 1.38 4.15-1.52.63-2.99 1.37-4.34 2.31-.56-1.93-.83-3.98-.91-6.1zm16.12 1.14c-.62.61-1.28 1.17-1.93 1.74-.54-.93-.92-1.95-1.32-2.97.98.22 2.28.61 3.25 1.23zM8.67 14.05c-.63-1.1-1.09-2.28-1.49-3.48 1.19-.31 2.4-.49 3.61-.57-.7 1.37-1.36 2.73-2.12 4.05zm6.07-.5c-.52.95-1.04 1.89-1.56 2.83-.49-.99-1-1.97-1.55-2.93.99-.06 2.11-.04 3.11.1z"/></svg>
                      {profile.social_links.arch_wiki}
                    </a>
                  )}
                  {profile.social_links.website && (
                    <a data-testid="social-link-website" href={profile.social_links.website.startsWith('http') ? profile.social_links.website : `https://${profile.social_links.website}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded border border-border/40 bg-background/50 text-muted-foreground hover:text-foreground hover:border-[#1793D1]/40 transition-colors">
                      <Globe className="w-3.5 h-3.5" /> {profile.social_links.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Report User button */}
            {currentUser && currentUser.username !== profile.username && (
              <button
                data-testid="report-user-btn"
                onClick={() => setShowReport(true)}
                className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-amber-400 transition-colors"
              >
                <Flag className="w-3.5 h-3.5" />
                {t('report_user')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Activity Tabs */}
      <div className="flex items-center gap-1 border-b border-border/40 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            data-testid={`profile-tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-[#1793D1] text-[#1793D1]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className={`text-xs font-mono ${activeTab === tab.key ? 'text-[#1793D1]' : 'text-muted-foreground'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Articles Tab */}
      {activeTab === 'articles' && (
        <div data-testid="profile-articles">
          {articles.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">{t('misc_no_results')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map(article => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Questions Tab */}
      {activeTab === 'questions' && (
        <div data-testid="profile-questions" className="space-y-2">
          {questions.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">{t('misc_no_results')}</p>
          ) : (
            questions.map(q => (
              <Link
                key={q.id}
                to={`/questions/${q.id}`}
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
                    <span>{q.answer_count || 0} {t('profile_answers')}</span>
                    <span>{q.vote_score || 0} votes</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
            ))
          )}
        </div>
      )}

      {/* Answers Tab */}
      {activeTab === 'answers' && (
        <div data-testid="profile-answers" className="space-y-2">
          {answers.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">{t('misc_no_results')}</p>
          ) : (
            answers.map(a => (
              <Link
                key={a.id}
                to={`/questions/${a.question_id}`}
                className="group flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:border-[#1793D1]/30 bg-card transition-all"
              >
                <div className={`shrink-0 w-8 h-8 rounded-md flex items-center justify-center ${a.is_accepted ? 'bg-emerald-400/15' : 'bg-[#1793D1]/10'}`}>
                  {a.is_accepted
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    : <MessageSquare className="w-4 h-4 text-[#1793D1]" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground line-clamp-1">{a.body_text || a.body_markdown || 'Answer'}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span>{a.vote_score || 0} votes</span>
                    {a.is_accepted && <span className="text-emerald-400 font-medium">{t('profile_accepted')}</span>}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
            ))
          )}
        </div>
      )}

      {/* Scripts Tab */}
      {activeTab === 'scripts' && (
        <div data-testid="profile-scripts" className="space-y-2">
          {scripts.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">{t('misc_no_results')}</p>
          ) : (
            scripts.map(s => (
              <Link
                key={s.id}
                to={`/scripts/${s.id}`}
                className="group flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:border-amber-400/30 bg-card transition-all"
              >
                <div className="shrink-0 w-8 h-8 rounded-md bg-amber-400/10 flex items-center justify-center">
                  <Terminal className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium truncate group-hover:text-amber-400 transition-colors">{s.title}</h3>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span className="capitalize">{s.category}</span>
                    <span>{s.vote_score || 0} votes</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
            ))
          )}
        </div>
      )}

      {showReport && profile && (
        <ReportModal targetType="user" targetId={profile.id || profile.username} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}
