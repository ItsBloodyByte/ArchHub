import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function VoteButtons({ score, userVote, onVote, vertical = true }) {
  const handleUp = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onVote(userVote === 1 ? 0 : 1);
  };
  const handleDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onVote(userVote === -1 ? 0 : -1);
  };

  return (
    <div data-testid="vote-buttons" className={`flex ${vertical ? 'flex-col' : 'flex-row'} items-center gap-0.5`}>
      <button
        data-testid="vote-up"
        onClick={handleUp}
        className={`p-1.5 rounded-md transition-colors ${
          userVote === 1
            ? 'text-[#1793D1] bg-[#1793D1]/10'
            : 'text-muted-foreground hover:text-[#1793D1] hover:bg-[#1793D1]/5'
        }`}
      >
        <ChevronUp className="w-5 h-5" />
      </button>
      <span data-testid="vote-score" className={`text-sm font-mono font-bold min-w-[2ch] text-center ${
        score > 0 ? 'text-[#1793D1]' : score < 0 ? 'text-destructive' : 'text-muted-foreground'
      }`}>
        {score}
      </span>
      <button
        data-testid="vote-down"
        onClick={handleDown}
        className={`p-1.5 rounded-md transition-colors ${
          userVote === -1
            ? 'text-red-400 bg-red-400/10'
            : 'text-muted-foreground hover:text-red-400 hover:bg-red-400/5'
        }`}
      >
        <ChevronDown className="w-5 h-5" />
      </button>
    </div>
  );
}
