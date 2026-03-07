import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, Eye, MessageSquare, Clock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import UserAvatar from './UserAvatar';

const difficultyColors = {
  beginner: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  intermediate: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  advanced: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  expert: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function ArticleCard({ article }) {
  const { t, lang } = useLanguage();
  
  const difficultyKey = `article_difficulty_${article.difficulty}`;
  const timeAgo = getTimeAgo(article.created_at);

  return (
    <Link
      to={`/article/${article.slug}`}
      data-testid={`article-card-${article.slug}`}
      className="group block rounded-lg border bg-card text-card-foreground shadow-sm hover:border-[#1793D1]/50 transition-all duration-300 hover:-translate-y-[2px]"
    >
      <div className="p-5">
        {/* Top row: difficulty + category */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${difficultyColors[article.difficulty] || difficultyColors.beginner}`}>
            {t(difficultyKey)}
          </span>
          <span className="text-xs font-mono text-muted-foreground">
            {article.category}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold tracking-tight mb-2 group-hover:text-[#1793D1] transition-colors line-clamp-2">
          {(lang === 'en' && article.title_en) ? article.title_en : article.title}
        </h3>

        {/* Summary */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {(lang === 'en' && article.summary_en) ? article.summary_en : article.summary}
        </p>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {article.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs font-mono text-[#1793D1]/70 bg-[#1793D1]/5 px-1.5 py-0.5 rounded">
                #{tag}
              </span>
            ))}
            {article.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">+{article.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Bottom: stats + author */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3" /> {article.vote_score}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> {article.view_count}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> {article.comment_count}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserAvatar username={article.author_username} size={20} />
            <span className="font-mono">{article.author_username}</span>
            <Clock className="w-3 h-3 ml-1" />
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function getTimeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 30) return `${diffDays}d`;
  return `${Math.floor(diffDays / 30)}mo`;
}
