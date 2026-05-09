import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { Product, Banner, StoreSettings, CartItem } from '../types';
import { useStore } from '../contexts/StoreContext';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, MapPin, Clock, AlertCircle, ShoppingBag, Package } from 'lucide-react';
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
}

const Home: React.FC<HomeProps> = ({ products, onAddToCart, banners, storeSettings, cart, toggleWishlist, wishlist }) => {
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

  // Environmental Voice Announcement
  React.useEffect(() => {
    if (envStatus && (envStatus.status === 'closed' || envStatus.status === 'delayed')) {
      const hasAnnounced = sessionStorage.getItem(`env_announcement_${envStatus.status}_${envStatus.reason}`);
      if (!hasAnnounced) {
        const message = envStatus.status === 'closed' 
          ? `Attention. Delivery will be closed tomorrow due to ${envStatus.reason}.`
          : `Important update. Delivery is currently delayed due to ${envStatus.reason}.`;
        
        const speech = new SpeechSynthesisUtterance(message);
        window.speechSynthesis.speak(speech);
        sessionStorage.setItem(`env_announcement_${envStatus.status}_${envStatus.reason}`, 'true');
      }
    }
  }, [envStatus]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-32 bg-[#F8FAFC] min-h-screen"
    >
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
          
          {!storeSettings?.isFunctionallyOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-red-50 border border-red-100 rounded-2xl px-4 py-2 flex items-center gap-2"
            >
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-600 text-[9px] font-black uppercase tracking-widest">Currently Accepting Pre-orders Only</span>
            </motion.div>
          )}

          <div className="mt-8 flex flex-col items-center gap-4 w-full">
              <button 
                onClick={() => navigate('/items')}
                className="w-full max-w-xs bg-primary text-white px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary transition-all flex items-center justify-center gap-3 group"
              >
                Browse Products
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

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
                  src={activeBanners[currentBanner].image} 
                  className="absolute inset-0 w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img 
                  src={activeBanners[currentBanner].image} 
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
      
      {/* Horizontal Scroll Sections removed as per request */}
      <ReachedEnd />
    </motion.div>
  );
};

export default Home;
