import React, { useState } from 'react';
import { Plus, Search, Tag, Trash2, Edit2, Percent, DollarSign, Clock } from 'lucide-react';
import { Coupon } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface AdminCouponManagerProps {
  coupons: Coupon[];
  onAdd: (coupon: Partial<Coupon>) => void;
  onDelete: (id: string) => void;
}

export const AdminCouponManager: React.FC<AdminCouponManagerProps> = ({ coupons, onAdd, onDelete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newCoupon, setNewCoupon] = useState<Partial<Coupon>>({
    code: '',
    discount: 0,
    type: 'percentage',
    minOrder: 0,
    maxDiscount: 0,
    expiryDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // Default 7 days
    usageLimitPerCustomer: 1
  });

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Coupon Management</h2>
          <p className="text-sm text-gray-500 font-medium">Create and manage promotional discount codes.</p>
        </div>
        
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 font-bold"
        >
          <Plus className="w-5 h-5" />
          Create Coupon
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-hide">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:scale-110" />
            
            <div className="flex items-start justify-between mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <Tag className="w-6 h-6" />
              </div>
              <button 
                onClick={() => onDelete(coupon.id)}
                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Coupon Code</span>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">{coupon.code}</h3>
              </div>
              
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Discount</span>
                    <span className="text-lg font-black text-primary">
                      {coupon.type === 'percentage' ? `${coupon.discount}%` : `₹${coupon.discount}`}
                    </span>
                    {coupon.type === 'percentage' && coupon.maxDiscount && (
                      <span className="text-[8px] font-bold text-gray-400 uppercase">Max: ₹{coupon.maxDiscount}</span>
                    )}
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Limit</span>
                    <span className="text-[10px] font-bold text-gray-700">
                      {coupon.usageLimitPerCustomer || 1} per user
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expires</span>
                    <span className="text-[10px] font-bold text-gray-700">
                      {coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString() : 'Never'}
                    </span>
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
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 bg-primary flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <Tag className="w-6 h-6" />
                  <h3 className="text-xl font-black tracking-tight">New Coupon</h3>
                </div>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Coupon Code</label>
                  <input 
                    type="text" 
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-black tracking-widest focus:ring-2 focus:ring-primary/20"
                    placeholder="E.G. FRESH50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Type</label>
                    <select 
                      value={newCoupon.type}
                      onChange={(e) => setNewCoupon(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Value</label>
                    <input 
                      type="number" 
                      value={isNaN(newCoupon.discount!) ? '' : newCoupon.discount}
                      onChange={(e) => setNewCoupon(prev => ({ ...prev, discount: parseFloat(e.target.value) }))}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Min. Order Amount (₹)</label>
                    <input 
                      type="number" 
                      value={isNaN(newCoupon.minOrder!) ? '' : newCoupon.minOrder}
                      onChange={(e) => setNewCoupon(prev => ({ ...prev, minOrder: parseFloat(e.target.value) }))}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Max Discount (₹)</label>
                    <input 
                      type="number" 
                      value={isNaN(newCoupon.maxDiscount!) ? '' : newCoupon.maxDiscount}
                      onChange={(e) => setNewCoupon(prev => ({ ...prev, maxDiscount: parseFloat(e.target.value) }))}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Expiry Date</label>
                  <input 
                    type="date" 
                    value={newCoupon.expiryDate ? new Date(newCoupon.expiryDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setNewCoupon(prev => ({ ...prev, expiryDate: new Date(e.target.value).getTime() }))}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Usage Limit Per Customer</label>
                  <input 
                    type="number" 
                    value={newCoupon.usageLimitPerCustomer || ''}
                    onChange={(e) => setNewCoupon(prev => ({ ...prev, usageLimitPerCustomer: parseInt(e.target.value) }))}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-4">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    onAdd(newCoupon);
                    setIsAdding(false);
                  }}
                  className="bg-primary text-white px-8 py-3 rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 font-bold"
                >
                  Create Coupon
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
