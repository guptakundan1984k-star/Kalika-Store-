import React, { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle, ArrowRight, Smartphone, MessageCircle, Home, ShoppingBag, MapPin, Clock } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Logo } from '../components/Logo';

export const OrderSuccess: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId, pin, phone, itemsCount, total, items, customerName, address, slot } = location.state || {};

  const [countdown, setCountdown] = React.useState(3);
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  const handleWhatsAppRedirect = () => {
    setIsRedirecting(true);
    const itemsListMsg = items?.map((item: any) => `• *${item.name}* x${item.quantity}`).join('%0A') || '';
    const now = new Date().toLocaleString('en-IN', { 
        day: 'numeric', month: 'long', year: 'numeric', 
        hour: 'numeric', minute: 'numeric', hour12: true 
    });
    
    const message = `🛒 *NEW ORDER* 🛒%0A%0A*CS Name:* ${customerName}%0A*Contact:* ${phone}%0A*Address:* ${address}%0A*Order Date:* ${now}%0A*Time Slot:* ${slot || 'Standard'}%0A%0A*Items:*%0A${itemsListMsg}%0A%0A💰 *Total:* ₹${total}%0A🔐 *PIN:* ${pin}%0A%0A_Thank you for your help and being so cooperative!_`;
    
    window.open(`https://wa.me/918002914323?text=${message}`, '_blank');
  };

  useEffect(() => {
    if (!orderId) {
      navigate('/', { replace: true });
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleWhatsAppRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [orderId, navigate]);

  if (!orderId) return null;

  return (
    <div className="min-h-screen bg-white pb-20">
      <Helmet>
        <title>Order Placed Successfully - Kalika Store</title>
      </Helmet>

      {/* Modern Header */}
      <div className="pt-12 pb-6 px-6 flex flex-col items-center">
        <Logo className="mb-4" />
        <div className="h-px w-12 bg-gray-100" />
      </div>

      <div className="max-w-xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-gray-200/50 overflow-hidden"
        >
          {/* Splash Success Header */}
          <div className="bg-green-600 p-10 flex flex-col items-center text-center relative overflow-hidden">
            {/* Animated Circles for "Splash" feel */}
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 4, opacity: 0.1 }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute w-32 h-32 bg-white rounded-full z-0"
            />
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative z-10"
            >
              <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 mx-auto border border-white/30">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-1">
                Order Placed!
              </h1>
              <p className="text-green-100 text-xs font-bold uppercase tracking-[0.2em] opacity-80">
                Thank you for shopping with us
              </p>
            </motion.div>
          </div>

          <div className="p-8 space-y-8">
            {/* Delivery PIN Section */}
            <div className="flex flex-col items-center gap-4 py-4">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Your Delivery PIN</span>
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="bg-green-50 px-10 py-6 rounded-[32px] border-2 border-green-100 shadow-inner"
              >
                <span className="text-5xl font-black text-green-600 tracking-[0.3em] font-mono">{pin}</span>
              </motion.div>
              <p className="text-[9px] text-green-600 font-black uppercase tracking-widest bg-green-50 px-4 py-2 rounded-full">
                Show this to delivery partner
              </p>
            </div>

            {/* Order Brief */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Order ID</span>
                <span className="text-xs font-black text-gray-900">{orderId}</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Items count</span>
                <span className="text-xs font-black text-gray-900">{itemsCount} Items</span>
              </div>
            </div>

            {/* Support Call to Action */}
            <div className="space-y-4">
              <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100/50 text-center animate-pulse">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">
                  {countdown > 0 ? `Redirecting to WhatsApp in ${countdown}s...` : 'Opening WhatsApp...'}
                </p>
              </div>

              <div className="flex gap-3">
                <a 
                  href="tel:8002914323"
                  className="flex-1 bg-gray-900 text-white p-5 rounded-[28px] flex items-center justify-center gap-3 shadow-xl transition-transform active:scale-95"
                >
                  <Smartphone className="w-5 h-5" />
                  <span className="font-black text-[10px] uppercase tracking-widest">Call Shop</span>
                </a>
                
                <button 
                  onClick={handleWhatsAppRedirect}
                  className="flex-1 bg-[#25D366] text-white p-5 rounded-[28px] flex items-center justify-center gap-3 shadow-xl transition-transform active:scale-95"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-black text-[10px] uppercase tracking-widest">WhatsApp</span>
                </button>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <Link 
                to="/orders"
                className="w-full py-5 bg-primary/10 text-primary rounded-[28px] flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest group"
              >
                View My Orders
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link 
                to="/"
                className="w-full py-5 text-gray-400 font-black text-[10px] uppercase tracking-widest text-center"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OrderSuccess;
