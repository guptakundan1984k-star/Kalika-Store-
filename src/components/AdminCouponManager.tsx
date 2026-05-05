import React, { useState, useMemo } from 'react';
import { Plus, Search, Tag, Trash2, Edit2, Percent, DollarSign, Clock, X, Check, AlertCircle } from 'lucide-react';
import { Coupon, Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface AdminCouponManagerProps {
  coupons: Coupon[];
  products: Product[];
  onAdd: (coupon: Partial<Coupon>) => void;
  onUpdate: (id: string, coupon: Partial<Coupon>) => void;
  onDelete: (id: string) => void;
}

export const AdminCouponManager: React.FC<AdminCouponManagerProps> = ({ coupons, products, onAdd, onUpdate, onDelete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newCoupon, setNewCoupon] = useState<Partial<Coupon>>({
    code: '',
    discount: 0,
    type: 'percentage',
    minOrder: 0,
    maxDiscount: 0,
    expiryDate: Date.now() + 30 * 24 * 60 * 60 * 1000, 
    usageLimit: 0,
    usageLimitPerCustomer: 1,
    status: 'active',
    eligibleProducts: []
  });

  const isEditing = editingId !== null;
  const currentCoupon = isEditing ? coupons.find(c => c.id === editingId) : null;

  const handleOpenEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setNewCoupon({ ...coupon });
    setIsAdding(true);
  };

  const handleClose = () => {
    setIsAdding(false);
    setEditingId(null);
    setNewCoupon({
      code: '',
      discount: 0,
      type: 'percentage',
      minOrder: 0,
      maxDiscount: 0,
      expiryDate: Date.now() + 30 * 24 * 60 * 60 * 1000, 
      usageLimit: 0,
      usageLimitPerCustomer: 1,
      status: 'active',
      eligibleProducts: []
    });
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
      !newCoupon.eligibleProducts?.includes(p.id)
    ).slice(0, 10);
  }, [searchQuery, products, newCoupon.eligibleProducts]);

  const addProductToEligible = (productId: string) => {
    setNewCoupon(prev => ({
      ...prev,
      eligibleProducts: [...(prev.eligibleProducts || []), productId]
    }));
    setSearchQuery('');
  };

  const removeProductFromEligible = (productId: string) => {
    setNewCoupon(prev => ({
      ...prev,
      eligibleProducts: prev.eligibleProducts?.filter(id => id !== productId)
    }));
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Product-Specific Coupons</h2>
          <p className="text-sm text-gray-500 font-medium">Create targeted discounts for specific inventory items.</p>
        </div>
        
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 font-bold"
        >
          <Plus className="w-5 h-5" />
          Create New Coupon
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-hide">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
          {coupons.map((coupon) => (
            <div key={coupon.id} className={`bg-white p-6 rounded-3xl shadow-sm border transition-all group relative overflow-hidden ${coupon.status === 'inactive' ? 'opacity-60 grayscale border-gray-200' : 'border-gray-100 shadow-md'}`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:scale-110" />
              
              <div className="flex items-start justify-between mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${coupon.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  <Tag className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${coupon.status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {coupon.status}
                  </span>
                  <button 
                    onClick={() => handleOpenEdit(coupon)}
                    className="p-2 text-gray-300 hover:text-primary hover:bg-primary/5 rounded-xl transition-all active:scale-95"
                    title="Edit Coupon"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => onDelete(coupon.id)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"
                    title="Delete Coupon"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Coupon Code</span>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">{coupon.code}</h3>
                </div>

                {coupon.eligibleProducts && coupon.eligibleProducts.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                      {coupon.eligibleProducts.length} Eligible Items
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {coupon.eligibleProducts.slice(0, 3).map(id => {
                        const p = products.find(prod => prod.id === id);
                        return (
                          <span key={id} className="text-[8px] bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full text-gray-600 truncate max-w-[100px]">
                            {p?.name || 'Deleted Product'}
                          </span>
                        );
                      })}
                      {coupon.eligibleProducts.length > 3 && (
                        <span className="text-[8px] text-gray-400 font-bold">+{coupon.eligibleProducts.length - 3} more</span>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type & Value</span>
                    <span className="text-lg font-black text-primary">
                      {coupon.type === 'percentage' ? `${coupon.discount}%` : `₹${coupon.discount}`}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Min Order: ₹{coupon.minOrder || 0}</span>
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expires</span>
                    <span className={`text-[10px] font-bold ${coupon.expiryDate && coupon.expiryDate < Date.now() ? 'text-red-500' : 'text-gray-700'}`}>
                      {coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString() : 'Never'}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">{coupon.usageLimitPerCustomer || 1} Per User</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-8 bg-primary flex items-center justify-between text-white flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Tag className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">{isEditing ? 'Edit Coupon' : 'Create Coupon'}</h3>
                    <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Amazon-Style Redemption Logic</p>
                  </div>
                </div>
                <button onClick={handleClose} className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-full transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-hide">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column: Basic Details */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Coupon Code</label>
                      <input 
                        type="text" 
                        value={newCoupon.code}
                        onChange={(e) => setNewCoupon(prev => ({ ...prev, code: e.target.value.toUpperCase().replace(/\s+/g, '') }))}
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-black tracking-[0.2em] focus:ring-4 focus:ring-primary/10 transition-all outline-none focus:border-primary"
                        placeholder="E.G. RAMADAN2024"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Type</label>
                        <select 
                          value={newCoupon.type}
                          onChange={(e) => setNewCoupon(prev => ({ ...prev, type: e.target.value as any }))}
                          className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none focus:border-primary appearance-none cursor-pointer"
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Flat Amount (₹)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Value</label>
                        <input 
                          type="number" 
                          value={newCoupon.discount || ''}
                          onChange={(e) => setNewCoupon(prev => ({ ...prev, discount: parseFloat(e.target.value) }))}
                          className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-black focus:ring-4 focus:ring-primary/10 transition-all outline-none focus:border-primary"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Min. Spend (₹)</label>
                        <input 
                          type="number" 
                          value={newCoupon.minOrder || ''}
                          onChange={(e) => setNewCoupon(prev => ({ ...prev, minOrder: parseFloat(e.target.value) }))}
                          className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none focus:border-primary"
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Max Cap (₹)</label>
                        <input 
                          type="number" 
                          value={newCoupon.maxDiscount || ''}
                          onChange={(e) => setNewCoupon(prev => ({ ...prev, maxDiscount: parseFloat(e.target.value) }))}
                          className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none focus:border-primary"
                          placeholder="No Limit"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Expiry</label>
                        <input 
                          type="date" 
                          value={newCoupon.expiryDate ? new Date(newCoupon.expiryDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => setNewCoupon(prev => ({ ...prev, expiryDate: new Date(e.target.value).getTime() }))}
                          className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-[10px] font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none focus:border-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Status</label>
                        <div className="flex bg-gray-50 rounded-2xl p-1 border-2 border-gray-100">
                          <button 
                            onClick={() => setNewCoupon(prev => ({ ...prev, status: 'active' }))}
                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${newCoupon.status === 'active' ? 'bg-green-500 text-white shadow-lg' : 'text-gray-400'}`}
                          >
                            Active
                          </button>
                          <button 
                            onClick={() => setNewCoupon(prev => ({ ...prev, status: 'inactive' }))}
                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${newCoupon.status === 'inactive' ? 'bg-red-500 text-white shadow-lg' : 'text-gray-400'}`}
                          >
                            Paused
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Product Targeting */}
                  <div className="space-y-6 flex flex-col h-full">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-primary uppercase tracking-widest">
                          Eligible Products
                        </label>
                        <div className="flex items-center gap-3">
                          <button 
                            type="button"
                            onClick={() => setNewCoupon(prev => ({ ...prev, eligibleProducts: products.map(p => p.id) }))}
                            className="text-[9px] font-black text-primary hover:text-primary-dark uppercase tracking-widest px-2 py-1 bg-primary/5 rounded-lg transition-colors"
                          >
                            Select All ({products.length})
                          </button>
                          <button 
                            type="button"
                            onClick={() => setNewCoupon(prev => ({ ...prev, eligibleProducts: [] }))}
                            className="text-[9px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest px-2 py-1 bg-red-50 rounded-lg transition-colors"
                          >
                            Clear
                          </button>
                          <span className="text-[10px] text-gray-400 font-bold">{newCoupon.eligibleProducts?.length || 0} Linked</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium">Coupon will ONLY work if these items are in cart.</p>
                      
                      {/* Search Box */}
                      <div className="relative">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                          <Search className="w-5 h-5 text-gray-400" />
                        </div>
                        <input 
                          type="text" 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search product to link..."
                          className="w-full bg-white border-2 border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all outline-none focus:border-primary"
                        />
                        
                        {/* Dropdown Results */}
                        <AnimatePresence>
                          {searchQuery && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[110] max-h-60 overflow-y-auto"
                            >
                              {filteredProducts.length > 0 ? (
                                filteredProducts.map(product => (
                                  <button 
                                    key={product.id}
                                    onClick={() => addProductToEligible(product.id)}
                                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-primary/5 transition-colors border-b border-gray-50 last:border-none group text-left"
                                  >
                                    <div className="w-10 h-10 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                                      <img src={product.image || undefined} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-black text-gray-900 truncate">{product.name}</p>
                                      <p className="text-[10px] font-bold text-gray-400 uppercase">{product.category}</p>
                                    </div>
                                    <Plus className="w-4 h-4 text-gray-300 group-hover:text-primary" />
                                  </button>
                                ))
                              ) : (
                                <div className="p-8 text-center text-gray-400">
                                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                                  <p className="text-xs font-bold uppercase tracking-widest">No products found</p>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Selected Tags Area */}
                    <div className="flex-1 bg-gray-50 rounded-[32px] p-6 border-2 border-dashed border-gray-200 min-h-[200px]">
                      {newCoupon.eligibleProducts && newCoupon.eligibleProducts.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {newCoupon.eligibleProducts.map(id => {
                            const p = products.find(prod => prod.id === id);
                            return (
                              <motion.div 
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                key={id} 
                                className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl group shadow-sm"
                              >
                                <span className="text-xs font-black text-gray-700">{p?.name}</span>
                                <button 
                                  onClick={() => removeProductFromEligible(id)}
                                  className="p-1 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-lg transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </motion.div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-gray-200 shadow-sm border border-gray-100">
                            <Plus className="w-8 h-8" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Target Selection Empty</p>
                            <p className="text-[10px] text-gray-300 font-medium">Link specific items to activate this coupon.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-8 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
                <div className="flex flex-col">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Security Check</p>
                  <p className="text-[10px] text-green-500 font-black uppercase">Validation: Ready for Production</p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleClose}
                    className="px-8 py-4 text-sm font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
                  >
                    Discard
                  </button>
                  <button 
                    disabled={!newCoupon.code || !newCoupon.discount || (newCoupon.eligibleProducts?.length || 0) === 0}
                    onClick={() => {
                      if (isEditing && editingId) {
                        onUpdate(editingId, newCoupon);
                      } else {
                        onAdd(newCoupon);
                      }
                      handleClose();
                    }}
                    className="bg-primary text-white px-10 py-4 rounded-2xl shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95 font-black uppercase tracking-widest text-xs flex items-center gap-3 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                  >
                    <Check className="w-5 h-5" />
                    {isEditing ? 'Update & Deploy' : 'Save & Deploy Coupon'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
