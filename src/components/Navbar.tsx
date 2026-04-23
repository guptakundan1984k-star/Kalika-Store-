import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Search, Mic, MapPin, ChevronDown, Heart, FileText, LayoutDashboard, Home, Package, Languages, Volume2, VolumeX, ArrowRight, Shield, X, Sparkles } from 'lucide-react';
import { Logo } from './Logo';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { Product, StoreSettings } from '../types';

interface NavbarProps {
  cartCount: number;
  user?: any;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  products: Product[];
  storeSettings?: StoreSettings | null;
  onAddToCart: (product: Product, quantity: number, redirectToCheckout?: boolean) => void;
}

import { SearchOverlay } from './SearchOverlay';

export const Navbar: React.FC<NavbarProps> = ({ cartCount, user, searchQuery, setSearchQuery, products, storeSettings, onAddToCart }) => {
  const location = useLocation();
  const isAdmin = user?.role === 'admin';
  const { language, setLanguage, t, isVoiceEnabled, setIsVoiceEnabled } = useLanguage();
  const [showSearchOverlay, setShowSearchOverlay] = React.useState(false);

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
      <nav className="sticky top-0 z-50 w-full bg-white border-b border-gray-100 px-4 md:px-6 py-2 md:py-3 shadow-sm overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-3 relative z-10">
          {/* Top Row: Location & Profile */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="hidden md:block">
                <Logo className="h-8" />
              </Link>
              
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-gray-900 font-black text-sm tracking-tight">
                  <span className="text-primary">⚡</span> 2 Hours delivery
                </div>
                <div className="flex items-center gap-1 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                  Home - Ranchi, Jharkhand <ChevronDown className="w-3 h-3" />
                </div>
              </div>

              <div className="hidden md:flex items-center gap-6 ml-8">
                <Link to="/categories" className={`text-xs font-black uppercase tracking-widest transition-colors ${location.pathname === '/categories' ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`}>
                  {t('categories')}
                </Link>
                <Link to="/items" className={`text-xs font-black uppercase tracking-widest transition-colors ${location.pathname === '/items' ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`}>
                  Items
                </Link>
                <Link to="/wishlist" className={`text-xs font-black uppercase tracking-widest transition-colors ${location.pathname === '/wishlist' ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`}>
                  Wishlist
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link to="/profile" className="p-2 hover:bg-gray-50 rounded-full transition-colors active:scale-95" aria-label="Profile">
                <User className="w-6 h-6 text-gray-700" />
              </Link>
              <Link to="/cart" className="relative p-2 hover:bg-gray-50 rounded-full transition-colors active:scale-95" aria-label={`Cart with ${cartCount} items`}>
                <ShoppingCart className="w-6 h-6 text-gray-700" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 bg-primary text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-lg">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          <div className="relative group cursor-pointer" onClick={() => setShowSearchOverlay(true)}>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <div className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-12 pr-24 py-3 text-sm font-medium text-gray-400">
              {searchQuery || t('search')}
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
              <Mic className="w-5 h-5 text-gray-400" />
              <div className="w-[1px] h-4 bg-gray-200" />
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      </nav>

      {/* Removed old Search Results Popup */}

      {/* Mobile Bottom Navbar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-2xl border-t border-gray-100 px-2 py-3 flex items-center justify-around shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className={`relative flex flex-col items-center gap-1 transition-all active:scale-90 ${
                isActive ? 'text-primary' : 'text-gray-400'
              }`}
            >
              <div className={`p-2 rounded-2xl transition-all ${
                isActive ? 'bg-primary/10 text-primary scale-110' : ''
              }`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};
