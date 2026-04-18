import React from 'react';
import { CartItem, Product, StoreSettings } from '../types';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShoppingBag, Truck, ShieldCheck, Clock, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from '../constants';
import { Link } from 'react-router-dom';

interface CartProps {
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onClearCart: () => void;
  products: Product[];
  onAddToCart: (product: Product) => void;
  storeSettings?: StoreSettings | null;
}

const Cart: React.FC<CartProps> = ({ cart, onUpdateQuantity, onRemove, onClearCart, products, onAddToCart, storeSettings }) => {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : (cart.length > 0 ? DELIVERY_FEE : 0);
  const total = subtotal + deliveryFee;

  if (cart.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-8">
        <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 shadow-xl shadow-gray-100 animate-pulse">
          <ShoppingCart className="w-16 h-16" />
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Your cart is empty</h2>
          <p className="text-gray-500 font-medium max-w-sm mx-auto">Looks like you haven't added any fresh groceries to your cart yet. Let's find something delicious!</p>
        </div>
        <Link 
          to="/products"
          className="bg-primary text-white font-bold px-12 py-5 rounded-3xl shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95 flex items-center gap-2 group"
        >
          Start Shopping
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 pt-12 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Cart</h1>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{cart.length} Items Selected</p>
              </div>
            </div>
            <button 
              onClick={onClearCart}
              className="text-xs font-bold text-red-500 hover:text-red-600 uppercase tracking-widest flex items-center gap-1.5 hover:bg-red-50 px-4 py-2 rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Clear Cart
            </button>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {cart.map((item) => (
                <motion.div 
                  layout
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center gap-6 group"
                >
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-50 shrink-0">
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <ShoppingBag className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 text-center md:text-left space-y-1">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{item.category}</span>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">{item.name}</h3>
                    <p className="text-sm text-gray-500 font-medium line-clamp-1">{item.description}</p>
                  </div>
                  
                  <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                    <div className="flex items-center bg-gray-50 rounded-2xl p-1.5 gap-4 border border-gray-100">
                      <button 
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm hover:bg-primary hover:text-white transition-all active:scale-90"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <span className="text-lg font-black w-6 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm hover:bg-primary hover:text-white transition-all active:scale-90"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <span className="text-xl font-black text-gray-900">₹{item.price * item.quantity}</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">₹{item.price} / unit</span>
                    </div>
                    
                    <button 
                      onClick={() => onRemove(item.id)}
                      className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Order Summary */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[40px] shadow-xl shadow-gray-200/50 border border-gray-100 sticky top-24 space-y-8">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Order Summary</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between text-sm font-bold text-gray-500">
                <span>Subtotal</span>
                <span className="text-gray-900">₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-gray-500">
                <span>Delivery Fee</span>
                <span className={deliveryFee === 0 ? 'text-green-600 font-black' : 'text-gray-900'}>
                  {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                </span>
              </div>
              {deliveryFee > 0 && (
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                  <p className="text-xs font-bold text-primary leading-relaxed">
                    Add <span className="text-lg font-black">₹{FREE_DELIVERY_THRESHOLD - subtotal}</span> more to unlock <span className="uppercase tracking-widest">FREE Delivery</span>!
                  </p>
                </div>
              )}
            </div>
            
            <div className="pt-8 border-t border-gray-100 flex flex-col gap-6">
              {!storeSettings?.isOpen && (
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-red-600 uppercase tracking-widest">Store is Currently Closed</p>
                    <p className="text-[10px] text-red-500 font-medium leading-relaxed">
                      {storeSettings?.message || "We are not accepting orders at this time. Please check back later."}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Amount</span>
                  <span className="text-4xl font-black text-gray-900 tracking-tighter">₹{total}</span>
                </div>
                {storeSettings?.isOpen ? (
                  <Link 
                    to="/checkout"
                    className="flex items-center gap-2 bg-primary text-white font-bold px-10 py-5 rounded-3xl shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95 group"
                  >
                    Checkout
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </Link>
                ) : (
                  <button 
                    disabled
                    className="flex items-center gap-2 bg-gray-200 text-gray-400 font-bold px-10 py-5 rounded-3xl cursor-not-allowed"
                  >
                    Store Closed
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                  <Truck className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fast Delivery</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Secure</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">24/7 Help</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Frequently Bought Section */}
      <div className="max-w-7xl mx-auto mt-20 space-y-8">
        <div className="flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Frequently Bought Together</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customers also added these items</p>
            </div>
          </div>
        </div>

        <div className="flex px-6">
          {products.slice(0, 1).map((product) => (
            <motion.div 
              key={product.id}
              whileHover={{ y: -5 }}
              className="w-full max-w-sm bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all group mx-auto"
            >
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 mb-6">
                {product.image && (
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="absolute top-3 right-3">
                  <span className="bg-white/90 backdrop-blur-md text-gray-900 text-[10px] font-black px-3 py-1.5 rounded-full shadow-sm uppercase tracking-widest">
                    ₹{product.price}
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-black text-gray-900 line-clamp-1">{product.name}</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{product.category}</p>
                </div>
                <button 
                  onClick={() => onAddToCart(product)}
                  className="w-full flex items-center justify-center gap-2 bg-gray-50 text-gray-900 font-black py-3 rounded-xl hover:bg-primary hover:text-white transition-all text-[10px] uppercase tracking-widest"
                >
                  <Plus className="w-4 h-4" />
                  Add to Cart
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Cart;
