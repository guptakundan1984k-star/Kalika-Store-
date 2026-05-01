import React from 'react';
import { Product } from '../types';
import { ShoppingCart, Plus, Minus, Heart, Star, ShoppingBag, Check, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { useStore } from '../contexts/StoreContext';

import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity?: number, redirectToCheckout?: boolean) => void;
  quantityInCart?: number;
  onRemoveFromCart?: (id: string) => void;
  toggleWishlist?: (productId: string) => void;
  isWishlisted?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onAddToCart, 
  quantityInCart = 0,
  toggleWishlist,
  isWishlisted = false,
}) => {
  const { settings, user } = useStore();
  const isPreOrder = settings && !settings.isFunctionallyOpen;

  const finalPrice = (user?.customPrices?.[product.id]) ?? product.price;
  const hasCustomPrice = user?.customPrices?.[product.id] !== undefined;

  const discount = product.originalPrice && product.originalPrice > finalPrice 
    ? Math.round(((product.originalPrice - finalPrice) / product.originalPrice) * 100)
    : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="bg-white rounded-[32px] overflow-hidden group relative flex flex-col h-full transition-all duration-300"
    >
      {/* Image Container with rounded top corners as per screenshot */}
      <div className="aspect-square relative bg-[#F9FAFB] rounded-[32px] overflow-hidden group-hover:bg-gray-50 transition-colors">
        {/* Wishlist Heart Icon (Matched to screenshot) */}
        <button 
          className={`absolute top-4 right-4 z-10 bg-white p-2 rounded-full border-2 border-gray-100 shadow-md transition-colors ${
            isWishlisted ? 'text-red-500 border-red-100' : 'text-gray-400 hover:text-red-500'
          }`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist?.(product.id);
          }}
        >
          <Heart className={`w-5 h-5 stroke-[2] ${isWishlisted ? 'fill-current' : ''}`} />
        </button>

        <Link to={`/product/${product.id}`} className="block w-full h-full p-4">
          <ProductImage 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105 rounded-2xl"
          />
        </Link>
      </div>

      {/* Content Section (Matched to screenshot) */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <Link to={`/product/${product.id}`} className="text-[14px] font-black text-gray-900 line-clamp-2 leading-snug tracking-tight">
          {product.name}
        </Link>

        {/* Rating Summary */}
        <div className="flex items-center gap-1.5 -mt-1">
          <div className="flex items-center gap-0.5 px-2 py-0.5 bg-yellow-400/10 rounded-full">
            <Star className="w-2.5 h-2.5 text-yellow-500 fill-current" />
            <span className="text-[10px] font-black text-yellow-700">{product.rating || '4.5'}</span>
          </div>
          <span className="text-[10px] font-bold text-gray-300">({product.reviewCount || '20'}+ reviews)</span>
        </div>
        
        <div className="flex items-center justify-between mt-auto">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[16px] font-black text-gray-900 leading-none">₹{finalPrice}</span>
              {hasCustomPrice && (
                <div className="bg-primary/10 text-primary p-0.5 rounded-md" title="Special Party Rate">
                  <Tag className="w-2.5 h-2.5" />
                </div>
              )}
            </div>
            <span className="text-[10px] font-bold text-gray-400 mt-1">{product.weight}</span>
          </div>

          <AnimatePresence mode="wait">
            {quantityInCart === 0 ? (
              <motion.button 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => onAddToCart(product, 1)}
                className="bg-white border-2 border-[#00AEEF] text-[#00AEEF] px-5 py-1.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-sm hover:bg-[#00AEEF] hover:text-white transition-all transform active:scale-90"
              >
                {isPreOrder ? 'Pre-order' : 'Add'}
              </motion.button>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center bg-[#00AEEF] rounded-xl p-0.5 shadow-md"
              >
                <button 
                  onClick={() => onAddToCart(product, -1)}
                  className="p-1 px-2.5 text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Minus className="w-4 h-4 stroke-[3]" />
                </button>
                <span className="w-8 text-center text-sm font-black text-white">{quantityInCart}</span>
                <button 
                  onClick={() => onAddToCart(product, 1)}
                  className="p-1 px-2.5 text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
