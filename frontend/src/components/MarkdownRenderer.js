import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import PackageWarnings from './PackageWarnings';

function CodeBlock({ language, value }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isBash = !language || language === 'bash' || language === 'sh' || language === 'shell' || language === 'zsh';

  return (
    <>
      <div className="relative group my-4 rounded-md overflow-hidden border border-border/50">
        <div className="flex items-center justify-between px-4 py-2 bg-[#1A1A2E] border-b border-border/30">
          <span className="text-xs font-mono text-muted-foreground">{language || 'text'}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <SyntaxHighlighter
          language={language || 'bash'}
          style={atomDark}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: '#0d0d1a',
            fontSize: '0.875rem',
            borderRadius: 0,
          }}
          showLineNumbers={value.split('\n').length > 3}
        >
          {value}
        </SyntaxHighlighter>
      </div>
      {isBash && <PackageWarnings code={value} />}
    </>
  );
}

export default function MarkdownRenderer({ content }) {
  const slugify = (text) => {
    const str = typeof text === 'string' ? text : extractText(text);
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const extractText = (children) => {
    if (typeof children === 'string') return children;
    if (Array.isArray(children)) return children.map(extractText).join('');
    if (children?.props?.children) return extractText(children.props.children);
    return '';
  };

  return (
    <div className="prose-arch" data-testid="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const value = String(children).replace(/\n$/, '');
            if (!inline && (match || value.includes('\n'))) {
              return <CodeBlock language={match?.[1]} value={value} />;
            }
            return (
              <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm text-[#1793D1]" {...props}>
                {children}
              </code>
            );
          },
          h1: ({ children }) => {
            const id = slugify(children);
            return <h1 id={id} className="text-3xl font-extrabold tracking-tighter mt-8 mb-4 scroll-mt-24">{children}</h1>;
          },
          h2: ({ children }) => {
            const id = slugify(children);
            return <h2 id={id} className="text-2xl font-bold tracking-tight mt-8 mb-3 pb-2 border-b border-border/50 scroll-mt-24">{children}</h2>;
          },
          h3: ({ children }) => {
            const id = slugify(children);
            return <h3 id={id} className="text-xl font-bold tracking-tight mt-6 mb-2 scroll-mt-24">{children}</h3>;
          },
          p: ({ children }) => <p className="text-base leading-7 text-foreground/90 mb-4">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-4 text-foreground/90">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-4 text-foreground/90">{children}</ol>,
          li: ({ children }) => <li className="text-base leading-7">{children}</li>,
          a: ({ href, children }) => (
            <a href={href} className="text-[#1793D1] hover:underline underline-offset-4" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#1793D1] pl-4 my-4 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="w-full border-collapse border border-border text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-border bg-muted px-3 py-2 text-left font-semibold">{children}</th>,
          td: ({ children }) => <td className="border border-border px-3 py-2">{children}</td>,
          hr: () => <hr className="my-8 border-border/50" />,
          strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
