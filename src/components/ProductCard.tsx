import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { ShoppingCart, Plus, Minus, Heart, Star, ShoppingBag, Check, Tag, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { useStore } from '../contexts/StoreContext';
import { aiService } from '../services/aiService';

import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity?: number, redirectToCheckout?: boolean, selectedUnit?: string) => void;
  quantityInCart?: number;
  onRemoveFromCart?: (id: string) => void;
  toggleWishlist?: (productId: string) => void;
  isWishlisted?: boolean;
}

const UNITS = ['Kilogram', 'Gram', 'Litre', 'Millilitre', 'Piece', 'Box', 'Pack', 'Dozen'];

export const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onAddToCart, 
  quantityInCart = 0,
  toggleWishlist,
  isWishlisted = false,
}) => {
  const { settings, user } = useStore();
  const isPreOrder = settings && !settings.isFunctionallyOpen;

  const [localQuantity, setLocalQuantity] = useState<string>('1');
  const [localUnit, setLocalUnit] = useState<string>('');
  const [showUnitSelector, setShowUnitSelector] = useState(false);
  const [isAiPredicting, setIsAiPredicting] = useState(false);

  // AI Prediction for Unit
  useEffect(() => {
    const predict = async () => {
      setIsAiPredicting(true);
      try {
        const result = await aiService.predictProductUnit(product.name, product.description || '');
        setLocalUnit(result.unit);
        setLocalQuantity(result.quantity.toString());
      } catch (error) {
        setLocalUnit('Piece');
      } finally {
        setIsAiPredicting(false);
      }
    };
    predict();
  }, [product.name, product.description]);

  const finalPrice = (user?.customPrices?.[product.id]) ?? product.price;
  const hasCustomPrice = user?.customPrices?.[product.id] !== undefined;

  const handleAdd = () => {
    const q = parseFloat(localQuantity);
    if (isNaN(q) || q <= 0) {
      alert("Please enter a valid quantity");
      return;
    }
    if (!localUnit) {
      alert("Please select a unit");
      setShowUnitSelector(true);
      return;
    }
    onAddToCart(product, q, false, localUnit);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="bg-white rounded-[32px] overflow-hidden group relative flex flex-col h-full transition-all duration-300 border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50"
    >
      {/* Image Container */}
      <div className="aspect-square relative bg-[#F9FAFB] rounded-[32px] overflow-hidden group-hover:bg-gray-50 transition-colors">
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

      {/* Content Section */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <Link to={`/product/${product.id}`} className="text-[14px] font-black text-gray-900 line-clamp-2 leading-snug tracking-tight">
          {product.name}
        </Link>

        {/* Price & Quantity Row */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[16px] font-black text-gray-900 leading-none">₹{finalPrice}</span>
              {hasCustomPrice && (
                <div className="bg-primary/10 text-primary p-0.5 rounded-md">
                  <Tag className="w-2.5 h-2.5" />
                </div>
              )}
            </div>
            <span className="text-[10px] font-bold text-gray-400 mt-1">{product.weight}</span>
          </div>
        </div>

        {/* New Quantity & Unit Selector */}
        <div className="mt-2 space-y-2">
          <div className="flex items-stretch gap-1 h-10">
            <input 
              type="text"
              inputMode="decimal"
              value={localQuantity}
              onChange={(e) => setLocalQuantity(e.target.value)}
              className="flex-1 min-w-0 bg-gray-50 border-2 border-gray-100 rounded-xl px-3 text-sm font-black text-gray-900 focus:border-[#00AEEF] focus:outline-none transition-colors"
              placeholder="Qty"
            />
            
            <div className="relative">
              <button 
                onClick={() => setShowUnitSelector(!showUnitSelector)}
                className={`h-full px-3 flex items-center gap-1 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all border-2 ${
                  localUnit 
                    ? 'bg-[#00AEEF]/10 border-[#00AEEF]/20 text-[#00AEEF]' 
                    : 'bg-blue-600 border-blue-600 text-white'
                }`}
              >
                {localUnit || 'Unit'}
                <ChevronDown className={`w-3 h-3 transition-transform ${showUnitSelector ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showUnitSelector && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowUnitSelector(false)} 
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full right-0 mb-2 z-50 w-32 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                    >
                      <div className="max-h-48 overflow-y-auto py-1">
                        {UNITS.map(unit => (
                          <button
                            key={unit}
                            onClick={() => {
                              setLocalUnit(unit);
                              setShowUnitSelector(false);
                            }}
                            className={`w-full px-4 py-2 text-left text-[11px] font-black uppercase tracking-tight hover:bg-gray-50 transition-colors ${
                              localUnit === unit ? 'text-[#00AEEF] bg-[#00AEEF]/5' : 'text-gray-600'
                            }`}
                          >
                            {unit}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          <button 
            onClick={handleAdd}
            className="w-full bg-[#00AEEF] text-white py-2.5 rounded-xl font-black text-[12px] uppercase tracking-[0.2em] shadow-lg shadow-[#00AEEF]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            {isPreOrder ? 'Pre-order' : 'Add to cart'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
