import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const HELP_TEXT = [
  { cmd: 'help', desc: 'Show available commands' },
  { cmd: 'neofetch', desc: 'Display system info' },
  { cmd: 'pacman -S <pkg>', desc: 'Install a package' },
  { cmd: 'ls', desc: 'List directory' },
  { cmd: 'cat <file>', desc: 'Read a file' },
  { cmd: 'whoami', desc: 'Show current user' },
  { cmd: 'uptime', desc: 'Platform uptime' },
  { cmd: 'clear', desc: 'Clear terminal' },
];

const PACKAGES = {
  knowledge: ['articles (6.2-1)', 'workarounds (3.1-1)', 'community (1.0-1)'],
  archlinux: ['base (2.0-1)', 'linux (6.12-1)', 'systemd (256-1)'],
  security: ['firewall (1.3-1)', 'gpg-keys (2.1-1)', 'audit (3.5-1)'],
  fun: ['cowsay (3.0-1)', 'sl (5.0-1)', 'lolcat (1.4-1)'],
};

const LS_OUTPUT = [
  { name: 'articles/', color: 'text-[#1793D1]' },
  { name: 'scripts/', color: 'text-[#1793D1]' },
  { name: 'community/', color: 'text-[#1793D1]' },
  { name: 'README.md', color: 'text-gray-300' },
  { name: '.secret', color: 'text-gray-600' },
  { name: 'arch.conf', color: 'text-gray-300' },
];

const NEOFETCH = [
  '                   -`                  ',
  '                  .o+`                 archmaster@archhub',
  '                 `ooo/                 ------------------',
  '                `+oooo:                OS: Arch Linux x86_64',
  '               `+oooooo:               Kernel: 6.12.1-arch1-1',
  '               -+oooooo+:              Uptime: 42 days',
  '             `/:-:++oooo+:             Packages: 1337 (pacman)',
  '            `/++++/+++++++:            Shell: zsh 5.9',
  '           `/++++++++++++++:           Terminal: ArchHub v1.0',
  '          `/+++ooooooooooooo/`         CPU: Community Cores',
  '         ./ooosssso++osssssso+`        Memory: 42 MiB / ∞ MiB',
  '        .oossssso-````/ossssss+`       ',
  '       -osssssso.      :ssssssso.      ',
  '      :osssssss/        osssso+++.     ',
  '     /ossssssss/        +ssssooo/-     ',
  '   `/ossssso+/:-        -:/+osssso+-   ',
  '  `+sso+:-`                 `.-/+oso:  ',
  ' `++:.                           `-/+/ ',
  ' .`                                 `  ',
];

export default function InteractiveTerminal() {
  const { user, authHeaders } = useAuth();
  const navigate = useNavigate();
  const [lines, setLines] = useState([
    { type: 'cmd', text: '$ pacman -S knowledge' },
    { type: 'info', text: 'resolving dependencies...' },
    { type: 'info', text: 'looking for conflicting packages...' },
    { type: 'success', text: ':: Processing package changes...' },
    { type: 'pkg', text: 'installing articles (6.2-1)' },
    { type: 'pkg', text: 'installing workarounds (3.1-1)' },
    { type: 'pkg', text: 'installing community (1.0-1)' },
    { type: 'success', text: ':: ArchHub is ready.' },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [easterEgg, setEasterEgg] = useState(false);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const addLines = useCallback((newLines) => {
    setLines(prev => [...prev, ...newLines]);
  }, []);

  const processCommand = useCallback(async (cmd) => {
    const trimmed = cmd.trim();
    const lower = trimmed.toLowerCase();
    
    addLines([{ type: 'cmd', text: `$ ${trimmed}` }]);
    setHistory(prev => [trimmed, ...prev].slice(0, 50));
    setHistIdx(-1);

    if (!trimmed) return;

    // Easter egg: "btw i use arch" or variations
    if (lower === 'btw i use arch' || lower === 'i use arch btw' || lower === 'btw, i use arch') {
      setEasterEgg(true);
      addLines([
        { type: 'easter', text: '' },
        { type: 'easter-title', text: '★ SECRET ACHIEVEMENT UNLOCKED ★' },
        { type: 'easter', text: '' },
        { type: 'easter-art', text: '    /\\' },
        { type: 'easter-art', text: '   /  \\' },
        { type: 'easter-art', text: '  /\\   \\' },
        { type: 'easter-art', text: ' /  ..  \\' },
        { type: 'easter-art', text: '/  /  \\  \\' },
        { type: 'easter-art', text: '/________\\' },
        { type: 'easter', text: '' },
        { type: 'easter-msg', text: '"I use Arch btw" - Achievement erhalten!' },
        { type: 'easter', text: '' },
      ]);
      // Claim the badge
      if (user) {
        try {
          await axios.post(`${API}/easter-egg`, {}, { headers: authHeaders });
        } catch {}
      }
      setTimeout(() => setEasterEgg(false), 5000);
      return;
    }

    // clear
    if (lower === 'clear') {
      setLines([]);
      return;
    }

    // help
    if (lower === 'help') {
      addLines([
        { type: 'info', text: 'Available commands:' },
        ...HELP_TEXT.map(h => ({ type: 'help', text: `  ${h.cmd.padEnd(20)} ${h.desc}` })),
        { type: 'info', text: '' },
        { type: 'hint', text: 'Hint: There might be a hidden command...' },
      ]);
      return;
    }

    // neofetch
    if (lower === 'neofetch') {
      addLines(NEOFETCH.map(line => ({ type: 'neofetch', text: line })));
      return;
    }

    // whoami
    if (lower === 'whoami') {
      addLines([{ type: 'output', text: user ? user.username : 'guest' }]);
      return;
    }

    // uptime
    if (lower === 'uptime') {
      const days = Math.floor(Math.random() * 365) + 42;
      addLines([{ type: 'output', text: ` up ${days} days, load average: 0.42, 0.13, 0.37` }]);
      return;
    }

    // ls
    if (lower === 'ls' || lower === 'ls -la' || lower === 'ls -a') {
      const showHidden = lower.includes('-a');
      const items = showHidden ? LS_OUTPUT : LS_OUTPUT.filter(i => !i.name.startsWith('.'));
      addLines(items.map(i => ({ type: 'ls', text: i.name, color: i.color })));
      return;
    }

    // cat
    if (lower.startsWith('cat ')) {
      const file = trimmed.slice(4).trim();
      if (file === 'README.md') {
        addLines([
          { type: 'output', text: '# ArchHub' },
          { type: 'output', text: 'Community knowledge for Arch Linux.' },
          { type: 'output', text: 'By the community, for the community.' },
        ]);
      } else if (file === '.secret') {
        addLines([
          { type: 'hint', text: 'You found a hidden file!' },
          { type: 'hint', text: 'Try typing something every Arch user says...' },
        ]);
      } else if (file === 'arch.conf') {
        addLines([
          { type: 'output', text: '[archhub]' },
          { type: 'output', text: 'Server = https://archhub.dev/$repo' },
          { type: 'output', text: 'SigLevel = Required' },
        ]);
      } else {
        addLines([{ type: 'error', text: `cat: ${file}: No such file or directory` }]);
      }
      return;
    }

    // pacman -S
    if (lower.startsWith('pacman -s ') || lower.startsWith('pacman -s')) {
      const pkg = trimmed.split(/\s+/).pop()?.toLowerCase();
      const packages = PACKAGES[pkg];
      if (packages) {
        addLines([
          { type: 'info', text: 'resolving dependencies...' },
          { type: 'info', text: 'looking for conflicting packages...' },
          { type: 'success', text: ':: Processing package changes...' },
          ...packages.map(p => ({ type: 'pkg', text: `installing ${p}` })),
          { type: 'success', text: `:: ${pkg} installed successfully.` },
        ]);
      } else {
        addLines([{ type: 'error', text: `error: target not found: ${pkg}` }]);
      }
      return;
    }

    // pacman -Syu
    if (lower === 'pacman -syu') {
      addLines([
        { type: 'info', text: ':: Synchronizing package databases...' },
        { type: 'info', text: ' core is up to date' },
        { type: 'info', text: ' extra is up to date' },
        { type: 'info', text: ' archhub is up to date' },
        { type: 'success', text: ':: Starting full system upgrade...' },
        { type: 'success', text: ' there is nothing to do' },
      ]);
      return;
    }

    // sudo rm -rf /
    if (lower.includes('rm -rf /') || lower.includes('rm -rf /*')) {
      addLines([
        { type: 'error', text: 'Nice try ;)' },
        { type: 'info', text: 'This terminal is sandboxed. No filesystem was harmed.' },
      ]);
      return;
    }

    // cd
    if (lower.startsWith('cd ')) {
      const dir = trimmed.slice(3).trim();
      if (dir === 'articles' || dir === 'articles/' || dir === 'tutorials' || dir === 'tutorials/') {
        addLines([{ type: 'info', text: 'Redirecting to articles...' }]);
        setTimeout(() => navigate('/tutorials'), 500);
        return;
      }
      if (dir === 'scripts' || dir === 'scripts/') {
        addLines([{ type: 'info', text: 'Redirecting to scripts...' }]);
        setTimeout(() => navigate('/scripts'), 500);
        return;
      }
      addLines([{ type: 'error', text: `bash: cd: ${dir}: No such file or directory` }]);
      return;
    }

    // Fallback
    addLines([{ type: 'error', text: `bash: ${trimmed.split(' ')[0]}: command not found` }]);
  }, [addLines, user, authHeaders, navigate]);

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      processCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(next);
      if (history[next]) setInput(history[next]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = histIdx - 1;
      setHistIdx(next);
      setInput(next >= 0 ? history[next] || '' : '');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const cmds = ['help', 'neofetch', 'pacman', 'ls', 'cat', 'whoami', 'uptime', 'clear', 'cd'];
      const match = cmds.find(c => c.startsWith(input.toLowerCase()));
      if (match) setInput(match);
    }
  };

  const lineClass = (type) => {
    switch (type) {
      case 'cmd': return 'text-gray-300';
      case 'info': return 'text-gray-500';
      case 'success': return 'text-emerald-400';
      case 'error': return 'text-red-400';
      case 'pkg': return '';
      case 'output': return 'text-gray-400';
      case 'help': return 'text-gray-500';
      case 'hint': return 'text-amber-400/80 italic';
      case 'neofetch': return 'text-[#1793D1]';
      case 'ls': return '';
      case 'easter-title': return 'text-center font-bold text-amber-400 easter-glow';
      case 'easter-art': return 'text-center text-[#1793D1] easter-glow';
      case 'easter-msg': return 'text-center text-emerald-400 font-bold';
      case 'easter': return '';
      default: return 'text-gray-300';
    }
  };

  const renderLine = (line, i) => {
    if (line.type === 'pkg') {
      const parts = line.text.match(/^installing (.+?) (\(.+?\))$/);
      if (parts) {
        return (
          <div key={i}>
            <span className="text-gray-300">installing </span>
            <span className="text-[#1793D1]">{parts[1]}</span>
            <span className="text-gray-500"> {parts[2]}</span>
          </div>
        );
      }
    }
    if (line.type === 'ls') {
      return <span key={i} className={`inline-block mr-4 ${line.color || ''}`}>{line.text}</span>;
    }
    return <div key={i} className={`${lineClass(line.type)} whitespace-pre`}>{line.text}</div>;
  };

  // Group ls lines together
  const renderLines = () => {
    const result = [];
    let lsBuf = [];
    lines.forEach((line, i) => {
      if (line.type === 'ls') {
        lsBuf.push(renderLine(line, i));
      } else {
        if (lsBuf.length) {
          result.push(<div key={`ls-${i}`} className="flex flex-wrap gap-x-1">{lsBuf}</div>);
          lsBuf = [];
        }
        result.push(renderLine(line, i));
      }
    });
    if (lsBuf.length) result.push(<div key="ls-end" className="flex flex-wrap gap-x-1">{lsBuf}</div>);
    return result;
  };

  return (
    <div
      data-testid="interactive-terminal"
      className={`rounded-lg border border-border/50 bg-[#0d0d1a] overflow-hidden shadow-2xl transition-all duration-500 ${easterEgg ? 'easter-terminal ring-2 ring-amber-400/50' : ''}`}
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[#1A1A2E] border-b border-border/30">
        <div className="w-3 h-3 rounded-full bg-red-400/60" />
        <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
        <div className="w-3 h-3 rounded-full bg-green-400/60" />
        <span className="ml-2 text-xs font-mono text-gray-500">archhub</span>
      </div>
      <div
        ref={scrollRef}
        className="p-4 font-mono text-sm space-y-0.5 max-h-[280px] overflow-y-auto scrollbar-thin cursor-text"
      >
        {renderLines()}
        <div className="flex items-center gap-1">
          <span className="text-[#1793D1]">$</span>
          <input
            ref={inputRef}
            data-testid="terminal-input"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            className="flex-1 bg-transparent outline-none border-none ring-0 text-gray-200 caret-[#1793D1] focus:outline-none focus:ring-0 focus:border-none"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
