import React from 'react';
import { Product } from '../types';
import { Heart, ShoppingCart, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';


interface WishlistProps {
  products: Product[];
  wishlist: string[];
  onAddToCart: (product: Product) => void;
  toggleWishlist: (productId: string) => void;
}

const Wishlist: React.FC<WishlistProps> = ({ products, wishlist, onAddToCart, toggleWishlist }) => {
  const navigate = useNavigate();
  const wishlistedProducts = products.filter(p => wishlist.includes(p.id));

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-[24px] flex items-center justify-center text-red-500 shadow-xl shadow-red-500/10">
                <Heart className="w-8 h-8 fill-current" />
              </div>
              <h1 className="text-5xl font-black text-gray-900 tracking-tighter leading-tight">
                My Wishlist
              </h1>
            </div>
            <p className="text-lg text-gray-500 font-medium max-w-md">
              Items you've saved for later. Grab them before they go out of stock!
            </p>
          </div>
          
          <Link 
            to="/products"
            className="flex items-center gap-3 bg-white px-8 py-4 rounded-2xl font-black text-gray-900 border border-gray-100 shadow-xl shadow-gray-200/50 hover:bg-gray-50 transition-all active:scale-95 group"
          >
            Continue Shopping
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {wishlistedProducts.length > 0 ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            <AnimatePresence mode="popLayout">
              {wishlistedProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-[40px] overflow-hidden border border-gray-100 shadow-xl shadow-gray-200/50 group relative flex flex-col"
                >
                  <div className="aspect-square overflow-hidden relative">
                    {product.image && (
                      <img 
                        src={product.image || undefined} 
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <button 
                      onClick={() => toggleWishlist(product.id)}
                      className="absolute top-4 right-4 p-3 bg-red-500 text-white rounded-2xl shadow-xl transition-all active:scale-90"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-white/80 backdrop-blur-md text-gray-900 text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                        {product.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-1 gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-gray-900 mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-500 font-medium line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                      <div className="flex flex-col">
                        <span className="text-2xl font-black text-primary tracking-tighter">₹{product.price}</span>
                        {product.weight && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{product.weight}</span>}
                      </div>
                      
                      <button 
                        onClick={() => onAddToCart(product)}
                        disabled={product.stock <= 0}
                        className="p-4 bg-primary text-white rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-90 disabled:opacity-50"
                      >
                        <ShoppingCart className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ) : (
          <div className="text-center py-32 bg-white rounded-[60px] border border-dashed border-gray-200 shadow-2xl shadow-gray-200/20">
            <div className="w-24 h-24 bg-gray-50 rounded-[40px] flex items-center justify-center text-gray-200 mx-auto mb-8 shadow-inner">
              <ShoppingBag className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Your wishlist is empty</h2>
            <p className="text-lg text-gray-400 font-medium max-w-md mx-auto mb-12">
              Explore our fresh collection and save your favorites here!
            </p>
            <button 
              onClick={() => navigate('/products')}
              className="bg-primary text-white font-black px-12 py-5 rounded-[24px] shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95"
            >
              Start Shopping
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
