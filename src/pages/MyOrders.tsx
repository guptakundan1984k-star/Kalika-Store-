import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, SlidersHorizontal, ChevronRight, Star, ShoppingBag, Clock, Package, Truck, CheckCircle, XCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Order, UserProfile } from '../types';
import { db, doc, updateDoc, collection, addDoc, handleFirestoreError, OperationType } from '../firebase';

interface MyOrdersProps {
  orders: Order[];
  user?: UserProfile | null;
}

export const MyOrders: React.FC<MyOrdersProps> = ({ orders, user }) => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const handleCancelOrder = async (orderId: string) => {
    if (!cancelReason.trim()) {
      alert("Please provide a reason for cancellation.");
      return;
    }

    try {
      // 1. Update Order Status
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'Cancelled',
        cancellationReason: cancelReason,
        updatedAt: Date.now()
      });

      // 2. Create Support Query for Admin
      await addDoc(collection(db, 'support_queries'), {
        userId: user?.uid || 'unknown',
        userName: user?.name || 'Customer',
        userEmail: user?.email || '',
        userPhone: user?.phone || '',
        status: 'pending',
        createdAt: Date.now(),
        chatHistory: [
          {
            role: 'user',
            content: `🚨 ORDER CANCELLED: Order #${orderId.slice(-6).toUpperCase()}\nReason: ${cancelReason}`
          }
        ]
      });

      setIsCancelling(null);
      setCancelReason('');
      alert("Order cancelled successfully.");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const filters = [
    { id: 'filter', label: 'Filter', icon: SlidersHorizontal },
    { id: 'quick', label: 'Quick', icon: null },
    { id: 'shop_all', label: 'Shop All', icon: null },
    { id: 'last_30', label: 'Last 30', icon: null },
  ];

  const getStatusDisplay = (order: Order) => {
    if (order.status === 'Delivered') {
      const date = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `Delivered, ${date}`;
    }
    return order.status === 'Pending' ? 'Under Process' : order.status;
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeFilter === 'Shop All' || activeFilter === 'All') return true;
    if (activeFilter === 'Quick') return true; 
    if (activeFilter === 'Last 30') {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      return order.createdAt > thirtyDaysAgo;
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    const activeStatuses = ['Packed', 'Out for Delivery', 'Ready for Pickup', 'Order Received'];
    if (activeStatuses.includes(status)) {
      return 'text-green-600 animate-pulse font-black';
    }
    if (status === 'Delivered') return 'text-gray-900 font-black';
    if (status === 'Cancelled') return 'text-red-500 font-black';
    return 'text-gray-900 font-black';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-20 pb-24 md:pt-24 lg:pt-28">
      {/* Header */}
      <div className="bg-white px-6 py-4 flex flex-col gap-4 border-b border-gray-100 sticky top-16 md:top-20 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-1 text-gray-900 hover:bg-gray-50 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Orders</h1>
        </div>

        {/* Desktop Search Integration */}
        <div className="relative">
          <ShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Search by Order ID or Product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-gray-50 px-6 py-4 flex items-center gap-3 overflow-x-auto scrollbar-hide">
        {filters.map((filter) => (
          <button
            key={filter.id}
            className={`shrink-0 flex items-center gap-2 px-6 py-3 rounded-full border border-gray-200 text-sm font-bold transition-all shadow-sm active:scale-95 ${
              activeFilter === filter.label ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-gray-500 hover:border-primary/20'
            }`}
            onClick={() => setActiveFilter(filter.label)}
          >
            {filter.icon && <filter.icon className="w-4 h-4" />}
            {filter.id === 'quick' && <span className={activeFilter === 'Quick' ? 'text-white' : 'text-primary'}>⚡</span>}
            {filter.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="flex-1 px-6 space-y-6 overflow-y-auto max-w-4xl mx-auto w-full">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={order.id}
              className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-6 group"
            >
              <div className="flex items-center justify-between">
                <h3 className={`text-xl tracking-tight transition-all ${getStatusColor(order.status)}`}>
                  {getStatusDisplay(order)}
                </h3>
                {/* Quick Badge */}
                {order.status === 'Delivered' && order.earnedPoints && (
                  <div className="bg-amber-50 border border-amber-100 px-3 py-1 rounded-xl flex items-center gap-1 shadow-sm">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{order.earnedPoints} Coins Earned</span>
                  </div>
                )}
                <div className="bg-orange-50 border border-orange-100 px-3 py-1 rounded-xl flex items-center gap-1 shadow-sm">
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">⚡ -Quick</span>
                </div>
              </div>

              {/* Product Thumbnails Row */}
              <div className="flex flex-wrap gap-4">
                {order.items.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="relative w-20 h-20 bg-gray-50 rounded-2xl p-1 border border-gray-100 shadow-sm">
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-contain mix-blend-multiply" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-200">
                        <ShoppingBag className="w-8 h-8" />
                      </div>
                    )}
                    {/* Quantity Badge */}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-lg">
                      <span className="text-[10px] font-black text-gray-900">{item.quantity}</span>
                    </div>
                  </div>
                ))}
                {order.items.length > 4 && (
                  <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 border-dashed">
                    <span className="text-xs font-black text-gray-400">+{order.items.length - 4}</span>
                  </div>
                )}
              </div>

              {/* Rating Section for Delivered Orders */}
              {order.status === 'Delivered' && (
                <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                  <p className="text-xs font-black text-gray-900 tracking-tight uppercase tracking-widest">Rate delivery experience:</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} className="p-0.5 text-gray-200 hover:text-orange-400 transition-colors">
                        <Star className="w-6 h-6" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Basic order info for click thru */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Order #{order.id.slice(-6).toUpperCase()}</span>
                  {['Pending', 'Order Received'].includes(order.status) && (
                    <button 
                      onClick={() => setIsCancelling(order.id)}
                      className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] flex items-center gap-1 hover:underline"
                    >
                      <XCircle className="w-3 h-3" /> Cancel Order
                    </button>
                  )}
                </div>
                <Link to={`/profile`} className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-1 hover:underline">
                  View Detail <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Cancellation Reason Modal */}
              <AnimatePresence>
                {isCancelling === order.id && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
                    onClick={() => setIsCancelling(null)}
                  >
                    <motion.div 
                      key="cancel-modal"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="bg-white w-full max-w-md rounded-[40px] p-8 space-y-6 shadow-2xl"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="w-16 h-16 bg-red-50 rounded-[28px] flex items-center justify-center text-red-500 mx-auto">
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Cancel Order?</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Please tell us why you want to cancel</p>
                      </div>
                      
                      <div className="space-y-3">
                        {['Changed my mind', 'Ordered wrong items', 'Delivery time too long', 'Found better price', 'Other'].map(reason => (
                          <button
                            key={reason}
                            onClick={() => setCancelReason(reason)}
                            className={`w-full p-4 rounded-2xl text-sm font-bold border-2 transition-all ${
                              cancelReason === reason ? 'bg-red-50 border-red-500 text-red-600' : 'bg-gray-50 border-transparent text-gray-500 hover:border-gray-100'
                            }`}
                          >
                            {reason}
                          </button>
                        ))}
                      </div>

                      {cancelReason === 'Other' && (
                        <textarea 
                          placeholder="Please provide details..."
                          className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-red-500/10 min-h-[100px] outline-none"
                          onChange={(e) => setCancelReason(e.target.value)}
                        />
                      )}

                      <div className="flex gap-4 pt-2">
                        <button 
                          onClick={() => setIsCancelling(null)}
                          className="flex-1 py-4 bg-gray-100 rounded-2xl font-black uppercase text-[10px] tracking-widest"
                        >
                          Keep Order
                        </button>
                        <button 
                          onClick={() => handleCancelOrder(order.id)}
                          className="flex-[2] py-4 bg-red-500 text-white rounded-2xl shadow-xl shadow-red-500/20 font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
                        >
                          Confirm Cancel
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-24 space-y-6">
            <div className="w-24 h-24 bg-gray-50 rounded-[40px] flex items-center justify-center text-gray-200 mx-auto">
              <ShoppingBag className="w-12 h-12" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black text-gray-900">No orders yet</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Start shopping to see your orders here</p>
            </div>
            <Link 
              to="/products"
              className="inline-block bg-primary text-white font-black px-10 py-4 rounded-2xl shadow-xl shadow-primary/30 active:scale-95 transition-transform"
            >
              Start Shopping
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
