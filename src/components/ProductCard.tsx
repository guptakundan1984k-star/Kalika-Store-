import React from 'react';
import { Product } from '../types';
import { ShoppingCart, Plus, Minus, Heart, Star, Eye, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  quantityInCart?: number;
  onRemoveFromCart?: (id: string) => void;
  toggleWishlist?: (productId: string) => void;
  isWishlisted?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onAddToCart, 
  quantityInCart = 0,
  onRemoveFromCart,
  toggleWishlist,
  isWishlisted = false
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-[40px] overflow-hidden border border-gray-100 shadow-xl shadow-gray-200/50 group relative flex flex-col h-full"
    >
      {/* Image Container */}
      <div className="aspect-square overflow-hidden relative bg-gray-50">
        <Link to={`/product/${product.id}`} className="block w-full h-full">
          {product.image ? (
            <img 
              src={product.image} 
              alt={product.name}
              className="w-full h-full object-contain p-4 transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-200">
              <ShoppingBag className="w-16 h-16" />
            </div>
          )}
        </Link>
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
          <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm text-gray-900 text-[9px] font-black uppercase tracking-widest rounded-lg shadow-sm border border-gray-100">
            {product.category}
          </span>
          
          {/* Imported Tag */}
          {(product.name.toLowerCase().includes('redbull') || 
            product.name.toLowerCase().includes('monster') || 
            product.name.toLowerCase().includes('imported') ||
            product.name.toLowerCase().includes('swiss')) && (
            <span className="px-2 py-1 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-indigo-200">
              Imported
            </span>
          )}

          {/* Low Stock Tag */}
          {product.stock <= 10 && product.stock > 0 && (
            <span className="px-2 py-1 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-orange-200 animate-pulse">
              Only a few left!
            </span>
          )}

          {/* Popular Tag */}
          {(product.rating || 4.5) >= 4.8 && (
            <span className="px-2 py-1 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-amber-200">
              Most Popular
            </span>
          )}

          {/* Bestseller Tag */}
          {((product.reviewCount || 0) >= 20 || product.price > 400) && (
            <span className="px-2 py-1 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-blue-200">
              Bestseller
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button 
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist?.(product.id);
          }}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute top-4 right-4 p-3 rounded-2xl shadow-xl transition-all active:scale-90 z-10 ${
            isWishlisted ? 'bg-red-500 text-white' : 'bg-white/80 backdrop-blur-md text-gray-400 hover:text-red-500'
          }`}
        >
          <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-1 gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <Link to={`/product/${product.id}`} className="text-xl font-black text-gray-900 line-clamp-1 group-hover:text-primary transition-colors">
              {product.name}
            </Link>
            <div className="flex items-center gap-1 bg-yellow-400/10 px-2 py-0.5 rounded-lg">
              <Star className="w-3 h-3 text-yellow-500 fill-current" />
              <span className="text-[10px] font-black text-yellow-700">{product.rating || '4.5'}</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
        <div className="flex flex-col">
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-xs font-bold text-gray-400 line-through tracking-tighter">₹{product.originalPrice}</span>
          )}
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-primary tracking-tighter">₹{product.price}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="bg-green-100 text-green-700 text-[10px] font-black px-1.5 py-0.5 rounded-lg uppercase tracking-widest">
                {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
              </span>
            )}
          </div>
          {product.weight && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{product.weight}</span>}
        </div>

          <AnimatePresence mode="wait">
            {quantityInCart > 0 ? (
              <motion.div 
                key="quantity"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2"
              >
                <div className="flex items-center bg-gray-900 rounded-xl p-0.5 shadow-lg shadow-gray-900/20">
                  <button 
                    onClick={() => onRemoveFromCart?.(product.id)}
                    aria-label="Decrease quantity"
                    className="p-1.5 text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-white font-black text-xs" aria-live="polite">{quantityInCart}</span>
                  <button 
                    onClick={() => onAddToCart(product)}
                    aria-label="Increase quantity"
                    className="p-1.5 text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                    disabled={quantityInCart >= product.stock}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-[10px] font-black text-primary uppercase tracking-widest animate-pulse">Added</span>
              </motion.div>
            ) : (
              <motion.button 
                key="add"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => onAddToCart(product)}
                disabled={product.stock <= 0}
                aria-label={`Add ${product.name} to cart`}
                className="p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-90 disabled:opacity-50 group/btn"
              >
                <ShoppingCart className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
