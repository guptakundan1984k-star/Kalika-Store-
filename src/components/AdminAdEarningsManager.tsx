import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Clock, CheckCircle2, IndianRupee, 
  Search, Filter, ExternalLink, CreditCard, Loader2, User as UserIcon
} from 'lucide-react';
import { AdEarning, UserProfile } from '../types';
import { db, collection, query, onSnapshot, getDocs, updateDoc, doc, addDoc } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

export const AdminAdEarningsManager: React.FC = () => {
  const [earnings, setEarnings] = useState<AdEarning[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'adEarnings'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdEarning));
      setEarnings(docs.sort((a, b) => b.lastWatchedAt - a.lastWatchedAt));
      
      const usersSnap = await getDocs(collection(db, 'users'));
      setUsers(usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handlePay = async (earning: AdEarning) => {
    if (!transactionId) {
      alert('Please enter Transaction ID');
      return;
    }

    setPayingId(earning.id);
    try {
      // Update earning status
      await updateDoc(doc(db, 'adEarnings', earning.id), {
        paymentStatus: 'paid',
        paidAt: Date.now(),
        transactionId
      });

      // Update total earnings in user profile
      const user = users.find(u => u.uid === earning.userId);
      if (user) {
        const currentTotal = user.totalAdEarnings || 0;
        await updateDoc(doc(db, 'users', earning.userId), {
          totalAdEarnings: currentTotal + 0.5
        });
      }

      setTransactionId('');
      setPayingId(null);
    } catch (error) {
      console.error(error);
      alert('Failed to process payment');
      setPayingId(null);
    }
  };

  const filteredEarnings = earnings.filter(e => {
    const matchesSearch = e.userName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         e.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         e.upiId?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totals = {
    pending: earnings.filter(e => e.paymentStatus === 'pending').length * 0.5,
    paid: earnings.filter(e => e.paymentStatus === 'paid').length * 0.5,
    totalCount: earnings.length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
           <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending Payouts</p>
                 <p className="text-3xl font-black text-gray-900 tracking-tight">₹{totals.pending.toFixed(2)}</p>
              </div>
           </div>
        </div>
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
           <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Completed Payouts</p>
                 <p className="text-3xl font-black text-gray-900 tracking-tight">₹{totals.paid.toFixed(2)}</p>
              </div>
           </div>
        </div>
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
           <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary text-secondary">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Ad Views</p>
                 <p className="text-3xl font-black text-gray-900 tracking-tight">{totals.totalCount}</p>
              </div>
           </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by User Name, ID, or UPI ID..."
            className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-6 py-4 font-bold text-sm focus:ring-4 focus:ring-primary/10 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'paid'].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f as any)}
              className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                statusFilter === f ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">User Details</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Info</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Earnings</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
               {filteredEarnings.map((e) => (
                 <tr key={e.id} className="hover:bg-gray-50/30 transition-all group">
                   <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                            <UserIcon className="w-5 h-5" />
                         </div>
                         <div>
                            <p className="text-sm font-black text-gray-900">{e.userName}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{e.userId.slice(-6)} • {new Date(e.lastWatchedAt).toLocaleDateString()}</p>
                         </div>
                      </div>
                   </td>
                   <td className="px-8 py-6">
                      <div className="space-y-1">
                         <p className="text-sm font-black text-indigo-600">{e.upiId || 'N/A'}</p>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{e.upiName || 'Not Registered'}</p>
                      </div>
                   </td>
                   <td className="px-8 py-6">
                      <div className="flex flex-col">
                         <span className="text-sm font-black text-gray-900">₹0.50</span>
                         <span className={`text-[9px] font-black uppercase tracking-widest ${e.paymentStatus === 'paid' ? 'text-green-500' : 'text-orange-500'}`}>
                            {e.paymentStatus}
                         </span>
                      </div>
                   </td>
                   <td className="px-8 py-6">
                      {e.paymentStatus === 'pending' ? (
                        <div className="flex items-center gap-2">
                           <input 
                              type="text" 
                              placeholder="Txn ID"
                              value={payingId === e.id ? transactionId : ''}
                              onChange={(ex) => setTransactionId(ex.target.value)}
                              onFocus={() => setPayingId(e.id)}
                              className="w-32 bg-gray-50 border-none rounded-xl px-4 py-2 text-[10px] font-bold focus:ring-2 focus:ring-primary/20"
                           />
                           <button 
                              onClick={() => handlePay(e)}
                              disabled={payingId === e.id && !transactionId}
                              className="px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                           >
                              {payingId === e.id && transactionId ? 'Pay' : 'Mark Paid'}
                           </button>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Txn: {e.transactionId}</p>
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(e.paidAt!).toLocaleDateString()}</p>
                        </div>
                      )}
                   </td>
                 </tr>
               ))}
               {filteredEarnings.length === 0 && (
                 <tr>
                    <td colSpan={4} className="px-8 py-16 text-center">
                       <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No matching earnings found</p>
                    </td>
                 </tr>
               )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
