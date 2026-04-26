import React, { useState, useEffect } from 'react';
import { ProductCard } from '../components/ProductCard';
import { Product, CartItem } from '../types';
import { motion } from 'motion/react';
import { Search, ArrowLeft, LayoutGrid, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface CategoriesProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  cart: CartItem[];
  onRemoveFromCart?: (id: string) => void;
  toggleWishlist?: (productId: string) => void;
  wishlist?: string[];
}

const Categories: React.FC<CategoriesProps> = ({ products, onAddToCart, cart, onRemoveFromCart, toggleWishlist, wishlist = [] }) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'price-low' | 'price-high' | 'newest'>('newest');
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get('category');
    if (cat) {
      setSelectedCategory(cat);
    }
  }, [location.search]);

  const categories = [
    { id: 'Vegetables', name: 'Fruits & veggies', image: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&q=80&w=200' },
    { id: 'Bakery', name: 'Bakery & batters', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=200' },
    { id: 'Dairy', name: 'Dairy', image: 'https://images.unsplash.com/photo-1550583724-125581f77833?auto=format&fit=crop&q=80&w=200' },
    { id: 'Meat', name: 'Eggs, meat & fish', image: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&q=80&w=200' },
    { id: 'Staples', name: 'Atta, rice & dals', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=200' },
    { id: 'Oils', name: 'Oils, ghee & masala', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=200' },
    { id: 'Snacks', name: 'Snacks & drinks', image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bb087?auto=format&fit=crop&q=80&w=200' },
    { id: 'Household', name: 'Cleaning & more', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=200' },
  ];

  const filteredProducts = products.filter(p => 
    (selectedCategory ? p.category === selectedCategory : true) &&
    (search ? p.name.toLowerCase().includes(search.toLowerCase()) : true)
  ).sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-[120px] md:top-[140px] z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Categories</h1>
            </div>
            <div className="relative flex-1 max-w-md hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search in categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div className="relative group">
              <button className="flex items-center gap-2 bg-white border border-gray-100 px-4 py-3 rounded-2xl shadow-sm hover:shadow-md transition-all font-bold text-sm text-gray-600">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                <span className="hidden sm:inline">Sort:</span>
                <span className="text-gray-900">
                  {sortBy === 'newest' ? 'Newest' : sortBy === 'price-low' ? 'Low-High' : 'High-Low'}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden hidden group-hover:block z-50">
                <button 
                  onClick={() => setSortBy('newest')} 
                  className={`w-full text-left px-4 py-3 text-xs font-bold transition-all active:scale-[0.98] ${sortBy === 'newest' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-primary/5 hover:text-primary'}`}
                >
                  Newest First
                </button>
                <button 
                  onClick={() => setSortBy('price-low')} 
                  className={`w-full text-left px-4 py-3 text-xs font-bold transition-all active:scale-[0.98] ${sortBy === 'price-low' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-primary/5 hover:text-primary'}`}
                >
                  Price: Low to High
                </button>
                <button 
                  onClick={() => setSortBy('price-high')} 
                  className={`w-full text-left px-4 py-3 text-xs font-bold transition-all active:scale-[0.98] ${sortBy === 'price-high' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-primary/5 hover:text-primary'}`}
                >
                  Price: High to Low
                </button>
              </div>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
            <button 
              onClick={() => setSelectedCategory('')}
              className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap active:scale-95 ${
                !selectedCategory ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap active:scale-95 ${
                  selectedCategory === cat.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {cat.id}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              quantityInCart={cart.find(c => c.id === product.id)?.quantity}
              onAddToCart={onAddToCart} 
              onRemoveFromCart={onRemoveFromCart}
              toggleWishlist={toggleWishlist}
              isWishlisted={wishlist.includes(product.id)}
            />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">No products found</h3>
            <p className="text-sm text-gray-500 font-medium">Try adjusting your search or category filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Categories;
