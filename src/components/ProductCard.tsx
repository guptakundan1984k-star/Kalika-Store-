import React, { useState, useEffect, memo } from 'react';
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

// Simple static cache for AI results to make UI "too fast"
const aiCache: Record<string, { unit: string; quantity: string }> = {};

const ProductCardComponent: React.FC<ProductCardProps> = ({ 
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
    const productName = product.name;
    const itemInCart = quantityInCart > 0 ? true : false;
    
    // If it's already in cart, we should probably prefer the unit already there
    // But ProductCard doesn't receive the full cart item, just quantity.
    // However, we can improve this by allowing ProductCard to find its own unit from cart if needed,
    // though that might be messy. For now, let's just make sure increments work.

    if (aiCache[productName]) {
      setLocalUnit(aiCache[productName].unit);
      setLocalQuantity(aiCache[productName].quantity);
      return;
    }

    const predict = async () => {
      setIsAiPredicting(true);
      try {
        const result = await aiService.predictProductUnit(product.name, product.description || '');
        setLocalUnit(result.unit);
        setLocalQuantity(result.quantity.toString());
        aiCache[productName] = { 
          unit: result.unit, 
          quantity: result.quantity.toString() 
        };
      } catch (error) {
        setLocalUnit('Piece');
      } finally {
        setIsAiPredicting(false);
      }
    };
    predict();
  }, [product.name, product.description]);

  const getRelevantTags = () => {
    const tags: string[] = [];
    const name = product.name.toLowerCase();
    const cat = product.category.toLowerCase();
    
    if (product.tag === 'Bestseller') tags.push('Bestseller');
    
    // Organic check
    if (cat.includes('fresh') || cat.includes('vegetable') || cat.includes('fruit') || name.includes('organic') || name.includes('pure')) {
      tags.push('Organic');
    }
    
    // Imported check
    if (name.includes('imported') || name.includes('premium') || name.includes('exotic') || name.includes('royal')) {
      tags.push('Imported');
    }
    
    // Daily Essentials
    if (cat.includes('grocery') || cat.includes('staples') || cat.includes('dairy') || name.includes('milk') || name.includes('rice') || name.includes('oil')) {
      tags.push('Daily Essentials');
    }
    
    // Seasonal
    if (name.includes('mango') || name.includes('winter') || name.includes('summer') || name.includes('festival') || name.includes('diwali')) {
      tags.push('Seasonal');
    }

    // Add any existing tags from the product data
    if (product.tags) {
      product.tags.forEach(t => {
        if (!tags.includes(t)) tags.push(t);
      });
    }

    return tags.slice(0, 3); // Max 3 tags
  };

  const relevantTags = getRelevantTags();

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
      whileTap={{ scale: 0.98 }}
      viewport={{ once: true }}
      className="bg-white rounded-[32px] overflow-hidden group relative flex flex-col h-full transition-all duration-300 border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50"
    >
      {/* Image Container */}
      <div className="aspect-square relative bg-[#F9FAFB] rounded-[32px] overflow-hidden group-hover:bg-gray-50 transition-colors">
        {quantityInCart > 0 && (
          <div className="absolute top-4 left-4 z-10 bg-green-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 animate-in fade-in zoom-in duration-300">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>{quantityInCart} Added</span>
          </div>
        )}
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
            hasManualPhoto={product.hasManualPhoto}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105 rounded-2xl"
          />
        </Link>
      </div>

      {/* Content Section */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        {/* Tags Row */}
        {relevantTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {relevantTags.map(tag => (
              <span 
                key={tag} 
                className={`text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full ${
                  tag === 'Bestseller' ? 'bg-orange-500 text-white' : 
                  tag === 'Organic' ? 'bg-green-500 text-white' :
                  tag === 'Imported' ? 'bg-purple-600 text-white' :
                  tag === 'Seasonal' ? 'bg-blue-500 text-white' :
                  'bg-gray-100 text-gray-500'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        <Link to={`/product/${product.id}`} className="text-[14px] font-black text-gray-900 line-clamp-2 leading-snug tracking-tight">
          {product.name}
        </Link>
        
        {/* Rating Display */}
        <div className="flex items-center gap-1">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className={`w-2.5 h-2.5 ${i < Math.floor(product.rating || 4.5) ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} 
              />
            ))}
          </div>
          <span className="text-[10px] font-bold text-gray-400">({product.reviewCount || 0})</span>
        </div>

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
          {quantityInCart > 0 ? (
            <div className="space-y-2 animate-in fade-in zoom-in duration-300">
              <div className="flex items-center bg-[#00AEEF] rounded-xl p-1 border border-[#00AEEF] shadow-lg shadow-[#00AEEF]/20 h-11 transition-all">
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAddToCart(product, -1, false, localUnit);
                  }}
                  className="w-9 h-9 flex items-center justify-center bg-white/20 rounded-lg hover:bg-white/30 transition-all active:scale-90 text-white"
                >
                  <Minus className="w-4 h-4 stroke-[3]" />
                </button>
                <div className="flex-1 text-center flex flex-col items-center justify-center -space-y-1">
                  <span className="text-[14px] font-black text-white leading-none">{quantityInCart}</span>
                  {localUnit && <span className="text-[8px] font-bold text-white/70 uppercase tracking-tighter">{localUnit}</span>}
                </div>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAddToCart(product, 1, false, localUnit);
                  }}
                  className="w-9 h-9 flex items-center justify-center bg-white/20 rounded-lg hover:bg-white/30 transition-all active:scale-90 text-white"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                </button>
              </div>

              <Link 
                to="/cart"
                className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-xl font-black text-[11px] uppercase tracking-wider shadow-lg shadow-green-500/15 hover:scale-[1.01] active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
              >
                <span>{quantityInCart} Added! Go to Cart</span>
                <span className="animate-pulse">→</span>
              </Link>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const ProductCard = memo(ProductCardComponent);
