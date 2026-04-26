import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ChevronLeft, Package, Truck, CheckCircle2, 
  MapPin, Clock, Phone, AlertCircle, ShoppingBag,
  Box, Info, ArrowRight, Home, IndianRupee, XCircle
} from 'lucide-react';
import { Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { db, doc, onSnapshot } from '../firebase';
import { Logo } from '../components/Logo';

export const OrderTracking: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (doc) => {
      if (doc.exists()) {
        setOrder({ id: doc.id, ...doc.data() } as Order);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [orderId]);

  const isPickup = order?.address?.manual === "Store Pickup" || !order?.address?.manual;

  const stages = [
    { key: 'Pending', label: 'Order Placed', icon: ShoppingBag, color: 'blue' },
    { key: 'Packaging', label: 'Packaging', icon: Clock, color: 'orange' },
    { key: 'Packed', label: 'Packed & Ready', icon: Package, color: 'purple' },
    ...(isPickup 
      ? [{ key: 'Ready to Pick Up', label: 'Ready to Pick Up', icon: MapPin, color: 'primary' }]
      : [{ key: 'Out for Delivery', label: 'Out for Delivery', icon: Truck, color: 'primary' }]
    ),
    { key: 'Delivered', label: isPickup ? 'Picked Up' : 'Delivered', icon: CheckCircle2, color: 'green' }
  ];

  const currentStageIndex = stages.findIndex(s => s.key === order?.status);
  const isCancelled = order?.status === 'Cancelled';

  const handleCancelOrder = async () => {
    if (!order) return;
    const reason = window.prompt("Why are you cancelling this order?");
    if (reason) {
      const { updateDoc, doc, db } = await import('../firebase');
      try {
        await updateDoc(doc(db, 'orders', order.id), {
          status: 'Cancelled',
          cancellationReason: reason,
          cancelledBy: 'Customer',
          updatedAt: Date.now()
        });
        alert("Order cancelled successfully.");
      } catch (e) {
        console.error(e);
        alert("Failed to cancel order.");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
        <Logo />
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center">
          <AlertCircle className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Order Not Found</h2>
          <p className="text-gray-500">The tracking link might be expired or incorrect.</p>
        </div>
        <Link to="/" className="bg-primary text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20">
          Back to Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="flex flex-col items-center">
            <h1 className="text-sm font-black text-gray-900 tracking-tight uppercase">Track Order</h1>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID: {order.id.slice(0, 8)}</span>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
        {/* Cancel Button for early stages */}
        {(order.status === 'Pending' || order.status === 'Order Received') && (
          <button 
            onClick={handleCancelOrder}
            className="w-full bg-red-50 text-red-600 p-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-red-100 hover:bg-red-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Cancel Order
          </button>
        )}

        {/* Status Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 overflow-hidden relative"
        >
          {isCancelled ? (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Order Cancelled</h2>
                <p className="text-sm font-medium text-gray-400 mt-1">This order was cancelled and is no longer being tracked.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Header Status */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Current Status</p>
                  <h2 className={`text-2xl font-black tracking-tight transition-all ${order.status !== 'Delivered' && order.status !== 'Cancelled' ? 'text-green-600 animate-pulse' : 'text-gray-900'}`}>{order.status}</h2>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Expected Delivery</p>
                  <p className="text-sm font-black text-gray-900">{order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString([], { day: 'numeric', month: 'short' }) : 'Today'}</p>
                </div>
              </div>

              {/* Progress Bar / Timeline */}
              <div className="relative">
                {/* Connector Line */}
                <div className="absolute top-6 left-6 right-6 h-1 bg-gray-100 rounded-full">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentStageIndex / (stages.length - 1)) * 100}%` }}
                    className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                  />
                </div>

                {/* Steps */}
                <div className="relative flex justify-between">
                  {stages.map((stage, i) => {
                    const isCompleted = currentStageIndex >= i;
                    const isActive = currentStageIndex === i;
                    const Icon = stage.icon;

                    return (
                      <div key={stage.key} className="flex flex-col items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 z-10 ${
                          isActive ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-125' :
                          isCompleted ? 'bg-primary text-white' : 'bg-white text-gray-300 border-2 border-gray-100'
                        }`}>
                          <Icon className={`${isActive ? 'w-6 h-6' : 'w-5 h-5'}`} />
                        </div>
                        <div className="flex flex-col items-center text-center">
                          <span className={`${isActive ? 'text-[9px] font-black' : 'text-[8px] font-bold'} uppercase tracking-tight ${
                            isCompleted ? 'text-gray-900' : 'text-gray-300'
                          }`}>
                            {stage.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Progress Table */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Updates</h3>
                </div>
                
                <div className="space-y-6">
                  {order.tracking?.slice().reverse().map((update, i) => (
                    <div key={i} className="flex gap-4 relative">
                      {i !== (order.tracking?.length || 0) - 1 && (
                        <div className="absolute left-2.5 top-5 bottom-[-1.5rem] w-px bg-gray-100" />
                      )}
                      <div className={`w-5 h-5 rounded-full z-10 flex items-center justify-center ${i === 0 ? 'bg-primary/20 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                        <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]' : 'bg-gray-400'}`} />
                      </div>
                      <div className="flex-1 -mt-1">
                        <p className={`text-sm font-black ${i === 0 ? 'text-gray-900' : 'text-gray-500'}`}>{update.message}</p>
                        <p className="text-[10px] font-medium text-gray-400 mt-0.5">{new Date(update.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Base creation event if no detailed tracking yet */}
                  {(!order.tracking || order.tracking.length === 0) && (
                    <div className="flex gap-4">
                      <div className="w-5 h-5 rounded-full bg-primary/20 text-primary z-10 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      </div>
                      <div className="flex-1 -mt-1">
                        <p className="text-sm font-black text-gray-900">Order successfully placed</p>
                        <p className="text-[10px] font-medium text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Support Card */}
        <div className="grid grid-cols-2 gap-4">
          <a href="tel:+919835467362" className="bg-white rounded-[32px] p-6 border border-gray-100 flex flex-col items-center justify-center text-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-95 group">
            <div className="w-12 h-12 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Phone className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">Call Store</p>
          </a>
          <Link to="/support" className="bg-white rounded-[32px] p-6 border border-gray-100 flex flex-col items-center justify-center text-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-95 group">
            <div className="w-12 h-12 bg-primary/5 text-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Info className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">Need Help?</p>
          </Link>
        </div>

        {/* Order Details Preview */}
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-50">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Order Items</h3>
          </div>
          <div className="p-8 space-y-6">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-50 shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-gray-900 text-line-clamp-1">{item.name}</p>
                  <p className="text-[10px] font-bold text-gray-400 mt-0.5">₹{item.price} × {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-gray-900">₹{item.price * item.quantity}</p>
                </div>
              </div>
            ))}
            
            <div className="pt-6 border-t border-gray-50 space-y-3">
              <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                <span>Items Total</span>
                <span>₹{order.total}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-green-500 uppercase tracking-[0.2em]">
                <span>Delivery Fee</span>
                <span>FREE</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-black text-gray-900 uppercase tracking-[0.1em]">Final Amount</span>
                <span className="text-xl font-black text-primary">₹{order.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Address Card */}
        <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Delivery Address</p>
              <p className="text-sm font-bold text-gray-900">{order.address?.manual || "Store Pickup"}</p>
            </div>
          </div>
        </div>
      </main>

      {/* Action Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-gray-100 flex items-center justify-between gap-4 z-50">
        <Link to="/" className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-900 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-all">
          <Home className="w-4 h-4" />
          Home
        </Link>
        <button className="flex-1 flex items-center justify-center gap-2 bg-primary text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:bg-black transition-all">
          <ShoppingBag className="w-4 h-4" />
          Order History
        </button>
      </div>
    </div>
  );
};
