import { useState, useRef, useEffect } from 'react';
import { Send, Terminal, Cpu, Sparkles, Trash2, Plus, Code2, MessageSquare, ChevronRight, Settings2, X, Zap, Laptop, Menu, Calculator, Home, Building2, Factory, Paperclip, FileText, Image as ImageIcon, Check } from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { generateCodeResponse, type Message, type ChatMode, type FileAttachment, type AIModel } from './services/gemini';
import { CodeBlock } from './components/CodeBlock';
import { ChatMessage } from './components/ChatMessage';

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  mode: ChatMode;
  model: AIModel;
  createdAt: number;
}

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('omega_sessions');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return parsed.map((s: any) => ({
        ...s,
        model: s.model || 'gemini-3-flash-preview'
      }));
    } catch (e) {
      return [];
    }
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    const saved = localStorage.getItem('omega_active_session');
    return saved || null;
  });
  const [input, setInput] = useState('');
  const [requirements, setRequirements] = useState('');
  const [showRequirements, setShowRequirements] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<ChatMode>('electrical');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [attachment, setAttachment] = useState<FileAttachment | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [budgetData, setBudgetData] = useState({
    area: '',
    type: 'Residencial',
    rooms: '',
    finish: 'Médio'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  useEffect(() => {
    if (activeSession) {
      setCurrentMode(activeSession.mode);
    }
  }, [activeSessionId]);

  useEffect(() => {
    localStorage.setItem('omega_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem('omega_active_session', activeSessionId);
    } else {
      localStorage.removeItem('omega_active_session');
    }
  }, [activeSessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const createNewSession = (mode: ChatMode = currentMode) => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: mode === 'software' ? 'Nova Conversa (Software)' : 'Nova Conversa (Elétrica)',
      messages: [],
      mode,
      model: 'gemini-3-flash-preview',
      createdAt: Date.now(),
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
    setCurrentMode(mode);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (activeSessionId === id) {
      setActiveSessionId(newSessions.length > 0 ? newSessions[0].id : null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setAttachment({
        mimeType: file.type,
        data: base64String,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        // Fallback for local dev or environments without aistudio global
        setHasApiKey(true);
      }
    };
    checkApiKey();
  }, []);

  const handleOpenKeySelector = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true); // Proceed after opening selector
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !attachment || isLoading) return;

    let currentSessionId = activeSessionId;
    let currentSessions = [...sessions];

    // Create session if none active
    if (!currentSessionId) {
      const newSession: ChatSession = {
        id: crypto.randomUUID(),
        title: input ? (input.slice(0, 30) + (input.length > 30 ? '...' : '')) : (attachment?.name || 'Arquivo Anexado'),
        messages: [],
        mode: currentMode,
        model: 'gemini-3-flash-preview',
        createdAt: Date.now(),
      };
      currentSessions = [newSession, ...sessions];
      currentSessionId = newSession.id;
      setSessions(currentSessions);
      setActiveSessionId(currentSessionId);
    }

    const fullPrompt = requirements.trim() 
      ? `REQUISITOS:\n${requirements}\n\nSOLICITAÇÃO:\n${input}`
      : input;

    const userMessage: Message = { 
      role: 'user', 
      content: attachment 
        ? `${fullPrompt}\n\n[Arquivo Anexado: ${attachment.name}]` 
        : fullPrompt 
    };
    
    const updatedSessions = currentSessions.map(s => {
      if (s.id === currentSessionId) {
        const newMessages = [...s.messages, userMessage];
        const title = s.messages.length === 0 
          ? (input.slice(0, 30) + (input.length > 30 ? '...' : '') || attachment?.name || 'Arquivo Anexado')
          : s.title;
        return { ...s, messages: newMessages, title };
      }
      return s;
    });

    setSessions(updatedSessions);
    const currentAttachment = attachment;
    setInput('');
    setAttachment(null);
    setIsLoading(true);

    try {
      const sessionToUpdate = updatedSessions.find(s => s.id === currentSessionId);
      if (!sessionToUpdate) return;

      const response = await generateCodeResponse(
        sessionToUpdate.messages, 
        sessionToUpdate.mode, 
        currentAttachment || undefined,
        sessionToUpdate.model
      );
      
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return { ...s, messages: [...s.messages, { role: 'model', content: response }] };
        }
        return s;
      }));
    } catch (error: any) {
      console.error('Failed to get response:', error);
      
      const errorMessage = error?.message || '';
      const isAuthError = errorMessage.includes('Requested entity was not found') || 
                         errorMessage.includes('API_KEY') || 
                         errorMessage.includes('403') || 
                         errorMessage.includes('401');
      
      const isQuotaError = errorMessage.includes('429') || 
                          errorMessage.includes('quota') || 
                          errorMessage.includes('RESOURCE_EXHAUSTED');

      if (isAuthError) {
        setHasApiKey(false);
      }

      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          let errorContent = `Erro na Ômega AI: ${errorMessage || "Falha ao conectar ao serviço de IA."}`;
          
          if (isAuthError) {
            errorContent = "### 🔐 Falha de Autenticação\nSua chave de API parece ser inválida ou expirou. Por favor, clique no ícone de engrenagem no topo para selecionar uma nova chave.";
          } else if (isQuotaError) {
            errorContent = "### ⚠️ Limite de Uso Excedido (Quota)\nVocê atingiu o limite de requisições da sua chave de API atual.\n\n**Como resolver:**\n1. **Aguarde alguns segundos** e tente novamente.\n2. **Verifique seu faturamento:** Se estiver usando o nível gratuito, os limites são mais restritos. Considere usar uma chave de um projeto com faturamento ativado no Google Cloud.\n3. **Troque a chave:** Clique no ícone de engrenagem ⚙️ no topo para configurar uma nova chave.";
          }
            
          return { ...s, messages: [...s.messages, { role: 'model', content: errorContent }] };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowBudgetModal(false);
    
    const budgetPrompt = `Olá Ômega AI! Gostaria de um orçamento elétrico preliminar com os seguintes detalhes:
- Área Construída: ${budgetData.area} m²
- Tipo de Instalação: ${budgetData.type}
- Número de Cômodos/Setores: ${budgetData.rooms}
- Padrão de Acabamento: ${budgetData.finish}

Por favor, gere o orçamento detalhado incluindo materiais, mão de obra e normas técnicas.`;

    setInput(budgetPrompt);
    // We'll let the user review the prompt or just send it? 
    // Let's just send it for a better "wizard" feel.
    
    // We need to wait a bit for setInput to be reflected if we were to use handleSend directly, 
    // but handleSend uses the 'input' state which might be stale.
    // Better to call a modified send function or just trigger handleSend with the prompt.
    
    // Temporary hack: call handleSend but pass the prompt directly
    await sendStructuredMessage(budgetPrompt);
  };

  const sendStructuredMessage = async (text: string) => {
    if (isLoading) return;

    let currentSessionId = activeSessionId;
    let currentSessions = [...sessions];

    if (!currentSessionId) {
      const newSession: ChatSession = {
        id: crypto.randomUUID(),
        title: 'Orçamento Elétrico',
        messages: [],
        mode: 'electrical',
        model: 'gemini-3-flash-preview',
        createdAt: Date.now(),
      };
      currentSessions = [newSession, ...sessions];
      currentSessionId = newSession.id;
      setSessions(currentSessions);
      setActiveSessionId(currentSessionId);
    }

    const userMessage: Message = { role: 'user', content: text };
    const updatedSessions = currentSessions.map(s => {
      if (s.id === currentSessionId) {
        return { ...s, messages: [...s.messages, userMessage], title: 'Orçamento Elétrico' };
      }
      return s;
    });

    setSessions(updatedSessions);
    setInput('');
    setIsLoading(true);

    try {
      const sessionToUpdate = updatedSessions.find(s => s.id === currentSessionId);
      if (!sessionToUpdate) return;
      const response = await generateCodeResponse(sessionToUpdate.messages, 'electrical');
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, { role: 'model', content: response }] } : s));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const softwareSuggestions = [
    "Implementar um cache thread-safe em Rust",
    "Criar um microsserviço com Gin em Go",
    "Construir uma visualização de lista SwiftUI com Swift",
    "Escrever um exemplo de corrotina Kotlin",
    "Desenvolver um modelo Ruby on Rails",
    "Explicar hooks do React com exemplos"
  ];

  const electricalSuggestions = [
    "Dimensionar condutores para um motor de 10CV (NBR 5410)",
    "Esquema de ligação para interruptor Three-Way",
    "Orçamento detalhado para reforma elétrica residencial de 100m²",
    "Como precificar serviços de manutenção em quadros industriais",
    "Explicar a diferença entre aterramento TN-S e TN-C",
    "Normas para instalação de para-raios (NBR 5419)"
  ];

  const suggestions = currentMode === 'software' ? softwareSuggestions : electricalSuggestions;

  const switchMode = (mode: ChatMode) => {
    if (currentMode === mode && activeSession?.mode === mode) return;
    
    setCurrentMode(mode);
    
    // If we are in an active session and it's a different mode, or if the current session has messages
    if (activeSession) {
      if (activeSession.messages.length === 0) {
        // Just update the empty session's mode
        setSessions(prev => prev.map(s => s.id === activeSessionId ? { 
          ...s, 
          mode, 
          title: mode === 'software' ? 'Nova Conversa (Software)' : 'Nova Conversa (Elétrica)' 
        } : s));
      } else if (activeSession.mode !== mode) {
        // Start a new session if the current one has messages and we're switching modes
        createNewSession(mode);
      }
    } else {
      // No active session, just ensure next one is right mode
      createNewSession(mode);
    }
  };

  if (hasApiKey === false) {
    return (
      <div className="flex h-screen bg-[#0A0A0A] items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#141414] border border-white/10 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto text-yellow-400">
            <Settings2 size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Configuração Necessária</h2>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Para utilizar os modelos avançados da Ômega AI, você precisa selecionar uma chave de API válida.
            </p>
          </div>
          <div className="bg-black/40 rounded-xl p-4 text-left border border-white/5">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-2">Instruções:</p>
            <ul className="text-[11px] text-zinc-400 space-y-2 list-disc pl-4">
              <li>Use um projeto do Google Cloud com faturamento ativo.</li>
              <li>Acesse <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:underline">documentação de faturamento</a> para mais detalhes.</li>
            </ul>
          </div>
          <button
            onClick={handleOpenKeySelector}
            className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-2xl transition-all shadow-lg shadow-yellow-500/20 uppercase tracking-widest text-xs"
          >
            Selecionar Chave de API
          </button>
        </div>
      </div>
    );
  }

  const handleModelChange = (model: AIModel) => {
    if (activeSessionId) {
      setSessions(prev => prev.map(s => 
        s.id === activeSessionId ? { ...s, model } : s
      ));
    }
    setShowModelModal(false);
  };

  const clearAllSessions = () => {
    if (window.confirm('Tem certeza que deseja apagar todo o histórico de conversas?')) {
      setSessions([]);
      setActiveSessionId(null);
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupSessionsByDate = (sessionsToGroup: ChatSession[]) => {
    const groups: { [key: string]: ChatSession[] } = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const last7Days = today - 86400000 * 7;

    sessionsToGroup.forEach(session => {
      const date = new Date(session.createdAt);
      const sessionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

      let label = 'Anteriores';
      if (sessionDate === today) label = 'Hoje';
      else if (sessionDate === yesterday) label = 'Ontem';
      else if (sessionDate >= last7Days) label = 'Últimos 7 dias';

      if (!groups[label]) groups[label] = [];
      groups[label].push(session);
    });

    return groups;
  };

  const groupedSessions = groupSessionsByDate(filteredSessions);

  const MODELS_METADATA = [
    {
      id: 'gemini-3-flash-preview' as AIModel,
      name: 'Gemini 3 Flash',
      tag: 'Rápido & Eficiente',
      description: 'Otimizado para velocidade e respostas imediatas. Ideal para tarefas de rotina, automação simples e consultas rápidas.',
      specialties: ['Velocidade', 'Automação', 'Consultas Gerais'],
      color: 'emerald' as const
    },
    {
      id: 'gemini-3.1-pro-preview' as AIModel,
      name: 'Gemini 3.1 Pro',
      tag: 'Raciocínio Avançado',
      description: 'O modelo mais capaz para tarefas complexas. Especialista em arquitetura de sistemas, depuração profunda e cálculos de engenharia.',
      specialties: ['Arquitetura', 'Depuração', 'Cálculos Complexos'],
      color: 'yellow' as const
    }
  ];

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-zinc-300 font-sans overflow-hidden relative">
      {/* Model Selection Modal */}
      <AnimatePresence>
        {showModelModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModelModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#111111] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                    <Settings2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Configurações do Modelo</h3>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Selecione a IA ideal para sua tarefa</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowModelModal(false)}
                  className="p-2 rounded-xl hover:bg-white/5 text-zinc-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {MODELS_METADATA.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleModelChange(model.id)}
                    className={cn(
                      "w-full text-left p-5 rounded-2xl border transition-all relative group overflow-hidden",
                      activeSession?.model === model.id
                        ? (model.color === 'emerald' ? "bg-emerald-500/10 border-emerald-500/30" : "bg-yellow-500/10 border-yellow-500/30")
                        : "bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center border",
                          model.color === 'emerald' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                        )}>
                          <Sparkles size={16} />
                        </div>
                        <div>
                          <h4 className="font-bold text-white">{model.name}</h4>
                          <span className={cn(
                            "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                            model.color === 'emerald' ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400"
                          )}>
                            {model.tag}
                          </span>
                        </div>
                      </div>
                      {activeSession?.model === model.id && (
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center",
                          model.color === 'emerald' ? "bg-emerald-500 text-black" : "bg-yellow-500 text-black"
                        )}>
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                      {model.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {model.specialties.map(spec => (
                        <span key={spec} className="text-[10px] bg-white/5 text-zinc-500 px-2 py-1 rounded-md border border-white/5">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-6 bg-white/[0.02] border-t border-white/5">
                <p className="text-[10px] text-zinc-500 text-center uppercase tracking-[0.2em] font-medium">
                  A Ômega AI utiliza a infraestrutura de ponta do Google Gemini
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showBudgetModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBudgetModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#141414] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between bg-yellow-500/5">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                    <Calculator className="text-yellow-400" size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-lg font-semibold text-white">Calculadora de Orçamento</h3>
                    <p className="text-[10px] md:text-xs text-zinc-500">Gere uma estimativa preliminar</p>
                  </div>
                </div>
                <button onClick={() => setShowBudgetModal(false)} className="p-1.5 md:p-2 rounded-lg hover:bg-white/5 text-zinc-500">
                  <X size={18} />
                </button>
              </div>
              
              <form onSubmit={handleBudgetSubmit} className="p-4 md:p-6 space-y-5">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Área (m²)</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          required
                          value={budgetData.area}
                          onChange={e => setBudgetData({...budgetData, area: e.target.value})}
                          placeholder="0"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Cômodos</label>
                      <input 
                        type="number" 
                        required
                        value={budgetData.rooms}
                        onChange={e => setBudgetData({...budgetData, rooms: e.target.value})}
                        placeholder="0"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Tipo de Instalação</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'Residencial', icon: Home, label: 'Resid.' },
                        { id: 'Predial', icon: Building2, label: 'Predial' },
                        { id: 'Industrial', icon: Factory, label: 'Indust.' }
                      ].map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setBudgetData({...budgetData, type: type.id})}
                          className={cn(
                            "flex items-center justify-center gap-2 p-2.5 rounded-xl border transition-all",
                            budgetData.type === type.id 
                              ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-400" 
                              : "bg-white/5 border-white/10 text-zinc-500 hover:border-white/20"
                          )}
                        >
                          <type.icon size={14} />
                          <span className="text-[10px] font-bold uppercase tracking-tight">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Padrão de Acabamento</label>
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                      {['Baixo', 'Médio', 'Alto'].map((finish) => (
                        <button
                          key={finish}
                          type="button"
                          onClick={() => setBudgetData({...budgetData, finish})}
                          className={cn(
                            "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                            budgetData.finish === finish ? "bg-yellow-500 text-black shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                          )}
                        >
                          {finish}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preview Section */}
                <div className="bg-black/40 rounded-2xl border border-white/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Sparkles size={14} className="text-yellow-500" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Prévia da Solicitação</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 leading-relaxed font-mono italic">
                    "Gere um orçamento para instalação <span className="text-yellow-500/80">{budgetData.type.toLowerCase()}</span> de <span className="text-yellow-500/80">{budgetData.area || 'X'}m²</span> com <span className="text-yellow-500/80">{budgetData.rooms || 'Y'} cômodos</span> e acabamento <span className="text-yellow-500/80">{budgetData.finish.toLowerCase()}</span>..."
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl shadow-xl shadow-yellow-500/10 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
                >
                  <Calculator size={16} />
                  Solicitar Orçamento
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 border-r border-white/5 bg-[#0D0D0D] flex flex-col z-50 transition-transform duration-300 md:relative md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Code2 size={18} className="text-emerald-400" />
            </div>
            <span className="font-semibold text-white tracking-tight">Ômega AI</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 md:hidden"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-3 space-y-2">
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
            <button 
              onClick={() => {
                switchMode('software');
                setIsSidebarOpen(false);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all",
                currentMode === 'software' 
                  ? "bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]" 
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Laptop size={14} />
              Software
            </button>
            <button 
              onClick={() => {
                switchMode('electrical');
                setIsSidebarOpen(false);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all",
                currentMode === 'electrical' 
                  ? "bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.3)]" 
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Zap size={14} />
              Elétrica
            </button>
          </div>
          <button 
            onClick={() => {
              createNewSession();
              setIsSidebarOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 transition-all text-sm font-medium text-white group",
              currentMode === 'software' ? "hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.05)]" : "hover:bg-yellow-500/10 hover:border-yellow-500/30 hover:shadow-[0_0_15px_rgba(234,179,8,0.05)]"
            )}
          >
            <Plus size={18} />
            Nova Sessão
          </button>

          <div className="relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-white transition-colors">
              <MessageSquare size={14} />
            </div>
            <input
              type="text"
              placeholder="Buscar histórico..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">
              Histórico
            </div>
            {sessions.length > 0 && (
              <button 
                onClick={clearAllSessions}
                className="text-[9px] font-bold text-zinc-700 hover:text-red-400 uppercase tracking-wider transition-colors"
                title="Limpar tudo"
              >
                Limpar
              </button>
            )}
          </div>
          
          <AnimatePresence initial={false}>
            {Object.entries(groupedSessions).map(([label, group]) => (
              <div key={label} className="space-y-1">
                <div className="px-3 py-1 text-[9px] font-bold text-zinc-700 uppercase tracking-wider">
                  {label}
                </div>
                {group.map((session) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    onClick={() => {
                      setActiveSessionId(session.id);
                      setIsSidebarOpen(false);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setActiveSessionId(session.id);
                        setIsSidebarOpen(false);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm group relative cursor-pointer outline-none",
                      activeSessionId === session.id 
                        ? cn(
                            "bg-white/[0.05] text-white border border-white/10",
                            session.mode === 'software' 
                              ? "shadow-[0_0_15px_rgba(16,185,129,0.1)] border-emerald-500/20" 
                              : "shadow-[0_0_15px_rgba(234,179,8,0.1)] border-yellow-500/20"
                          )
                        : "text-zinc-500 hover:bg-white/[0.02] hover:text-zinc-300 border border-transparent focus:bg-white/[0.02]"
                    )}
                  >
                    {session.mode === 'software' ? (
                      <Laptop size={16} className={cn(activeSessionId === session.id ? "text-emerald-400" : "text-zinc-600")} />
                    ) : (
                      <Zap size={16} className={cn(activeSessionId === session.id ? "text-yellow-400" : "text-zinc-600")} />
                    )}
                    <span className="flex-1 text-left truncate pr-6">{session.title}</span>
                    <button
                      onClick={(e) => deleteSession(e, session.id)}
                      className="absolute right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))}
              </div>
            ))}
          </AnimatePresence>
          {filteredSessions.length === 0 && (
            <div className="px-3 py-8 text-center">
              <p className="text-xs text-zinc-600 italic">
                {searchQuery ? 'Nenhum resultado encontrado' : 'Nenhuma conversa ainda'}
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/5">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowModelModal(true)}
              className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center border",
                  activeSession?.model === 'gemini-3.1-pro-preview' 
                    ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" 
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                )}>
                  <Sparkles size={16} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Modelo Ativo</p>
                  <p className="text-xs font-bold text-white">
                    {activeSession?.model === 'gemini-3.1-pro-preview' ? 'Gemini 3.1 Pro' : 'Gemini 3 Flash'}
                  </p>
                </div>
              </div>
              <Settings2 size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-6 bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-white/5 text-zinc-500 md:hidden"
            >
              <Menu size={20} />
            </button>
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center border",
              currentMode === 'software' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
            )}>
              {currentMode === 'software' ? <Laptop size={18} /> : <Zap size={18} />}
            </div>
            <div className="hidden sm:block">
              <h2 className="text-sm font-medium text-white">
                {activeSession ? activeSession.title : (currentMode === 'software' ? 'Assistente de Software' : 'Assistente de Elétrica')}
              </h2>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                {currentMode === 'software' ? 'Engenharia de Software' : 'Engenharia Elétrica'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {activeSession && (
              <button
                onClick={() => setShowModelModal(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
              >
                <div className={cn(
                  "w-5 h-5 rounded flex items-center justify-center",
                  activeSession.model === 'gemini-3.1-pro-preview' ? "text-yellow-400" : "text-emerald-400"
                )}>
                  <Sparkles size={14} />
                </div>
                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                  {activeSession.model === 'gemini-3.1-pro-preview' ? 'Gemini 3.1 Pro' : 'Gemini 3 Flash'}
                </span>
                <ChevronRight size={12} className="text-zinc-600 group-hover:text-zinc-400 rotate-90" />
              </button>
            )}
            {currentMode === 'electrical' && (
              <button 
                onClick={() => setShowBudgetModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-all text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(234,179,8,0.1)]"
              >
                <Calculator size={16} />
                <span className="hidden sm:inline">Orçamento</span>
              </button>
            )}
            <button 
              onClick={handleOpenKeySelector}
              className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-yellow-400 transition-colors"
              title="Configurar Chave API"
            >
              <Settings2 size={18} />
            </button>
            <button 
              onClick={() => {
                if (activeSessionId) {
                  if (confirm('Deseja limpar o histórico desta sessão?')) {
                    const e = { stopPropagation: () => {} } as React.MouseEvent;
                    deleteSession(e, activeSessionId);
                  }
                }
              }}
              className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-red-400 transition-colors"
              title="Limpar histórico"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 md:px-4 py-4 md:py-8 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-4 md:space-y-8">
            {messages.length === 0 ? (
              <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6 py-10">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center border mb-2",
                  currentMode === 'software' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                )}>
                  {currentMode === 'software' ? <Cpu size={32} /> : <Zap size={32} />}
                </div>
                <div className="px-4">
                  <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
                    {currentMode === 'software' ? 'Como posso ajudar você a programar hoje?' : 'Como posso ajudar com sua instalação elétrica?'}
                  </h1>
                  <p className="text-zinc-500 text-sm md:text-base max-w-md mx-auto">
                    {currentMode === 'software' 
                      ? 'Peça-me para escrever funções, depurar erros ou explicar arquiteturas complexas.' 
                      : 'Tire dúvidas sobre a NBR 5410, diagramas de fiação, manutenção e segurança elétrica.'}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg px-4">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="text-left px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all text-sm text-zinc-400 hover:text-zinc-200"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <ChatMessage key={idx} message={msg} mode={currentMode} />
              ))
            )}
            {isLoading && (
              <div className="flex gap-3 md:gap-4 p-4 md:p-6 rounded-3xl bg-[#111111] border border-white/10 shadow-xl">
                <div className={cn(
                  "w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0 border",
                  currentMode === 'software' 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                    : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                )}>
                  <Sparkles size={18} className="animate-pulse" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">Ômega AI</div>
                  <div className="flex gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full animate-bounce", currentMode === 'software' ? "bg-emerald-500/40" : "bg-yellow-500/40")} style={{ animationDelay: '0ms' }} />
                    <div className={cn("w-2 h-2 rounded-full animate-bounce", currentMode === 'software' ? "bg-emerald-500/40" : "bg-yellow-500/40")} style={{ animationDelay: '150ms' }} />
                    <div className={cn("w-2 h-2 rounded-full animate-bounce", currentMode === 'software' ? "bg-emerald-500/40" : "bg-yellow-500/40")} style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent">
          <div className="max-w-3xl mx-auto space-y-3 md:space-y-4">
            <AnimatePresence>
              {attachment && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-2 pr-4 w-fit"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                    {attachment.mimeType.startsWith('image/') ? <ImageIcon size={20} className="text-emerald-400" /> : <FileText size={20} className="text-zinc-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate max-w-[200px]">{attachment.name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Pronto para enviar</p>
                  </div>
                  <button 
                    onClick={() => setAttachment(null)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              )}
              {showRequirements && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-[#141414] border border-white/10 rounded-2xl p-3 md:p-4 space-y-2 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Settings2 size={14} className={currentMode === 'software' ? "text-emerald-400" : "text-yellow-400"} />
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Requisitos Específicos</label>
                      </div>
                      <button 
                        onClick={() => setShowRequirements(false)} 
                        className="p-1 rounded-md hover:bg-white/5 text-zinc-600 hover:text-zinc-400 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <textarea
                      value={requirements}
                      onChange={(e) => setRequirements(e.target.value)}
                      placeholder={currentMode === 'software' 
                        ? "Descreva restrições, padrões (ex: Clean Code), bibliotecas ou requisitos específicos do projeto..."
                        : "Descreva o ambiente (residencial/industrial), tensão local, normas específicas ou componentes disponíveis..."}
                      className="w-full bg-transparent border-none focus:ring-0 text-xs md:text-sm text-zinc-300 p-0 resize-none h-20 md:h-24 custom-scrollbar"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={cn(
              "relative flex items-end gap-1 md:gap-2 bg-[#141414] border border-white/10 rounded-2xl p-1.5 md:p-2 transition-all shadow-2xl focus-within:ring-1",
              currentMode === 'software' ? "focus-within:border-emerald-500/50 focus-within:ring-emerald-500/50" : "focus-within:border-yellow-500/50 focus-within:ring-yellow-500/50"
            )}>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*,application/pdf,text/*"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 md:p-3 rounded-xl transition-all shrink-0 text-zinc-600 hover:text-zinc-400 hover:bg-white/5"
                title="Anexar arquivo"
              >
                <Paperclip size={18} className="md:w-5 md:h-5" />
              </button>
              <button
                onClick={() => setShowRequirements(!showRequirements)}
                className={cn(
                  "p-2.5 md:p-3 rounded-xl transition-all shrink-0",
                  showRequirements 
                    ? (currentMode === 'software' ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400")
                    : "text-zinc-600 hover:text-zinc-400 hover:bg-white/5"
                )}
                title="Configurar requisitos"
              >
                <Settings2 size={18} className="md:w-5 md:h-5" />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={currentMode === 'software' ? "Pergunte sobre código..." : "Dúvidas sobre elétrica..."}
                className="flex-1 bg-transparent border-none focus:ring-0 text-zinc-200 placeholder-zinc-600 py-2.5 md:py-3 px-2 md:px-4 resize-none max-h-40 md:max-h-60 min-h-[44px] md:min-h-[56px] text-sm md:text-base custom-scrollbar"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={(!input.trim() && !attachment) || isLoading}
                className={cn(
                  "p-2.5 md:p-3 rounded-xl transition-all shrink-0",
                  (input.trim() || attachment) && !isLoading
                    ? (currentMode === 'software' ? "bg-emerald-500 text-black hover:bg-emerald-400" : "bg-yellow-500 text-black hover:bg-yellow-400")
                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                )}
              >
                <Send size={18} className="md:w-5 md:h-5" />
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 mt-3 text-center uppercase tracking-[0.2em]">
              Desenvolvido por Engenheiro Mecatrônico e Professor Júlio Lima • Ômega AI
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
