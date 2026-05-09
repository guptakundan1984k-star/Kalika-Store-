import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, Wallet, Clock, CheckCircle, Package, 
  Search, Filter, LogOut, Lock, Sparkles, User, ArrowRight, ArrowLeft,
  TrendingUp, Activity, AlertCircle, Phone, MapPin, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Order, UserProfile, WalletTransaction, WalletRequest } from '../types';
import { Logo } from '../components/Logo';
import { db, collection, query, where, orderBy, onSnapshot, updateDoc, doc, addDoc, getDoc, auth, handleFirestoreError, OperationType } from '../firebase';
import { AdminOrderManager } from '../components/AdminOrderManager';
import { WalletManager } from '../components/WalletManager';
import { AdminAssistant } from '../components/AdminAssistant';
import { notificationService } from '../services/notificationService';

interface CSProps {
  products: Product[];
  orders: Order[];
  user: UserProfile | null;
}

const AdminWalletRequestsReadOnly: React.FC = () => {
  const [requests, setRequests] = useState<WalletRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fourMonthsAgo = Date.now() - (120 * 24 * 60 * 60 * 1000);
    const q = query(
      collection(db, 'walletRequests'), 
      where('createdAt', '>=', fourMonthsAgo),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WalletRequest)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'walletRequests');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Activity className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div key={request.id} className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${request.status === 'approved' ? 'bg-green-100 text-green-600' : request.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-900">{request.userName}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date(request.createdAt).toLocaleDateString()}</span>
                <span className="w-1 h-1 bg-gray-200 rounded-full" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{request.method || 'offline'}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-primary">₹{request.amount}</p>
            <div className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-block ${request.status === 'approved' ? 'bg-green-500 text-white' : request.status === 'pending' ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'}`}>
              {request.status}
            </div>
          </div>
        </div>
      ))}
      {requests.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-[10px] font-black uppercase tracking-widest">No requests found</p>
        </div>
      )}
    </div>
  );
};

const CS: React.FC<CSProps> = ({ products, orders: allOrders, user }) => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(() => {
    const saved = localStorage.getItem('cs_auth_expiry');
    return saved ? parseInt(saved) > Date.now() : false;
  });
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'wallet' | 'transactions'>('orders');

  // Load staff profile data
  const [staffProfile, setStaffProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'cs') return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setStaffProfile(snap.data() as UserProfile);
      }
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (password === 'kalika@ansh2012') {
      setIsAuthorized(true);
      localStorage.setItem('cs_auth_expiry', (Date.now() + 24 * 60 * 60 * 1000).toString());
      setLoginAttempts(0);
    } else {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      if (newAttempts >= 3) {
        setIsLocked(true);
        setTimeout(() => {
          setIsLocked(false);
          setLoginAttempts(0);
        }, 300000); // 5 min lock
      }
    }
  };

  const handleLogout = () => {
    setIsAuthorized(false);
    localStorage.removeItem('cs_auth_expiry');
    navigate('/');
  };

  if (!user || user.role !== 'cs') {
    return <Navigate to="/" />;
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gray-50" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white border-2 border-gray-100 rounded-[48px] p-12 shadow-2xl relative z-10 space-y-8"
        >
          <div className="text-center space-y-4">
            <Logo />
            <div className="pt-4">
              <span className="bg-orange-100 text-orange-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-200">
                Staff Access Hub
              </span>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight mt-4">Welcome, {user.name}</h2>
              <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Verify identity to continue</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Staff Password</label>
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300 group-focus-within:text-primary transition-all" />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="w-full bg-gray-50 border-none rounded-3xl pl-16 pr-6 py-5 text-2xl font-black tracking-[0.5em] focus:ring-4 focus:ring-primary/10 transition-all text-gray-900 placeholder:tracking-normal placeholder:text-gray-200"
                  value={password}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPassword(val);
                    if (val === 'kalika@ansh2012') {
                      handleLogin();
                    }
                  }}
                  disabled={isLocked}
                />
              </div>
              {isLocked && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="text-xs font-bold text-red-600 uppercase tracking-widest">System Locked (5 min)</p>
                </div>
              )}
            </div>

            <button 
              type="submit"
              disabled={isLocked}
              className="w-full bg-gray-900 text-white font-black py-5 rounded-3xl shadow-2xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3 group px-4"
            >
              Verify & Enter Workspace
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <p className="text-center text-[10px] text-gray-300 font-bold uppercase tracking-[0.2em] pt-4">
            Authorized Personnel Only
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      {/* Top Header */}
      <nav className="bg-white border-b border-gray-100 px-4 py-2 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-primary"
              title="Go to Website"
            >
              <ArrowLeft className="w-5 h-5 cursor-pointer" />
            </button>
            <Logo />
            <div className="h-6 w-px bg-gray-100 hidden md:block" />
            <div className="hidden md:flex items-center gap-2">
              <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-200">
                Staff ID: {user.uid.slice(-6).toUpperCase()}
              </span>
              <p className="text-xs font-black text-gray-900 tracking-tight">{user.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Handheld Balance</p>
              <h4 className={`text-md font-black tracking-tight ${staffProfile?.walletBalance && staffProfile.walletBalance < 0 ? 'text-red-500' : 'text-green-600'}`}>
                ₹{staffProfile?.walletBalance || 0}
              </h4>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all active:scale-95"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[2.5rem] border-2 border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-4 transition-all hover:shadow-xl group">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 shrink-0 group-hover:scale-110 transition-transform">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">To Deliver</p>
              <h4 className="text-xl font-black text-gray-900 tracking-tight">
                {allOrders.filter(o => o.status === 'Out for Delivery').length}
              </h4>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border-2 border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-4 transition-all hover:shadow-xl group">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center text-green-500 shrink-0 group-hover:scale-110 transition-transform">
              <CheckCircle className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Delivered</p>
              <h4 className="text-xl font-black text-gray-900 tracking-tight">
                {allOrders.filter(o => o.status === 'Delivered').length}
              </h4>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border-2 border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-4 transition-all hover:shadow-xl group">
            <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 shrink-0 group-hover:scale-110 transition-transform">
              <Wallet className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Handheld</p>
              <h4 className={`text-xl font-black tracking-tight ${staffProfile?.walletBalance && staffProfile.walletBalance < 0 ? 'text-red-500' : 'text-green-600'}`}>
                ₹{staffProfile?.walletBalance || 0}
              </h4>
            </div>
          </div>

          <div 
            onClick={() => navigate('/topup')}
            className="bg-primary p-6 rounded-[2.5rem] shadow-2xl shadow-primary/20 flex items-center gap-4 group cursor-pointer active:scale-95 transition-all text-left"
          >
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-white shrink-0 group-hover:rotate-12 transition-transform shadow-inner">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-0.5">Top Up</p>
              <h4 className="text-md font-black text-white tracking-tight">Request Funds</h4>
            </div>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${
              activeTab === 'orders' ? 'bg-gray-900 text-white shadow-xl shadow-gray-900/20' : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Live Orders
          </button>
          <button 
            onClick={() => setActiveTab('wallet')}
            className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${
              activeTab === 'wallet' ? 'bg-gray-900 text-white shadow-xl shadow-gray-900/20' : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'
            }`}
          >
            <Wallet className="w-4 h-4" />
            My Wallet
          </button>
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${
              activeTab === 'transactions' ? 'bg-gray-900 text-white shadow-xl shadow-gray-900/20' : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'
            }`}
          >
            <Activity className="w-4 h-4" />
            User Top-ups
          </button>
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {activeTab === 'orders' ? (
            <AdminOrderManager 
              orders={allOrders} 
              products={products}
              defaultView="workflow"
              onUpdateStatus={async (id, status) => {
                try {
                  await updateDoc(doc(db, 'orders', id), { 
                    status,
                    deliveredBy: status === 'Delivered' ? user.uid : undefined
                  });

                  // Notify User about status update
                  const order = allOrders.find(o => o.id === id);
                  if (order && order.userId) {
                    let title = "Order Update! 📦";
                    let body = `Your order #${id.slice(-6).toUpperCase()} is now ${status}.`;
                    
                    if (status === 'Packed') {
                      title = "Order Packed! 📦";
                      body = `Good news! Your order #${id.slice(-6).toUpperCase()} has been packed and is ready for dispatch.`;
                    } else if (status === 'Out for Delivery') {
                      title = "Out for Delivery! 🚚";
                      body = `Our delivery partner is on the way with your order #${id.slice(-6).toUpperCase()}.`;
                    } else if (status === 'Delivered') {
                      title = "Order Delivered! ✅";
                      body = `Your order #${id.slice(-6).toUpperCase()} has been delivered. Enjoy your items!`;
                    }

                    await notificationService.sendNotification({
                      userIds: [order.userId],
                      title,
                      body,
                      type: 'order'
                    });
                  }
                } catch (e) {
                  handleFirestoreError(e, OperationType.UPDATE, `orders/${id}`);
                }
              }}
              onDeliveredWithPayment={async (id, receivedAmount) => {
                try {
                  const order = allOrders.find(o => o.id === id);
                  if (!order) return;

                  const total = order.total;
                  const debtSettled = order.walletDebtSettle || 0;
                  const basePrice = total - debtSettled;
                  const balanceAdjustment = receivedAmount - basePrice;
                  
                  // Update Order
                  await updateDoc(doc(db, 'orders', id), {
                    status: 'Delivered',
                    receivedAmount,
                    deliveredBy: user.uid,
                    updatedAt: Date.now()
                  });

                  // Notify User about delivery
                  if (order.userId) {
                    await notificationService.sendNotification({
                      userIds: [order.userId],
                      title: "Order Delivered! ✅",
                      body: `Your order #${id.slice(-6).toUpperCase()} has been delivered successfully. Amount paid: ₹${receivedAmount}.`,
                      type: 'order'
                    });
                  }

                  // Update CUSTOMER Wallet (The user who placed the order)
                  if (order.userId && balanceAdjustment !== 0) {
                    const customerRef = doc(db, 'users', order.userId);
                    const currentBalance = 0; // We'll use increment for safety or fetch
                    
                    // Fetch current customer balance to log it
                    const custSnap = await getDoc(customerRef);
                    const currentCustBalance = custSnap.exists() ? (custSnap.data() as UserProfile).walletBalance || 0 : 0;
                    const newCustBalance = currentCustBalance + balanceAdjustment;

                    await updateDoc(customerRef, { walletBalance: newCustBalance });
                    
                    await addDoc(collection(db, 'walletTransactions'), {
                      userId: order.userId,
                      amount: balanceAdjustment,
                      balanceAfter: newCustBalance,
                      type: 'delivery_adjustment',
                      description: `Delivery Adjust: Order #${id.slice(-6).toUpperCase()} (Rec: ₹${receivedAmount}, Tot: ₹${total})`,
                      orderId: id,
                      createdAt: Date.now()
                    });
                  }

                  // Optional: Update Staff Handheld if you still want to track what staff brought back
                  const staffRef = doc(db, 'users', user.uid);
                  const staffNewBalance = (staffProfile?.walletBalance || 0) + receivedAmount;
                  await updateDoc(staffRef, { walletBalance: staffNewBalance });

                } catch (e) {
                  handleFirestoreError(e, OperationType.UPDATE, `orders/${id}`);
                }
              }}
            />
          ) : activeTab === 'wallet' ? (
            <WalletManager user={user} />
          ) : (
            <div className="bg-white rounded-[40px] border-2 border-white shadow-2xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Wallet Requests</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global user top-up activity</p>
                </div>
                <div className="bg-primary/10 text-primary px-4 py-2 rounded-2xl flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest tracking-tighter">Live Monitor</span>
                </div>
              </div>
              
              {/* Simple version of AdminWalletRequests for CS */}
              <div className="space-y-4">
                 <AdminWalletRequestsReadOnly />
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <AdminAssistant 
        context={{ staffProfile, allOrders, products }}
        title="CS Assistant"
      />
    </div>
  );
};

export default CS;
