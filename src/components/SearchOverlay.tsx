import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, X, Mic, ArrowLeft, Heart, Plus, ChevronRight, Sparkles, ShoppingBag, Loader2, ScanBarcode, History, TrendingUp, Grid, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { CATEGORIES } from '../constants';
import { aiService } from '../services/aiService';
import { searchProducts, getMatchingCategories } from '../utils/searchUtils';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onAddToCart: (product: Product, quantity: number, redirectToCheckout?: boolean) => void;
}

type SearchTab = 'Products' | 'Categories' | 'Popular' | 'Recent';

const TRENDING_KEYWORDS = [
  'Cold Drinks', 'Chips', 'Detergent', 'Atta', 'Soap', 'Chocolate', 'Biscuits', 'Fresh Fruits', 'Dairy'
];

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ 
  isOpen, 
  onClose, 
  products, 
  searchQuery, 
  setSearchQuery,
  onAddToCart
}) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pastSearches, setPastSearches] = useState<string[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchTab>('Products');

  useEffect(() => {
    const saved = localStorage.getItem('pastSearches');
    if (saved) setPastSearches(JSON.parse(saved));
    
    // Pick random products for "Trending today"
    const shuffled = [...products].sort(() => 0.5 - Math.random());
    setTrendingProducts(shuffled.slice(0, 10));
  }, [products, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
       setActiveTab('Recent');
    } else {
       setActiveTab('Products');
    }
  };

  const saveSearchTerm = (query: string) => {
    if (query.trim()) {
      const updated = [query, ...pastSearches.filter(s => s !== query)].slice(0, 10);
      setPastSearches(updated);
      localStorage.setItem('pastSearches', JSON.stringify(updated));
    }
  };

  const handleProductClick = (product: Product) => {
    saveSearchTerm(searchQuery || product.name);
    onClose();
    navigate(`/product/${product.id}`);
  };

  const handleAiSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsAiSearching(true);
    try {
      const ids = await aiService.semanticProductSearch(searchQuery, products);
      if (ids.length > 0) {
        // If AI finds results, we could potentially highlight them or auto-select them
        // For now, the local searchProducts also handles semantic terms via searchUtils
      }
    } catch (e) {
      console.error("AI Search failed", e);
    } finally {
      setIsAiSearching(false);
    }
  };

  const displayProducts = searchProducts(products, searchQuery);
  const matchedCategories = getMatchingCategories(products, searchQuery);

  const clearPastSearches = () => {
    setPastSearches([]);
    localStorage.removeItem('pastSearches');
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() 
            ? <span key={i} className="font-black text-primary">{part}</span> 
            : part
        )}
      </>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[100] bg-white flex flex-col"
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 shadow-sm relative z-10">
            <button 
              onClick={onClose}
              className="p-2 -ml-2 text-gray-900 hover:bg-gray-50 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1 relative flex items-center">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <SearchIcon className="w-5 h-5 text-gray-400" />
              </div>
              <input 
                ref={inputRef}
                type="text" 
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveSearchTerm(searchQuery);
                    onClose();
                    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
                  }
                }}
                placeholder="Search for 'Milk', 'Bread' or 'Cold Drinks'..."
                className="w-full bg-gray-100 border-none rounded-2xl pl-12 pr-12 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-gray-400"
              />
              {searchQuery && (
                <button 
                  onClick={() => handleSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button 
              onClick={() => navigate('/scan')}
              className="p-2 bg-gray-100 rounded-xl text-gray-900 hover:text-primary transition-colors"
            >
              <ScanBarcode className="w-6 h-6" />
            </button>
          </div>

          {/* Search Tabs */}
          {searchQuery && (
            <div className="flex border-b border-gray-100 bg-white">
              {(['Products', 'Categories'] as SearchTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest relative transition-all ${
                    activeTab === tab ? 'text-primary' : 'text-gray-400'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div 
                      layoutId="searchTab"
                      className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-primary rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50/30">
            {!searchQuery ? (
              <div className="space-y-8 py-6">
                {/* Recent Searches */}
                {pastSearches.length > 0 && (
                  <div className="space-y-4">
                    <div className="px-6 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-gray-400" />
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Recent searches</h3>
                      </div>
                      <button 
                        onClick={clearPastSearches}
                        className="text-[10px] font-black text-primary uppercase tracking-widest"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 px-6">
                      {pastSearches.map((term, i) => (
                        <button 
                          key={i}
                          onClick={() => handleSearch(term)}
                          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 shadow-sm hover:border-primary/50 flex items-center gap-2"
                        >
                          <small className="text-gray-300">#</small> {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending Searches */}
                <div className="space-y-4">
                  <div className="px-6 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Trending now</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 px-6">
                    {TRENDING_KEYWORDS.map((kw, i) => (
                      <button 
                        key={i}
                        onClick={() => handleSearch(kw)}
                        className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm group hover:border-primary/30 transition-all text-left"
                      >
                        <span className="text-sm font-bold text-gray-700">{kw}</span>
                        <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-primary transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Popular Categories */}
                <div className="space-y-4">
                  <div className="px-6 flex items-center gap-2">
                    <Grid className="w-4 h-4 text-gray-400" />
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Shop By Category</h3>
                  </div>
                  <div className="flex flex-nowrap overflow-x-auto gap-6 px-6 scrollbar-hide pb-4">
                    {CATEGORIES.map((cat) => (
                      <button 
                        key={cat.id}
                        onClick={() => handleSearch(cat.name)}
                        className="shrink-0 flex flex-col items-center gap-3 group"
                      >
                        <div className="w-20 h-20 rounded-full bg-white border border-gray-100 p-1 group-hover:scale-110 group-hover:border-primary transition-all shadow-sm overflow-hidden">
                          <img 
                            src={products.find(p => p.category === cat.name)?.image || `https://picsum.photos/seed/${cat.name}/200`} 
                            alt={cat.name} 
                            className="w-full h-full object-contain mix-blend-multiply" 
                          />
                        </div>
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest text-center max-w-[80px]">
                          {cat.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Search Results */
              <div className="py-4">
                {activeTab === 'Products' ? (
                  <div className="space-y-2">
                    {displayProducts.length > 0 ? (
                      <div className="px-4 grid grid-cols-1 gap-3">
                        {displayProducts.map(product => (
                          <div 
                            key={product.id}
                            className="flex items-center gap-4 p-3 bg-white border border-gray-100 rounded-[28px] shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                          >
                            <Link to={`/product/${product.id}`} onClick={() => handleProductClick(product)} className="w-20 h-20 bg-gray-50 rounded-2xl overflow-hidden shrink-0">
                              <img 
                                src={product.image || undefined} 
                                alt={product.name} 
                                className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
                                referrerPolicy="no-referrer"
                              />
                            </Link>
                                <div className="flex min-w-0 flex-1 flex-col">
                                 <div className="mb-1 flex flex-wrap gap-1">
                                  {product.tags?.slice(0, 2).map(tag => (
                                    <span key={tag} className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter">
                                      {tag}
                                    </span>
                                  ))}
                                 </div>
                               <Link to={`/product/${product.id}`} onClick={() => handleProductClick(product)}>
                                 <h5 className="text-sm font-black text-gray-900 line-clamp-1 group-hover:text-primary transition-colors">
                                   {highlightText(product.name, searchQuery)}
                                 </h5>
                               </Link>
                               <div className="flex items-center gap-3 mt-1">
                                <span className="text-lg font-black text-gray-900">₹{product.price}</span>
                                {product.weight && (
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{product.weight}</span>
                                )}
                               </div>
                            </div>
                            <div className="flex flex-col gap-2">
                               <button 
                                 onClick={() => onAddToCart(product, 1)}
                                 className="w-10 h-10 bg-primary/10 text-primary rounded-2xl flex items-center justify-center hover:bg-primary hover:text-white transition-all active:scale-90"
                               >
                                <Plus className="w-5 h-5" />
                               </button>
                               <div className="p-2 text-gray-200 group-hover:text-primary transition-colors">
                                <ChevronRight className="w-5 h-5" />
                               </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-20 text-center space-y-6 px-6">
                        <div className="w-24 h-24 bg-gray-100 rounded-[40px] flex items-center justify-center text-gray-300 mx-auto">
                          <Package className="w-12 h-12" />
                        </div>
                        <div>
                          <p className="text-xl font-black text-gray-900">No products found</p>
                          <p className="text-sm text-gray-400 mt-2">We couldn't find anything matching "{searchQuery}". Try searching for categories like "Snacks" or "Beverages".</p>
                        </div>
                        <div className="flex flex-col gap-3 max-w-xs mx-auto">
                          <button 
                            onClick={() => handleSearch('')}
                            className="bg-gray-100 text-gray-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest"
                          >
                            Browse All Products
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Category Results */
                  <div className="px-6 space-y-4">
                    {matchedCategories.length > 0 ? (
                      matchedCategories.map(catName => (
                        <button 
                          key={catName}
                          onClick={() => {
                            setSearchQuery(catName);
                            setActiveTab('Products');
                          }}
                          className="w-full flex items-center justify-between p-5 bg-white border border-gray-100 rounded-3xl shadow-sm group hover:border-primary/50 transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                              <Grid className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                              <h4 className="text-base font-black text-gray-900 group-hover:text-primary transition-colors">{catName}</h4>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global Category</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-200 group-hover:text-primary transition-colors" />
                        </button>
                      ))
                    ) : (
                      <div className="py-20 text-center">
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No matching categories</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Bottom Call to Action for No Results */}
          {!searchQuery && (
            <div className="p-6 bg-white border-t border-gray-100 flex items-center justify-between">
              <div className="flex-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Can't find an item?</p>
                <p className="text-sm font-black text-gray-900">Request a new product</p>
              </div>
              <button 
                onClick={() => navigate('/items?request=new')}
                className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
              >
                Request
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

