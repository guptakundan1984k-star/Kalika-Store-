import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, updateDoc, doc, onSnapshot } from '../firebase';
import { UserProfile, Product } from '../types';
import { Search, User, Package, Tag, Save, Loader2, IndianRupee, Trash2, ChevronRight, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AdminPartyPricingManager: React.FC<{ products: Product[] }> = ({ products }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [searchProduct, setSearchProduct] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(userList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchUser.toLowerCase()) || 
    u.phone?.includes(searchUser)
  ).slice(0, 5);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
    p.category.toLowerCase().includes(searchProduct.toLowerCase())
  ).slice(0, 5);

  const handleUpdatePrice = async (productId: string, price: number | null) => {
    if (!selectedUser) return;
    
    setIsSaving(true);
    try {
      const updatedCustomPrices = { ...(selectedUser.customPrices || {}) };
      if (price === null) {
        delete updatedCustomPrices[productId];
      } else {
        updatedCustomPrices[productId] = price;
      }

      await updateDoc(doc(db, 'users', selectedUser.uid), {
        customPrices: updatedCustomPrices
      });

      // Update local state for immediate feedback
      setSelectedUser({
        ...selectedUser,
        customPrices: updatedCustomPrices
      });

      alert(price === null ? "Custom price removed" : "Custom price updated successfully");
    } catch (error) {
      console.error("Error updating custom price:", error);
      alert("Failed to update custom price");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-32">
      <div className="bg-white p-8 rounded-[40px] shadow-xl shadow-gray-200/50 border border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Party-wise Pricing</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">Set special rates for specific customers</p>
          </div>
        </div>

        {/* Step 1: Select User */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Step 1: Select Party (Customer)</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name or phone..."
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {searchUser && filteredUsers.map(user => (
              <button 
                key={user.uid}
                onClick={() => {
                  setSelectedUser(user);
                  setSearchUser('');
                }}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                  selectedUser?.uid === user.uid 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-50 hover:border-primary/20 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-gray-900">{user.name}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.phone}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedUser && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Left: Product Selection */}
            <div className="bg-white p-8 rounded-[40px] shadow-xl shadow-gray-200/50 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 tracking-tight text-lg">Search Products</h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">To add custom price</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search by name or category..."
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-3 text-xs font-bold shadow-inner focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-3">
                  {searchProduct && filteredProducts.map(product => {
                    const hasCustom = selectedUser.customPrices?.[product.id];
                    return (
                      <div key={product.id} className="bg-gray-50 p-4 rounded-3xl border border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={product.image || undefined} className="w-10 h-10 rounded-xl object-cover" alt="" />
                          <div>
                            <p className="text-xs font-black text-gray-900">{product.name}</p>
                            <p className="text-[9px] font-bold text-gray-400 italic">MRP: ₹{product.price}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <input 
                            type="number"
                            placeholder="Party Price"
                            defaultValue={hasCustom || ''}
                            onBlur={(e) => {
                              const newPrice = parseFloat(e.target.value);
                              if (!isNaN(newPrice)) {
                                handleUpdatePrice(product.id, newPrice);
                              }
                            }}
                            className="w-24 bg-white border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-black text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                           />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Active Custom Prices for this Party */}
            <div className="bg-white p-8 rounded-[40px] shadow-xl shadow-gray-200/50 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-50 rounded-xl text-green-600">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 tracking-tight text-lg">Active Party Rates</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current custom pricing for {selectedUser.name}</p>
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(selectedUser.customPrices || {}).length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center opacity-20 text-center">
                    <Tag className="w-12 h-12 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No custom prices set yet</p>
                  </div>
                ) : (
                  Object.entries(selectedUser.customPrices || {}).map(([pid, price]) => {
                    const product = products.find(p => p.id === pid);
                    if (!product) return null;
                    return (
                      <div key={pid} className="bg-indigo-600 p-4 rounded-3xl text-white flex items-center justify-between shadow-lg shadow-indigo-600/20">
                        <div className="flex items-center gap-3">
                          <img src={product.image || undefined} className="w-10 h-10 rounded-xl object-cover bg-white/20" alt="" />
                          <div>
                            <p className="text-xs font-black tracking-tight">{product.name}</p>
                            <p className="text-[8px] font-bold text-indigo-200 uppercase tracking-widest">Regular Price: ₹{product.price}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 leading-none mb-1">Party Rate</p>
                            <p className="text-lg font-black tracking-tighter">₹{price}</p>
                          </div>
                          <button 
                            onClick={() => handleUpdatePrice(pid, null)}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
