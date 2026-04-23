import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, orderBy, updateDoc, doc, handleFirestoreError, OperationType } from '../firebase';
import ReactMarkdown from 'react-markdown';
import { generateSupportReply } from '../services/geminiService';
import { MessageSquare, User, Clock, CheckCircle, AlertCircle, ArrowRight, Image as ImageIcon, X, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SupportQuery {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  chatHistory: { role: 'user' | 'ai' | 'admin', content: string, image?: string }[];
  status: 'pending' | 'resolved';
  createdAt: number;
}

export const AdminSupportManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'support' | 'features'>('support');
  const [queries, setQueries] = useState<SupportQuery[]>([]);
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<SupportQuery | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<FeatureRequest | null>(null);
  const [adminReply, setAdminReply] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAISuggest = async () => {
    if (!selectedQuery) return;
    setIsGeneratingAI(true);
    try {
      const reply = await generateSupportReply(selectedQuery.chatHistory);
      setAdminReply(reply);
    } catch (error) {
      console.error("AI Suggest failed:", error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'support_queries'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setQueries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportQuery)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'support_queries', false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'feature_requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFeatureRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeatureRequest)));
    }, (error) => {
      console.error("Error fetching feature requests:", error);
    });
    return () => unsubscribe();
  }, []);

  const handleResolve = async (id: string) => {
    await updateDoc(doc(db, 'support_queries', id), { status: 'resolved' });
  };

  const handleUpdateFeatureStatus = async (id: string, status: FeatureRequest['status']) => {
    try {
      await updateDoc(doc(db, 'feature_requests', id), { status });
      if (selectedFeature?.id === id) {
        setSelectedFeature(prev => prev ? { ...prev, status } : null);
      }
    } catch (error) {
      console.error("Error updating feature status:", error);
    }
  };

  const handleSendReply = async () => {
    if (!selectedQuery || (!adminReply.trim() && !selectedImage)) return;
    setIsSending(true);
    try {
      const updatedHistory = [...selectedQuery.chatHistory, { 
        role: 'admin' as const, 
        content: adminReply,
        image: selectedImage || undefined
      }];
      await updateDoc(doc(db, 'support_queries', selectedQuery.id), {
        chatHistory: updatedHistory,
        updatedAt: Date.now()
      });
      setAdminReply('');
      setSelectedImage(null);
    } catch (error) {
      console.error("Error sending reply:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm w-fit">
        <button 
          onClick={() => setActiveTab('support')}
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'support' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:bg-gray-50'
          }`}
        >
          Support Queries
        </button>
        <button 
          onClick={() => setActiveTab('features')}
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'features' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:bg-gray-50'
          }`}
        >
          Feature Requests
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">
              {activeTab === 'support' ? 'Support Requests' : 'Feature Requests'}
            </h3>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {activeTab === 'support' ? queries.length : featureRequests.length} Total
            </span>
          </div>

          <div className="space-y-3">
            {activeTab === 'support' ? (
              queries.map((q) => (
                <button
                  key={q.id}
                  onClick={() => setSelectedQuery(q)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all active:scale-95 ${
                    selectedQuery?.id === q.id 
                      ? 'bg-primary/5 border-primary shadow-sm' 
                      : 'bg-white border-gray-100 hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      q.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {q.status}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold">
                      {new Date(q.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900 truncate">{q.userName}</h4>
                  <p className="text-xs text-gray-500 truncate">{q.chatHistory[q.chatHistory.length - 1]?.content}</p>
                </button>
              ))
            ) : (
              featureRequests.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFeature(f)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all active:scale-95 ${
                    selectedFeature?.id === f.id 
                      ? 'bg-primary/5 border-primary shadow-sm' 
                      : 'bg-white border-gray-100 hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      f.status === 'pending' ? 'bg-orange-100 text-orange-600' : 
                      f.status === 'reviewed' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {f.status}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold">
                      {new Date(f.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900 truncate">{f.userName}</h4>
                  <p className="text-xs text-gray-500 truncate">{f.feature}</p>
                </button>
              ))
            )}

            {(activeTab === 'support' ? queries.length : featureRequests.length) === 0 && (
              <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                  No {activeTab === 'support' ? 'support requests' : 'feature requests'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {activeTab === 'support' && selectedQuery ? (
              <motion.div
                key={selectedQuery.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[600px] max-h-[800px]"
              >
                {/* Keep existing detail content */}
              <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 tracking-tight">{selectedQuery.userName}</h3>
                    <p className="text-xs text-gray-500 font-medium">{selectedQuery.userPhone} | {selectedQuery.userEmail}</p>
                  </div>
                </div>
                {selectedQuery.status === 'pending' && (
                  <button
                    onClick={() => handleResolve(selectedQuery.id)}
                    className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-600 transition-all active:scale-95"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark Resolved
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
                {selectedQuery.chatHistory.map((msg, i) => (
                  <div key={`chat-${i}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary text-white rounded-tr-none' 
                        : msg.role === 'admin'
                          ? 'bg-secondary text-white rounded-tl-none'
                          : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'
                    }`}>
                      {msg.image && (
                        <img 
                          src={msg.image} 
                          alt="Shared" 
                          className="w-full max-w-[200px] rounded-xl mb-2 object-cover"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="text-sm font-medium prose prose-sm max-w-none prose-invert">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-gray-100 bg-white space-y-4">
                {selectedImage && (
                  <div className="relative inline-block">
                    <img src={selectedImage} alt="Preview" className="w-20 h-20 object-cover rounded-xl border-2 border-primary" />
                    <button 
                      onClick={() => setSelectedImage(null)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <div className="flex gap-4">
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="flex-1 relative">
                    <input 
                      type="text"
                      value={adminReply}
                      onChange={(e) => setAdminReply(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
                      placeholder="Type your reply to the customer..."
                      className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 pr-24 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <button 
                        onClick={handleAISuggest}
                        disabled={isGeneratingAI}
                        className="p-1 text-gray-400 hover:text-primary transition-colors"
                        title="AI Suggest Reply"
                      >
                        {isGeneratingAI ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                      </button>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1 text-gray-400 hover:text-primary transition-colors"
                      >
                        <ImageIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleSendReply}
                    disabled={isSending || (!adminReply.trim() && !selectedImage)}
                    className="bg-primary text-white p-4 rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 disabled:opacity-50"
                  >
                    <ArrowRight className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">
                  This query was last updated on {new Date(selectedQuery.createdAt).toLocaleString()}
                </p>
              </div>
            </motion.div>
          ) : activeTab === 'features' && selectedFeature ? (
            <motion.div
                key={selectedFeature.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[600px]"
              >
                <div className="p-8 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                        <Sparkles className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Feature Request from</p>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">{selectedFeature.userName}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {['pending', 'reviewed', 'implemented'].map((s) => (
                        <button
                          key={s}
                          onClick={() => handleUpdateFeatureStatus(selectedFeature.id, s as any)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                            selectedFeature.status === s 
                              ? s === 'pending' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' :
                                s === 'reviewed' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' :
                                'bg-green-500 text-white shadow-lg shadow-green-500/20'
                              : 'bg-white text-gray-400 hover:bg-gray-100 border border-gray-100'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Submitted on {new Date(selectedFeature.createdAt).toLocaleString()}</p>
                    </div>
                    <p className="text-lg font-medium text-gray-700 leading-relaxed italic">
                      "{selectedFeature.feature}"
                    </p>
                  </div>
                </div>

                <div className="p-8 flex flex-col items-center justify-center text-center space-y-6 flex-1">
                  <div className="w-20 h-20 bg-gray-50 rounded-[40px] flex items-center justify-center text-gray-300">
                    <Sparkles className="w-10 h-10" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-gray-900 tracking-tight mb-2">Review Process</h4>
                    <p className="text-sm text-gray-500 font-medium max-w-sm mx-auto">
                      Review this feature request and update its status. This helps in prioritizing product development based on user feedback.
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : !selectedQuery && !selectedFeature ? (
              <div className="h-[600px] flex flex-col items-center justify-center bg-white rounded-[32px] border border-gray-100 shadow-sm p-12 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-[32px] flex items-center justify-center text-gray-300 mb-6">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">Select a request</h3>
                <p className="text-sm text-gray-500 font-medium">Choose a support or feature request from the list to view details.</p>
              </div>
            ) : null}
        </AnimatePresence>
      </div>
    </div>
  </div>
);
};
