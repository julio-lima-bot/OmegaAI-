import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { Plus, Sparkles, Copy, Check, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { CodeBlock } from './CodeBlock';
import { Message, ChatMode } from '../services/gemini';

interface ChatMessageProps {
  message: Message;
  mode: ChatMode;
}

export function ChatMessage({ message, mode }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAI = message.role === 'model';
  const canCollapse = isAI && message.content.length > 200;

  const handleFeedback = (type: 'like' | 'dislike') => {
    setFeedback(prev => prev === type ? null : type);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.4, 
        ease: [0.23, 1, 0.32, 1] // Custom cubic-bezier for a "crafted" feel
      }}
      className={cn(
        "group flex gap-2 md:gap-4 p-3 md:p-6 rounded-2xl md:rounded-3xl transition-all border w-full overflow-hidden relative",
        message.role === 'user' 
          ? "bg-zinc-900/30 border-white/5 shadow-sm" 
          : (mode === 'software' 
              ? "bg-emerald-500/[0.03] border-emerald-500/10 shadow-lg shadow-emerald-500/5" 
              : "bg-yellow-500/[0.03] border-yellow-500/10 shadow-lg shadow-yellow-500/5")
      )}
    >
      <div className={cn(
        "w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 border transition-all mt-1",
        message.role === 'user' 
          ? "bg-zinc-800 border-zinc-700 text-zinc-400" 
          : (mode === 'software' 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
              : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.1)]")
      )}>
        {message.role === 'user' ? <Plus size={14} className="md:w-5 md:h-5" /> : <Sparkles size={14} className="md:w-5 md:h-5" />}
      </div>
      
      <div className="flex-1 min-w-0 w-full relative overflow-hidden">
        <div className="flex items-center justify-between mb-2 md:mb-3 gap-2">
          <div className="text-[9px] md:text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] truncate">
            {message.role === 'user' ? 'Você' : 'Ômega AI'}
          </div>
          
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            {isAI && (
              <div className="flex items-center gap-1 mr-1 md:mr-2">
                <button
                  onClick={() => handleFeedback('like')}
                  className={cn(
                    "p-2 rounded-lg transition-all active:scale-90 border border-transparent",
                    feedback === 'like' 
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]" 
                      : "bg-white/5 md:bg-transparent text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                  )}
                  title="Gostei"
                >
                  <motion.div
                    animate={feedback === 'like' ? { scale: [1, 1.3, 1], rotate: [0, -10, 0] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <ThumbsUp size={14} fill={feedback === 'like' ? "currentColor" : "none"} />
                  </motion.div>
                </button>
                <button
                  onClick={() => handleFeedback('dislike')}
                  className={cn(
                    "p-2 rounded-lg transition-all active:scale-90 border border-transparent",
                    feedback === 'dislike' 
                      ? "bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]" 
                      : "bg-white/5 md:bg-transparent text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                  )}
                  title="Não gostei"
                >
                  <motion.div
                    animate={feedback === 'dislike' ? { scale: [1, 1.3, 1], rotate: [0, 10, 0] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <ThumbsDown size={14} fill={feedback === 'dislike' ? "currentColor" : "none"} />
                  </motion.div>
                </button>
              </div>
            )}

            {canCollapse && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 md:p-2 rounded-lg bg-white/5 md:bg-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-white/10 text-zinc-400 hover:text-white transition-all flex items-center gap-1.5 border border-white/5 md:border-transparent"
                title={isExpanded ? "Recolher resposta" : "Expandir resposta"}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp size={14} className="md:w-3.5 md:h-3.5" />
                    <span className="text-[10px] md:text-[10px] font-bold uppercase tracking-wider hidden xs:inline">Recolher</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} className="md:w-3.5 md:h-3.5" />
                    <span className="text-[10px] md:text-[10px] font-bold uppercase tracking-wider hidden xs:inline">Expandir</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={copyToClipboard}
              className="p-2 md:p-2 rounded-lg bg-white/5 md:bg-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-white/10 text-zinc-400 hover:text-white transition-all flex items-center gap-1.5 border border-white/10 md:border-transparent active:scale-95"
              title="Copiar resposta completa"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider hidden sm:inline">Copiado</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Copiar</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className={cn(
          "markdown-body text-xs md:text-base leading-relaxed text-zinc-300 break-words overflow-hidden transition-all duration-300 relative",
          !isExpanded && "max-h-[100px] md:max-h-[150px]"
        )}>
          <Markdown
            components={{
              p: ({ children }) => <div className="mb-4 last:mb-0">{children}</div>,
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = inline;
                
                if (!isInline) {
                  return (
                    <CodeBlock
                      language={match ? match[1] : ''}
                      value={String(children).replace(/\n$/, '')}
                    />
                  );
                }
                
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </Markdown>

          {!isExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#111111] to-transparent pointer-events-none" />
          )}
        </div>
      </div>
    </motion.div>
  );
}
