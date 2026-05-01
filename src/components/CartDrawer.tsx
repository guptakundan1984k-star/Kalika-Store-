import React from 'react';
import { ShoppingCart, X, Plus, Minus, Trash2, ArrowRight, ShoppingBag, Clock, Camera, Package, AlertCircle, Navigation, MapPin } from 'lucide-react';
import { CartItem, Product, ProductUnit, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from '../constants';
import { coordinateExpressDelivery } from '../services/deliveryService';

import { ProductImage } from './ProductImage';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  products: Product[];
  user?: UserProfile | null;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCheckout: () => void;
  onAddItems: (items: { product: Product, quantity: number }[]) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ 
  isOpen, onClose, items, products, user, onUpdateQuantity, onRemove, onClear, onCheckout, onAddItems 
}) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : (items.length > 0 ? DELIVERY_FEE : 0);
  const total = subtotal + deliveryFee;

  const [locationStatus, setLocationStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showLocationLink, setShowLocationLink] = React.useState(false);
  const [userLocation, setUserLocation] = React.useState<string | null>(localStorage.getItem('user_location'));

  const handleExpressCoordination = async () => {
    setLocationStatus('loading');
    try {
      const { address } = await coordinateExpressDelivery(user || null);
      setUserLocation(address);
      setLocationStatus('success');
      setShowLocationLink(true);
    } catch (error) {
      console.error("Coordination error:", error);
      setLocationStatus('error');
      alert("Unable to fetch location. Please allow permissions.");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/5 z-[60]"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-[450px] bg-white z-[70] shadow-2xl flex flex-col rounded-l-[48px] overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Your Cart</h2>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{items.length} Items</p>
                    {items.length > 0 && (
                      <button 
                        onClick={() => {
                          if (window.confirm('Clear your entire cart?')) {
                            onClear();
                          }
                        }}
                        className="text-[8px] font-black text-red-500 uppercase tracking-widest hover:bg-red-50 px-2 py-1 rounded-lg transition-all"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link 
                  to="/bill" 
                  onClick={onClose}
                  className="p-3 hover:bg-primary/10 text-primary rounded-2xl transition-colors flex items-center gap-2"
                  title="Scan Paper Bill"
                >
                  <Camera className="w-6 h-6" />
                </Link>
                <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.length > 0 && subtotal < FREE_DELIVERY_THRESHOLD && (
                <div className="bg-blue-50 p-4 rounded-3xl border border-blue-100 flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest leading-normal">
                    Add ₹{FREE_DELIVERY_THRESHOLD - subtotal} more to get <span className="text-blue-600">FREE DELIVERY</span> 🚚
                  </p>
                </div>
              )}

              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                  <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
                    <ShoppingCart className="w-16 h-16" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Your cart is empty</h3>
                    <p className="text-sm font-bold text-gray-400 max-w-[200px] mx-auto uppercase tracking-widest">Add some items to start your shopping journey!</p>
                  </div>
                  <button 
                    onClick={onClose}
                    className="bg-primary text-white font-black px-10 py-5 rounded-full shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95 uppercase tracking-widest text-xs"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <motion.div 
                    layout
                    key={item.id}
                    className="flex items-center gap-4 bg-white p-4 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all group"
                  >
                    <div className="w-20 h-20 rounded-[24px] overflow-hidden bg-gray-50 shrink-0 border border-gray-100 shadow-inner">
                      <ProductImage
                        src={item.image || undefined} 
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <h4 className="font-black text-gray-900 text-xs sm:text-sm line-clamp-2 leading-tight tracking-tight">{item.name}</h4>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-primary">₹{item.price}</p>
                            {item.originalPrice && item.originalPrice > item.price && (
                              <p className="text-[10px] font-bold text-gray-300 line-through">₹{item.originalPrice}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center bg-gray-100 rounded-full p-1 border border-gray-200 ml-auto">
                          <button 
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="w-7 h-7 flex items-center justify-center bg-white rounded-full shadow-sm hover:bg-primary hover:text-white transition-all active:scale-90"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-xs font-black text-gray-900">{item.quantity}</span>
                          <button 
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="w-7 h-7 flex items-center justify-center bg-white rounded-full shadow-sm hover:bg-primary hover:text-white transition-all active:scale-90"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => onRemove(item.id)}
                      className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
            
            {items.length > 0 && (
              <div className="p-8 bg-white border-t border-gray-100 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between text-xs font-black text-gray-400 uppercase tracking-widest px-2">
                    <span>Subtotal</span>
                    <span className="text-gray-900">₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-xs font-black text-gray-400 uppercase tracking-widest px-2">
                    <span>Delivery</span>
                    <span className={deliveryFee === 0 ? 'text-green-500' : 'text-gray-900'}>
                      {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                    </span>
                  </div>
                </div>

                <div className="pt-6 border-t-2 border-dashed border-gray-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Payable</span>
                    <span className="text-4xl font-black text-primary tracking-tighter leading-none">₹{total}</span>
                  </div>
                  <button 
                    onClick={onCheckout}
                    className="flex items-center gap-4 bg-primary text-white font-black px-10 py-6 rounded-full shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95 group relative overflow-hidden"
                  >
                    <span className="relative z-10 text-lg uppercase tracking-wider">Checkout</span>
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform relative z-10" />
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
