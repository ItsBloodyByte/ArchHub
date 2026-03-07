import React from 'react';
import { Bold, Italic, Heading1, Heading2, Heading3, Code, Link as LinkIcon, List, ListOrdered, Quote, Image, Minus, Table, FileCode2 } from 'lucide-react';

const LANGUAGES = ['bash', 'python', 'javascript', 'json', 'yaml', 'toml', 'ini', 'c', 'rust', 'go', 'sql', 'html', 'css'];

const actions = [
  { icon: Bold, label: 'Bold', prefix: '**', suffix: '**', placeholder: 'bold text' },
  { icon: Italic, label: 'Italic', prefix: '_', suffix: '_', placeholder: 'italic text' },
  'sep',
  { icon: Heading1, label: 'H1', prefix: '# ', suffix: '', placeholder: 'Heading 1', newline: true },
  { icon: Heading2, label: 'H2', prefix: '## ', suffix: '', placeholder: 'Heading 2', newline: true },
  { icon: Heading3, label: 'H3', prefix: '### ', suffix: '', placeholder: 'Heading 3', newline: true },
  'sep',
  { icon: Code, label: 'Inline Code', prefix: '`', suffix: '`', placeholder: 'code' },
  { icon: LinkIcon, label: 'Link', prefix: '[', suffix: '](url)', placeholder: 'link text' },
  { icon: Image, label: 'Image', prefix: '![alt](', suffix: ')', placeholder: 'image-url' },
  'sep',
  { icon: List, label: 'Bullet List', prefix: '- ', suffix: '', placeholder: 'list item', newline: true },
  { icon: ListOrdered, label: 'Numbered List', prefix: '1. ', suffix: '', placeholder: 'list item', newline: true },
  { icon: Quote, label: 'Blockquote', prefix: '> ', suffix: '', placeholder: 'quote', newline: true },
  { icon: Minus, label: 'Divider', prefix: '\n---\n', suffix: '', placeholder: '', newline: true },
  { icon: Table, label: 'Table', prefix: '| Header | Header |\n| ------ | ------ |\n| ', suffix: ' | cell |\n', placeholder: 'cell', newline: true },
];

export default function MarkdownToolbar({ textareaRef, value, onChange }) {
  const [showLangMenu, setShowLangMenu] = React.useState(false);

  const handleAction = (action) => {
    const textarea = textareaRef?.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const insertText = selectedText || action.placeholder;

    let before = value.substring(0, start);
    let after = value.substring(end);

    if (action.newline && before.length > 0 && !before.endsWith('\n')) {
      before += '\n';
    }

    const newValue = before + action.prefix + insertText + action.suffix + after;
    onChange(newValue);

    requestAnimationFrame(() => {
      const cursorPos = before.length + action.prefix.length + insertText.length;
      textarea.focus();
      textarea.setSelectionRange(before.length + action.prefix.length, cursorPos);
    });
  };

  const insertCodeBlock = (lang) => {
    setShowLangMenu(false);
    const textarea = textareaRef?.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || 'code here';
    let before = value.substring(0, start);
    const after = value.substring(end);

    if (before.length > 0 && !before.endsWith('\n')) before += '\n';

    const newValue = `${before}\`\`\`${lang}\n${selectedText}\n\`\`\`\n${after}`;
    onChange(newValue);

    requestAnimationFrame(() => {
      const pos = before.length + 4 + lang.length + 1;
      textarea.focus();
      textarea.setSelectionRange(pos, pos + selectedText.length);
    });
  };

  return (
    <div data-testid="markdown-toolbar" className="flex items-center gap-0.5 p-1.5 border border-input rounded-t-md bg-muted/30 -mb-[1px] relative z-10 flex-wrap">
      {actions.map((action, i) => {
        if (action === 'sep') return <div key={i} className="w-px h-5 bg-border mx-1" />;
        return (
          <button
            key={action.label}
            type="button"
            data-testid={`toolbar-${action.label.toLowerCase().replace(/\s/g, '-')}`}
            onClick={() => handleAction(action)}
            className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title={action.label}
          >
            <action.icon className="w-4 h-4" />
          </button>
        );
      })}

      {/* Code Block Dropdown */}
      <div className="relative">
        <button
          type="button"
          data-testid="toolbar-code-block"
          onClick={() => setShowLangMenu(!showLangMenu)}
          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Code Block"
        >
          <FileCode2 className="w-4 h-4" />
        </button>
        {showLangMenu && (
          <div className="absolute top-full left-0 mt-1 w-36 rounded-md border border-border bg-popover shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
            {LANGUAGES.map(lang => (
              <button
                key={lang}
                type="button"
                data-testid={`toolbar-lang-${lang}`}
                onClick={() => insertCodeBlock(lang)}
                className="w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-accent transition-colors"
              >
                {lang}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
