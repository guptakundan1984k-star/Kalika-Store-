import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Order } from '../types';
import { HelpCircle, MessageSquare, Send, Image as ImageIcon, Sparkles, Volume2, User, Loader2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { db, doc, onSnapshot, setDoc } from '../firebase';
import { answerAdminQuery } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { PageLoader } from '../components/PageLoader';

interface HelpSupportPageProps {
  user: UserProfile;
  orders: Order[];
}

const HelpSupportPageContent: React.FC<HelpSupportPageProps> = ({ user, orders }) => {
  const [helpQuery, setHelpQuery] = useState('');
  const [helpLoading, setHelpLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [helpMessages, setHelpMessages] = useState<{ role: 'user' | 'ai' | 'admin', content: string, image?: string }[]>([
    { role: 'ai', content: "Hello! I'm your Kalika Store assistant. How can I help you today?" }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [helpMessages]);

  useEffect(() => {
    if (!user.uid) return;
    const unsubscribe = onSnapshot(doc(db, 'support_queries', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.chatHistory && data.chatHistory.length > 1) {
          setHelpMessages(data.chatHistory);
        }
      }
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleHelpSend = async () => {
    if ((!helpQuery.trim() && !selectedImage) || !user.uid) return;
    const userMsg = helpQuery;
    const userImg = selectedImage;
    setHelpQuery('');
    setSelectedImage(null);
    
    const newMessages = [...helpMessages, { 
      role: 'user' as const, 
      content: userMsg, 
      ...(userImg ? { image: userImg } : {})
    }];
    setHelpMessages(newMessages);
    setHelpLoading(true);

    try {
      // Sync to Firebase
      await setDoc(doc(db, 'support_queries', user.uid), {
        userId: user.uid,
        userName: user.name || 'Anonymous',
        userEmail: user.email || 'No email',
        userPhone: user.phone || 'Not provided',
        chatHistory: newMessages,
        status: 'pending',
        updatedAt: Date.now(),
        createdAt: Date.now()
      }, { merge: true });

      const response = await answerAdminQuery(userMsg || "Analyze this image", { user, orders }, userImg || undefined);
      const aiMsg = { role: 'ai' as const, content: response || "I'm sorry, I couldn't process that." };
      const updatedMessages = [...newMessages, aiMsg];
      
      setHelpMessages(updatedMessages);
      await setDoc(doc(db, 'support_queries', user.uid), {
        chatHistory: updatedMessages,
        updatedAt: Date.now()
      }, { merge: true });

    } catch (e) {
      console.error("Help error:", e);
    } finally {
      setHelpLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 md:px-8">
      <div className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <HelpCircle className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Help & Support</h1>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">AI & Expert Assistance</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Live Status</span>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden flex flex-col">
          {/* Chat area */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {helpMessages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-primary text-white' : 
                  msg.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-primary'
                }`}>
                  {msg.role === 'user' ? <User className="w-5 h-5" /> : 
                   msg.role === 'admin' ? <MessageSquare className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                </div>
                <div className={`max-w-[80%] space-y-2 ${msg.role === 'user' ? 'items-end' : ''}`}>
                  <div className={`p-4 rounded-3xl text-sm font-medium leading-relaxed ${
                    msg.role === 'user' ? 'bg-primary text-white rounded-tr-sm' : 
                    msg.role === 'admin' ? 'bg-indigo-50 text-indigo-900 border border-indigo-100 rounded-tl-sm' : 
                    'bg-gray-50 text-gray-800 border border-gray-100 rounded-tl-sm'
                  }`}>
                    {msg.image && (
                      <img src={msg.image} alt="Attachment" className="w-full max-w-sm rounded-xl mb-3 shadow-md" />
                    )}
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest px-2">
                    {msg.role === 'user' ? 'You' : msg.role === 'admin' ? 'Support Agent' : 'Kalika AI'}
                  </p>
                </div>
              </motion.div>
            ))}
            {helpLoading && (
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
                <div className="bg-gray-50 p-4 rounded-3xl rounded-tl-sm border border-gray-100">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>



          {/* Input Area */}
          <div className="p-6 border-t border-gray-100 bg-gray-50/50">
            <AnimatePresence>
              {selectedImage && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-4 relative inline-block"
                >
                  <img src={selectedImage} alt="Preview" className="h-20 w-20 object-cover rounded-xl border-2 border-white shadow-lg" />
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:scale-110 transition-all"
                  >
                    <Plus className="w-3 h-3 rotate-45" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-4 bg-white border border-gray-200 rounded-2xl text-gray-400 hover:text-primary transition-all shadow-sm"
              >
                <ImageIcon className="w-6 h-6" />
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageSelect} />
              </button>
              <div className="flex-1 relative">
                <input 
                  type="text"
                  value={helpQuery}
                  onChange={(e) => setHelpQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleHelpSend()}
                  placeholder="Type your question here..."
                  className="w-full bg-white border border-gray-200 rounded-[28px] pl-6 pr-16 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                />
                <button 
                  onClick={handleHelpSend}
                  disabled={helpLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const HelpSupportPage: React.FC<HelpSupportPageProps> = (props) => (
  <PageLoader>
    <HelpSupportPageContent {...props} />
  </PageLoader>
);
