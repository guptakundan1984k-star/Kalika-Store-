import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Product, Review, UserProfile } from '../types';
import { 
  Star, ShoppingCart, Heart, ArrowLeft, ShieldCheck, 
  Truck, Clock, MessageSquare, Send, User, Trash2, Plus, Minus, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AdSlot } from '../components/AdSlot';
import { db, collection, query, where, onSnapshot, addDoc, Timestamp, deleteDoc, doc, getDocs } from '../firebase';
import { Logo } from '../components/Logo';

interface ProductDetailProps {
  products: Product[];
  onAddToCart: (product: Product, quantity?: number, redirectToCheckout?: boolean) => void;
  toggleWishlist: (productId: string) => void;
  wishlist: string[];
  user: UserProfile | null;
  storeSettings: any;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ products, onAddToCart, toggleWishlist, wishlist, user, storeSettings }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const product = products.find(p => p.id === id);
  
  const finalPrice = user?.customPrices?.[product?.id || ''] ?? product?.price ?? 0;
  const hasCustomPrice = user?.customPrices?.[product?.id || ''] !== undefined;
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [hasOrdered, setHasOrdered] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVariations, setSelectedVariations] = useState<{
    size?: string;
    color?: string;
    flavor?: string;
  }>({});
  const [quantity, setQuantity] = useState(1);

  const isWishlisted = wishlist.includes(id || '');

  useEffect(() => {
    if (product?.variations) {
      setSelectedVariations({
        size: product.variations.sizes?.[0],
        color: product.variations.colors?.[0],
        flavor: product.variations.flavors?.[0]
      });
    }
  }, [product]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, 'reviews'), where('productId', '==', id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
      setReviews(reviewList.sort((a, b) => b.createdAt - a.createdAt));
    }, (error) => {
      console.error("Error listening to reviews:", error);
    });
    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!id || !user || !user.uid) {
      setHasOrdered(false);
      return;
    }

    const checkOrder = async () => {
      try {
        const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const orders = querySnapshot.docs.map(doc => doc.data());
        const ordered = orders.some(order => 
          order.items?.some((item: any) => item.id === id)
        );
        setHasOrdered(ordered);
      } catch (error) {
        console.error("Error checking order status:", error);
      }
    };

    checkOrder();
  }, [id, user]);

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        productId: id,
        userId: user.uid,
        userName: user.name,
        rating: newReview.rating,
        comment: newReview.comment,
        createdAt: Date.now()
      });
      setNewReview({ rating: 5, comment: '' });
    } catch (error) {
      console.error("Error adding review:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
    } catch (error) {
      console.error("Error deleting review:", error);
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <Logo className="mb-8" />
        <h2 className="text-2xl font-black text-gray-900 mb-4">Product Not Found</h2>
        <button onClick={() => navigate('/products')} className="text-primary font-bold flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" /> Back to Products
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <button 
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-gray-500 font-bold hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image Section */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="aspect-square bg-white rounded-[40px] overflow-hidden shadow-2xl shadow-gray-200/50 group relative">
              {product.image && (
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
              )}
              <button 
                onClick={() => toggleWishlist(product.id)}
                className={`absolute top-6 right-6 p-4 rounded-2xl shadow-xl transition-all active:scale-90 ${
                  isWishlisted ? 'bg-red-500 text-white' : 'bg-white/80 backdrop-blur-md text-gray-400 hover:text-red-500'
                }`}
              >
                <Heart className={`w-6 h-6 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>
          </motion.div>

          {/* Info Section */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full">
                  {product.category}
                </span>

                {/* Status and Low Stock Tag */}
                {product.stock > 0 ? (
                  <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${
                    product.stock <= 10 ? 'bg-orange-50 text-orange-600 animate-pulse border border-orange-100' : 'bg-green-50 text-green-600'
                  }`}>
                    {product.stock <= 10 ? 'Only a few left!' : 'In Stock'}
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                    Out of Stock
                  </span>
                )}

                {/* Imported Tag */}
                {(product.name.toLowerCase().includes('redbull') || 
                  product.name.toLowerCase().includes('monster') || 
                  product.name.toLowerCase().includes('imported') ||
                  product.name.toLowerCase().includes('swiss')) && (
                  <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-indigo-200">
                    Imported
                  </span>
                )}

                {/* Popular Tag */}
                {(product.rating || 4.5) >= 4.8 && (
                  <span className="px-3 py-1 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-amber-200">
                    Most Popular
                  </span>
                )}

                {/* Bestseller Tag */}
                {((reviews.length || product.reviewCount || 0) >= 20 || product.price > 400) && (
                  <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-blue-200">
                    Bestseller
                  </span>
                )}
              </div>
              <h1 className="text-5xl font-black text-gray-900 leading-tight tracking-tighter">
                {product.name}
              </h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 bg-yellow-400/10 px-3 py-1 rounded-xl">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-sm font-black text-yellow-700">{product.rating || '4.5'}</span>
                </div>
                <span className="text-sm font-bold text-gray-400">({reviews.length} Reviews)</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {product.originalPrice && product.originalPrice > finalPrice && (
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-gray-400 line-through tracking-tighter">₹{product.originalPrice}</span>
                  <span className="bg-green-100 text-green-700 text-xs font-black px-2 py-1 rounded-xl uppercase tracking-widest">
                    {Math.round(((product.originalPrice - finalPrice) / product.originalPrice) * 100)}% OFF
                  </span>
                </div>
              )}
              <div className="flex items-baseline gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-5xl font-black text-primary tracking-tighter">₹{finalPrice}</span>
                  {hasCustomPrice && (
                    <div className="bg-primary/10 text-primary px-3 py-1 rounded-xl flex items-center gap-2 border border-primary/20">
                      <Tag className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Party Rate</span>
                    </div>
                  )}
                </div>
                {product.weight && <span className="text-lg font-bold text-gray-400">/ {product.weight}</span>}
              </div>
            </div>

            <p className="text-lg text-gray-500 font-medium leading-relaxed">
              {product.description}
            </p>

            {/* Variations Selectors */}
            <div className="space-y-8">
              {/* Quantity Selection */}
              <div className="space-y-4">
                <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Quantity</label>
                <div className="flex items-center gap-6">
                  <div className="flex items-center bg-white border-2 border-gray-100 rounded-2xl p-1 shadow-sm">
                    <button 
                      onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                      className="p-3 hover:bg-gray-50 rounded-xl transition-colors text-gray-400 hover:text-primary"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <span className="w-12 text-center text-lg font-black text-gray-900">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(prev => Math.min(product.stock, prev + 1))}
                      disabled={quantity >= product.stock}
                      className="p-3 hover:bg-gray-50 rounded-xl transition-colors text-gray-400 hover:text-primary disabled:opacity-20"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  {quantity >= product.stock && (
                    <span className="text-xs font-bold text-orange-500 uppercase tracking-widest animate-pulse">Max Stock Reached</span>
                  )}
                </div>
              </div>

              {product.variations && (
              <div className="space-y-6">
                {product.variations.sizes && product.variations.sizes.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Select Size</label>
                    <div className="flex flex-wrap gap-3">
                      {product.variations.sizes.map(size => (
                        <button
                          key={size}
                          onClick={() => setSelectedVariations(prev => ({ ...prev, size }))}
                          className={`px-6 py-3 rounded-2xl text-sm font-black transition-all border-2 ${
                            selectedVariations.size === size 
                              ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                              : 'bg-white border-gray-100 text-gray-600 hover:border-primary/30'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {product.variations.colors && product.variations.colors.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Select Color</label>
                    <div className="flex flex-wrap gap-3">
                      {product.variations.colors.map(color => (
                        <button
                          key={color}
                          onClick={() => setSelectedVariations(prev => ({ ...prev, color }))}
                          className={`px-6 py-3 rounded-2xl text-sm font-black transition-all border-2 ${
                            selectedVariations.color === color 
                              ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                              : 'bg-white border-gray-100 text-gray-600 hover:border-primary/30'
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {product.variations.flavors && product.variations.flavors.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Select Flavor</label>
                    <div className="flex flex-wrap gap-3">
                      {product.variations.flavors.map(flavor => (
                        <button
                          key={flavor}
                          onClick={() => setSelectedVariations(prev => ({ ...prev, flavor }))}
                          className={`px-6 py-3 rounded-2xl text-sm font-black transition-all border-2 ${
                            selectedVariations.flavor === flavor 
                              ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                              : 'bg-white border-gray-100 text-gray-600 hover:border-primary/30'
                          }`}
                        >
                          {flavor}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900">Free Delivery</h4>
                  <p className="text-xs font-bold text-gray-400">On orders above ₹199</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900">Fast Delivery</h4>
                  <p className="text-xs font-bold text-gray-400">Doorstep service</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={() => {
                  onAddToCart({ 
                    ...product, 
                    selectedVariations
                  } as any, quantity, true);
                }}
                disabled={product.stock <= 0}
                className="flex-1 flex items-center justify-center gap-3 font-black px-8 py-5 rounded-[24px] shadow-2xl transition-all active:scale-95 bg-primary text-white shadow-primary/30 hover:bg-primary-dark"
              >
                <ShoppingCart className="w-6 h-6" />
                Add to Cart
              </button>

              <button 
                onClick={() => {
                  onAddToCart({ 
                    ...product, 
                    selectedVariations
                  } as any, quantity, true);
                }}
                disabled={product.stock <= 0}
                className="flex-1 flex items-center justify-center gap-3 font-black px-8 py-5 rounded-[24px] shadow-2xl transition-all active:scale-95 bg-gray-900 text-white shadow-xl shadow-gray-200 hover:bg-black"
              >
                Buy Now
              </button>
            </div>
          </motion.div>
        </div>

        <AdSlot className="my-12" />

        {/* Reviews Section */}
        <div className="mt-24 grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-1 space-y-8">
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">Customer Reviews</h3>
            
            {user ? (
              hasOrdered ? (
                <form onSubmit={handleAddReview} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/50 space-y-6">
                  <h4 className="text-lg font-black text-gray-900">Write a Review</h4>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewReview({ ...newReview, rating: star })}
                          className={`p-2 rounded-xl transition-all ${
                            newReview.rating >= star ? 'bg-yellow-400 text-white' : 'bg-gray-50 text-gray-300'
                          }`}
                        >
                          <Star className={`w-6 h-6 ${newReview.rating >= star ? 'fill-current' : ''}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Your Comment</label>
                    <textarea 
                      required
                      value={newReview.comment}
                      onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                      placeholder="Tell us what you think..."
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all min-h-[120px]"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white font-black px-8 py-4 rounded-2xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Posting...' : 'Post Review'}
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              ) : (
                <div className="bg-orange-50 p-8 rounded-[32px] border border-orange-100 text-center space-y-4">
                  <ShieldCheck className="w-12 h-12 text-orange-500 mx-auto" />
                  <h4 className="text-lg font-black text-gray-900">Order to Review</h4>
                  <p className="text-sm font-medium text-gray-500">You can only review products you have purchased from our store.</p>
                  <button 
                    disabled
                    className="w-full bg-gray-200 text-gray-400 font-black py-4 rounded-2xl cursor-not-allowed"
                  >
                    Purchase Required
                  </button>
                </div>
              )
            ) : (
              <div className="bg-primary/5 p-8 rounded-[32px] border border-primary/10 text-center space-y-4">
                <MessageSquare className="w-12 h-12 text-primary mx-auto" />
                <h4 className="text-lg font-black text-gray-900">Sign in to Review</h4>
                <p className="text-sm font-medium text-gray-500">Share your experience with other shoppers.</p>
                <button 
                  onClick={() => navigate('/login')}
                  className="w-full bg-primary text-white font-black py-4 rounded-2xl"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <motion.div 
                  key={review.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm group relative"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <h5 className="font-black text-gray-900">{review.userName}</h5>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={`star-${review.id}-${i}`} 
                              className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-600 font-medium leading-relaxed">
                    {review.comment}
                  </p>
                  
                  {user && (user.uid === review.userId || user.role === 'admin') && (
                    <button 
                      onClick={() => handleDeleteReview(review.id)}
                      className="absolute top-8 right-8 p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </motion.div>
              ))
            ) : (
              <div className="text-center py-24 bg-white rounded-[40px] border border-dashed border-gray-200">
                <MessageSquare className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h4 className="text-xl font-black text-gray-400">No reviews yet</h4>
                <p className="text-sm font-medium text-gray-400">Be the first to review this product!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
