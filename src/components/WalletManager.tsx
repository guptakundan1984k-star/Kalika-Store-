
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, Plus, History, ArrowUpRight, ArrowDownRight, 
  IndianRupee, Send, Clock, CheckCircle2, XCircle, AlertCircle, Loader2
} from 'lucide-react';
import { UserProfile, WalletTransaction, WalletRequest } from '../types';
import { db, collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, doc, handleFirestoreError, OperationType } from '../firebase';

interface WalletManagerProps {
  user: UserProfile;
}

export const WalletManager: React.FC<WalletManagerProps> = ({ user }) => {
  const [activeView, setActiveView] = useState<'overview' | 'history' | 'request'>('overview');
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [requests, setRequests] = useState<WalletRequest[]>([]);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestAmount, setRequestAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listen for transactions
    const txQuery = query(
      collection(db, 'walletTransactions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeTx = onSnapshot(txQuery, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WalletTransaction)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'walletTransactions');
    });

    // Listen for requests
    const reqQuery = query(
      collection(db, 'walletRequests'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeReq = onSnapshot(reqQuery, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WalletRequest)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'walletRequests');
    });

    return () => {
      unsubscribeTx();
      unsubscribeReq();
    };
  }, [user.uid]);

  const [showSuccess, setShowSuccess] = useState(false);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestAmount <= 0) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'walletRequests'), {
        userId: user.uid,
        userName: user.name,
        userPhone: user.phone || '',
        amount: requestAmount,
        status: 'pending',
        createdAt: Date.now()
      });
      setRequestAmount(0);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setActiveView('overview');
      }, 3000);
    } catch (error) {
      console.error("Error creating wallet request:", error);
    } finally {
      setLoading(false);
    }
  };

  const balance = user.walletBalance || 0;

  return (
    <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
      {/* Wallet Header */}
      <div className="p-8 bg-primary text-white relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-white/60" />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Digital Wallet</p>
            </div>
            <h3 className="text-4xl font-black tracking-tighter">₹{balance.toFixed(2)}</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Closing Balance</p>
          </div>
          <button 
            onClick={() => setActiveView('request')}
            className="bg-white text-primary px-6 py-4 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-black/10 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Top Up
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button 
          onClick={() => setActiveView('overview')}
          className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'overview' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Overview
        </button>
        <button 
          onClick={() => setActiveView('history')}
          className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'history' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Transactions
        </button>
      </div>

      <div className="p-8">
        <AnimatePresence mode="wait">
          {activeView === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Expiry Notice */}
              {transactions.some(tx => tx.expiresAt && tx.expiresAt > Date.now() && tx.expiresAt < Date.now() + (7 * 24 * 60 * 60 * 1000)) && (
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-[10px] font-black text-orange-900 uppercase tracking-widest">Action Required</p>
                    <p className="text-[10px] font-medium text-orange-700 leading-tight">Some of your wallet credits are expiring soon. Use them before they are gone!</p>
                  </div>
                </div>
              )}

              {/* Recent Transactions Peek */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recent Activity</h4>
                  <button onClick={() => setActiveView('history')} className="text-[10px] font-bold text-primary uppercase tracking-widest">View All</button>
                </div>
                {transactions.slice(0, 3).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.amount > 0 ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                        {tx.amount > 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-xs font-black text-gray-900 tracking-tight">{tx.description}</p>
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">{new Date(tx.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : ''}₹{tx.amount}
                      </p>
                      <p className="text-[10px] font-bold text-gray-300">Balance: ₹{tx.balanceAfter}</p>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-200">
                      <Clock className="w-8 h-8" />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No recent transactions</p>
                  </div>
                )}
              </div>

              {/* Pending Requests */}
              {requests.some(r => r.status === 'pending') && (
                <div className="p-6 bg-blue-50 border border-blue-100 rounded-[32px] space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-500" />
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Pending Top-Ups</h4>
                  </div>
                  {requests.filter(r => r.status === 'pending').map(req => (
                    <div key={req.id} className="flex items-center justify-between bg-white/50 p-3 rounded-xl border border-blue-100">
                      <div className="space-y-0.5">
                        <p className="text-sm font-black text-gray-900">₹{req.amount}</p>
                        <p className="text-[10px] font-medium text-blue-400 uppercase tracking-widest">Requested on {new Date(req.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-100 px-3 py-1 rounded-full">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Awaiting Admin
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeView === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors border-b border-gray-50">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tx.amount > 0 ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                      {tx.amount > 0 ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 tracking-tight">{tx.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">{new Date(tx.createdAt).toLocaleDateString()}</span>
                        <span className="w-1 h-1 bg-gray-200 rounded-full" />
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">{tx.type.replace('_', ' ')}</span>
                        {tx.expiresAt && (
                          <>
                            <span className="w-1 h-1 bg-gray-200 rounded-full" />
                            <span className={`text-[10px] font-black uppercase tracking-widest ${Date.now() > tx.expiresAt ? 'text-red-500' : 'text-orange-500 animate-pulse'}`}>
                              {Date.now() > tx.expiresAt ? 'Expired' : `Expires: ${new Date(tx.expiresAt).toLocaleDateString()}`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.amount > 0 ? '+' : ''}₹{tx.amount}
                    </p>
                    <p className="text-[10px] font-bold text-gray-300">New Balance: ₹{tx.balanceAfter}</p>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="py-20 text-center">
                  <History className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No transaction history found</p>
                </div>
              )}
            </motion.div>
          )}

          {activeView === 'request' && (
            <motion.div 
              key="request"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h4 className="text-2xl font-black text-gray-900 tracking-tight">Request Top Up</h4>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Enter details to send a request to admin</p>
              </div>

              <form onSubmit={handleCreateRequest} className="space-y-6">
                <AnimatePresence>
                  {showSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="p-6 bg-green-50 border border-green-100 rounded-3xl text-center space-y-2"
                    >
                      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                      <h5 className="text-lg font-black text-green-900 tracking-tight">Request Sent!</h5>
                      <p className="text-xs font-bold text-green-600 uppercase tracking-widest leading-tight">Admin will verify and credit your wallet shortly.</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Amount to Add</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={requestAmount || ''}
                      onChange={(e) => setRequestAmount(parseFloat(e.target.value) || 0)}
                      placeholder="Enter amount (e.g. 500)"
                      className="w-full bg-gray-50 border-none rounded-2xl py-6 pl-14 pr-6 text-2xl font-black text-gray-900 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    />
                    <IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 relative group">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Full Name</p>
                    <p className="text-sm font-bold text-gray-900">{user.name}</p>
                    <button 
                      type="button"
                      onClick={() => window.location.href = '/profile?edit=true'}
                      className="absolute top-2 right-2 p-1 text-[8px] font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 relative group">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Phone Number</p>
                    <p className="text-sm font-bold text-gray-900">{user.phone || 'Not provided'}</p>
                    <button 
                      type="button"
                      onClick={() => window.location.href = '/profile?edit=true'}
                      className="absolute top-2 right-2 p-1 text-[8px] font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {!user.phone && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-widest leading-tight">
                        Please add your phone number to identify your payment.
                      </p>
                      <button 
                        type="button"
                        onClick={() => window.location.href = '/profile?edit=true'}
                        className="text-[8px] font-black text-primary uppercase tracking-widest hover:underline mt-1"
                      >
                        Add Phone Now
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setActiveView('overview')}
                    className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading || !user.phone || requestAmount <= 0}
                    className="flex-3 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Send Request to Admin'}
                  </button>
                </div>
              </form>

              <div className="p-6 bg-gray-50 rounded-[32px] border border-gray-100 space-y-3">
                <h5 className="text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <Send className="w-3 h-3 text-primary" />
                  How it works
                </h5>
                <p className="text-[10px] font-medium text-gray-500 leading-relaxed uppercase tracking-wider">
                  1. Send a request with the amount you paid.<br/>
                  2. Admin will verify the offline/UPI payment.<br/>
                  3. Money will be added instantly after approval.<br/>
                  4. Use wallet for seamless instant checkout!
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
