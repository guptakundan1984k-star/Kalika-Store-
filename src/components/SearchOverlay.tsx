import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, X, Mic, ArrowLeft, Heart, Plus, ChevronRight, Sparkles, ShoppingBag, Loader2, ScanBarcode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { CATEGORIES } from '../constants';


import { aiService } from '../services/aiService';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onAddToCart: (product: Product, quantity: number, redirectToCheckout?: boolean) => void;
}

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
  const [aiResultIds, setAiResultIds] = useState<string[]>([]);

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
    setAiResultIds([]); // Reset AI results on new type
    if (query.trim()) {
      const updated = [query, ...pastSearches.filter(s => s !== query)].slice(0, 10);
      setPastSearches(updated);
      localStorage.setItem('pastSearches', JSON.stringify(updated));
    }
  };

  const handleAiSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsAiSearching(true);
    setAiResultIds([]); // Clear previous results while searching
    try {
      // 1. Semantic search with Gemini
      const ids = await aiService.semanticProductSearch(searchQuery, products);
      
      // 2. Local fuzzy fallback if AI results are thin
      const queryTerm = searchQuery.toLowerCase().trim();
      const localMatches = products
        .filter(p => !ids.includes(p.id)) // Only those not already picked by AI
        .filter(p => 
          p.name.toLowerCase().includes(queryTerm) || 
          p.category.toLowerCase().includes(queryTerm) ||
          p.description?.toLowerCase().includes(queryTerm)
        )
        .slice(0, 5)
        .map(p => p.id);

      setAiResultIds([...ids, ...localMatches]);
    } catch (e) {
      console.error("AI Search failed", e);
    } finally {
      setIsAiSearching(false);
    }
  };

  const filteredProducts = searchQuery.trim().length === 0 
    ? [] 
    : products.filter(p => {
        const query = searchQuery.toLowerCase().trim();
        const name = p.name.toLowerCase();
        const category = p.category.toLowerCase();
        const description = (p.description || '').toLowerCase();
        return name.includes(query) || category.includes(query) || description.includes(query);
      }).slice(0, 15);

  const aiFilteredProducts = aiResultIds.length > 0 
    ? products.filter(p => aiResultIds.includes(p.id))
    : [];

  const displayProducts = aiFilteredProducts.length > 0 ? aiFilteredProducts : filteredProducts;

  const popularCategories = CATEGORIES.map(cat => {
    // Get a representative image from products in this category
    const product = products.find(p => p.category === cat.name);
    return { ...cat, image: product?.image || 'https://picsum.photos/seed/cat/200' };
  });

  const clearPastSearches = () => {
    setPastSearches([]);
    localStorage.removeItem('pastSearches');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0.1, right: 0.8 }}
          onDragEnd={(_, info) => {
            if (info.offset.x > 100) onClose();
          }}
          className="fixed inset-0 z-[100] bg-white flex flex-col touch-none"
        >
          {/* Draggable Handle for Visual Hint */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 flex items-center justify-center pointer-events-none">
            <div className="w-1 h-32 bg-gray-200/50 rounded-full" />
          </div>
          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
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
                  placeholder="Search for 'Fruits'"
                  className="w-full bg-gray-100 border-none rounded-full pl-12 pr-28 py-3 text-sm font-medium focus:ring-2 focus:ring-[#00AEEF]/20 transition-all"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <button 
                    onClick={() => navigate('/scan')}
                    className="p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-400 hover:text-primary transition-colors shadow-sm border border-gray-100"
                    title="Scan Barcode"
                  >
                    <ScanBarcode className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleAiSearch}
                    disabled={isAiSearching}
                    className="p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-400 hover:text-[#00AEEF] transition-colors flex items-center gap-1 shadow-sm border border-gray-200"
                  >
                    {isAiSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#00AEEF]" />
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="text-[8px] font-black uppercase tracking-tighter">AI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="w-10 h-10 flex items-center justify-center">
                 <img src="https://kalikastore.in/logo.png" alt="Profile" className="w-8 h-8 rounded-full border border-gray-100" />
              </div>
          </div>



          <div className="flex-1 overflow-y-auto pb-24">
            {!searchQuery ? (
              <div className="space-y-8 py-6">
                {/* Past Searches */}
                {pastSearches.length > 0 && (
                  <div className="space-y-4">
                    <div className="px-6 flex items-center justify-between">
                      <h3 className="text-xl font-black text-gray-900 tracking-tight">Past searches</h3>
                      <button 
                        onClick={clearPastSearches}
                        className="text-sm font-black text-primary hover:text-primary-dark transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="flex flex-nowrap overflow-x-auto gap-3 px-6 scrollbar-hide">
                      {pastSearches.map((term, i) => (
                        <button 
                          key={i}
                          onClick={() => handleSearch(term)}
                          className="shrink-0 px-6 py-3 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-600 shadow-sm hover:border-primary/30 transition-all"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending today */}
                <div className="space-y-4">
                  <div className="px-6">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Trending today</h3>
                  </div>
                  <div className="flex flex-nowrap overflow-x-auto gap-4 px-6 scrollbar-hide pb-4">
                    {trendingProducts.map((product) => (
                      <div 
                        key={product.id}
                        className="shrink-0 w-[180px] bg-white border border-gray-100 rounded-[32px] overflow-hidden group shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all"
                      >
                        <div className="relative aspect-square bg-gray-50 p-4">
                          <button className="absolute top-3 left-3 p-1.5 bg-white/80 backdrop-blur-sm rounded-xl text-gray-300 hover:text-red-500 transition-colors">
                            <Heart className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onAddToCart(product, 1, true)}
                            className="absolute top-3 right-3 p-1.5 bg-white shadow-lg rounded-xl text-primary hover:bg-primary hover:text-white transition-all active:scale-95"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <Link to={`/product/${product.id}`} onClick={onClose}>
                            <img 
                              src={product.image} 
                              alt={product.name} 
                              className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500" 
                              referrerPolicy="no-referrer"
                            />
                          </Link>
                          {/* Unit display like in image */}
                          {product.weight && (
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-gray-100/90 backdrop-blur-sm px-4 py-1.5 rounded-xl text-[10px] font-black text-gray-900 uppercase tracking-widest whitespace-nowrap shadow-sm border border-white/50">
                              {product.weight}
                            </div>
                          )}
                        </div>
                        <div className="p-4 space-y-1">
                          <Link to={`/product/${product.id}`} onClick={onClose}>
                            <h4 className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight group-hover:text-primary transition-colors">{product.name}</h4>
                          </Link>
                          <div className="pt-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-black text-gray-900">₹{product.price}</span>
                              {product.originalPrice && (
                                <span className="text-xs font-bold text-gray-300 line-through">₹{product.originalPrice}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Popular Category */}
                <div className="space-y-4">
                  <div className="px-6">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Popular Category</h3>
                  </div>
                  <div className="flex flex-nowrap overflow-x-auto gap-6 px-6 scrollbar-hide pb-4">
                    {popularCategories.map((cat) => (
                      <button 
                        key={cat.id}
                        onClick={() => {
                          setSearchQuery(cat.name);
                        }}
                        className="shrink-0 flex flex-col items-center gap-3 group"
                      >
                        <div className="w-20 h-20 rounded-full border-2 border-gray-100 p-1 group-hover:border-primary transition-all overflow-hidden bg-white shadow-sm">
                          <img 
                            src={cat.image || undefined} 
                            alt={cat.name} 
                            className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-500" 
                          />
                        </div>
                        <span className="text-xs font-black text-gray-600 uppercase tracking-widest group-hover:text-primary transition-colors text-center max-w-[80px] leading-tight">
                          {cat.name.split(' ')[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Search Results */
              <div className="px-4 py-6 space-y-6">
                <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    {aiFilteredProducts.length > 0 ? 'AI Suggestions' : `Found ${filteredProducts.length} items`} for "{searchQuery}"
                  </p>
                  {filteredProducts.length > 0 && aiFilteredProducts.length === 0 && (
                    <button 
                      onClick={handleAiSearch}
                      className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2 hover:bg-primary/10 px-3 py-1.5 rounded-xl transition-all"
                    >
                      <Sparkles className="w-3 h-3" />
                      Get Smart Suggestions
                    </button>
                  )}
                </div>

                {displayProducts.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {displayProducts.map(product => (
                      <Link 
                        key={product.id}
                        to={`/product/${product.id}`}
                        onClick={onClose}
                        className="flex items-center gap-4 p-3 hover:bg-primary/5 rounded-[24px] transition-all group border border-gray-50"
                      >
                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-50 shrink-0">
                          <img 
                            src={product.image || undefined} 
                            alt={product.name} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full">{product.category}</span>
                          <h5 className="text-base font-black text-gray-900 truncate group-hover:text-primary mt-1">{product.name}</h5>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-lg font-black text-gray-900">₹{product.price}</span>
                            {product.weight && (
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {product.weight}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-2 text-gray-300 group-hover:text-primary transition-colors">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center space-y-6">
                    <div className="w-20 h-20 bg-gray-50 rounded-[32px] flex items-center justify-center text-gray-300 mx-auto">
                      <SearchIcon className="w-10 h-10" />
                    </div>
                    <div>
                      <p className="text-lg font-black text-gray-900">No products found</p>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Try another keyword</p>
                    </div>
                    <button 
                      onClick={() => navigate(`/items?request=${encodeURIComponent(searchQuery)}`)}
                      className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/30"
                    >
                      Ask owner to add this
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
