import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, Phone, MapPin, Send, Trash2, 
  IndianRupee, User, Calendar, MessageSquare,
  AlertCircle, CheckCircle2
} from 'lucide-react';
import { Due } from '../types';
import { db, collection, onSnapshot, query, addDoc, deleteDoc, doc, updateDoc, handleFirestoreError, OperationType } from '../firebase';

export const AdminDuesManager: React.FC = () => {
  const [dues, setDues] = useState<Due[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newDue, setNewDue] = useState<Partial<Due>>({
    name: '',
    phone: '',
    address: '',
    amount: 0
  });

  useEffect(() => {
    const q = query(collection(db, 'dues'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Due)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'dues', false);
    });
    return () => unsubscribe();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDue.name || !newDue.amount) return;

    try {
      await addDoc(collection(db, 'dues'), {
        ...newDue,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      setNewDue({ name: '', phone: '', address: '', amount: 0 });
      setIsAdding(false);
    } catch (e) {
      console.error("Failed to add due", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Clear this due?')) return;
    try {
      await deleteDoc(doc(db, 'dues', id));
    } catch (e) {
      console.error("Failed to delete due", e);
    }
  };

  const sendReminder = (due: Due) => {
    const message = `Hello ${due.name}, this is a reminder from Kalika Store. You have an outstanding due of ₹${due.amount}. Please clear it at your earliest convenience. Thank you!`;
    window.open(`https://wa.me/91${due.phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const filteredDues = dues.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.phone.includes(searchQuery)
  );

  const totalDues = dues.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="space-y-8">
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Outstanding</p>
            <h3 className="text-3xl font-black text-gray-900 tracking-tighter">₹{totalDues}</h3>
          </div>
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Debtors</p>
            <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{dues.length}</h3>
          </div>
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-primary p-8 rounded-[32px] shadow-xl shadow-primary/20 text-white flex items-center justify-between group active:scale-95 transition-all"
        >
          <div className="text-left space-y-1">
            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none">Create New</p>
            <h3 className="text-xl font-black tracking-tight">Add Due Entry</h3>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center group-hover:rotate-90 transition-transform">
            <Plus className="w-6 h-6" />
          </div>
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Customer Dues</h2>
            <p className="text-xs font-medium text-gray-400">Manage and track all customer payments and reminders.</p>
          </div>
          
          <div className="relative">
            <input 
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-primary/10 transition-all outline-none w-full md:w-80"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer Info</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Updated</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDues.map((due) => (
                <tr key={due.id} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-black text-gray-900 tracking-tight">{due.name}</p>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase">
                            <Phone className="w-3 h-3" />
                            {due.phone}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase">
                            <MapPin className="w-3 h-3" />
                            {due.address.slice(0, 20)}...
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="inline-flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-xl font-black text-sm tracking-tight border border-red-100">
                      ₹{due.amount}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-900">
                        {new Date(due.updatedAt).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                        {new Date(due.updatedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => sendReminder(due)}
                        className="p-3 bg-green-50 text-green-500 rounded-xl hover:bg-green-500 hover:text-white transition-all active:scale-90"
                        title="Send WhatsApp Reminder"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(due.id)}
                        className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-90"
                        title="Clear Due"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDues.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-gray-50 rounded-[32px] flex items-center justify-center text-gray-300">
                        <AlertCircle className="w-10 h-10" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-black text-gray-900 tracking-tight">No Dues Found</p>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Everything is balanced!</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Due Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-10 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">New Due Entry</h3>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Enter customer details below</p>
                </div>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="p-3 bg-white text-gray-400 hover:text-gray-900 rounded-2xl shadow-sm border border-gray-100 transition-all active:scale-90"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleAdd} className="p-10 space-y-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Customer Name</label>
                    <input 
                      type="text"
                      required
                      value={newDue.name}
                      onChange={(e) => setNewDue({ ...newDue, name: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Phone Number</label>
                      <input 
                        type="tel"
                        required
                        value={newDue.phone}
                        onChange={(e) => setNewDue({ ...newDue, phone: e.target.value })}
                        placeholder="10 digit number"
                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Due Amount</label>
                      <div className="relative">
                        <input 
                          type="number"
                          required
                          value={newDue.amount}
                          onChange={(e) => setNewDue({ ...newDue, amount: parseFloat(e.target.value) })}
                          placeholder="0.00"
                          className="w-full bg-gray-50 border-none rounded-2xl pl-10 pr-6 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                        />
                        <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Address</label>
                    <textarea 
                      required
                      value={newDue.address}
                      onChange={(e) => setNewDue({ ...newDue, address: e.target.value })}
                      placeholder="Customer full address"
                      rows={3}
                      className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 bg-gray-50 text-gray-400 font-black py-4 rounded-2xl shadow-sm border border-gray-100 hover:bg-gray-100 transition-all active:scale-95 uppercase tracking-widest text-[10px]"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 uppercase tracking-widest text-[10px]"
                  >
                    Save Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
