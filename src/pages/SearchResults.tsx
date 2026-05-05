import React, { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { ProductCard } from '../components/ProductCard';
import { searchProducts } from '../utils/searchUtils';
import { Search, Filter, ArrowLeft, Package, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { ReachedEnd } from '../components/ReachedEnd';

interface SearchResultsProps {
  products: Product[];
  onAddToCart: (product: Product, quantity?: number, redirectToCheckout?: boolean, selectedUnit?: string) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ products, onAddToCart }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';

  const results = useMemo(() => {
    return searchProducts(products, query);
  }, [products, query]);

  const recommendedProducts = useMemo(() => {
    // If no results, or only few, show some random popular ones
    if (results.length < 4) {
      return [...products].sort(() => 0.5 - Math.random()).slice(0, 8);
    }
    return [];
  }, [products, results]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Search Header */}
      <div className="bg-white sticky top-0 z-30 border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text"
              readOnly
              value={query}
              onClick={() => navigate('/')} // Redirect to home search to trigger overlay
              className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-3 text-sm font-bold text-gray-900 focus:ring-0"
            />
          </div>
          <button className="p-3 bg-gray-50 rounded-xl text-gray-900">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Results Info */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              {results.length > 0 ? `Results for "${query}"` : 'No matches found'}
            </h1>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
              Showing {results.length} items from inventory
            </p>
          </div>
          {results.length > 0 && (
            <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Smart Match</span>
            </div>
          )}
        </div>

        {results.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {results.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ProductCard product={product} onAddToCart={onAddToCart} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-12">
            <div className="py-20 text-center bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/50 space-y-6">
              <div className="w-24 h-24 bg-gray-50 rounded-[40px] flex items-center justify-center text-gray-300 mx-auto">
                <Package className="w-12 h-12" />
              </div>
              <div className="max-w-xs mx-auto space-y-2">
                <p className="text-xl font-black text-gray-900">Oops! No items found</p>
                <p className="text-sm text-gray-400">
                  We couldn't find anything matching your search. But don't worry, we're constantly adding new products!
                </p>
              </div>
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <button 
                  onClick={() => navigate('/')}
                  className="bg-primary text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/30"
                >
                  Return to Home
                </button>
                <button 
                  onClick={() => navigate('/cs')}
                  className="bg-gray-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest"
                >
                  Request this product
                </button>
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-gray-900 tracking-tight italic">Recommended <span className="text-primary italic">for you</span></h2>
                <button 
                  onClick={() => navigate('/products')}
                  className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {recommendedProducts.map(p => (
                  <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} />
                ))}
              </div>
            </div>
          </div>
        )}
        
        {results.length > 0 && <ReachedEnd />}
      </div>
    </div>
  );
};
