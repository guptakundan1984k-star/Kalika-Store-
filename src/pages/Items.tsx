import React, { useState } from 'react';
import { Product, CartItem } from '../types';
import { ProductCard } from '../components/ProductCard';
import { Search } from '../components/Search';
import { Filter, LayoutGrid, List, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

interface ItemsProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveFromCart: (id: string) => void;
  toggleWishlist: (productId: string) => void;
  wishlist: string[];
  storeSettings: any;
}

const Items: React.FC<ItemsProps> = ({ 
  products, 
  onAddToCart, 
  cart, 
  onRemoveFromCart,
  toggleWishlist,
  wishlist,
  storeSettings
}) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'price-low' | 'price-high' | 'newest'>('newest');

  const filteredProducts = products.filter(p => {
    const searchTerms = search.toLowerCase().split(' ').filter(t => t.length > 0);
    const name = p.name.toLowerCase();
    const matchesSearch = searchTerms.length === 0 || searchTerms.every(term => name.includes(term));
    return matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-100 pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">All Items</h1>
              <p className="text-sm text-gray-500 font-medium">Explore our entire collection of fresh groceries.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative group">
                <button className="flex items-center gap-2 bg-white border border-gray-100 px-4 py-3 rounded-2xl shadow-sm hover:shadow-md transition-all font-bold text-sm text-gray-600">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                  <span className="hidden sm:inline">Sort By:</span>
                  <span className="text-gray-900">
                    {sortBy === 'newest' ? 'Newest' : sortBy === 'price-low' ? 'Price: Low-High' : 'Price: High-Low'}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden hidden group-hover:block z-50">
                  <button 
                    onClick={() => setSortBy('newest')} 
                    className={`w-full text-left px-4 py-3 text-xs font-bold transition-all ${sortBy === 'newest' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-primary/5 hover:text-primary'}`}
                  >
                    Newest First
                  </button>
                  <button 
                    onClick={() => setSortBy('price-low')} 
                    className={`w-full text-left px-4 py-3 text-xs font-bold transition-all ${sortBy === 'price-low' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-primary/5 hover:text-primary'}`}
                  >
                    Price: Low to High
                  </button>
                  <button 
                    onClick={() => setSortBy('price-high')} 
                    className={`w-full text-left px-4 py-3 text-xs font-bold transition-all ${sortBy === 'price-high' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-primary/5 hover:text-primary'}`}
                  >
                    Price: High to Low
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <Search value={search} onChange={setSearch} />
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-gray-200 shadow-xl shadow-gray-100">
              <Filter className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900">No items found</h3>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">Try adjusting your search to find what you're looking for.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => setSearch('')}
                className="bg-gray-100 text-gray-900 font-bold px-8 py-4 rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
              >
                Clear Search
              </button>
              <Link 
                to={`/items?request=${encodeURIComponent(search)}`}
                className="bg-primary text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
              >
                Ask owner to add this product
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  quantityInCart={cart.find(item => item.id === product.id)?.quantity}
                  onAddToCart={onAddToCart} 
                  onRemoveFromCart={onRemoveFromCart}
                  toggleWishlist={toggleWishlist}
                  isWishlisted={wishlist.includes(product.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default Items;
