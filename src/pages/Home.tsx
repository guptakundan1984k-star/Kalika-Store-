import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { Product, Banner, StoreSettings, CartItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, MapPin, Clock, AlertCircle, ShoppingBag, Package } from 'lucide-react';
import { Logo } from '../components/Logo';

interface HomeProps {
  products: Product[];
  onAddToCart: (product: Product, quantity?: number) => void;
  banners: Banner[];
  storeSettings?: StoreSettings | null;
  cart: CartItem[];
}

const Home: React.FC<HomeProps> = ({ products, onAddToCart, banners, storeSettings, cart }) => {
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

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-32 bg-[#F8FAFC] min-h-screen"
    >
      {/* Brand Identity / Header Section */}
      <div className="w-full pt-12 pb-8 flex flex-col items-center">
        <div className="w-full px-6 flex flex-col items-center text-center">
          <Logo showBg className="w-full mb-8" />
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
        </div>
      </div>

      {/* Hero Banners Section - Only show if active banners exist */}
      {activeBanners.length > 0 && (
        <div className="px-4 py-4">
          <div className="relative aspect-[16/9] md:aspect-[21/9] rounded-[40px] overflow-hidden shadow-xl bg-gray-100 border-4 border-white group">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeBanners[currentBanner].id}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute inset-0"
              >
                {activeBanners[currentBanner].type === 'video' ? (
                  <video 
                    src={activeBanners[currentBanner].image} 
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img 
                    src={activeBanners[currentBanner].image} 
                    alt={activeBanners[currentBanner].title} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div 
                  className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent flex flex-col items-start justify-end p-8 md:p-12 cursor-pointer"
                  onClick={() => {
                    if (activeBanners[currentBanner].link) {
                      navigate(activeBanners[currentBanner].link!);
                    }
                  }}
                >
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-2 max-w-lg"
                  >
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-xl">
                      {activeBanners[currentBanner].title}
                    </h2>
                    
                    {activeBanners[currentBanner].link && (
                      <div className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-primary hover:text-white transition-all active:scale-95 group">
                        Explore Collection
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Pagination dots */}
            {activeBanners.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {activeBanners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentBanner(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      currentBanner === idx ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Popular Items Header (Matched style to screenshot) */}
      <div className="px-6 py-6 flex items-center justify-between">
        <h2 className="text-2xl font-black text-[#1F2937] tracking-tight">Popular Items</h2>
        <button 
          onClick={() => navigate('/categories')}
          className="text-[#00AEEF] font-black text-sm flex items-center gap-1.5"
        >
          Shop by Category <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Horizontal Scroll Sections */}
      <div className="space-y-10">
        {productSections.map((section, idx) => (
          <section key={idx}>
            <div className="flex gap-4 overflow-x-auto px-6 scrollbar-hide pb-4">
              {section.items.map((product) => (
                <div key={product.id} className="min-w-[180px] w-[180px]">
                  <ProductCard 
                    product={product} 
                    quantityInCart={cart.find(c => c.id === product.id)?.quantity}
                    onAddToCart={(p, q) => onAddToCart(p, q)} 
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </motion.div>
  );
};

export default Home;
