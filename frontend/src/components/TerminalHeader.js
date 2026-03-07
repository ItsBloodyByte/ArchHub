import React from 'react';
import { Terminal } from 'lucide-react';

export default function TerminalHeader({ command }) {
  return (
    <div className="flex items-center gap-2 text-[#1793D1] font-mono text-sm mb-6">
      <Terminal className="w-4 h-4 shrink-0" />
      <span className="opacity-70">$</span>
      <span className="typing-animation">{command}</span>
    </div>
  );
}
