import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, Users, ShoppingBag, DollarSign, 
  ArrowUpRight, ArrowDownRight, ArrowRight, Package, Clock,
  Shield, BarChart3, Calendar, RefreshCw, Download, Ticket, Layout, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, onSnapshot, query, orderBy, handleFirestoreError, OperationType } from '../firebase';
import { Order, Product, UserProfile } from '../types';
import { AdminOrderManager } from './AdminOrderManager';
import { AdminProductManager } from './AdminProductManager';
import { AdminUserManager } from './AdminUserManager';
import { updateDoc, doc, deleteDoc, addDoc } from 'firebase/firestore';

const COLORS = ['#f97316', '#facc15', '#fb923c', '#fde047'];

interface AdminDashboardProps {
  onTabChange?: (tab: any) => void;
  user?: UserProfile | null;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onTabChange, user }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products' | 'users' | 'coupons'>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState<boolean | null>(null);
  const [lastOrderCount, setLastOrderCount] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedNavigationTab, setSelectedNavigationTab] = useState('orders');
  const widgetsRef = React.useRef<HTMLDivElement>(null);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    // The useEffect will re-run because of the dependency if we add it, 
    // but onSnapshot is already real-time. 
    // However, this might help if the connection was lost.
  };

  const scrollToWidgets = () => {
    widgetsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const exportOrdersToCSV = () => {
    if (orders.length === 0) return;
    
    const headers = ['Order ID', 'Date', 'Customer', 'Phone', 'Items', 'Total', 'Payment', 'Status', 'Address'];
    const rows = orders.map(order => [
      order.id,
      new Date(order.createdAt).toLocaleString(),
      order.userName || 'Guest',
      order.userPhone || 'N/A',
      order.items.map(item => `${item.name} (${item.quantity})`).join('; '),
      order.total,
      order.paymentMethod,
      order.status,
      order.address?.manual || 'Takeaway'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `kalika_store_orders_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setLoading(false);
      return;
    }

    // Request notification permission
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const newOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      
      // Play ring sound if new order arrives
      if (lastOrderCount !== null && newOrders.length > lastOrderCount) {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log("Audio play failed:", e));
        
        // Also show a browser notification if possible
        if (Notification.permission === "granted") {
          new Notification("New Order Received!", {
            body: `Order #${newOrders[0].id.slice(-8)} for ₹${newOrders[0].total}`,
            icon: "/favicon.ico"
          });
        }
      }
      
      setOrders(newOrders);
      setLastOrderCount(newOrders.length);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders', false);
    });

    const qProducts = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products', false);
    });

    const qUsers = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users', false);
      setLoading(false);
    });

    const qRequests = query(collection(db, 'product_requests'), orderBy('createdAt', 'desc'));
    const unsubscribeRequests = onSnapshot(qRequests, (snapshot) => {
      const newRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(newRequests);
      
      // Notify for new requests
      if (requests.length > 0 && newRequests.length > requests.length) {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log("Audio play failed:", e));
      }
    }, (error) => {
      console.error("Requests sync failed", error);
    });

    // Connectivity Check
    const checkConnection = () => {
      setIsDbConnected(navigator.onLine);
    };
    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);
    checkConnection();

    return () => {
      unsubscribeOrders();
      unsubscribeProducts();
      unsubscribeUsers();
      unsubscribeRequests();
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
    };
  }, [user, refreshKey]);

  const stats = [
    { label: 'Total Revenue', value: `₹${orders.reduce((sum, o) => sum + o.total, 0)}`, icon: DollarSign, trend: '+12.5%', color: 'primary', tab: 'billing' },
    { label: 'Total Orders', value: orders.length, icon: ShoppingBag, trend: '+8.2%', color: 'blue', tab: 'orders' },
    { label: 'Active Users', value: users.length, icon: Users, trend: '+5.4%', color: 'purple', tab: 'users' },
    { label: 'Products', value: products.length, icon: Package, trend: '+2.1%', color: 'orange', tab: 'products' },
  ];

  const getSalesForPeriod = (days: number) => {
    const now = Date.now();
    const periodMs = days * 24 * 60 * 60 * 1000;
    return orders
      .filter(o => o.status === 'Delivered' && (now - o.createdAt) <= periodMs)
      .reduce((sum, o) => sum + o.total, 0);
  };

  const salesStats = [
    { label: 'Today', value: getSalesForPeriod(1), icon: Calendar },
    { label: 'Last 7 Days', value: getSalesForPeriod(7), icon: Calendar },
    { label: 'Last 30 Days', value: getSalesForPeriod(30), icon: Calendar },
    { label: 'Last 6 Months', value: getSalesForPeriod(180), icon: Calendar },
  ];

  const handleUpdateOrderStatus = async (id: string, status: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status });
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const handleUpdateProduct = async (id: string, product: Partial<Product>) => {
    try {
      await updateDoc(doc(db, 'products', id), product);
    } catch (error) {
      console.error("Error updating product:", error);
    }
  };

  const handleAddProduct = async (product: Partial<Product>) => {
    try {
      await addDoc(collection(db, 'products'), {
        ...product,
        createdAt: Date.now(),
        rating: 4.5,
        reviews: 0
      });
    } catch (error) {
      console.error("Error adding product:", error);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (error) {
        console.error("Error deleting product:", error);
      }
    }
  };

  const handleUpdateUserRole = async (uid: string, role: UserProfile['role']) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role });
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch (error) {
        console.error("Error deleting user:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Initializing Admin Panel...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Stats Grid */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Dashboard Overview</h2>
        <div className="flex flex-wrap items-center gap-3">
          {/* Go to Selected Widget */}
          <div className="flex items-center gap-2 bg-white border border-gray-100 p-1.5 rounded-2xl shadow-sm">
            <select 
              value={selectedNavigationTab}
              onChange={(e) => setSelectedNavigationTab(e.target.value)}
              className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none px-3 cursor-pointer"
            >
              <option value="dashboard">Dashboard</option>
              <option value="products">Inventory</option>
              <option value="orders">Orders</option>
              <option value="users">Customers</option>
              <option value="coupons">Coupons</option>
              <option value="billing">Billing</option>
              <option value="banners">Banners</option>
              <option value="settings">Settings</option>
            </select>
            <button 
              onClick={() => onTabChange?.(selectedNavigationTab)}
              className="group flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary-dark transition-all active:scale-95 shadow-lg shadow-primary/20"
            >
              Go to Selected
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <button 
            onClick={exportOrdersToCSV}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-xl shadow-green-600/20 hover:bg-green-700 transition-all active:scale-95 font-bold text-xs uppercase tracking-widest"
            title="Download Order CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">Download Orders</span>
          </button>
          <button 
            onClick={handleRefresh}
            className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-primary hover:shadow-lg transition-all active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={scrollToWidgets}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-xl shadow-gray-900/20 hover:bg-black transition-all active:scale-95 font-bold text-xs uppercase tracking-widest"
          >
            <Layout className="w-4 h-4" />
            Go to Widgets
          </button>
        </div>
      </div>

      {/* Price Alert & Connection Banner */}
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-6 rounded-[32px] flex items-center justify-between gap-6 border ${isDbConnected === false ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDbConnected === false ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {isDbConnected === false ? <Clock className="w-6 h-6 animate-pulse" /> : <RefreshCw className="w-6 h-6" />}
              </div>
              <div>
                <h4 className={`text-lg font-black ${isDbConnected === false ? 'text-red-900' : 'text-green-900'}`}>
                  {isDbConnected === false ? 'Database Offline' : 'Database Online'}
                </h4>
                <p className={`text-sm font-bold uppercase tracking-widest ${isDbConnected === false ? 'text-red-600/70' : 'text-green-600/70'}`}>
                  {isDbConnected === false ? 'Check your internet connection' : 'Live sync active & secure'}
                </p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${isDbConnected === false ? 'bg-red-600 text-white animate-pulse' : 'bg-green-600 text-white'}`}>
              {isDbConnected === false ? 'Not Connected' : 'Connected'}
            </div>
          </div>

          {products.some(p => !p.price || p.price <= 0) && (
            <div className="bg-red-50 border border-red-100 p-6 rounded-[32px] flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-red-900">Price Alert</h4>
                  <p className="text-sm font-bold text-red-600/70 uppercase tracking-widest">Pricing Missing</p>
                </div>
              </div>
              <button 
                onClick={() => onTabChange?.('products')}
                className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 hover:bg-red-700"
              >
                Fix ({products.filter(p => !p.price || p.price <= 0).length})
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <button 
            key={stat.label} 
            onClick={() => onTabChange?.(stat.tab)}
            className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all group text-left w-full active:scale-95"
          >
            <div className="flex items-center justify-between mb-6">
              <div className={`w-14 h-14 bg-${stat.color === 'primary' ? 'primary' : stat.color}-50 rounded-2xl flex items-center justify-center text-${stat.color === 'primary' ? 'primary' : stat.color}-500 group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-7 h-7" />
              </div>
              <div className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black">
                <ArrowUpRight className="w-3 h-3" />
                {stat.trend}
              </div>
            </div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h4 className="text-3xl font-black text-gray-900 tracking-tight">{stat.value}</h4>
          </button>
        ))}
      </div>

      {/* Sales Period Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {salesStats.map((stat) => (
          <div key={stat.label} className="bg-gray-900 p-6 rounded-[32px] border border-gray-800 shadow-2xl group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label} Sales</p>
            </div>
            <h4 className="text-2xl font-black text-white tracking-tight">₹{stat.value.toLocaleString()}</h4>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className="xl:col-span-2 bg-white rounded-[40px] border border-gray-100 shadow-sm p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Sales Performance</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Revenue over time</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={orders.slice(0, 7).map((o, i) => ({ name: new Date(o.createdAt).toLocaleDateString('en-US', { weekday: 'short' }), revenue: o.total }))}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#f97316', fontWeight: 900, fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Distribution */}
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8">
          <div className="mb-8">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Order Status</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Distribution by status</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={['Pending', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'].map(status => ({
                    name: status,
                    value: orders.filter(o => o.status === status).length
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {['#f97316', '#3b82f6', '#a855f7', '#22c55e', '#ef4444'].map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 900, fontSize: '12px' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Widgets Section */}
      <div ref={widgetsRef} className="pt-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Layout className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Quick Widgets</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Manage store components</p>
            </div>
          </div>
          <button 
            onClick={handleRefresh}
            className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
          >
            <RefreshCw className="w-3 h-3" />
            Reload Widgets
          </button>
        </div>

        <div className="bg-gray-50 rounded-[40px] border border-gray-100 p-2">
          <div className="max-h-[400px] overflow-y-auto p-4 space-y-4 scrollbar-hide">
            <div className="bg-gradient-to-br from-primary to-orange-600 p-8 rounded-[32px] text-white shadow-xl shadow-primary/20 flex items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                  <Ticket className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-black mb-1">Coupon Manager</h4>
                  <p className="text-sm opacity-80">Create and manage discount codes for your customers.</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('coupons')}
                className="bg-white text-primary px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-gray-100 active:scale-95 shrink-0"
              >
                Manage
              </button>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-8 rounded-[32px] text-white shadow-xl shadow-blue-600/20 flex items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-black mb-1">User Roles</h4>
                  <p className="text-sm opacity-80">Assign admin roles and manage user permissions.</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('users')}
                className="bg-white text-blue-600 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-gray-100 active:scale-95 shrink-0"
              >
                Manage
              </button>
            </div>

            <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-8 rounded-[32px] text-white shadow-xl shadow-purple-600/20 flex items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                  <Package className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-black mb-1">Inventory Sync</h4>
                  <p className="text-sm opacity-80">Bulk update stock and import product catalogs.</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('products')}
                className="bg-white text-purple-600 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-gray-100 active:scale-95 shrink-0"
              >
                Manage
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Recent Orders */}
        <div className="xl:col-span-2 bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Recent Orders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-gray-900">#{order.id.slice(-8).toUpperCase()}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        order.status === 'Delivered' ? 'bg-green-50 text-green-600' :
                        order.status === 'Cancelled' ? 'bg-red-50 text-red-600' :
                        'bg-orange-50 text-orange-600'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-gray-900">₹{order.total}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Top Products</h3>
          </div>
          <div className="p-8 space-y-6">
            {products.slice(0, 4).map((product) => (
              <div key={product.id} className="flex items-center gap-4 group">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
                  {product.image && <img src={product.image} alt={product.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-gray-900 group-hover:text-primary transition-colors">{product.name}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{product.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-primary">₹{product.price}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${product.stock <= 5 ? 'text-red-500' : 'text-green-500'}`}>
                    {product.stock <= 5 ? 'Low Stock' : 'In Stock'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Product Requests */}
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Product Requests</h3>
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest">
              {requests.length} Total
            </span>
          </div>
          <div className="p-8 space-y-6 max-h-[400px] overflow-y-auto scrollbar-hide">
            {requests.length > 0 ? requests.map((req) => (
              <div key={req.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-gray-900">{req.productName}</p>
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Requested by: {req.customerName}</p>
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => {
                      const msg = `Regarding your request for ${req.productName}: We are looking into it!`;
                      window.open(`https://wa.me/?text=${msg}`, '_blank');
                    }}
                    className="text-[8px] font-black text-primary uppercase tracking-widest hover:underline"
                  >
                    Reply via WA
                  </button>
                  <button 
                    onClick={async () => {
                      if (window.confirm('Mark as completed?')) {
                        await deleteDoc(doc(db, 'product_requests', req.id));
                      }
                    }}
                    className="text-[8px] font-black text-green-500 uppercase tracking-widest hover:underline"
                  >
                    Complete
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No requests yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
