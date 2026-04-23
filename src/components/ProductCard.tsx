import React from 'react';
import { Product } from '../types';
import { ShoppingCart, Plus, Minus, Heart, Star, ShoppingBag, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity?: number) => void;
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
  const [quantity, setQuantity] = React.useState(quantityInCart || 1);

  React.useEffect(() => {
    if (quantityInCart > 0) {
      setQuantity(quantityInCart);
    } else {
      setQuantity(0);
    }
  }, [quantityInCart]);

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

          {/* Tags from Admin */}
          {product.tag && (
            <span className={`px-2 py-1 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg ${
              product.tag === 'Bestseller' ? 'bg-blue-600 shadow-blue-200' :
              product.tag === 'Top Rated' ? 'bg-amber-500 shadow-amber-200' :
              product.tag === 'New Arrival' ? 'bg-green-600 shadow-green-200' :
              'bg-purple-600 shadow-purple-200'
            }`}>
              {product.tag}
            </span>
          )}

          {/* Low Stock Tag */}
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

        <div className="flex flex-col gap-3 pt-4 border-t border-gray-50">
          <div className="flex items-center justify-between">
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

            <div className="flex items-center gap-2">
              {/* Quantity Selector */}
              <div className="flex items-center bg-gray-50 rounded-xl p-0.5 border border-gray-100 group/qty">
                <button 
                  onClick={() => setQuantity(prev => Math.max(0, prev - 1))}
                  className="p-1 px-2 text-gray-400 hover:text-primary transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                
                <div className="relative flex items-center">
                  <input 
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) {
                        setQuantity(Math.min(product.stock, Math.max(0, val)));
                      } else {
                        setQuantity(0);
                      }
                    }}
                    className="w-8 bg-transparent text-center text-[10px] font-black text-gray-700 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <button 
                  onClick={() => setQuantity(prev => (prev === 0 ? 1 : Math.min(product.stock, prev + 1)))}
                  disabled={quantity >= product.stock}
                  className="p-1 px-2 text-gray-400 hover:text-primary transition-colors disabled:opacity-20"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (quantity === 0) {
                    if (quantityInCart > 0 && onRemoveFromCart) {
                      onRemoveFromCart(product.id);
                    }
                    return;
                  }
                  
                  // When item is added, proceed to checkout
                  onAddToCart(product, quantity, true);
                }}
                disabled={product.stock <= 0 && quantity === 0}
                className="p-3 rounded-xl shadow-lg transition-all flex items-center justify-center bg-primary text-white shadow-primary/20 hover:bg-primary-dark"
              >
                {quantity === 0 ? <ShoppingCart className="w-5 h-5" /> : <Check className="w-5 h-5" />}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
