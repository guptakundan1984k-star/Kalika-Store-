import React, { useState, useEffect } from 'react';
import { AdminDashboard } from '../components/AdminDashboard';
import { AdminProductManager } from '../components/AdminProductManager';
import { AdminOrderManager } from '../components/AdminOrderManager';
import { AdminOrderWorkflow } from '../components/AdminOrderWorkflow';
import { AdminUserManager } from '../components/AdminUserManager';
import { AdminCouponManager } from '../components/AdminCouponManager';
import { AdminBannerManager } from '../components/AdminBannerManager';
import { AdminSupportManager } from '../components/AdminSupportManager';
import { AdminBillingManager } from '../components/AdminBillingManager';
import { AdminVariationManager } from '../components/AdminVariationManager';
import { AdminStockManager } from '../components/AdminStockManager';
import { AdminStoreSettings } from '../components/AdminStoreSettings';
import { AdminStorageManager } from '../components/AdminStorageManager';
import { AdminBulkAIUploader } from '../components/AdminBulkAIUploader';
import { AdminExpenseManager } from '../components/AdminExpenseManager';
import { AdminBulkEnquiryManager } from '../components/AdminBulkEnquiryManager';
import { AdminManualOrderCreator } from '../components/AdminManualOrderCreator';
import { AdminPartyPricingManager } from '../components/AdminPartyPricingManager';
import { AdminDuesManager } from '../components/AdminDuesManager';
import { AdminWalletRequests } from '../components/AdminWalletRequests';
import { AdminAdEarningsManager } from '../components/AdminAdEarningsManager';
import { Product, Order, UserProfile, Coupon, Banner, Expense, BulkEnquiry } from '../types';
import { 
  LayoutDashboard, Package, ShoppingBag, Users, 
  Tag, Settings, LogOut, ChevronRight, ChevronLeft, Menu, X, 
  Bell, Search, User, Sparkles, Shield, Image as ImageIcon,
  Printer, Eye, EyeOff, Box, Layers, Cloud, CloudOff, RefreshCw, Database, HardDrive, CheckSquare,
  IndianRupee, Zap, AlertCircle, Briefcase, Wallet
} from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from '../components/Logo';
import { auth, db, collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, where, handleFirestoreError, OperationType } from '../firebase';

interface AdminProps {
  products: Product[];
  orders: Order[];
  coupons: Coupon[];
  banners: Banner[];
  user: UserProfile | null;
}

const Admin: React.FC<AdminProps> = ({ products, orders, coupons, banners, user }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'bulk-ai' | 'party-pricing' | 'expenses' | 'orders' | 'workflow' | 'users' | 'wallet' | 'coupons' | 'banners' | 'support' | 'billing' | 'variations' | 'stocks' | 'settings' | 'storage' | 'bulk-enquiries' | 'dues' | 'earnings'>('dashboard');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isDbConnected, setIsDbConnected] = useState<boolean | null>(null);
  const [pendingQueries, setPendingQueries] = useState(0);
  const [pendingEnquiries, setPendingEnquiries] = useState(0);
  const [pendingWalletRequests, setPendingWalletRequests] = useState(0);
  const [pendingAdPayouts, setPendingAdPayouts] = useState(0);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [selectedEnquiryForOrder, setSelectedEnquiryForOrder] = useState<BulkEnquiry | null>(null);

  useEffect(() => {
    const handleCreateOrderEvent = (e: any) => {
      setSelectedEnquiryForOrder(e.detail);
    };
    window.addEventListener('createOrderFromEnquiry', handleCreateOrderEvent);
    return () => window.removeEventListener('createOrderFromEnquiry', handleCreateOrderEvent);
  }, []);

  const handleSyncOperation = async (op: () => Promise<any>) => {
    setSyncStatus('syncing');
    try {
      await op();
      setSyncStatus('success');
      setLastSyncTime(Date.now());
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (e) {
      setSyncStatus('error');
      console.error("Sync failed:", e);
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  };

  const [error, setError] = useState('');
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);

  useEffect(() => {
    const storedLockout = localStorage.getItem('admin_lockout');
    if (storedLockout) {
      const time = parseInt(storedLockout);
      if (time > Date.now()) {
        setLockoutTime(time);
      } else {
        localStorage.removeItem('admin_lockout');
        localStorage.removeItem('admin_attempts');
      }
    }
  }, []);

  useEffect(() => {
    if (lockoutTime) {
      const timer = setInterval(() => {
        const now = Date.now();
        if (now >= lockoutTime) {
          setLockoutTime(null);
          localStorage.removeItem('admin_lockout');
          localStorage.removeItem('admin_attempts');
          setError('');
          clearInterval(timer);
        } else {
          const diff = lockoutTime - now;
          const h = Math.floor(diff / (1000 * 60 * 60));
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((diff % (1000 * 60)) / 1000);
          setError(`Device disabled. Try again in ${h}h ${m}m ${s}s`);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutTime]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    const now = Date.now();
    if (lockoutTime && lockoutTime > now) {
      const remaining = Math.ceil((lockoutTime - now) / 60000);
      const hours = Math.floor(remaining / 60);
      const mins = remaining % 60;
      setError(`Access disabled. Please try again in ${hours > 0 ? `${hours}h ${mins}m` : `${mins} minutes`}.`);
      return;
    }

    if (password === 'kalika@ansh2012') { 
      setIsAuthorized(true);
      setError('');
      localStorage.removeItem('admin_attempts');
      localStorage.removeItem('admin_lockout');
      localStorage.removeItem('admin_phase2_attempts');
      
      // Upgrade user to admin in Firestore if they are logged in
      if (user && user.role !== 'admin') {
        updateDoc(doc(db, 'users', user.uid), { role: 'admin' }).catch(e => {
          console.error("Failed to upgrade user to admin:", e);
        });
      }
    } else {
      const attempts = parseInt(localStorage.getItem('admin_attempts') || '0') + 1;
      localStorage.setItem('admin_attempts', attempts.toString());
      
      if (attempts >= 5) {
        // 24 hours lockout for this device
        const time = now + 24 * 60 * 60 * 1000;
        localStorage.setItem('admin_lockout', time.toString());
        setLockoutTime(time);
        setError('Device disabled for 24 hours due to repeated failures.');
      } else {
        setError(`Incorrect password. ${5 - attempts} attempts remaining.`);
      }
    }
  };

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isAuthorized || !user) return;

    const setAdminRole = async () => {
      try {
        await updateDoc(doc(db, 'users', user.uid), { role: 'admin' });
        setIsReady(true);
      } catch (e) {
        console.error("Failed to set admin role", e);
        // If it fails (maybe already admin or network error), we still try to proceed
        setIsReady(true);
      }
    };

    setAdminRole();
  }, [isAuthorized, user]);

  useEffect(() => {
    if (!isAuthorized || !isReady) return;

    const qUsers = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users', false);
    });

    const qQueries = query(collection(db, 'support_queries'), where('status', '==', 'pending'));
    const unsubscribeQueries = onSnapshot(qQueries, (snapshot) => {
      setPendingQueries(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'support_queries', false);
    });

    const qEnquiries = query(collection(db, 'bulk_enquiries'), where('status', '==', 'Pending'));
    const unsubscribeEnquiries = onSnapshot(qEnquiries, (snapshot) => {
      setPendingEnquiries(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bulk_enquiries', false);
    });

    const qWallet = query(collection(db, 'walletRequests'), where('status', '==', 'pending'));
    const unsubscribeWallet = onSnapshot(qWallet, (snapshot) => {
      setPendingWalletRequests(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'walletRequests', false);
    });

    const qEarnings = query(collection(db, 'adEarnings'), where('paymentStatus', '==', 'pending'));
    const unsubscribeEarnings = onSnapshot(qEarnings, (snapshot) => {
      setPendingAdPayouts(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'adEarnings', false);
    });

    // Connectivity Check
    const checkConnection = () => {
      const isOnline = navigator.onLine;
      setIsDbConnected(isOnline);
    };

    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);
    checkConnection();

    return () => {
      unsubscribeUsers();
      unsubscribeQueries();
      unsubscribeEnquiries();
      unsubscribeWallet();
      unsubscribeEarnings();
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
    };
  }, [isAuthorized]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-12 rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-100 max-w-md w-full text-center space-y-8"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto shadow-inner">
            <Shield className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Admin Access</h2>
            <p className="text-sm font-medium text-gray-400">Please enter the admin password to continue.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password"
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-center text-lg font-black tracking-[0.5em] focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {error && <p className="text-xs font-bold text-red-500 uppercase tracking-widest">{error}</p>}
            <button 
              type="submit"
              className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 uppercase tracking-widest text-xs"
            >
              Verify Access
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'products', label: 'Inventory', icon: Package },
    { id: 'party-pricing', label: 'Party Rates', icon: Tag },
    { id: 'bulk-ai', label: 'Bulk AI Add', icon: Zap },
    { id: 'expenses', label: 'Expenses', icon: IndianRupee },
    { id: 'stocks', label: 'Stocks', icon: Box },
    { id: 'variations', label: 'Variations', icon: Layers },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, badge: orders.filter(o => o.status === 'Pending').length },
    { id: 'workflow', label: 'Workflow', icon: CheckSquare, badge: orders.filter(o => ['Proceeded', 'Packed'].includes(o.status)).length },
    { id: 'users', label: 'Customers', icon: Users },
    { id: 'wallet', label: 'Wallet Req', icon: Wallet, badge: pendingWalletRequests },
    { id: 'earnings', label: 'Ads Revenue', icon: IndianRupee, badge: pendingAdPayouts },
    { id: 'coupons', label: 'Coupons', icon: Tag },
    { id: 'billing', label: 'Billing', icon: Printer },
    { id: 'banners', label: 'Banners', icon: ImageIcon },
    { id: 'support', label: 'Support', icon: Bell, badge: pendingQueries },
    { id: 'bulk-enquiries', label: 'Business Inquiries', icon: Briefcase, badge: pendingEnquiries },
    { id: 'dues', label: 'Customer Dues', icon: IndianRupee },
    { id: 'settings', label: 'Store Settings', icon: Settings },
    { id: 'storage', label: 'Cloud Storage', icon: HardDrive },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-6">
            <Logo />
            <div className="h-8 w-px bg-gray-100 hidden md:block" />
            <h2 className="text-xl font-black text-gray-900 tracking-tight capitalize hidden md:block">{activeTab}</h2>
            
            {/* Sync Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
              {isDbConnected === false ? (
                <div className="flex items-center gap-2 text-red-500">
                  <CloudOff className="w-3 h-3 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Not Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-500">
                  <Cloud className="w-3 h-3 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Connected</span>
                </div>
              )}
            </div>

            {syncStatus !== 'idle' && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
                {syncStatus === 'syncing' ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-primary" />
                ) : syncStatus === 'success' ? (
                  <CheckSquare className="w-3 h-3 text-green-500" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-red-500" />
                )}
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  {syncStatus === 'syncing' ? 'Saving...' : syncStatus === 'success' ? 'Saved' : 'Error'}
                </span>
              </div>
            )}

            {/* Database ID Indicator (Small) */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
              <Database className="w-3 h-3 text-gray-400" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                DB: {firebaseConfig.firestoreDatabaseId.slice(-8)}
              </span>
            </div>

            {/* Storage Indicator */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
              <Cloud className="w-3 h-3 text-primary animate-pulse" />
              <span className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">
                Gmail Storage: 5TB Connected
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-gray-400 hover:text-primary transition-all active:scale-90">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="h-8 w-px bg-gray-100" />
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-black text-gray-900 tracking-tight">Valued Customer</span>
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Super Admin</span>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-inner">
                <User className="w-6 h-6" />
              </div>
            </div>
            <button 
              onClick={() => auth.signOut()}
              className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-90"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Horizontal Navigation Strip (User requested: "sidebar in the above of every admin pages") */}
        <div className="bg-white border-b border-gray-100 sticky top-16 z-40 overflow-x-auto scrollbar-hide">
          <div className="flex items-center px-4 py-3 gap-2 min-w-max max-w-7xl mx-auto">
            {menuItems.map((item) => (
              <button 
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap active:scale-95 ${
                  activeTab === item.id 
                    ? 'bg-primary text-white shadow-xl shadow-primary/20 translate-y-[-2px]' 
                    : 'bg-gray-50 text-gray-400 hover:bg-primary/5 hover:text-primary'
                }`}
              >
                <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-white' : 'text-gray-400'}`} />
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`w-4 h-4 flex items-center justify-center rounded-full text-[8px] font-black ${
                    activeTab === item.id ? 'bg-white text-primary' : 'bg-primary text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <AdminDashboard onTabChange={setActiveTab} user={user} />}
              {activeTab === 'bulk-ai' && (
                <AdminBulkAIUploader 
                  categories={['Vegetables', 'Fruits', 'Dairy', 'Bakery', 'Meat', 'Snacks', 'Beverages', 'Staples', 'Oils', 'Household']}
                  onBulkAdd={(newProducts) => handleSyncOperation(async () => {
                    const batch = newProducts.map(p => addDoc(collection(db, 'products'), { ...p, createdAt: Date.now() }));
                    await Promise.all(batch);
                  })}
                />
              )}
              {activeTab === 'expenses' && <AdminExpenseManager />}
              {activeTab === 'party-pricing' && <AdminPartyPricingManager products={products} />}
              {activeTab === 'products' && (
                <AdminProductManager 
                  products={products} 
                  onAdd={(product) => handleSyncOperation(async () => {
                    await addDoc(collection(db, 'products'), { ...product, createdAt: Date.now() });
                  })} 
                  onBulkAdd={(newProducts) => handleSyncOperation(async () => {
                    const batch = newProducts.map(p => addDoc(collection(db, 'products'), { ...p, createdAt: Date.now() }));
                    await Promise.all(batch);
                  })}
                  onUpdate={(id, product) => handleSyncOperation(async () => {
                    const { id: _, ...updateData } = product as any;
                    await updateDoc(doc(db, 'products', id), updateData);
                  })} 
                  onDelete={(id) => handleSyncOperation(async () => {
                    if (window.confirm('Are you sure you want to delete this product?')) {
                      await deleteDoc(doc(db, 'products', id));
                    }
                  })} 
                />
              )}
              {activeTab === 'orders' && (
                <AdminOrderManager 
                  orders={orders} 
                  products={products}
                  onUpdateStatus={(id, status) => handleSyncOperation(async () => {
                    const order = orders.find(o => o.id === id);
                    if (!order) return;

                    await updateDoc(doc(db, 'orders', id), { status });
                  })} 
                  onDeliveredWithPayment={(id, receivedAmount) => handleSyncOperation(async () => {
                    const order = orders.find(o => o.id === id);
                    if (!order) return;
                    
                    const balanceAdjustment = receivedAmount - order.total;
                    
                    // Update Order
                    await updateDoc(doc(db, 'orders', id), { 
                      status: 'Delivered',
                      receivedAmount,
                      walletAdjusted: true
                    });

                    // Update User Wallet & Transaction History
                    if (order.userId) {
                      const userDoc = doc(db, 'users', order.userId);
                      const userRef = users.find(u => u.uid === order.userId);
                      const currentBalance = userRef?.walletBalance || 0;
                      const newBalance = currentBalance + balanceAdjustment;

                      // Update User Balance
                      await updateDoc(userDoc, {
                        walletBalance: newBalance
                      });

                      // Create Transaction Record
                      if (balanceAdjustment !== 0) {
                        await addDoc(collection(db, 'walletTransactions'), {
                          userId: order.userId,
                          amount: balanceAdjustment,
                          balanceAfter: newBalance,
                          type: 'delivery_adjustment',
                          description: balanceAdjustment > 0 
                            ? `Extra payment for Order #${order.id.slice(-6).toUpperCase()}` 
                            : `Due for Order #${order.id.slice(-6).toUpperCase()}`,
                          orderId: order.id,
                          createdAt: Date.now()
                        });
                      }
                      
                      // Log full payment if any
                      if (receivedAmount > 0 && receivedAmount !== balanceAdjustment) {
                        // Optional: Log the payment itself if you want full double-entry
                      }
                    }
                  })}
                />
              )}
              {activeTab === 'workflow' && (
                <AdminOrderWorkflow 
                  orders={orders} 
                  onUpdateStatus={(id, status) => handleSyncOperation(async () => {
                    const order = orders.find(o => o.id === id);
                    if (!order) return;

                    await updateDoc(doc(db, 'orders', id), { status });
                  })} 
                />
              )}
              {activeTab === 'users' && (
                <AdminUserManager 
                  users={users} 
                  onUpdateRole={(uid, role) => handleSyncOperation(async () => {
                    await updateDoc(doc(db, 'users', uid), { role });
                  })} 
                  onDelete={(uid) => handleSyncOperation(async () => {
                    if (window.confirm('Are you sure you want to delete this user?')) {
                      await deleteDoc(doc(db, 'users', uid));
                    }
                  })} 
                />
              )}
              {activeTab === 'coupons' && (
                <AdminCouponManager 
                  coupons={coupons} 
                  onAdd={(coupon) => handleSyncOperation(async () => {
                    await addDoc(collection(db, 'coupons'), { ...coupon, createdAt: Date.now() });
                  })} 
                  onDelete={(id) => handleSyncOperation(async () => {
                    if (window.confirm('Are you sure you want to delete this coupon?')) {
                      await deleteDoc(doc(db, 'coupons', id));
                    }
                  })} 
                />
              )}
              {activeTab === 'banners' && (
                <AdminBannerManager 
                  banners={banners} 
                  onAdd={(banner) => handleSyncOperation(async () => {
                    await addDoc(collection(db, 'banners'), { ...banner, createdAt: new Date().toISOString() });
                  })} 
                  onUpdate={(id, banner) => handleSyncOperation(async () => {
                    await updateDoc(doc(db, 'banners', id), banner);
                  })}
                  onDelete={(id) => handleSyncOperation(async () => {
                    await deleteDoc(doc(db, 'banners', id));
                  })} 
                />
              )}
              {activeTab === 'support' && <AdminSupportManager />}
              {activeTab === 'billing' && <AdminBillingManager orders={orders} />}
              {activeTab === 'variations' && <AdminVariationManager products={products} />}
              {activeTab === 'stocks' && (
                <AdminStockManager 
                  products={products} 
                  onUpdateStock={(id, stock) => handleSyncOperation(async () => {
                    await updateDoc(doc(db, 'products', id), { stock });
                  })} 
                />
              )}
              {activeTab === 'bulk-enquiries' && <AdminBulkEnquiryManager />}
              {activeTab === 'wallet' && <AdminWalletRequests />}
              {activeTab === 'earnings' && <AdminAdEarningsManager />}
              {activeTab === 'dues' && <AdminDuesManager />}
              {activeTab === 'settings' && <AdminStoreSettings />}
              {activeTab === 'storage' && <AdminStorageManager />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {selectedEnquiryForOrder && (
          <AdminManualOrderCreator 
            enquiry={selectedEnquiryForOrder}
            products={products}
            onClose={() => setSelectedEnquiryForOrder(null)}
            onSuccess={() => {
              setSelectedEnquiryForOrder(null);
              setActiveTab('orders');
              alert("Order created successfully!");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Admin;
