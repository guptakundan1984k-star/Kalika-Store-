import React, { useState, useEffect } from 'react';
import { db, collection, query, onSnapshot, updateDoc, deleteDoc, doc } from '../firebase';
import { Review, Product } from '../types';
import { Check, X, Trash2, Star, Search, Filter, MessageSquare, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminReviewManagerProps {
  products: Product[];
}

export const AdminReviewManager: React.FC<AdminReviewManagerProps> = ({ products }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Load all reviews in real-time
  useEffect(() => {
    const q = query(collection(db, 'reviews'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          productId: data.productId || '',
          userId: data.userId || '',
          userName: data.userName || 'Anonymous',
          rating: data.rating || 5,
          comment: data.comment || '',
          photos: data.photos || [],
          createdAt: data.createdAt || Date.now(),
          orderId: data.orderId || '',
          isCSReview: data.isCSReview || false,
          status: data.status || 'approved' // default existing/historical reviews to approved
        } as Review;
      });
      // Sort reviews by newest first
      setReviews(reviewList.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    }, (error) => {
      console.error("Error loading reviews for moderation:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Update review status
  const handleUpdateStatus = async (reviewId: string, newStatus: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'reviews', reviewId), { status: newStatus });
      
      // Update the product's average rating and reviewCount
      const reviewToUpdate = reviews.find(r => r.id === reviewId);
      if (!reviewToUpdate) return;
      
      // Recalculate average using all approved/non-rejected reviews
      const updatedReviews = reviews.map(r => r.id === reviewId ? { ...r, status: newStatus } : r);
      const activeReviewsForProduct = updatedReviews.filter(r => r.productId === reviewToUpdate.productId && r.status !== 'rejected');
      const newCount = activeReviewsForProduct.length;
      const newRating = newCount > 0 
        ? activeReviewsForProduct.reduce((acc, r) => acc + r.rating, 0) / newCount 
        : 4.5;
        
      await updateDoc(doc(db, 'products', reviewToUpdate.productId), {
        rating: Number(newRating.toFixed(2)),
        reviewCount: newCount
      });
    } catch (error) {
      console.error("Error updating review status:", error);
      alert("Failed to update status. Please check your permissions.");
    }
  };

  // Delete review
  const handleDeleteReview = async (reviewId: string, productId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this review?")) return;
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      
      // Update the product's average rating and reviewCount
      const remainingReviewsForProduct = reviews.filter(r => r.id !== reviewId && r.productId === productId && r.status !== 'rejected');
      const newCount = remainingReviewsForProduct.length;
      const newRating = newCount > 0 
        ? remainingReviewsForProduct.reduce((acc, r) => acc + r.rating, 0) / newCount 
        : 4.5;
        
      await updateDoc(doc(db, 'products', productId), {
        rating: Number(newRating.toFixed(2)),
        reviewCount: newCount
      });
    } catch (error) {
      console.error("Error deleting review:", error);
      alert("Failed to delete review. Please check your permissions.");
    }
  };

  // Find related product details
  const getProduct = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  // Filter and search reviews
  const filteredReviews = reviews.filter(review => {
    const product = getProduct(review.productId);
    const productName = product ? product.name.toLowerCase() : '';
    const userName = review.userName.toLowerCase();
    const comment = review.comment.toLowerCase();
    const matchesSearch = productName.includes(searchQuery.toLowerCase()) || 
                          userName.includes(searchQuery.toLowerCase()) || 
                          comment.includes(searchQuery.toLowerCase()) ||
                          review.productId.includes(searchQuery);
    
    if (statusFilter === 'all') return matchesSearch;
    return review.status === statusFilter && matchesSearch;
  });

  return (
    <div className="space-y-8 p-6 bg-white rounded-[40px] border border-gray-100 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Reviews Moderation</h2>
          <p className="text-sm text-gray-500 font-medium">Moderate customer ratings and written comments. Approved reviews are visible on packaging listings and product pages.</p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Total Feedback</span>
            <span className="text-sm font-black text-gray-900">{reviews.length} Customer Reviews</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by product name, customer name or review text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-medium focus:outline-none focus:border-primary/30 focus:bg-white transition-all shadow-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => {
            const count = filter === 'all' 
              ? reviews.length 
              : reviews.filter(r => r.status === filter).length;
            
            return (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all border-2 active:scale-95 ${
                  statusFilter === filter
                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/10'
                    : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                }`}
              >
                {filter} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Table & List View */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-gray-400 gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-black uppercase tracking-[0.2em] animate-pulse">Scanning database...</span>
        </div>
      ) : filteredReviews.length > 0 ? (
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {filteredReviews.map((review) => {
              const product = getProduct(review.productId);
              
              return (
                <motion.div
                  key={review.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`bg-white rounded-3xl p-6 md:p-8 border shadow-sm relative group flex flex-col md:flex-row gap-6 transition-colors ${
                    review.status === 'pending' ? 'bg-amber-50/20 border-amber-200/50' : 
                    review.status === 'rejected' ? 'bg-red-50/10 border-red-100' : 'border-gray-150'
                  }`}
                >
                  {/* Status Badge */}
                  <div className="absolute top-6 right-6 flex items-center gap-2">
                    <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${
                      review.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                      review.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'
                    }`}>
                      {review.status || 'approved'}
                    </span>
                  </div>

                  {/* Product Image & Info */}
                  <div className="w-full md:w-1/4 flex flex-col gap-3 shrink-0">
                    <div className="aspect-square w-full rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 relative">
                      {product?.image ? (
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <MessageSquare className="w-10 h-10" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 text-sm tracking-tight line-clamp-2">
                        {product ? product.name : `Product ID: ${review.productId}`}
                      </h4>
                      {product && (
                        <span className="text-2xs font-bold text-gray-400 uppercase tracking-widest block mt-0.5">
                          Category: {product.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Review Quality Content */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <div className="flex items-center gap-1 bg-yellow-400/10 px-2.5 py-0.5 rounded-xl">
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                          <span className="text-xs font-black text-yellow-700">{review.rating}</span>
                        </div>
                        <h5 className="font-bold text-gray-900">{review.userName}</h5>
                        {review.isCSReview && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-widest rounded-md border border-blue-100">
                            CS Verified
                          </span>
                        )}
                        <span className="text-2xs font-bold text-gray-400 uppercase tracking-widest">
                          {new Date(review.createdAt).toLocaleDateString()} at {new Date(review.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-gray-700 text-sm font-medium leading-relaxed italic border-l-2 border-gray-200 pl-4 py-1 mb-4">
                        "{review.comment}"
                      </p>

                      {/* Display Photos if any */}
                      {review.photos && review.photos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {review.photos.map((photo, index) => (
                            <a 
                              key={index}
                              href={photo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-100 hover:scale-105 transition-transform"
                            >
                              <img src={photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </a>
                          ))}
                        </div>
                      )}

                      <div className="bg-gray-50 px-4 py-2 rounded-xl text-2xs font-bold text-gray-400 max-w-max flex items-center gap-1.5 border border-gray-100">
                        <span className="text-primary font-black">ORDER ID:</span>
                        <span>{review.orderId || 'Direct Review'}</span>
                      </div>
                    </div>

                    {/* Modification & Moderation Actions */}
                    <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-gray-100 justify-end">
                      {review.status !== 'approved' && (
                        <button
                          onClick={() => handleUpdateStatus(review.id, 'approved')}
                          className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-green-500/10"
                        >
                          <Check className="w-4 h-4" />
                          Approve Review
                        </button>
                      )}
                      
                      {review.status !== 'rejected' && (
                        <button
                          onClick={() => handleUpdateStatus(review.id, 'rejected')}
                          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-amber-500/10"
                        >
                          <X className="w-4 h-4" />
                          Reject / Hide
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteReview(review.id, review.productId)}
                        className="flex items-center gap-1.5 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border border-red-200"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Permanently
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-4">
          <AlertCircle className="w-12 h-12 text-gray-300" />
          <div>
            <h4 className="text-lg font-black text-gray-400">No Reviews Found</h4>
            <p className="text-xs font-medium text-gray-400 max-w-sm mx-auto mt-1">There are no reviews matching the current status filter or search parameters.</p>
          </div>
        </div>
      )}
    </div>
  );
};
