import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, Loader2, Minimize2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { answerAdminQuery } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface AdminAssistantProps {
  context: any;
  title?: string;
}

export const AdminAssistant: React.FC<AdminAssistantProps> = ({ context, title = "Admin AI Assistant" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Analyzing context...');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
    { role: 'ai', content: `Hello! I'm your AI assistant. I have access to your current ${title === 'CS Assistant' ? 'delivery & wallet' : 'store'} context. How can I help you manage things today?` }
  ]);

  const loadingIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (loading) {
      const texts = ['Analyzing context...', 'Reading store data...', 'Checking inventory...', 'Reviewing orders...', 'Matching patterns...', 'Crafting response...'];
      let i = 0;
      loadingIntervalRef.current = setInterval(() => {
        i = (i + 1) % texts.length;
        setLoadingText(texts[i]);
      }, 1500);
    } else {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    }
    return () => { if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current); };
  }, [loading]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!query.trim()) return;
    const userMsg = query;
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const response = await answerAdminQuery(userMsg, context);
      setMessages(prev => [...prev, { role: 'ai', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: "Error: Could not reach the AI service. Please check your connection." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => { setIsOpen(true); setIsMinimized(false); }}
        className="fixed bottom-8 right-8 z-[60] bg-gray-900 text-white w-16 h-16 rounded-[24px] shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all border-2 border-primary/20"
      >
        <Sparkles className="w-8 h-8 text-primary animate-pulse" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? '80px' : '600px',
              width: isMinimized ? '300px' : '400px'
            }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className={`fixed bottom-8 right-8 z-[70] bg-white border border-gray-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] rounded-[32px] overflow-hidden flex flex-col transition-all duration-300`}
          >
            <div className="bg-gray-900 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white tracking-tight uppercase">{title}</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Insight</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all">
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button onClick={() => setIsOpen(false)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 scroll-smooth"
                >
                  {messages.map((msg, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                        msg.role === 'user' 
                        ? 'bg-gray-900 text-white rounded-tr-none' 
                        : 'bg-white text-gray-800 rounded-tl-none border border-gray-100 shadow-sm shadow-gray-200/50'
                      }`}>
                        <div className="markdown-body">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest text-[10px]">{loadingText}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-white border-t border-gray-100">
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Ask me anything about the store..."
                      className="w-full bg-gray-50 border-none rounded-2xl pl-6 pr-14 py-4 text-sm font-bold placeholder:text-gray-300 focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button 
                      onClick={handleSend}
                      disabled={!query.trim() || loading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-all active:scale-90 disabled:opacity-50 disabled:grayscale"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
