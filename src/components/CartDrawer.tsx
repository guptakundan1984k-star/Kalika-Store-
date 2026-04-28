import React from 'react';
import { ShoppingCart, X, Plus, Minus, Trash2, ArrowRight, ShoppingBag, Clock, Camera, Package, AlertCircle } from 'lucide-react';
import { CartItem, Product, ProductUnit } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from '../constants';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  products: Product[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCheckout: () => void;
  onAddItems: (items: { product: Product, quantity: number }[]) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ 
  isOpen, onClose, items, products, onUpdateQuantity, onRemove, onClear, onCheckout, onAddItems 
}) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : (items.length > 0 ? DELIVERY_FEE : 0);
  const total = subtotal + deliveryFee;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-[450px] bg-white z-[70] shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
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
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
                    <ShoppingCart className="w-12 h-12" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-gray-900">Your cart is empty</h3>
                    <p className="text-sm text-gray-500 max-w-[200px] mx-auto">Looks like you haven't added anything to your cart yet.</p>
                  </div>
                  <button 
                    onClick={onClose}
                    className="bg-primary text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <motion.div 
                    layout
                    key={item.id}
                    className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <ShoppingBag className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-black text-gray-900 text-[10px] line-clamp-1 leading-tight">{item.name}</h4>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => onRemove(item.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {item.weight && (
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{item.weight}</p>
                      )}
                      
                      {item.selectedVariations && (
                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                          {Object.entries(item.selectedVariations).map(([key, value]) => (
                            <span key={key} className="text-[7px] font-black uppercase tracking-tighter bg-primary/5 text-primary px-1 py-0.5 rounded border border-primary/10">
                              {value}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[10px] font-black text-primary">₹{item.price}</p>
                            {item.originalPrice && item.originalPrice > item.price && (
                              <p className="text-[8px] font-bold text-gray-400 line-through">₹{item.originalPrice}</p>
                            )}
                          </div>
                          <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">Total: ₹{item.price * item.quantity}</p>
                        </div>
                        <div className="flex items-center bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                          <button 
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="w-5 h-5 flex items-center justify-center bg-white rounded-md shadow-sm hover:bg-primary hover:text-white transition-all active:scale-90"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="w-5 text-center text-[10px] font-black text-gray-900">{item.quantity}</span>
                          <button 
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="w-5 h-5 flex items-center justify-center bg-white rounded-md shadow-sm hover:bg-primary hover:text-white transition-all active:scale-90"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => onRemove(item.id)}
                      className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
            
            {items.length > 0 && (
              <div className="p-8 bg-gray-50/50 border-t border-gray-100 space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-4 text-gray-500">
                    <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">Estimated Delivery</p>
                      <p className="text-sm font-bold text-gray-900">1-2 Hours</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm font-bold text-gray-400 uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span className="text-gray-900">₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-gray-400 uppercase tracking-widest">
                    <span>Delivery Fee</span>
                    <span className={deliveryFee === 0 ? 'text-green-500' : 'text-gray-900'}>
                      {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                    </span>
                  </div>
                  {deliveryFee > 0 && (
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest text-right">
                      Add ₹{FREE_DELIVERY_THRESHOLD - subtotal} more for FREE delivery
                    </p>
                  )}
                  <div className="pt-4 border-t border-gray-100 flex justify-between items-end">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Amount</span>
                      <span className="text-3xl font-black text-primary tracking-tighter">₹{total}</span>
                    </div>
                    <button 
                      onClick={onCheckout}
                      className="flex items-center gap-3 bg-primary text-white font-black px-8 py-5 rounded-[24px] shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95 group"
                    >
                      Checkout
                      <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
