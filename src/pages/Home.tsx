import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { Product, Banner, StoreSettings, CartItem } from '../types';
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



      {/* Banners removed (ads) */}
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
      
      {/* Horizontal Scroll Sections removed as per request */}
      <ReachedEnd />
    </motion.div>
  );
};

export default Home;
