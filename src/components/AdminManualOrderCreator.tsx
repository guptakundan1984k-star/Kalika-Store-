import React, { useState, useEffect } from 'react';
import { Product, BulkEnquiry, CartItem, Order, UserProfile } from '../types';
import { 
  Search, Plus, Minus, Trash2, ShoppingBag, 
  User, Phone, MapPin, CheckCircle, X, Loader2, Sparkles, FileText, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, addDoc, handleFirestoreError, OperationType, getDoc, doc } from '../firebase';
import { aiService } from '../services/aiService';

interface AdminManualOrderCreatorProps {
  enquiry: BulkEnquiry;
  products: Product[];
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminManualOrderCreator: React.FC<AdminManualOrderCreatorProps> = ({ 
  enquiry, 
  products, 
  onClose, 
  onSuccess 
}) => {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', enquiry.userId));
        if (userDoc.exists()) {
          setTargetUser(userDoc.data() as UserProfile);
        }
      } catch (e) {
        console.error("Error fetching user for manual order:", e);
      }
    };
    fetchUser();
  }, [enquiry.userId]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 5);

  const addToCart = (product: Product) => {
    const finalPrice = (targetUser?.customPrices?.[product.id]) ?? product.price;
    
    let isDuplicate = false;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        isDuplicate = true;
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1, price: finalPrice } : item
        );
      }
      return [...prev, { ...product, quantity: 1, price: finalPrice }];
    });

    if (isDuplicate) {
      alert(`${product.name} is already in the cart. Increased quantity!`);
    }
  };

  const handleClearCart = () => {
    if (window.confirm("Remove all items from this order?")) {
      setCart([]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCreateOrder = async () => {
    if (cart.length === 0) {
      alert("Please add at least one item to the order.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newOrder: Omit<Order, 'id'> = {
        userId: enquiry.userId,
        userName: enquiry.name,
        userPhone: enquiry.phone,
        items: cart,
        total,
        status: 'Order Received',
        deliveryType: 'Delivery',
        createdAt: Date.now(),
        pin: Math.floor(1000 + Math.random() * 9000).toString(),
        address: {
          manual: enquiry.storeName || 'Address from bulk enquiry',
          verified: true
        }
      };

      await addDoc(collection(db, 'orders'), newOrder);
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    } finally {
      setIsSubmitting(false);
    }
  };

  const processBillWithAi = async () => {
    if (!enquiry.billUrl) return;
    setIsAiProcessing(true);
    try {
      // Use AI service to extract items from bill URL
      const extractedItems = await aiService.analyzeBillImage(enquiry.billUrl);
      
      const matchedItems: CartItem[] = [];
      for (const item of extractedItems) {
        // Simple name matching
        const match = products.find(p => 
          p.name.toLowerCase().includes(item.name.toLowerCase()) ||
          item.name.toLowerCase().includes(p.name.toLowerCase())
        );
        
        if (match) {
          matchedItems.push({ ...match, quantity: item.quantity || 1 });
        }
      }
      
      if (matchedItems.length > 0) {
        setCart(prev => {
          const newCart = [...prev];
          matchedItems.forEach(mi => {
            const existing = newCart.find(item => item.id === mi.id);
            if (existing) {
              existing.quantity += mi.quantity;
            } else {
              newCart.push(mi);
            }
          });
          return newCart;
        });
        alert(`AI matched ${matchedItems.length} products from the bill!`);
      } else {
        alert("AI detected items but couldn't find exact matches in your store inventory. Please add them manually.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to process bill with AI. Please add items manually.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh]"
      >
        {/* Left: Bill Image (if exists) */}
        {enquiry.billUrl && (
          <div className="md:w-1/3 bg-gray-900 flex flex-col items-center justify-center p-6 border-r border-white/10">
            <div className="w-full flex items-center justify-between mb-4 text-white">
               <div className="flex items-center gap-2">
                 <FileText className="w-4 h-4 text-primary" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Customer Bill</span>
               </div>
               <button 
                onClick={processBillWithAi}
                disabled={isAiProcessing}
                className="bg-primary hover:bg-white hover:text-black px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50"
               >
                 {isAiProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                 AI Extract
               </button>
            </div>
            <div className="flex-1 w-full relative group">
              <img 
                src={enquiry.billUrl} 
                alt="Bill" 
                className="w-full h-full object-contain rounded-2xl"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <a href={enquiry.billUrl} target="_blank" rel="noreferrer" className="bg-white text-black px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all hover:scale-105 shadow-xl">
                   View Full Size
                 </a>
              </div>
            </div>
          </div>
        )}

        {/* Right: Order Creation Form */}
        <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
          <div className="p-8 border-b border-gray-100 bg-white flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Create Manual Order</h3>
              <div className="flex items-center gap-4 mt-1">
                 <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                   <User className="w-3 h-3" />
                   {enquiry.name}
                 </div>
                 <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                   <Phone className="w-3 h-3" />
                   {enquiry.phone}
                 </div>
              </div>
            </div>
            <button onClick={onClose} className="p-3 bg-gray-100 text-gray-400 hover:text-red-500 rounded-2xl">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Search and Product List */}
            <div className="md:w-1/2 p-6 flex flex-col gap-6 overflow-y-auto border-r border-gray-100">
               <div className="relative">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                 <input 
                  type="text" 
                  placeholder="Search products to add..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold shadow-sm focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                 />
               </div>

               <div className="space-y-3">
                 {filteredProducts.map(product => (
                   <div key={product.id} className="bg-white p-4 rounded-[28px] border border-gray-100 flex items-center justify-between group hover:border-primary/30 transition-all shadow-sm">
                     <div className="flex items-center gap-4">
                       <img src={product.image} className="w-12 h-12 rounded-xl object-cover" alt="" />
                       <div>
                         <p className="text-sm font-black text-gray-900 tracking-tight">{product.name}</p>
                         <div className="flex items-center gap-2">
                           <p className="text-[10px] font-bold text-gray-400">₹{targetUser?.customPrices?.[product.id] ?? product.price} • {product.weight}</p>
                           {targetUser?.customPrices?.[product.id] && (
                             <Tag className="w-3 h-3 text-primary animate-pulse" />
                           )}
                         </div>
                       </div>
                     </div>
                     <button 
                      onClick={() => addToCart(product)}
                      className="p-3 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all active:scale-90"
                     >
                       <Plus className="w-5 h-5" />
                     </button>
                   </div>
                 ))}
               </div>
            </div>

            {/* Cart and Checkout */}
            <div className="md:w-1/2 p-6 bg-white flex flex-col overflow-hidden">
               <div className="flex-1 overflow-y-auto space-y-4">
                 <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2">
                     <ShoppingBag className="w-5 h-5 text-gray-900" />
                     <h4 className="text-lg font-black text-gray-900 tracking-tight">Order Items</h4>
                   </div>
                   {cart.length > 0 && (
                     <button 
                       onClick={handleClearCart}
                       className="px-4 py-2 bg-red-50 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
                     >
                       <Trash2 className="w-3 h-3" />
                       Clear All
                     </button>
                   )}
                 </div>

                 <AnimatePresence mode="popLayout">
                   {cart.map(item => (
                     <motion.div 
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-gray-50 p-4 rounded-[28px] border border-gray-100 flex items-center justify-between"
                     >
                       <div className="flex-1">
                         <p className="text-sm font-black text-gray-900 tracking-tight">{item.name}</p>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">₹{item.price * item.quantity}</p>
                       </div>
                       <div className="flex items-center gap-3">
                         <div className="flex items-center bg-white rounded-xl border border-gray-100 shadow-sm">
                           <button onClick={() => updateQuantity(item.id, -1)} className="p-2 text-gray-400 hover:text-red-500"><Minus className="w-4 h-4" /></button>
                           <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                           <button onClick={() => updateQuantity(item.id, 1)} className="p-2 text-gray-400 hover:text-primary"><Plus className="w-4 h-4" /></button>
                         </div>
                         <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-100 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                     </motion.div>
                   ))}
                   {cart.length === 0 && (
                     <div className="flex flex-col items-center justify-center py-20 opacity-20">
                       <ShoppingBag className="w-12 h-12 mb-2" />
                       <p className="text-xs font-black uppercase tracking-widest">Cart is empty</p>
                     </div>
                   )}
                 </AnimatePresence>
               </div>

               <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                 <div className="flex items-center justify-between px-2">
                   <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Grand Total</span>
                   <span className="text-3xl font-black text-gray-900 tracking-tighter">₹{total}</span>
                 </div>
                 <button 
                  onClick={handleCreateOrder}
                  disabled={isSubmitting || cart.length === 0}
                  className="w-full bg-primary text-white py-6 rounded-[32px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-primary/30 hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                 >
                   {isSubmitting ? (
                     <Loader2 className="w-6 h-6 animate-spin" />
                   ) : (
                     <>
                        <CheckCircle className="w-6 h-6" />
                        Confirm & Create Order
                     </>
                   )}
                 </button>
               </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
