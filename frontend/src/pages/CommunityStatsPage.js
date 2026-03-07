import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Terminal, BookOpen, Users, MessageSquare, HelpCircle, Code2,
  ThumbsUp, CheckCircle2, Tag, BarChart3, Layers
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const difficultyColors = {
  beginner: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  intermediate: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  advanced: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  expert: 'bg-red-500/15 text-red-400 border-red-500/25',
};

export default function CommunityStatsPage() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/stats/community`)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="h-10 w-64 bg-muted/20 rounded animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-lg bg-muted/20 animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { overview, categories, difficulties, top_tags } = data;

  const statCards = [
    { label: t('stats_articles'), value: overview.articles, icon: BookOpen, color: 'text-[#1793D1]', bg: 'bg-[#1793D1]/10' },
    { label: t('stats_users'), value: overview.users, icon: Users, color: 'text-violet-400', bg: 'bg-violet-400/10' },
    { label: t('stats_questions'), value: overview.questions, icon: HelpCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: t('stats_scripts'), value: overview.scripts, icon: Code2, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: t('stats_answers'), value: overview.answers, icon: MessageSquare, color: 'text-sky-400', bg: 'bg-sky-400/10' },
    { label: t('stats_solved'), value: overview.solved_questions, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: t('stats_votes'), value: overview.total_votes, icon: ThumbsUp, color: 'text-pink-400', bg: 'bg-pink-400/10' },
    { label: t('stats_comments'), value: overview.comments, icon: MessageSquare, color: 'text-zinc-400', bg: 'bg-zinc-400/10' },
  ];

  const maxCatCount = Math.max(...categories.map(c => c.count), 1);
  const maxTagCount = Math.max(...top_tags.map(t => t.count), 1);

  return (
    <div data-testid="community-stats-page" className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4 text-[#1793D1] font-mono text-sm">
            <Terminal className="w-4 h-4" />
            <span className="opacity-70">$</span>
            <span className="typing-animation">archhub --stats --community</span>
          </div>
          <h1 data-testid="stats-page-title" className="text-3xl sm:text-4xl font-extrabold tracking-tighter">
            {t('stats_title')}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">{t('stats_subtitle')}</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {statCards.map(card => (
            <div
              key={card.label}
              data-testid={`stat-card-${card.label.toLowerCase().replace(/\s/g, '-')}`}
              className="p-4 rounded-lg border border-border/50 bg-card hover:border-[#1793D1]/20 transition-colors"
            >
              <div className={`w-9 h-9 rounded-md ${card.bg} flex items-center justify-center mb-3`}>
                <card.icon className={`w-4.5 h-4.5 ${card.color}`} />
              </div>
              <div className="text-2xl font-extrabold font-mono">{card.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{card.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Categories Distribution */}
          <div className="rounded-lg border border-border/50 bg-card p-5">
            <div className="flex items-center gap-2 mb-5">
              <Layers className="w-4 h-4 text-[#1793D1]" />
              <h2 className="text-base font-bold">{t('stats_categories')}</h2>
            </div>
            <div className="space-y-3">
              {categories.map(cat => (
                <div key={cat.name} data-testid={`cat-bar-${cat.name}`}>
                  <div className="flex items-center justify-between mb-1">
                    <Link to={`/tutorials?category=${cat.name}`} className="text-sm font-mono hover:text-[#1793D1] transition-colors capitalize">
                      {cat.name.replace(/-/g, ' ')}
                    </Link>
                    <span className="text-xs font-mono text-muted-foreground">{cat.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1793D1]/60 transition-all duration-500"
                      style={{ width: `${(cat.count / maxCatCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Difficulty Distribution */}
          <div className="space-y-6">
            <div className="rounded-lg border border-border/50 bg-card p-5">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="w-4 h-4 text-[#1793D1]" />
                <h2 className="text-base font-bold">{t('stats_difficulty')}</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {difficulties.map(d => (
                  <div
                    key={d.name}
                    data-testid={`diff-card-${d.name}`}
                    className={`p-3 rounded-lg border ${difficultyColors[d.name] || 'border-border/50'}`}
                  >
                    <div className="text-xl font-extrabold font-mono">{d.count}</div>
                    <div className="text-xs font-mono capitalize mt-0.5">{t(`article_difficulty_${d.name}`)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Tags */}
            <div className="rounded-lg border border-border/50 bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-4 h-4 text-[#1793D1]" />
                <h2 className="text-base font-bold">{t('stats_top_tags')}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {top_tags.map(tag => {
                  const opacity = 0.4 + (tag.count / maxTagCount) * 0.6;
                  return (
                    <Link
                      key={tag.name}
                      to={`/tutorials?tag=${tag.name}`}
                      data-testid={`tag-${tag.name}`}
                      className="text-xs font-mono px-2.5 py-1.5 rounded-md border border-[#1793D1]/20 bg-[#1793D1]/5 hover:bg-[#1793D1]/15 hover:border-[#1793D1]/40 transition-colors"
                      style={{ opacity }}
                    >
                      #{tag.name} <span className="text-muted-foreground ml-1">{tag.count}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
