import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { onSnapshot, query, collection, where } from 'firebase/firestore';
import { db } from '../firebase';
import { ShoppingCart, ShoppingBag, User, Search, Mic, MicOff, MapPin, ChevronDown, Heart, FileText, LayoutDashboard, Home, Package, Languages, Volume2, VolumeX, ArrowRight, Shield, X, Sparkles, ArrowLeft, RefreshCw, Navigation } from 'lucide-react';
import { Logo } from './Logo';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { Product, StoreSettings, UserProfile } from '../types';
import { coordinateExpressDelivery } from '../services/deliveryService';
import { SearchOverlay } from './SearchOverlay';

interface NavbarProps {
  cartCount: number;
  user?: UserProfile | null;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  products: Product[];
  storeSettings?: StoreSettings | null;
  onAddToCart: (product: Product, quantity: number, redirectToCheckout?: boolean) => void;
  onCartOpen: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ cartCount, user, searchQuery, setSearchQuery, products, storeSettings, onAddToCart, onCartOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t, isVoiceEnabled, setIsVoiceEnabled } = useLanguage();
  const [showSearchOverlay, setShowSearchOverlay] = React.useState(false);
  const [showLangBanner, setShowLangBanner] = React.useState(false);
  const [prevLang, setPrevLang] = React.useState(language);
  const [locationStatus, setLocationStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [userLocation, setUserLocation] = React.useState<string | null>(localStorage.getItem('user_location'));

  const [showTrustPanel, setShowTrustPanel] = React.useState(false);
  const [showLocationLink, setShowLocationLink] = React.useState(false);
  const [isLocationDismissed, setIsLocationDismissed] = React.useState(() => localStorage.getItem('location_dismissed') === 'true');

  const handleFetchLocation = async () => {
    if (isLocationDismissed) {
      setIsLocationDismissed(false);
      localStorage.removeItem('location_dismissed');
    }
    if (isVoiceEnabled) {
      const utterance = new SpeechSynthesisUtterance('Fetching your delivery location');
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }

    setLocationStatus('loading');
    try {
      const { address } = await coordinateExpressDelivery(user || null);
      setUserLocation(address);
      setLocationStatus('success');
      if (!isLocationDismissed) {
        setShowLocationLink(true);
      }
    } catch (error) {
      console.error("Location error:", error);
      setLocationStatus('error');
      alert("Unable to fetch location. Please allow permissions.");
    }
  };

  React.useEffect(() => {
    if (language !== prevLang) {
      setShowLangBanner(true);
      const timer = setTimeout(() => setShowLangBanner(false), 5000);
      setPrevLang(language);
      return () => clearTimeout(timer);
    }
  }, [language]);

  const toggleVoice = () => {
    setIsVoiceEnabled(!isVoiceEnabled);
  };

  const handleLanguageSwitch = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  const [hasAdminNotifications, setHasAdminNotifications] = React.useState(false);

  React.useEffect(() => {
    if (user?.role !== 'admin') return;
    
    // Check for pending wallet requests
    const qWallet = query(collection(db, 'walletRequests'), where('status', '==', 'pending'));
    const unsubscribeWallet = onSnapshot(qWallet, (snap) => {
      if (snap.size > 0) setHasAdminNotifications(true);
    });

    return () => unsubscribeWallet();
  }, [user]);

  const [searchPlaceholderIdx, setSearchPlaceholderIdx] = React.useState(0);
  const placeholders = [
    t('home') === 'Home' ? 'Search for "Milk"' : 'दूध खोजें',
    'Search for "Atta"',
    'Search for "Cold Drinks"',
    'Search for "Soap"',
    'Search for "Chips"',
    'Search for "Chocolate"',
  ];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setSearchPlaceholderIdx(prev => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const hideBottomNav = ['/admin', '/order-tracking', '/checkout', '/scan', '/cs'].some(path => location.pathname.startsWith(path));

  const mobileNavItems = [
    { path: '/', icon: Home, label: t('home') },
    { path: '/categories', icon: Package, label: t('categories') },
    { path: '/items', icon: LayoutDashboard, label: 'Items' },
    { path: '/profile', icon: User, label: t('profile'), hasDot: hasAdminNotifications },
  ];

  return (
    <>
      <AnimatePresence>
        {showLangBanner && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-gray-900 text-white py-4 px-6 text-center font-black uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4 border-b-4 border-primary"
          >
            <Languages className="w-6 h-6 text-primary animate-pulse" />
            <span>{language === 'hi' ? 'वेबसाइट अब हिंदी में है' : 'Website is now in English'}</span>
            <X className="w-5 h-5 ml-4 cursor-pointer hover:rotate-90 transition-transform" onClick={() => setShowLangBanner(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <SearchOverlay 
        isOpen={showSearchOverlay}
        onClose={() => setShowSearchOverlay(false)}
        products={products}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddToCart={onAddToCart}
      />
      <nav className="fixed top-0 z-50 w-full bg-white px-4 md:px-6 py-3 shadow-md border-b border-gray-100 transition-all">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {location.pathname !== '/' && (
                <button 
                  onClick={() => {
                    if (location.pathname === '/checkout') {
                      window.dispatchEvent(new CustomEvent('checkout-back-step'));
                    } else if (location.pathname === '/cs') {
                      window.dispatchEvent(new CustomEvent('cs-back-action'));
                      // If we are deep in specialized views, we might not want to navigate back yet
                      // but usually we want to go back to previous page
                      navigate(-1);
                    } else if (location.pathname.startsWith('/admin')) {
                      window.dispatchEvent(new CustomEvent('cs-back-action'));
                      navigate(-1);
                    } else {
                      navigate(-1);
                    }
                  }}
                  className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all active:scale-90 border border-gray-100"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-900" />
                </button>
              )}
              <div 
                className="relative"
                onMouseEnter={() => setShowTrustPanel(true)}
                onMouseLeave={() => setShowTrustPanel(false)}
                onClick={() => setShowTrustPanel(!showTrustPanel)}
              >
                <Logo className="cursor-pointer" />
                
                <AnimatePresence>
                  {showTrustPanel && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full left-0 mt-4 z-[110] w-[320px] bg-white p-6 rounded-[32px] shadow-2xl border border-gray-100"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
                          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
                            <Shield className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-black text-gray-900 tracking-tight uppercase">Kalika Store</h4>
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Trusted Since- 2010</p>
                          </div>
                        </div>
                        
                        <p className="text-sm font-bold text-gray-700 leading-relaxed">
                          Trusted Since 2010. We provide high-quality groceries with a touch of personal care. Your trust is our greatest asset, serving the local community with fresh produce daily.
                        </p>

                        <div className="space-y-3 pt-2">
                          <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span>Ranchi, Jharkhand</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            <FileText className="w-4 h-4 text-primary" />
                            <span>kalikastore.info@gmail.com</span>
                          </div>
                          <div className="flex flex-col gap-2 pl-7">
                            <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              <span>+91 9608123427</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              <span>+91 9905516803</span>
                            </div>
                          </div>
                          {storeSettings?.contactPhone && (
                            <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              <User className="w-4 h-4 text-primary" />
                              <span>{storeSettings.contactPhone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="relative group">
                  <div 
                    onClick={handleFetchLocation}
                    className={`flex flex-col px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-sm ring-1 transition-all cursor-pointer select-none active:scale-95 ${
                      locationStatus === 'loading' 
                        ? 'bg-blue-600 ring-blue-600 animate-pulse' 
                        : 'bg-white ring-gray-100 hover:ring-blue-600 shadow-gray-200/20'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={locationStatus === 'loading' ? 'animate-spin' : 'animate-bounce'}>
                        {locationStatus === 'loading' ? <RefreshCw className="w-2.5 h-2.5" /> : '📍'}
                      </span> 
                      <span className="font-black text-[8px] sm:text-[10px] uppercase tracking-tighter">
                        {locationStatus === 'loading' ? '...' : (userLocation ? userLocation.split(',')[0].slice(0, 10) : 'Ranchi')}
                      </span>
                    </div>
                  </div>

                  <AnimatePresence>
                  </AnimatePresence>
                </div>

                <button 
                  onClick={onCartOpen}
                  className="relative flex items-center justify-center w-12 h-12 bg-white border-2 border-gray-100 rounded-2xl shadow-xl shadow-gray-200/50 hover:scale-110 active:scale-95 transition-all group"
                >
                  <div className="relative">
                    <ShoppingBag className="w-6 h-6 text-gray-900 group-hover:text-primary transition-colors" />
                    {cartCount > 0 && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-3 -right-3 flex items-center justify-center bg-white text-primary text-[9px] font-black w-6 h-6 rounded-full border-2 border-primary shadow-lg z-20"
                      >
                        {cartCount}
                      </motion.span>
                    )}
                  </div>
                </button>
              </div>

              <div className="h-6 w-px bg-gray-100 mx-0.5" />

              <div className="flex items-center gap-2">
                {/* Profile button removed from header */}
              </div>
            </div>
          </div>

          <div 
            className="relative group cursor-pointer" 
            onClick={() => setShowSearchOverlay(true)}
          >
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <Search className="w-5 h-5 text-gray-900 stroke-[2.5]" />
            </div>
            <div className="w-full bg-[#F3F4F6] border border-gray-100 rounded-2xl pl-12 pr-28 py-4 text-[14px] font-bold text-gray-400/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] flex items-center group-hover:bg-gray-100 transition-all overflow-hidden h-[54px]">
              <AnimatePresence mode="wait">
                <motion.span
                  key={searchPlaceholderIdx}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute left-12"
                >
                  {placeholders[searchPlaceholderIdx]}
                </motion.span>
              </AnimatePresence>
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-4 text-gray-400">
               <Mic 
                 onClick={(e) => {
                   e.stopPropagation();
                   setIsVoiceEnabled(true);
                   window.dispatchEvent(new CustomEvent('trigger-voice-assistant'));
                 }}
                 className={`w-5 h-5 cursor-pointer hover:text-primary transition-colors ${isVoiceEnabled ? 'text-primary' : ''}`} 
               />
               <div className="w-px h-4 bg-gray-200" />
               <Search className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>
      </nav>
      {/* Spacer for fixed navbar */}
      <div className="h-[128px]" />

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
                    {item.hasDot && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white" />
                    )}
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${
                    isActive ? 'text-[#00AEEF]' : 'text-gray-400'
                  }`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div 
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-gray-100 rounded-[28px] -z-10"
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
