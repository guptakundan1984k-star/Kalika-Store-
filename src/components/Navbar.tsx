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
}

export const Navbar: React.FC<NavbarProps> = ({ cartCount, user, searchQuery, setSearchQuery, products, storeSettings }) => {
  const location = useLocation();
  const isAdmin = user?.role === 'admin';
  const { language, setLanguage, t, isVoiceEnabled, setIsVoiceEnabled } = useLanguage();
  const [showSearchPopup, setShowSearchPopup] = React.useState(false);

  React.useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setShowSearchPopup(true);
    } else {
      setShowSearchPopup(false);
    }
  }, [searchQuery]);

  const filteredProducts = searchQuery.trim().length === 0 
    ? [] 
    : products.filter(p => {
        const query = searchQuery.toLowerCase().trim();
        const name = p.name.toLowerCase();
        const category = p.category.toLowerCase();
        const description = (p.description || '').toLowerCase();
        
        // Match if name starts with query, or contains query as a word, or category matches
        return name.includes(query) || category.includes(query) || description.includes(query);
      }).sort((a, b) => {
        // Prioritize exact matches and prefix matches
        const query = searchQuery.toLowerCase().trim();
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        
        if (aName === query) return -1;
        if (bName === query) return 1;
        if (aName.startsWith(query) && !bName.startsWith(query)) return -1;
        if (!aName.startsWith(query) && bName.startsWith(query)) return 1;
        return 0;
      }).slice(0, 15);

  const mobileNavItems = [
    { path: '/', icon: Home, label: t('home') },
    { path: '/categories', icon: Package, label: t('categories') },
    { path: '/items', icon: LayoutDashboard, label: 'Items' },
    { path: '/wishlist', icon: Heart, label: 'Wishlist' },
    { path: '/profile', icon: User, label: t('profile') },
  ];

  return (
    <>
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
                  {storeSettings && (
                    <div className="relative group/status flex items-center">
                      <div className={`w-1.5 h-1.5 rounded-full ${storeSettings.isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover/status:block z-50">
                        <div className="bg-gray-900 text-white text-[10px] font-black px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl uppercase tracking-widest">
                          Store is {storeSettings.isOpen ? 'Open' : 'Closed'}
                        </div>
                      </div>
                    </div>
                  )}
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
              {isAdmin && (
                <Link to="/admin" className="p-2 hover:bg-primary/10 rounded-full transition-all text-primary" title="Go to Admin Panel">
                  <Shield className="w-6 h-6" />
                </Link>
              )}
              <Link to="/profile" className="p-2 hover:bg-gray-50 rounded-full transition-colors" aria-label="Profile">
                <User className="w-6 h-6 text-gray-700" />
              </Link>
              <Link to="/cart" className="relative p-2 hover:bg-gray-50 rounded-full transition-colors" aria-label={`Cart with ${cartCount} items`}>
                <ShoppingCart className="w-6 h-6 text-gray-700" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 bg-primary text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-lg">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Bottom Row: Search Bar */}
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search')}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-12 pr-24 py-3 text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
              <button className="p-1 text-gray-400 hover:text-primary transition-colors">
                <Mic className="w-5 h-5" />
              </button>
              <div className="w-[1px] h-4 bg-gray-200" />
              <Link to="/bill" className="p-1 text-gray-400 hover:text-primary transition-colors">
                <FileText className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Search Results Popup */}
      <AnimatePresence>
        {showSearchPopup && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 md:pt-32">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSearchPopup(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl border border-primary/20 p-8 overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <Search className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-gray-900 tracking-tight">Search Results</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {filteredProducts.length > 0 
                        ? `Found ${filteredProducts.length} items for "${searchQuery}"`
                        : `No items found for "${searchQuery}"`}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSearchPopup(false)} 
                  className="p-3 hover:bg-gray-50 rounded-2xl transition-colors group"
                >
                  <X className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-8 scrollbar-hide pb-4">
                {searchQuery.length < 2 && (
                  <div className="space-y-6">
                    <div>
                      <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Trending Searches</h5>
                      <div className="flex flex-wrap gap-2">
                        {['Milk', 'Vim', 'Bread', 'Ghee', 'Poha', 'Soap', 'Oil', 'Sugar'].map(tag => (
                          <button 
                            key={tag}
                            onClick={() => setSearchQuery(tag)}
                            className="px-4 py-2 bg-gray-50 hover:bg-primary/10 hover:text-primary rounded-xl text-xs font-bold text-gray-600 transition-all border border-gray-100"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Quick Categories</h5>
                      <div className="grid grid-cols-2 gap-3">
                        {['Dairy', 'Snacks', 'Staples', 'Personal Care'].map(cat => (
                          <button 
                            key={cat}
                            onClick={() => setSearchQuery(cat)}
                            className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-primary/10 rounded-2xl text-xs font-bold text-gray-600 transition-all border border-gray-100 group"
                          >
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                              <Package className="w-4 h-4" />
                            </div>
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredProducts.map(product => (
                      <Link 
                        key={product.id}
                        to={`/product/${product.id}`}
                        onClick={() => { setSearchQuery(''); setShowSearchPopup(false); }}
                        className="flex items-center gap-6 p-4 hover:bg-primary/5 rounded-[32px] transition-all group border border-gray-50 hover:border-primary/20"
                      >
                        <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-50 shrink-0 shadow-sm">
                          <img 
                            src={product.image} 
                            alt={product.name} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">{product.category}</span>
                            {product.stock <= 5 && product.stock > 0 && (
                              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-3 py-1 rounded-full">Low Stock</span>
                            )}
                          </div>
                          <h5 className="text-lg font-black text-gray-900 truncate group-hover:text-primary transition-colors">{product.name}</h5>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xl font-black text-gray-900">₹{product.price}</span>
                            {product.weight && (
                              <span className="text-xs font-bold text-gray-400">{product.weight}</span>
                            )}
                          </div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-primary group-hover:text-white group-hover:rotate-[-45deg] transition-all duration-300">
                          <ArrowRight className="w-6 h-6" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center space-y-6">
                    <div className="w-24 h-24 bg-gray-50 rounded-[32px] flex items-center justify-center text-gray-300 mx-auto">
                      <Search className="w-12 h-12" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xl font-black text-gray-900">No products found</p>
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">We couldn't find anything matching "{searchQuery}"</p>
                    </div>
                    <Link 
                      to={`/items?request=${encodeURIComponent(searchQuery)}`}
                      onClick={() => { setSearchQuery(''); setShowSearchPopup(false); }}
                      className="inline-flex items-center gap-3 bg-primary text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95"
                    >
                      <Sparkles className="w-5 h-5" />
                      Ask owner to add this product
                    </Link>
                  </div>
                )}
              </div>

              {filteredProducts.length > 0 && (
                <div className="pt-6 border-t border-gray-50">
                  <Link 
                    to="/products"
                    onClick={() => { setSearchQuery(''); setShowSearchPopup(false); }}
                    className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-gray-900/20 hover:bg-black transition-all group"
                  >
                    View All Products
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navbar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-2xl border-t border-gray-100 px-2 py-3 flex items-center justify-around shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className={`relative flex flex-col items-center gap-1 transition-all ${
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
