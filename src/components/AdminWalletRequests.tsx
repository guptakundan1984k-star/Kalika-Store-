
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, XCircle, Clock, User, Phone, 
  IndianRupee, Search, Filter, Loader2, Wallet,
  ArrowRight, ShieldCheck, AlertCircle, Eye, ImageIcon, X,
  Plus, Check
} from 'lucide-react';
import { WalletRequest, UserProfile } from '../types';
import { 
  db, collection, query, where, orderBy, onSnapshot, updateDoc, 
  doc, getDoc, addDoc, handleFirestoreError, OperationType, getDocs 
} from '../firebase';

export const AdminWalletRequests: React.FC = () => {
  const [requests, setRequests] = useState<WalletRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  const MAX_WALLET_BALANCE = 250000;

  useEffect(() => {
    const fourMonthsAgo = Date.now() - (120 * 24 * 60 * 60 * 1000);
    const q = query(
      collection(db, 'walletRequests'),
      where('createdAt', '>=', fourMonthsAgo),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WalletRequest)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'walletRequests');
    });
    return () => unsubscribe();
  }, []);

  const [view, setView] = useState<'requests' | 'history'>('requests');
  const [globalTransactions, setGlobalTransactions] = useState<any[]>([]);

  useEffect(() => {
    const fourMonthsAgo = Date.now() - (120 * 24 * 60 * 60 * 1000);
    const q = query(
      collection(db, 'walletTransactions'),
      where('createdAt', '>=', fourMonthsAgo),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGlobalTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'walletTransactions');
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

        if (newBalance > MAX_WALLET_BALANCE) {
          alert(`Approval failed: User balance would exceed ₹${MAX_WALLET_BALANCE.toLocaleString()}`);
          return;
        }

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

  const [creditSearch, setCreditSearch] = useState('');
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [allCustomers, setAllCustomers] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCustomerList, setShowCustomerList] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('walletBalance', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAllCustomers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });
    return () => unsubscribe();
  }, []);

  const QUICK_AMOUNTS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];

  const handleSearchUser = async () => {
    if (!creditSearch.trim()) return;
    setIsSearching(true);
    try {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const allUsers = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      const term = creditSearch.toLowerCase();
      
      const filtered = allUsers.filter(u => 
        u.name?.toLowerCase().includes(term) || 
        u.phone?.includes(term) || 
        u.email?.toLowerCase().includes(term)
      ).slice(0, 5); // Show top 5 matches
      
      setSearchResults(filtered);
      if (filtered.length === 0) {
        alert("No customers found matching that search.");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUser = (user: UserProfile) => {
    setFoundUser(user);
    setSearchResults([]);
    setCreditSearch('');
  };

  const [sendAsBonus, setSendAsBonus] = useState(false);

  const handleDirectCredit = async () => {
    if (!foundUser || creditAmount <= 0) return;
    await handleAddMoneyDirectly(creditAmount);
  };

  const handleAddMoneyDirectly = async (amount: number) => {
    if (!foundUser || amount <= 0) return;
    setProcessingId('direct');
    try {
      const userRef = doc(db, 'users', foundUser.uid);
      const newBalance = (foundUser.walletBalance || 0) + amount;
      
      const updateData: any = { 
        walletBalance: newBalance,
        updatedAt: Date.now()
      };
      
      if (sendAsBonus) {
        updateData.pendingBonus = {
          id: `bonus_${Date.now()}`,
          amount: amount,
          description: `Gifted by Admin`,
          expiresAt: Date.now() + (3 * 24 * 60 * 60 * 1000), // 3 days
          createdAt: Date.now()
        };
      }

      await updateDoc(userRef, updateData);
      await addDoc(collection(db, 'walletTransactions'), {
        userId: foundUser.uid,
        amount: amount,
        balanceAfter: newBalance,
        type: 'admin_credit',
        description: `Direct wallet credit by Admin`,
        createdAt: Date.now()
      });

      // Notification
      if (foundUser.phone) {
        const message = `*WALLET CREDITED!*%0A--------------------------%0AHello ${foundUser.name}, ₹${amount} has been added to your wallet.%0A*New Balance:* ₹${newBalance}%0A%0AEnjoy Shopping!%0A_Kalika Store_`;
        setTimeout(() => window.open(`https://wa.me/${foundUser.phone}?text=${message}`, '_blank'), 100);
      }

      alert(`Success! Credited ₹${amount} to ${foundUser.name}`);
      setCreditAmount(0);
      setFoundUser(null);
    } catch (e) {
      console.error(e);
      alert('Action failed');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Customer Selection & Direct Credit */}
      <div className="bg-gray-900 p-8 rounded-[48px] shadow-2xl relative overflow-hidden group">
        <div className="absolute right-0 top-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -mr-32 -mt-32" />
        <div className="relative z-10 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-black text-white tracking-tight">Direct Admin Credit</h3>
            </div>
            <button 
              onClick={() => setShowCustomerList(!showCustomerList)}
              className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
            >
              {showCustomerList ? 'Hide List' : 'View All Customers'}
            </button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 relative">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text"
                placeholder="Search by Name, Phone, or Email..."
                value={creditSearch}
                onChange={e => {
                  setCreditSearch(e.target.value);
                  if (e.target.value.length >= 2) {
                    const term = e.target.value.toLowerCase();
                    const filtered = allCustomers.filter(u => 
                      u.name?.toLowerCase().includes(term) || 
                      u.phone?.includes(term) || 
                      u.email?.toLowerCase().includes(term)
                    ).slice(0, 5);
                    setSearchResults(filtered);
                  } else {
                    setSearchResults([]);
                  }
                }}
                className="w-full bg-white/10 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-white focus:ring-4 focus:ring-primary/20 transition-all outline-none"
              />
              
              {/* Search Results Dropdown */}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute left-0 right-0 top-full mt-2 bg-white rounded-3xl shadow-2xl overflow-hidden z-[60] border border-gray-100"
                  >
                    <div className="p-2">
                      {searchResults.map(u => (
                        <button
                          key={u.uid}
                          onClick={() => handleSelectUser(u)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-2xl transition-colors text-left"
                        >
                          <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-black">
                            {u.name?.charAt(0) || <User className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900">{u.name}</p>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{u.phone || u.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button 
              onClick={handleSearchUser}
              disabled={isSearching}
              className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Find CUSTOMER
            </button>
          </div>

          {/* Customer List Display */}
          <AnimatePresence>
            {showCustomerList && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white/5 rounded-3xl overflow-hidden border border-white/10"
              >
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">All Customers ({allCustomers.length})</span>
                  <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Sort by Balance</span>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2 space-y-2 scrollbar-hide">
                  {allCustomers.map(u => (
                    <button
                      key={u.uid}
                      onClick={() => handleSelectUser(u)}
                      className="w-full flex items-center justify-between p-4 hover:bg-white/10 rounded-2xl transition-colors text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-black">
                          {u.name?.charAt(0) || <User className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-white">{u.name}</p>
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{u.phone || u.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Balance</p>
                        <p className="text-sm font-black text-primary">₹{u.walletBalance || 0}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {foundUser && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-primary font-black relative group">
                      {foundUser.name?.charAt(0) || <User className="w-6 h-6" />}
                      <button 
                        onClick={() => setFoundUser(null)}
                        className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div>
                      <p className="text-white font-black text-lg">{foundUser.name}</p>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{foundUser.phone || foundUser.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Available Balance</p>
                    <p className="text-2xl font-black text-primary">₹{foundUser.walletBalance || 0}</p>
                  </div>
                </div>

                  <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {QUICK_AMOUNTS.map(amt => (
                      <div key={amt} className="flex items-center gap-1">
                        <button
                          onClick={() => setCreditAmount(amt)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            creditAmount === amt 
                              ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/20' 
                              : 'bg-white/5 text-white/60 hover:bg-white/10'
                          }`}
                        >
                          + ₹{amt}
                        </button>
                        {creditAmount === amt && (
                          <button
                            onClick={() => handleAddMoneyDirectly(amt)}
                            disabled={isSearching}
                            className="p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all active:scale-95 shadow-lg shadow-green-500/20"
                            title="Credit This Amount Instantly"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => setCreditAmount(0)}
                      className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="flex gap-4 items-center">
                    <div className="relative flex-1">
                      <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input 
                        type="number"
                        placeholder="Enter custom amount..."
                        value={creditAmount || ''}
                        onChange={e => setCreditAmount(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border-none rounded-xl pl-10 pr-4 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/20 transition-all outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                       <button 
                         type="button"
                         onClick={() => setSendAsBonus(!sendAsBonus)}
                         className={`w-10 h-6 rounded-full transition-all relative ${sendAsBonus ? 'bg-primary' : 'bg-gray-700'}`}
                       >
                         <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${sendAsBonus ? 'left-5' : 'left-1'}`} />
                       </button>
                       <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white">Show Popup</span>
                        <span className="text-[7px] font-black text-white/40 uppercase">BONUS NOTIFICATION</span>
                       </div>
                    </div>
                    <button 
                      onClick={handleDirectCredit}
                      disabled={creditAmount <= 0 || processingId === 'direct'}
                      className="bg-primary text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 min-w-[140px]"
                    >
                      {processingId === 'direct' ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Credit Wallet'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
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

      {/* Tab Switcher */}
      <div className="flex bg-white p-2 rounded-[32px] border border-gray-100 shadow-sm max-w-md">
        <button
          onClick={() => setView('requests')}
          className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${
            view === 'requests' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Wallet Requests
        </button>
        <button
          onClick={() => setView('history')}
          className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${
            view === 'history' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Transaction History
        </button>
      </div>

      <AnimatePresence mode="wait">
        {view === 'requests' ? (
          <motion.div
            key="requests-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >

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
                      <div className="flex flex-col items-end gap-3 text-right">
                        {(request as any).screenshot && (
                          <div 
                            onClick={() => setSelectedScreenshot((request as any).screenshot)}
                            className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-xl rotate-3 hover:rotate-0 transition-all cursor-zoom-in"
                          >
                            <img src={(request as any).screenshot || undefined} alt="Proof" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="text-right">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Time</p>
                          <p className="text-xs font-bold text-gray-900">{new Date(request.createdAt).toLocaleString()}</p>
                        </div>
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
          </motion.div>
        ) : (
          <motion.div
            key="history-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-white p-8 rounded-[48px] border border-gray-100 shadow-xl shadow-gray-200/50">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Global Transaction History</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Latest wallet activity across all customers</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-primary bg-primary/10 px-4 py-2 rounded-full uppercase tracking-widest">
                    {globalTransactions.length} Total
                  </span>
                </div>
              </div>

              <div className="space-y-4 max-h-[800px] overflow-y-auto pr-4 scrollbar-hide">
                {globalTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-6 bg-gray-50 hover:bg-white hover:shadow-xl hover:shadow-gray-200/50 transition-all rounded-[32px] border border-gray-100 group">
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                        tx.amount > 0 ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'
                      }`}>
                        {tx.amount > 0 ? <Plus className="w-7 h-7" /> : <XCircle className="w-7 h-7" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h5 className="font-black text-gray-900">{tx.description || (tx.amount > 0 ? 'Wallet Credit' : 'Wallet Debit')}</h5>
                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                            tx.type === 'wallet_topup' ? 'bg-blue-100 text-blue-600' :
                            tx.type === 'admin_credit' ? 'bg-purple-100 text-purple-600' :
                            tx.type === 'order_payment' ? 'bg-gray-200 text-gray-600' :
                            'bg-orange-100 text-orange-600'
                          }`}>
                            {tx.type?.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            {new Date(tx.createdAt).toLocaleString()}
                          </p>
                          <span className="w-1 h-1 bg-gray-200 rounded-full" />
                          <p className="text-[10px] text-primary font-black uppercase tracking-widest">
                            {allCustomers.find(c => c.uid === tx.userId)?.name || 'Unknown Customer'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className={`text-xl font-black ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toFixed(2)}
                      </p>
                      <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Balance After: ₹{tx.balanceAfter?.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                {globalTransactions.length === 0 && (
                  <div className="py-24 text-center space-y-4 bg-gray-50 rounded-[48px] border border-dashed border-gray-200">
                    <Clock className="w-12 h-12 text-gray-200 mx-auto" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No transaction history found</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* Screenshot Modal */}
        <AnimatePresence>
          {selectedScreenshot && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
              onClick={() => setSelectedScreenshot(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="relative max-w-lg w-full bg-white rounded-[40px] overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Payment Proof</h3>
                  <button 
                    onClick={() => setSelectedScreenshot(null)}
                    className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-4 max-h-[70vh] overflow-y-auto bg-gray-50">
                  <img 
                    src={selectedScreenshot || undefined} 
                    alt="Payment Screenshot" 
                    className="w-full h-auto rounded-3xl shadow-lg border-4 border-white"
                  />
                </div>
                <div className="p-8 text-center">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Verify the UTR/Txn ID in your bank statement before approving</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };
