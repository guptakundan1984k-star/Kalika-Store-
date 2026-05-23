import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ProductCard } from '../components/ProductCard';
import { Product, Banner, StoreSettings, CartItem, UserProfile, Order } from '../types';
import { useStore } from '../contexts/StoreContext';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, MapPin, Clock, AlertCircle, ShoppingBag, Package, ShieldCheck, Phone } from 'lucide-react';
import { Logo } from '../components/Logo';
import { ReachedEnd } from '../components/ReachedEnd';

interface HomeProps {
  products: Product[];
  onAddToCart: (product: Product, quantity?: number, redirectToCheckout?: boolean, selectedUnit?: string) => void;
  banners: Banner[];
  storeSettings?: StoreSettings | null;
  cart: CartItem[];
  toggleWishlist: (productId: string) => void;
  wishlist: string[];
  user: UserProfile | null;
  orders: Order[];
}

const Home: React.FC<HomeProps> = ({ products, onAddToCart, banners, storeSettings, cart, toggleWishlist, wishlist, user, orders }) => {
  const activeBanners = banners.filter(b => b.active);
  const [currentBanner, setCurrentBanner] = React.useState(0);
  const navigate = useNavigate();
  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Banner Auto-scroll
  React.useEffect(() => {
    if (currentBanner >= activeBanners.length) {
      setCurrentBanner(0);
    }
    
    if (activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeBanners.length, currentBanner]);

  // Categories based on unique categories from products
  const categories = Array.from(new Set(products.map(p => p.category)));

  const productSections = [
    { title: "Handpicked for You", subtitle: "Handpicked for You 💖", items: products.slice(0, 8) },
    { title: "Cold Drinks & Ice Creams", subtitle: "Cold Drinks & Ice Creams", items: products.filter(p => ['Beverages', 'Ice Cream', 'Cold Drinks'].includes(p.category)).slice(0, 8) },
    { title: "Rice & Atta", subtitle: "Rice & Atta", items: products.filter(p => ['Grains', 'Rice', 'Atta', 'Flour'].includes(p.category)).slice(0, 8) },
  ];

  const { envStatus } = useStore();

  // Environmental Announcement Logic removed
  React.useEffect(() => {
    if (envStatus && (envStatus.status === 'closed' || envStatus.status === 'delayed')) {
      // Optional: Add UI banner logic here if needed, but voice is removed as per request
    }
  }, [envStatus]);



  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-32 bg-[#F8FAFC] min-h-screen"
    >
      <Helmet>
        <title>Kalika Store - Fresh Grocery Delivery in Ranchi | Jharkhand</title>
        <meta name="description" content="Shop fresh groceries, cold drinks, household essentials, and more at Kalika Store Ranchi. Fast delivery and best prices guaranteed." />
        <meta name="keywords" content="grocery, ranchi, delivery, fresh vegetables, cold drinks, rice, atta, kalika store" />
      </Helmet>
      {/* Brand Identity / Header Section */}
      <div className="w-full pt-12 pb-8 flex flex-col items-center">
        <div className="w-full px-6 flex flex-col items-center text-center">

          <Logo large className="mb-8" />
          <div className="flex items-center gap-3">
            <span className="h-px w-12 bg-gray-200" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">
              Quality • Freshness • Trust
            </p>
            <span className="h-px w-12 bg-gray-200" />
          </div>

          <div className="mt-4 flex items-center justify-center bg-white/50 backdrop-blur-sm px-4 py-1 rounded-full border border-gray-100 shadow-sm">
            <span className="text-[9px] font-black text-gray-500 tracking-wider uppercase">Fssai lic no: 21125008000027</span>
          </div>
          
          {!storeSettings?.isFunctionallyOpen && storeSettings && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-red-50 border border-red-100 rounded-2xl px-4 py-2 flex items-center gap-2"
            >
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-600 text-[9px] font-black uppercase tracking-widest">Currently Accepting Pre-orders Only</span>
            </motion.div>
          )}

          {/* New Call to Order Banner */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 w-full max-w-md bg-gradient-to-r from-primary to-[#00AEEF] p-6 rounded-[32px] text-white shadow-xl shadow-primary/20 relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Phone className="w-4 h-4 text-white" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Priority Delivery Service</span>
              </div>
              <h3 className="text-lg font-black leading-tight tracking-tight mb-4">
                Whenever you Place an order Please call the store to get fastest delivery
              </h3>
              <a 
                href="tel:9608123427"
                className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95 shadow-lg"
              >
                <Phone className="w-4 h-4" />
                Call: 9608123427
              </a>
            </div>
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 bg-black/10 rounded-full blur-xl" />
          </motion.div>

          <div className="mt-8 flex flex-col items-center gap-4 w-full">
              <button 
                onClick={() => navigate('/items')}
                className="w-full max-w-xs bg-primary text-white px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary transition-all flex items-center justify-center gap-3 group"
              >
                Browse Products
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Quick Re-order Section for Returning Users */}
              {user && orders.length > 0 && (
                <div className="w-full px-4 mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Buy Again</h3>
                    <Link to="/orders" className="text-xs font-black text-primary uppercase tracking-widest">Order History</Link>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 no-scrollbar">
                    {Array.from(new Set(orders.flatMap(o => o.items).map(item => item.id)))
                      .slice(0, 5)
                      .map(pid => products.find(p => p.id === pid))
                      .filter(Boolean)
                      .map((product: any) => (
                        <div 
                          key={product.id}
                          className="min-w-[140px] bg-white p-4 rounded-[28px] border border-gray-100 shadow-sm flex flex-col items-center gap-3"
                        >
                          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
                            <img src={product.image || undefined} alt={product.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-black text-gray-900 line-clamp-1 truncate w-24">{product.name}</p>
                            <p className="text-[10px] font-black text-primary mt-0.5">₹{product.price}</p>
                          </div>
                          <button 
                            onClick={() => onAddToCart(product)}
                            className="w-full py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all active:scale-95 shadow-lg"
                          >
                            Add
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>



      {/* Banners Section */}
      <AnimatePresence mode="wait">
        {activeBanners.length > 0 && (
          <div className="px-6 mb-8 mt-4">
            <motion.div
              key={currentBanner}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="relative w-full h-[220px] md:h-[300px] rounded-[40px] overflow-hidden shadow-2xl shadow-primary/10 border-4 border-white"
            >
              {activeBanners[currentBanner].type === 'video' ? (
                <video 
                  src={activeBanners[currentBanner].image || undefined} 
                  className="absolute inset-0 w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img 
                  src={activeBanners[currentBanner].image || undefined} 
                  alt={activeBanners[currentBanner].title}
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 md:p-12">
                <motion.h3 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-3xl md:text-5xl font-black text-white leading-tight mb-2 tracking-tighter"
                >
                  {activeBanners[currentBanner].title}
                </motion.h3>
                <p className="text-white/80 text-xs md:text-sm font-bold uppercase tracking-[0.3em] mb-4">
                  {activeBanners[currentBanner].subtitle || 'Exclusive Offer'}
                </p>
                {activeBanners[currentBanner].link && (
                  <button 
                    onClick={() => navigate(activeBanners[currentBanner].link || '/items')}
                    className="bg-white text-gray-900 px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest w-fit hover:bg-primary hover:text-white transition-all active:scale-95 shadow-xl"
                  >
                    Explore Now
                  </button>
                )}
              </div>
            </motion.div>
            
            {/* Pagination Dots */}
            {activeBanners.length > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                {activeBanners.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setCurrentBanner(idx)}
                    className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentBanner ? 'w-8 bg-primary' : 'w-2 bg-gray-200'}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Popular Items Header */}
      <div className="px-6 py-6 flex items-center justify-between">
        <h2 className="text-2xl font-black text-[#1F2937] tracking-tight">Popular Items</h2>
        <button 
          onClick={() => navigate('/categories')}
          className="text-[#00AEEF] font-black text-sm flex items-center gap-1.5"
        >
          Shop by Category <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Terms & Conditions Section */}
      <div className="px-6 py-12 bg-white border-y border-gray-100">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Terms & Conditions</h2>
            <div className="flex items-center justify-center gap-2">
              <span className="h-0.5 w-8 bg-primary rounded-full" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Our Store Policies</p>
              <span className="h-0.5 w-8 bg-primary rounded-full" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-gray-50 rounded-[32px] border border-gray-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <h3 className="font-black text-gray-900 tracking-tight">Return Policy</h3>
              </div>
              <p className="text-sm font-medium text-gray-500 leading-relaxed">
                Only defective items are allowed for return. <strong>Check items at the time of delivery</strong>. Issues reported after delivery partner leaves may not be eligible for return.
              </p>
            </div>

            <div className="p-8 bg-gray-50 rounded-[32px] border border-gray-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Phone className="w-5 h-5" />
                </div>
                <h3 className="font-black text-gray-900 tracking-tight">Express Delivery</h3>
              </div>
              <p className="text-sm font-medium text-gray-500 leading-relaxed">
                Whenever you place an order, <strong>please call the store at 9608123427 immediately</strong> to get the fastest delivery. Failure to call may result in significant delivery delays.
              </p>
            </div>

            <div className="p-8 bg-gray-50 rounded-[32px] border border-gray-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="font-black text-gray-900 tracking-tight">Delivery Notice</h3>
              </div>
              <p className="text-sm font-medium text-gray-500 leading-relaxed">
                We deliver across Ranchi, Jharkhand. <strong>If weather is not suitable, delivery will be paused without any prior notice</strong> for the safety of our partners.
              </p>
            </div>

            <div className="p-8 bg-gray-50 rounded-[32px] border border-gray-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-black text-gray-900 tracking-tight">Order Records</h3>
              </div>
              <p className="text-sm font-medium text-gray-500 leading-relaxed">
                Order history is preserved for <strong>6 months</strong>. Records are automatically removed after this period for security and performance.
              </p>
            </div>


          </div>
        </div>
      </div>
      
      {/* Horizontal Scroll Sections removed as per request */}

      <ReachedEnd />
    </motion.div>
  );
};

export default Home;
