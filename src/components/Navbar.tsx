import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Search, Mic, MapPin, ChevronDown, Heart, FileText, LayoutDashboard, Home, Package, Languages, Volume2, VolumeX, ArrowRight, Shield, X, Sparkles } from 'lucide-react';
import { Logo } from './Logo';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { Product, StoreSettings } from '../types';
import { SearchOverlay } from './SearchOverlay';

interface NavbarProps {
  cartCount: number;
  user?: any;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  products: Product[];
  storeSettings?: StoreSettings | null;
  onAddToCart: (product: Product, quantity: number, redirectToCheckout?: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ cartCount, user, searchQuery, setSearchQuery, products, storeSettings, onAddToCart }) => {
  const location = useLocation();
  const { language, setLanguage, t, isVoiceEnabled, setIsVoiceEnabled } = useLanguage();
  const [showSearchOverlay, setShowSearchOverlay] = React.useState(false);

  const hideBottomNav = ['/admin', '/order-tracking', '/checkout', '/scan'].some(path => location.pathname.startsWith(path));

  const mobileNavItems = [
    { path: '/', icon: Home, label: t('home') },
    { path: '/categories', icon: Package, label: t('categories') },
    { path: '/items', icon: LayoutDashboard, label: 'Items' },
    { path: '/wishlist', icon: Heart, label: 'Wishlist' },
    { path: '/profile', icon: User, label: t('profile') },
  ];

  return (
    <>
      <SearchOverlay 
        isOpen={showSearchOverlay}
        onClose={() => setShowSearchOverlay(false)}
        products={products}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddToCart={onAddToCart}
      />
      <nav className="fixed top-0 z-50 w-full bg-white px-4 md:px-6 py-2 shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto space-y-2">
          {/* Top Row: Location & Profile Icons (Matched exactly to screenshot) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-black font-black text-[13px] tracking-tight">
                  <span className="text-primary italic">⚡</span> 2 Hours delivery
                </div>
                <div className="flex items-center gap-1 text-[#6B7280] text-[10px] font-black uppercase tracking-widest leading-none">
                  Home - Ranchi, Jharkhand <ChevronDown className="w-3 h-3 translate-y-[-1px]" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-5">
              <Link to="/profile" className="p-1" aria-label="Profile">
                <User className="w-7 h-7 text-[#1F2937] stroke-[1.5]" />
              </Link>
              <Link to="/cart" className="relative p-1" aria-label="Cart">
                <ShoppingCart className="w-7 h-7 text-[#1F2937] stroke-[1.5]" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Search Bar (Matched pill shape and icons from screenshot) */}
          <div 
            className="relative group cursor-pointer" 
            onClick={() => setShowSearchOverlay(true)}
          >
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <Search className="w-5 h-5 text-black stroke-[2.5]" />
            </div>
            <div className="w-full bg-[#F3F4F6] border border-gray-100 rounded-2xl pl-12 pr-28 py-3 text-[14px] font-bold text-gray-400/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] flex items-center">
              Search products...
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-4 text-gray-400">
              <Mic className="w-5 h-5 stroke-[2]" />
              <div className="w-[1px] h-4 bg-gray-200" />
              <FileText className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
        </div>
      </nav>
      {/* Spacer for fixed navbar */}
      <div className="h-[104px]" />

      {/* Bottom Navbar (Floating pill design matching screenshot) */}
      {!hideBottomNav && (
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[400px]">
          <nav className="bg-white rounded-[32px] px-2 py-2 flex items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link 
                  key={item.path} 
                  to={item.path}
                  className="flex flex-col items-center gap-1 flex-1 relative px-1 py-1"
                >
                  <div className={`p-2.5 rounded-full transition-all duration-300 ${
                    isActive ? 'bg-[#F0F7FF] text-[#00AEEF] scale-110' : 'text-gray-400'
                  }`}>
                    <Icon className={`w-6 h-6 ${isActive ? 'stroke-[3]' : 'stroke-[2]'}`} />
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${
                    isActive ? 'text-[#00AEEF]' : 'text-gray-400'
                  }`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div 
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-gray-50/20 rounded-[28px] -z-10"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
};
