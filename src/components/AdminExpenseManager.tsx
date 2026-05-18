import React, { useState, useEffect } from 'react';
import { 
  Plus, Receipt, Mic, Camera, Search, Filter, Calendar, 
  Trash2, Download, Save, Loader2, IndianRupee, Image as ImageIcon,
  MessageSquare, Sparkles, X, ChevronRight, AlertCircle
} from 'lucide-react';
import { Expense } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, addDoc, query, onSnapshot, orderBy, deleteDoc, doc, storage, ref, uploadBytes, getDownloadURL } from '../firebase';
import { aiService } from '../services/aiService';
import { optimizeImage } from '../lib/utils';

export const AdminExpenseManager: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    itemName: '',
    amount: 0,
    date: Date.now(),
    source: 'manual',
    category: 'Operational'
  });

  const categories = ['Inventory', 'Salary', 'Rent', 'Electricity', 'Water', 'Maintenance', 'Marketing', 'Operational', 'Other'];

  useEffect(() => {
    const q = query(collection(db, 'expenses'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!newExpense.itemName || !newExpense.amount) return;
    setIsProcessing(true);
    try {
      await addDoc(collection(db, 'expenses'), {
        ...newExpense,
        date: newExpense.date || Date.now()
      });
      setIsAdding(false);
      setNewExpense({ itemName: '', amount: 0, date: Date.now(), source: 'manual', category: 'Operational' });
    } catch (e) {
      console.error("Save expense failed", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceRecord = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice recognition not supported in this browser.");
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'hi-IN'; // Default to Hindi

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };
    
    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      if (event.results[0].isFinal) {
        setIsProcessing(true);
        const structured = await aiService.analyzeVoiceExpense(text);
        setNewExpense(prev => ({ ...prev, ...structured, source: 'voice' }));
        setIsProcessing(false);
        setIsAdding(true);
      }
    };

    recognition.start();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      let url = "";
      try {
        const storageRef = ref(storage, `expenses/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        url = await getDownloadURL(storageRef);
      } catch (storageError) {
        console.warn("Storage failed for expense bill, falling back to Base64:", storageError);
        url = await optimizeImage(file, 1024, 0.7);
      }

      // We need optimized base64 for AI analysis too
      const optimizedBase64 = await optimizeImage(file, 800, 0.6);
      const base64DataOnly = optimizedBase64.split(',')[1];

      const structured = await aiService.analyzeBill(base64DataOnly, 'image/jpeg');
      setNewExpense(prev => ({ ...prev, ...structured, photoUrl: url, source: 'photo' }));
      setIsAdding(true);
    } catch (e) {
      console.error("Bill processing failed", e);
      alert("Failed to process bill. Please try a clearer photo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredExpenses = expenses.filter(e => 
    e.itemName.toLowerCase().includes(search.toLowerCase()) ||
    e.category?.toLowerCase().includes(search.toLowerCase())
  );

  const totalExpense = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Expenses & Purchases</h2>
          <p className="text-sm text-gray-500 font-medium">Track your store spending with AI assistance (Voice/Photo).</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleVoiceRecord}
            className={`p-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center gap-2 font-bold ${
              isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
            }`}
          >
            <Mic className="w-5 h-5" />
            <span className="hidden sm:inline">{isRecording ? 'Listening...' : 'Voice Entry (Hindi/Eng)'}</span>
          </button>
          
          <label className="p-4 bg-secondary/10 text-secondary rounded-2xl shadow-xl hover:bg-secondary hover:text-white transition-all cursor-pointer flex items-center gap-2 font-bold">
            <Camera className="w-5 h-5" />
            <span className="hidden sm:inline">Upload Bill</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
          </label>

          <button 
            onClick={() => setIsAdding(true)}
            className="p-4 bg-primary text-white rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all flex items-center gap-2 font-bold"
          >
            <Plus className="w-5 h-5" />
            Manual Entry
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Expenses</p>
          <div className="flex items-center gap-2">
            <IndianRupee className="w-6 h-6 text-primary" />
            <h4 className="text-3xl font-black text-gray-900">{totalExpense.toLocaleString()}</h4>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Entries This Month</p>
          <h4 className="text-3xl font-black text-gray-900">{filteredExpenses.length}</h4>
        </div>
      </div>

      {/* Search & List */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search expenses by name or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-3 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </div>
          <button className="p-3 bg-gray-50 rounded-xl text-gray-400 hover:text-primary transition-all">
            <Filter className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Item Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary opacity-20" />
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-20 text-gray-400 font-bold">No expenses found.</td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">{new Date(expense.date).toLocaleDateString()}</span>
                        <span className="text-[10px] text-gray-400">{new Date(expense.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl border ${
                          expense.source === 'voice' ? 'bg-blue-50 border-blue-100 text-blue-500' :
                          expense.source === 'photo' ? 'bg-green-50 border-green-100 text-green-500' :
                          'bg-gray-50 border-gray-100 text-gray-400'
                        }`}>
                          {expense.source === 'voice' ? <Mic className="w-4 h-4" /> : 
                           expense.source === 'photo' ? <Camera className="w-4 h-4" /> : 
                           <Receipt className="w-4 h-4" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-900">{expense.itemName}</span>
                          {expense.photoUrl && (
                            <button className="text-[8px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:underline">
                              <ImageIcon className="w-2 h-2" /> View Bill
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-lg text-[9px] font-black uppercase tracking-widest">{expense.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-gray-900">₹{expense.amount.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          if (window.confirm("Delete this expense entry?")) {
                            deleteDoc(doc(db, 'expenses', expense.id));
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual/AI Edit Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 bg-gray-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Confirm Expense</h3>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
                      Source: {newExpense.source === 'voice' ? 'Voice (Hinglish)' : newExpense.source === 'photo' ? 'Photo OCR' : 'Manual'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {newExpense.source === 'voice' && transcript && (
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-blue-500 mt-1" />
                    <p className="text-sm font-medium text-blue-700 italic">"{transcript}"</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Item Name</label>
                    <input 
                      type="text" 
                      value={newExpense.itemName}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, itemName: e.target.value }))}
                      className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-black focus:ring-4 focus:ring-primary/10 transition-all text-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Amount (₹)</label>
                    <input 
                      type="number" 
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-black focus:ring-4 focus:ring-primary/10 transition-all text-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Quantity/Unit</label>
                    <input 
                      type="text" 
                      value={newExpense.quantity || ''}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, quantity: e.target.value }))}
                      placeholder="e.g. 5kg, 10 crates"
                      className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-primary/10 transition-all text-gray-900"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Category</label>
                    <select 
                      value={newExpense.category}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-primary/10 transition-all text-gray-900 appearance-none"
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleSave}
                  disabled={isProcessing}
                  className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 hover:bg-black transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save Transaction
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Processing Overalay */}
      <AnimatePresence>
        {isProcessing && !isAdding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-6"
          >
            <div className="relative w-32 h-32 mb-8">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-[6px] border-primary/10 border-t-primary rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-12 h-12 text-primary animate-pulse" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">AI is identifying your expense...</h3>
            <p className="text-sm font-medium text-gray-500 mt-2">Processing voice/bill for precise extraction</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
