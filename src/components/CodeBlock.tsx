import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface CodeBlockProps {
  language: string;
  value: string;
}

export function CodeBlock({ language, value }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-white/10 bg-[#1e1e1e] w-full max-w-full">
      <div className="flex items-center justify-between px-3 md:px-4 py-1.5 md:py-2 bg-black/30 border-b border-white/5 shrink-0">
        <span className="text-[10px] md:text-xs font-mono text-zinc-400 uppercase tracking-wider">
          {language || 'text'}
        </span>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1 md:gap-1.5 px-2 py-1 rounded-md bg-white/5 md:bg-transparent hover:bg-white/10 transition-colors text-zinc-400 hover:text-white border border-white/5 md:border-transparent"
          title="Copiar código"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-400 md:w-3.5 md:h-3.5" />
              <span className="text-[9px] md:text-[10px] font-medium text-emerald-400">Copiado!</span>
            </>
          ) : (
            <>
              <Copy size={12} className="md:w-3.5 md:h-3.5" />
              <span className="text-[9px] md:text-[10px] font-medium">Copiar</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto custom-scrollbar w-full">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          wrapLongLines={true}
          customStyle={{
            margin: 0,
            padding: '1rem',
            fontSize: '0.75rem',
            lineHeight: '1.5',
            background: 'transparent',
            width: '100%',
            maxWidth: '100%',
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
