import React from 'react';
import { CartItem, Product, StoreSettings, UserProfile, Order } from '../types';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShoppingBag, Truck, ShieldCheck, Clock, Sparkles, AlertCircle, Package, Smartphone, MapPin, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../contexts/StoreContext';
import { Link, useNavigate } from 'react-router-dom';
import { db, collection, addDoc, doc, updateDoc } from '../firebase';
import { AdSlot } from '../components/AdSlot';

interface CartProps {
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onClearCart: () => void;
  products: Product[];
  onAddToCart: (product: Product, quantity?: number) => void;
  storeSettings?: StoreSettings | null;
  user: UserProfile | null;
}

const Cart: React.FC<CartProps> = ({ cart, onUpdateQuantity, onRemove, onClearCart, products, onAddToCart, storeSettings, user }) => {
  const navigate = useNavigate();
  const { deliveryFee: configDeliveryFee, freeDeliveryThreshold: configThreshold } = useStore();
  const [isPlacingQuickOrder, setIsPlacingQuickOrder] = React.useState(false);
  
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal >= configThreshold ? 0 : (cart.length > 0 ? configDeliveryFee : 0);
  const total = subtotal + deliveryFee;

  const handleQuickOrder = async () => {
    if (!user || !user.phone || !user.address) {
      navigate('/checkout');
      return;
    }

    if (!window.confirm("Place order INSTANTLY using your saved address and phone?")) return;

    setIsPlacingQuickOrder(true);
    try {
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      const newOrder: Order = {
        id: Math.random().toString(36).substr(2, 9).toUpperCase(),
        userId: user.uid,
        userName: user.name,
        userPhone: user.phone,
        items: cart,
        total,
        status: 'Pending',
        deliveryType: 'Delivery',
        address: { manual: user.address },
        deliverySlot: 'ASAP (Quick Order)',
        paymentMethod: 'COD',
        pin,
        createdAt: Date.now(),
      };

      await addDoc(collection(db, 'orders'), newOrder);
      onClearCart();
      
      // Speak & Play
      const speech = new SpeechSynthesisUtterance("Quick Order Placed Successfully!");
      window.speechSynthesis.speak(speech);

      alert("Quick Order Placed! Redirecting to tracking...");
      navigate('/profile');
    } catch (e) {
      console.error("Quick order failed", e);
      alert("Quick order failed. Please use standard checkout.");
    } finally {
      setIsPlacingQuickOrder(false);
    }
  };

  const inventoryThreshold = configThreshold;
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<{ [key: string]: HTMLDivElement | null }>({});

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center space-y-12">
        <div className="relative">
          <div className="w-40 h-40 bg-gray-50 rounded-[48px] flex items-center justify-center text-gray-200 shadow-inner">
            <ShoppingBag className="w-20 h-20" />
          </div>
          <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl rotate-12">
            <Plus className="w-6 h-6" />
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Empty Cart</h2>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No products in your cart yet</p>
        </div>
        <Link 
          to="/products"
          className="bg-primary text-white font-black px-12 py-6 rounded-[28px] shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95 flex items-center gap-4 group"
        >
          <span className="text-sm uppercase tracking-[0.2em]">Add products to cart</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
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
              onClick={() => {
                if (window.confirm("Are you sure you want to remove all items from your cart?")) {
                  onClearCart();
                }
              }}
              className="text-xs font-bold text-red-500 hover:text-red-600 uppercase tracking-widest flex items-center gap-1.5 hover:bg-red-50 px-4 py-2 rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Clear Cart
            </button>
          </div>

          <AdSlot />

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {cart.map((item) => (
                <motion.div 
                  layout
                  key={item.id}
                  ref={el => { itemRefs.current[item.id] = el; }}
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
                    {item.weight && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Package className="w-3 h-3 text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.weight}</span>
                      </div>
                    )}
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
                      {item.weight && <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">₹{item.price} / {item.weight}</span>}
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
        <div className="space-y-8" ref={summaryRef}>
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
                    Add <span className="text-lg font-black">₹{configThreshold - subtotal}</span> more to unlock <span className="uppercase tracking-widest">FREE Delivery</span>!
                  </p>
                </div>
              )}
            </div>
            
            <div className="pt-8 border-t border-gray-100 flex flex-col gap-6">
              <AdSlot slot="cart_summary" />
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
                  <div className="flex flex-col gap-3">
                    <Link 
                      to="/checkout"
                      className="flex items-center justify-center gap-2 bg-primary text-white font-bold px-10 py-5 rounded-3xl shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95 group"
                    >
                      Checkout
                      <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    
                    {user?.phone && user?.address && (
                      <button 
                        onClick={handleQuickOrder}
                        disabled={isPlacingQuickOrder}
                        className="flex items-center justify-center gap-2 bg-orange-500 text-white font-bold px-10 py-4 rounded-3xl shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isPlacingQuickOrder ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            <span>Quick Order (1-Click)</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
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
