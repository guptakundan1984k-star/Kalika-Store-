
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, XCircle, Clock, User, Phone, 
  IndianRupee, Search, Filter, Loader2, Wallet,
  ArrowRight, ShieldCheck, AlertCircle
} from 'lucide-react';
import { WalletRequest, UserProfile } from '../types';
import { 
  db, collection, query, orderBy, onSnapshot, updateDoc, 
  doc, getDoc, addDoc, handleFirestoreError, OperationType 
} from '../firebase';

export const AdminWalletRequests: React.FC = () => {
  const [requests, setRequests] = useState<WalletRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'walletRequests'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WalletRequest)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'walletRequests');
    });
    return () => unsubscribe();
  }, []);

  const handleProcessRequest = async (request: WalletRequest, status: 'approved' | 'rejected') => {
    setProcessingId(request.id);
    try {
      if (status === 'approved') {
        // 1. Get current user profile
        const userRef = doc(db, 'users', request.userId);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          alert("User not found!");
          return;
        }

        const userData = userSnap.data() as UserProfile;
        const currentBalance = userData.walletBalance || 0;
        const newBalance = currentBalance + request.amount;

        // 2. Update user balance
        await updateDoc(userRef, {
          walletBalance: newBalance
        });

        // 3. Create wallet transaction record
        await addDoc(collection(db, 'walletTransactions'), {
          userId: request.userId,
          amount: request.amount,
          balanceAfter: newBalance,
          type: 'wallet_topup',
          description: `Wallet top-up approved (Ref: ${request.id.slice(-6).toUpperCase()})`,
          createdAt: Date.now()
        });
      }

      // 4. Update request status
      await updateDoc(doc(db, 'walletRequests', request.id), {
        status: status
      });

    } catch (error) {
      console.error("Error processing wallet request:", error);
      alert("Failed to process request.");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchesFilter = filter === 'all' || r.status === filter;
    const matchesSearch = r.userName.toLowerCase().includes(search.toLowerCase()) || 
                          r.userPhone.includes(search);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/50 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending Requests</p>
            <h4 className="text-3xl font-black text-gray-900">{requests.filter(r => r.status === 'pending').length}</h4>
          </div>
          <div className="w-14 h-14 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center">
            <Clock className="w-7 h-7" />
          </div>
        </div>
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/50 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Approved Today</p>
            <h4 className="text-3xl font-black text-gray-900">
              {requests.filter(r => r.status === 'approved' && new Date(r.createdAt).toDateString() === new Date().toDateString()).length}
            </h4>
          </div>
          <div className="w-14 h-14 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center">
            <CheckCircle className="w-7 h-7" />
          </div>
        </div>
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/50 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Top-up Value</p>
            <h4 className="text-3xl font-black text-primary">
              ₹{requests.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0)}
            </h4>
          </div>
          <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
            <Wallet className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
            <input 
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
            />
          </div>
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-gray-50 border-none rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All Requests</option>
          </select>
        </div>
      </div>

      {/* Requests List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredRequests.map((request) => (
            <motion.div 
              key={request.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-[48px] border border-gray-100 shadow-xl shadow-gray-200/40 space-y-6 relative overflow-hidden group"
            >
              {request.status === 'pending' && <div className="absolute right-8 top-8 w-3 h-3 bg-orange-500 rounded-full animate-ping" />}
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-50 rounded-[28px] flex items-center justify-center text-gray-400 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h5 className="text-xl font-black text-gray-900 tracking-tight">{request.userName}</h5>
                  <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <Phone className="w-3 h-3" />
                    {request.userPhone}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-6 bg-gray-50 rounded-[32px] border border-gray-100 transition-colors group-hover:bg-primary/5">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Top-up Amount</p>
                  <p className="text-3xl font-black text-primary flex items-center gap-2">
                    <IndianRupee className="w-6 h-6" />
                    {request.amount}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Time</p>
                  <p className="text-xs font-bold text-gray-900">{new Date(request.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {request.status === 'pending' ? (
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button 
                    onClick={() => handleProcessRequest(request, 'rejected')}
                    disabled={processingId === request.id}
                    className="flex items-center justify-center gap-2 py-5 bg-red-50 text-red-500 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                  <button 
                    onClick={() => handleProcessRequest(request, 'approved')}
                    disabled={processingId === request.id}
                    className="flex items-center justify-center gap-2 py-5 bg-primary text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-xs disabled:opacity-50"
                  >
                    {processingId === request.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Approve Top-up
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className={`mt-4 flex items-center justify-center gap-3 py-4 ${request.status === 'approved' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'} rounded-3xl border ${request.status === 'approved' ? 'border-green-100' : 'border-red-100'}`}>
                  {request.status === 'approved' ? <ShieldCheck className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Request {request.status}
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredRequests.length === 0 && (
          <div className="md:col-span-2 py-24 text-center space-y-4 bg-white rounded-[48px] border border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-200">
              <Clock className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xl font-black text-gray-900 tracking-tight">No Wallet Requests Found</h4>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">All caught up! No pending top-ups to show.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
