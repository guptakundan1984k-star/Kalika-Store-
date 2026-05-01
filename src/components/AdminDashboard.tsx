import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, Users, ShoppingBag, DollarSign, 
  ArrowUpRight, ArrowDownRight, ArrowRight, Package, Clock,
  Shield, BarChart3, Calendar, RefreshCw, Download, Ticket, Layout, AlertCircle,
  Camera, Image as ImageIcon, Sparkles, Loader2, Upload, Link as LinkIcon, Save, Trash2, Plus, X, Truck, Mic
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, onSnapshot, query, orderBy, handleFirestoreError, OperationType, storage, ref, uploadBytes, getDownloadURL } from '../firebase';
import { Order, Product, UserProfile, StoreSettings } from '../types';
import { AdminOrderManager } from './AdminOrderManager';
import { AdminProductManager } from './AdminProductManager';
import { AdminUserManager } from './AdminUserManager';
import { writeBatch, updateDoc, doc, deleteDoc, addDoc } from 'firebase/firestore';
import { aiService } from '../services/aiService';

const COLORS = ['#f97316', '#facc15', '#fb923c', '#fde047'];

interface AdminDashboardProps {
  onTabChange?: (tab: any) => void;
  user?: UserProfile | null;
  products: Product[];
  orders: Order[];
  users: UserProfile[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onTabChange, user, products, orders, users }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products' | 'users' | 'coupons'>('overview');
  const [loading, setLoading] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState<boolean | null>(null);
  const [lastOrderCount, setLastOrderCount] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedNavigationTab, setSelectedNavigationTab] = useState('orders');
  const [showPhotoAlertFix, setShowPhotoAlertFix] = useState(false);
  const [showPriceAlertList, setShowPriceAlertList] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'store'), (s) => {
      if (s.exists()) setSettings(s.data() as StoreSettings);
    });
    return () => unsub();
  }, []);
  const [showContinuousPhotoAdder, setShowContinuousPhotoAdder] = useState(false);
  const [continuousPhotos, setContinuousPhotos] = useState<{file: File, preview: string, productName?: string, matchedId?: string}[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [fixingProduct, setFixingProduct] = useState<Product | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isFixing, setIsFixing] = useState(false);
  const widgetsRef = React.useRef<HTMLDivElement>(null);

  const productsMissingPhotos = products.filter(p => !p.image || p.image.includes('picsum.photos') || p.image.includes('placeholder'));

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
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
    if (!user || user.role !== 'admin') return;

    // Request notification permission
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

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
      handleFirestoreError(error, OperationType.LIST, 'product_requests', false);
    });

    // Connectivity Check
    const checkConnection = () => {
      setIsDbConnected(navigator.onLine);
    };
    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);
    checkConnection();

    return () => {
      unsubscribeRequests();
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
    };
  }, [user]);

  // Monitor for new orders from props
  useEffect(() => {
    if (lastOrderCount !== null && orders.length > lastOrderCount) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => console.log("Audio play failed:", e));
      
      if (Notification.permission === "granted" && orders[0]) {
        new Notification("New Order Received!", {
          body: `Order #${orders[0].id.slice(-8)} for ₹${orders[0].total}`,
          icon: "/favicon.ico"
        });
      }
    }
    setLastOrderCount(orders.length);
  }, [orders]);

  const systemStats = [
    { label: 'Delivery', status: settings?.isDeliveryEnabled !== false ? 'ON' : 'OFF', icon: Truck, color: settings?.isDeliveryEnabled !== false ? 'text-green-500' : 'text-red-500' },
    { label: 'Voice AI', status: settings?.isVoiceSupportEnabled ? 'ON' : 'OFF', icon: Mic, color: settings?.isVoiceSupportEnabled ? 'text-green-500' : 'text-red-500' },
    { label: 'Staff Online', status: users.filter(u => u.role === 'admin' || u.role === 'cs').length, icon: Shield, color: 'text-purple-500' },
  ];

  const stats = [
    { label: 'Total Revenue', value: `₹${orders.reduce((sum, o) => sum + o.total, 0)}`, icon: DollarSign, trend: '+12.5%', color: 'primary', tab: 'dashboard' },
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
                onClick={() => setShowPriceAlertList(true)}
                className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 hover:bg-red-700"
              >
                Fix ({products.filter(p => !p.price || p.price <= 0).length})
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[32px] flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-black text-indigo-900">Continuous Adder</h4>
                <p className="text-sm font-bold text-indigo-600/70 uppercase tracking-widest">Bulk Photo Upload</p>
              </div>
            </div>
            <button 
              onClick={() => setShowContinuousPhotoAdder(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-black transition-all"
            >
              Add Photos
            </button>
          </div>

          <div className="bg-gray-900 border border-black p-6 rounded-[32px] flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-black text-white">Clean Store</h4>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Reset Catalog</p>
              </div>
            </div>
            <button 
              onClick={async () => {
              if (window.confirm("⚠️ DANGER: This will delete ALL products permanently. Proceed?")) {
                const confirmInput = window.prompt("Type 'DELETE' to confirm:");
                if (confirmInput === 'DELETE') {
                  setIsFixing(true);
                  try {
                    const batch = writeBatch(db);
                    products.forEach(p => {
                      batch.delete(doc(db, 'products', p.id));
                    });
                    await batch.commit();
                    alert("Catalog cleared successfully!");
                  } catch (e) {
                    console.error("Failed to clear catalog", e);
                    alert("Some items could not be deleted. Please check permissions.");
                  } finally {
                    setIsFixing(false);
                  }
                }
              }
            }}
              className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 hover:bg-black transition-all"
            >
              Clear All
            </button>
          </div>
        </div>

        {productsMissingPhotos.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-orange-50 border border-orange-100 p-6 rounded-[32px] flex items-center justify-between gap-6 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-black text-orange-900">Photo Alert</h4>
                <p className="text-sm font-bold text-orange-600/70 uppercase tracking-widest">
                  {productsMissingPhotos.length} Items need professional photos
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={async () => {
                  if (!window.confirm(`Auto-fix ${productsMissingPhotos.length} photos using AI Search?`)) return;
                  setIsFixing(true);
                  for (const p of productsMissingPhotos) {
                    try {
                      const urls = await aiService.findProductImages(p.name, p.category);
                      if (urls.length > 0) {
                        await updateDoc(doc(db, 'products', p.id), {
                          image: urls[0],
                          primaryImage: urls[0],
                          images: urls
                        });
                      }
                    } catch (e) {
                      console.error(`Fix failed for ${p.name}`, e);
                    }
                    await new Promise(r => setTimeout(r, 600));
                  }
                  setIsFixing(false);
                  alert("Auto-fix complete!");
                }}
                disabled={isFixing}
                className="bg-[#00AEEF] text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-black transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isFixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                AI Auto-Fix
              </button>
              <button 
                onClick={() => setShowPhotoAlertFix(true)}
                className="bg-white text-gray-900 border border-gray-200 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2"
              >
                <Camera className="w-4 h-4 text-primary" />
                Add Photos Manually
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showPriceAlertList && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden">
               <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                 <div>
                   <h3 className="text-2xl font-black text-gray-900 tracking-tight">Price Incompleteness</h3>
                   <p className="text-xs font-black text-red-500 uppercase tracking-widest">Items currently missing a sale price</p>
                 </div>
                 <button onClick={() => setShowPriceAlertList(false)} className="p-3 bg-gray-50 rounded-xl text-gray-400 hover:text-red-500 transition-all">
                   <Clock className="w-6 h-6 rotate-45" />
                 </button>
               </div>
               <div className="flex-1 overflow-y-auto p-6 space-y-3">
                 {products.filter(p => !p.price || p.price <= 0).map(p => (
                   <div key={p.id} className="bg-gray-50 p-4 rounded-3xl border border-gray-100 flex items-center justify-between group">
                     <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-white rounded-xl overflow-hidden border border-gray-100">
                         <img src={p.image} className="w-full h-full object-cover" alt="" />
                       </div>
                       <div>
                         <p className="text-sm font-black text-gray-900">{p.name}</p>
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{p.category}</p>
                       </div>
                     </div>
                     <div className="flex items-center gap-2">
                       <input 
                        type="number"
                        placeholder="Set Price"
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value);
                          if (val > 0) {
                            updateDoc(doc(db, 'products', p.id), { price: val });
                          }
                        }}
                        className="w-24 bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-black focus:ring-2 focus:ring-primary/20 outline-none"
                       />
                       <button 
                        onClick={() => {
                          setSelectedNavigationTab('products');
                          onTabChange?.('products');
                          setShowPriceAlertList(false);
                        }}
                        className="p-2 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-primary transition-all"
                       >
                         <ArrowUpRight className="w-5 h-5" />
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </motion.div>
        )}

        {showContinuousPhotoAdder && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden">
               <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white z-10">
                 <div>
                   <h3 className="text-2xl font-black text-gray-900 tracking-tight">Continuous Photo Adder</h3>
                   <p className="text-xs font-black text-indigo-500 uppercase tracking-widest">Select multiple photos, preview, and match to inventory</p>
                 </div>
                 <div className="flex items-center gap-4">
                   <label className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-105 transition-all cursor-pointer">
                     <Plus className="w-4 h-4" />
                     Select Photos
                     <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const newEntries = files.map(file => ({
                          file,
                          preview: URL.createObjectURL(file)
                        }));
                        setContinuousPhotos(prev => [...prev, ...newEntries]);
                      }}
                     />
                   </label>
                   <button 
                    onClick={async () => {
                      if (continuousPhotos.length === 0) return;
                      const matchedOnes = continuousPhotos.filter(p => !!p.matchedId);
                      if (matchedOnes.length === 0) {
                        alert("Please match at least one photo to a product first.");
                        return;
                      }

                      setIsProcessingBatch(true);
                      try {
                        for (const item of matchedOnes) {
                          const product = products.find(p => p.id === item.matchedId);
                          const hasRealPhoto = product?.image && !product.image.includes('picsum.photos') && !product.image.includes('placeholder');
                          
                          if (hasRealPhoto) {
                            if (!window.confirm(`Product "${product?.name}" already has a professional photo. Do you want to replace it?`)) {
                              continue;
                            }
                          }

                          const storageRef = ref(storage, `products/${item.matchedId}/${Date.now()}_${item.file.name}`);
                          const snapshot = await uploadBytes(storageRef, item.file);
                          const url = await getDownloadURL(snapshot.ref);
                          
                          await updateDoc(doc(db, 'products', item.matchedId!), {
                            image: url,
                            updatedAt: Date.now()
                          });
                        }
                        alert(`Successfully processed ${matchedOnes.length} photos!`);
                        setContinuousPhotos([]);
                        setShowContinuousPhotoAdder(false);
                      } catch (e) {
                        console.error("Batch upload failed", e);
                        alert("Batch upload failed. Please try again.");
                      } finally {
                        setIsProcessingBatch(false);
                      }
                    }}
                    disabled={continuousPhotos.length === 0 || isProcessingBatch}
                    className="bg-black text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-black/20 hover:bg-primary transition-all disabled:opacity-50"
                   >
                     {isProcessingBatch ? (
                       <span className="flex items-center gap-2">
                         <Loader2 className="w-4 h-4 animate-spin" />
                         PROCESSING...
                       </span>
                     ) : (
                       <span className="flex items-center gap-2">
                         <Save className="w-4 h-4" />
                         Process & Save ({continuousPhotos.length})
                       </span>
                     )}
                   </button>
                   <button onClick={() => {
                     setShowContinuousPhotoAdder(false);
                     setContinuousPhotos([]);
                   }} className="p-3 bg-gray-50 rounded-xl hover:text-red-500 transition-all">
                     <X className="w-6 h-6" />
                   </button>
                 </div>
               </div>
               
                <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-gray-50">
                  {continuousPhotos.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
                      <ImageIcon className="w-24 h-24 mb-6" />
                      <h4 className="text-2xl font-black uppercase tracking-widest">No photos selected</h4>
                      <p className="text-sm font-bold uppercase tracking-widest">Batch select product photos to begin</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {continuousPhotos.map((item, idx) => {
                        const matchedProduct = products.find(p => p.id === item.matchedId);
                        const hasExistingPhoto = matchedProduct?.image && !matchedProduct.image.includes('picsum.photos') && !matchedProduct.image.includes('placeholder');
                        
                        return (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={idx}
                            className={`group relative bg-white rounded-3xl border-2 shadow-lg overflow-hidden flex flex-col transition-all ${item.matchedId ? (hasExistingPhoto ? 'border-orange-400' : 'border-green-400') : 'border-white'}`}
                          >
                            <div className="aspect-square relative overflow-hidden bg-gray-100">
                              <img src={item.preview} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="" />
                              <button 
                                onClick={() => setContinuousPhotos(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-xl shadow-lg hover:scale-110 transition-all z-20"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              {hasExistingPhoto && (
                                <div className="absolute top-2 left-2 bg-orange-500 text-white p-1 rounded-lg shadow-lg z-20" title="Item already has photo">
                                  <AlertCircle className="w-3 h-3 animate-pulse" />
                                </div>
                              )}
                            </div>
                            <div className="p-2 space-y-1.5">
                               <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest truncate">{item.file.name}</p>
                               <select 
                                 className="w-full bg-gray-100 border-none rounded-xl px-2 py-1.5 text-[10px] font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                                 onChange={(e) => {
                                   const newPhotos = [...continuousPhotos];
                                   newPhotos[idx].matchedId = e.target.value;
                                   setContinuousPhotos(newPhotos);
                                 }}
                                 value={item.matchedId || ""}
                               >
                                 <option value="">Match Product...</option>
                                 {products.map(p => (
                                   <option key={p.id} value={p.id}>{p.name}</option>
                                 ))}
                               </select>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
            </div>
          </motion.div>
        )}

        {showPhotoAlertFix && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <div className="bg-white w-full max-w-4xl max-h-[80vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Professional Photo Fixer</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Identify & replace placeholder images</p>
                </div>
                <button onClick={() => setShowPhotoAlertFix(false)} className="p-3 bg-gray-50 rounded-2xl hover:text-red-500 transition-all">
                  <Clock className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 scrollbar-hide">
                {productsMissingPhotos.map(product => (
                  <motion.div 
                    layout
                    key={product.id}
                    className="group bg-gray-50 rounded-[32px] p-4 border border-gray-100 hover:border-[#00AEEF]/50 transition-all shadow-sm hover:shadow-lg"
                  >
                    <div className="aspect-square rounded-2xl overflow-hidden mb-4 bg-white relative border border-gray-100">
                      <img src={product.image} className="w-full h-full object-cover grayscale opacity-50" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Camera className="w-10 h-10 text-gray-200" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-black text-gray-900 leading-tight line-clamp-1">{product.name}</h5>
                        <p className="text-[10px] font-black text-[#00AEEF] uppercase tracking-widest">{product.category}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => {
                            setFixingProduct(product);
                            setNewImageUrl('');
                          }}
                          className="w-full bg-white border border-gray-200 p-3 rounded-xl flex flex-col items-center gap-1 hover:border-[#00AEEF] transition-all group/btn"
                        >
                          <Upload className="w-4 h-4 text-gray-400 group-hover/btn:text-[#00AEEF]" />
                          <span className="text-[8px] font-black uppercase text-gray-400">Manual</span>
                        </button>
                        <button 
                          onClick={async () => {
                            try {
                              setFixingProduct(product);
                              setIsFixing(true);
                              const urls = await aiService.findProductImages(product.name, product.category);
                              if (urls.length > 0) {
                                await updateDoc(doc(db, 'products', product.id), {
                                  image: urls[0],
                                  primaryImage: urls[0],
                                  images: urls
                                });
                                alert(`Updated photo for ${product.name}`);
                              } else {
                                alert("AI could not find an image for this item.");
                              }
                            } catch (e) {
                              console.error(e);
                            } finally {
                              setFixingProduct(null);
                              setIsFixing(false);
                            }
                          }}
                          disabled={isFixing}
                          className="w-full bg-[#00AEEF]/10 p-3 rounded-xl flex flex-col items-center gap-1 hover:bg-[#00AEEF] hover:text-white transition-all group/btn disabled:opacity-50"
                        >
                          {isFixing && fixingProduct?.id === product.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-[#00AEEF] group-hover/btn:text-white" />}
                          <span className="text-[8px] font-black uppercase text-[#00AEEF] group-hover/btn:text-white">AI Search</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {fixingProduct && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Update Photo</h3>
                  <p className="text-sm font-bold text-gray-400">For {fixingProduct.name}</p>
                </div>
                <button onClick={() => setFixingProduct(null)} className="p-2 text-gray-400 hover:text-red-500">
                  <Trash2 className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Paste Image URL</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <button 
                      onClick={async () => {
                        if (newImageUrl) {
                          await updateDoc(doc(db, 'products', fixingProduct.id), { image: newImageUrl, primaryImage: newImageUrl });
                          setFixingProduct(null);
                        }
                      }}
                      className="bg-primary text-white p-4 rounded-2xl hover:bg-primary-dark transition-all"
                    >
                      <Save className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                    <span className="bg-white px-4 text-gray-400">or</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Upload File</label>
                  <label className="w-full h-32 bg-gray-50 border-4 border-dashed border-gray-100 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-all group">
                    <Upload className="w-8 h-8 text-gray-300 group-hover:text-primary transition-colors" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2">Tap to select photo</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIsFixing(true);
                          const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
                          await uploadBytes(storageRef, file);
                          const url = await getDownloadURL(storageRef);
                          await updateDoc(doc(db, 'products', fixingProduct.id), { image: url, primaryImage: url });
                          setIsFixing(false);
                          setFixingProduct(null);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* System Status Indicators */}
      <div className="flex flex-wrap gap-4 mb-8">
        {systemStats.map((s) => (
          <div key={s.label} className="bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className={`p-1.5 rounded-lg bg-gray-50 ${s.color}`}>
              <s.icon className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">{s.label}</p>
              <p className={`text-[10px] font-black uppercase tracking-tight ${s.color}`}>{s.status}</p>
            </div>
          </div>
        ))}
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
              <AreaChart data={
                // Group sales by day to avoid duplicate key errors on the chart axis
                Array.from(
                  orders.slice(0, 30).reduce((acc, o) => {
                    const day = new Date(o.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
                    acc.set(day, (acc.get(day) || 0) + o.total);
                    return acc;
                  }, new Map<string, number>())
                ).map(([name, revenue]) => ({ name, revenue }))
              }>
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
            <div className="bg-gradient-to-br from-[#00AEEF] to-blue-600 p-8 rounded-[32px] text-white shadow-xl shadow-blue-600/20 flex items-center justify-between gap-6">
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
                onClick={() => onTabChange?.('coupons')}
                className="bg-white text-blue-600 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-gray-100 active:scale-95 shrink-0"
              >
                Manage
              </button>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-8 rounded-[32px] text-white shadow-xl shadow-indigo-600/20 flex items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center shrink-0">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-black mb-1">User Roles</h4>
                  <p className="text-sm opacity-80">Assign admin roles and manage user permissions.</p>
                </div>
              </div>
              <button 
                onClick={() => onTabChange?.('users')}
                className="bg-white text-indigo-600 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-gray-100 active:scale-95 shrink-0"
              >
                Manage
              </button>
            </div>

            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-8 rounded-[32px] text-white shadow-xl shadow-emerald-600/20 flex items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center shrink-0">
                  <Package className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-black mb-1">Inventory Sync</h4>
                  <p className="text-sm opacity-80">Bulk update stock and import product catalogs.</p>
                </div>
              </div>
              <button 
                onClick={() => onTabChange?.('products')}
                className="bg-white text-emerald-600 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-gray-100 active:scale-95 shrink-0"
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
                <tr className="bg-gray-100">
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.slice(0, 5).map((order) => (
                  <tr key={`recent-${order.id}`} className="hover:bg-gray-50 transition-colors">
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
              <div key={`top-${product.id}`} className="flex items-center gap-4 group">
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
