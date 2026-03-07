import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Trophy, Medal, Award, Star, BookOpen, HelpCircle, TrendingUp, Crown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import TerminalHeader from '../components/TerminalHeader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LeaderboardPage() {
  const { t, lang } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('contributors');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/leaderboard`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-8"><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-muted/20 animate-pulse" />)}</div></div>;
  }

  const rankColors = ['text-amber-400', 'text-zinc-400', 'text-orange-500'];
  const rankIcons = [Crown, Medal, Award];

  const tabs = [
    { key: 'contributors', label: t('leaderboard_tab_contributors'), icon: Trophy },
    { key: 'authors', label: t('leaderboard_tab_authors'), icon: BookOpen },
    { key: 'answerers', label: t('leaderboard_tab_answerers'), icon: HelpCircle },
    { key: 'rising', label: t('leaderboard_tab_rising'), icon: TrendingUp },
  ];

  return (
    <div data-testid="leaderboard-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TerminalHeader command="cat /etc/archhub/leaderboard" />
      <div className="flex items-center gap-3 mb-8">
        <Trophy className="w-7 h-7 text-amber-400" />
        <h1 className="text-3xl font-extrabold tracking-tighter">{t('leaderboard_title')}</h1>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-8 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.key}
            data-testid={`tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key ? 'border-[#1793D1] text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Top Contributors */}
      {activeTab === 'contributors' && data?.top_contributors && (
        <div className="space-y-3">
          {/* Podium - Top 3 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {data.top_contributors.slice(0, 3).map((user, i) => {
              const RankIcon = rankIcons[i];
              return (
                <div key={user.id} data-testid={`leader-${user.username}`} className={`relative p-6 rounded-lg border ${i === 0 ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/50 bg-card'} text-center`}>
                  <RankIcon className={`w-8 h-8 ${rankColors[i]} mx-auto mb-3`} />
                  <span className="text-xs font-mono text-muted-foreground">#{i + 1}</span>
                  <Link to={`/user/${user.username}`} className="block">
                    <div className="w-14 h-14 rounded-lg bg-[#1793D1]/20 border border-[#1793D1]/30 flex items-center justify-center mx-auto my-3">
                      <span className="text-[#1793D1] font-mono text-xl font-bold">{user.username[0].toUpperCase()}</span>
                    </div>
                    <h3 className="font-bold font-mono text-sm hover:text-[#1793D1] transition-colors">{user.username}</h3>
                  </Link>
                  <div className="text-2xl font-extrabold font-mono mt-2 text-[#1793D1]">{user.reputation}</div>
                  <div className="text-xs text-muted-foreground">{t('leaderboard_reputation')}</div>
                  <div className="flex justify-center gap-4 mt-3 text-xs text-muted-foreground font-mono">
                    <span>{user.article_count} {t('leaderboard_articles')}</span>
                    <span>TL {user.trust_level}</span>
                  </div>
                  {user.badges?.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 mt-3">
                      {user.badges.slice(0, 3).map(b => (
                        <span key={b} className="text-[10px] font-mono text-amber-400/70 bg-amber-500/10 px-1.5 py-0.5 rounded">{b}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Rest of the list */}
          <div className="rounded-lg border border-border/50 overflow-hidden">
            {data.top_contributors.slice(3).map((user, i) => (
              <div key={user.id} className="flex items-center gap-4 px-4 py-3 border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors">
                <span className="text-sm font-mono text-muted-foreground w-8 text-right">#{i + 4}</span>
                <div className="w-8 h-8 rounded-sm bg-[#1793D1]/20 flex items-center justify-center shrink-0">
                  <span className="text-[#1793D1] font-mono text-xs font-bold">{user.username[0].toUpperCase()}</span>
                </div>
                <Link to={`/user/${user.username}`} className="flex-1 font-mono text-sm font-medium hover:text-[#1793D1] transition-colors">
                  {user.username}
                </Link>
                <span className="text-sm font-mono font-bold text-[#1793D1]">{user.reputation}</span>
                <span className="text-xs font-mono text-muted-foreground hidden sm:inline">{user.article_count} {t('leaderboard_articles').toLowerCase()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Authors */}
      {activeTab === 'authors' && data?.top_authors && (
        <div className="space-y-3">
          {data.top_authors.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">{t('leaderboard_no_data')}</div>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              {data.top_authors.map((author, i) => (
                <div key={author.username} className="flex items-center gap-4 px-4 py-3 border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors">
                  <span className={`text-sm font-mono w-8 text-right font-bold ${i < 3 ? rankColors[i] : 'text-muted-foreground'}`}>#{i + 1}</span>
                  <div className="w-8 h-8 rounded-sm bg-[#1793D1]/20 flex items-center justify-center shrink-0">
                    <span className="text-[#1793D1] font-mono text-xs font-bold">{author.username[0].toUpperCase()}</span>
                  </div>
                  <Link to={`/user/${author.username}`} className="flex-1 font-mono text-sm font-medium hover:text-[#1793D1] transition-colors">
                    {author.username}
                  </Link>
                  <div className="text-right">
                    <span className="text-sm font-mono font-bold">{author.total_votes}</span>
                    <span className="text-xs text-muted-foreground ml-1">{t('leaderboard_votes')}</span>
                  </div>
                  <div className="text-right hidden sm:block">
                    <span className="text-xs font-mono text-muted-foreground">{author.article_count} {t('leaderboard_articles').toLowerCase()}</span>
                  </div>
                  <div className="text-right hidden md:block">
                    <span className="text-xs font-mono text-muted-foreground">{author.total_views} {t('leaderboard_views')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Top Answerers */}
      {activeTab === 'answerers' && data?.top_answerers && (
        <div className="space-y-3">
          {data.top_answerers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">{t('leaderboard_no_answers')}</div>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              {data.top_answerers.map((answerer, i) => (
                <div key={answerer.username} className="flex items-center gap-4 px-4 py-3 border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors">
                  <span className={`text-sm font-mono w-8 text-right font-bold ${i < 3 ? rankColors[i] : 'text-muted-foreground'}`}>#{i + 1}</span>
                  <div className="w-8 h-8 rounded-sm bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-mono text-xs font-bold">{answerer.username[0].toUpperCase()}</span>
                  </div>
                  <Link to={`/user/${answerer.username}`} className="flex-1 font-mono text-sm font-medium hover:text-[#1793D1] transition-colors">
                    {answerer.username}
                  </Link>
                  <div className="flex items-center gap-1 text-emerald-400">
                    <Star className="w-3.5 h-3.5" />
                    <span className="text-sm font-mono font-bold">{answerer.accepted_count}</span>
                    <span className="text-xs">{t('leaderboard_accepted')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rising Stars */}
      {activeTab === 'rising' && data?.rising_stars && (
        <div className="space-y-3">
          {data.rising_stars.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">{t('leaderboard_no_activity')}</div>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              {data.rising_stars.map((star, i) => (
                <div key={star.username} className="flex items-center gap-4 px-4 py-3 border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors">
                  <TrendingUp className={`w-4 h-4 ${i < 3 ? 'text-[#1793D1]' : 'text-muted-foreground'}`} />
                  <div className="w-8 h-8 rounded-sm bg-[#1793D1]/20 flex items-center justify-center shrink-0">
                    <span className="text-[#1793D1] font-mono text-xs font-bold">{star.username[0].toUpperCase()}</span>
                  </div>
                  <Link to={`/user/${star.username}`} className="flex-1 font-mono text-sm font-medium hover:text-[#1793D1] transition-colors">
                    {star.username}
                  </Link>
                  <span className="text-xs font-mono text-muted-foreground">
                    {t('leaderboard_last_activity')}: {new Date(star.last_activity).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
