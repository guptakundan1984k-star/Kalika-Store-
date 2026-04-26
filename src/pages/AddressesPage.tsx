import React, { useState } from 'react';
import { UserProfile, Address } from '../types';
import { MapPin, Plus, Trash2, Home, Briefcase, Map as MapIcon, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, doc, updateDoc } from '../firebase';
import { PageLoader } from '../components/PageLoader';

interface AddressesPageProps {
  user: UserProfile;
}

const AddressesPageContent: React.FC<AddressesPageProps> = ({ user }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ label: 'Home', address: '' });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.uid) return;

    let updatedAddresses;
    if (editingId) {
      updatedAddresses = (user.addresses || []).map(a => 
        a.id === editingId ? { ...a, label: formData.label, address: formData.address } : a
      );
    } else {
      const newAddress: Address = {
        id: Math.random().toString(36).substr(2, 9),
        label: formData.label,
        address: formData.address,
        lat: 23.3884,
        lng: 85.2795
      };
      updatedAddresses = [...(user.addresses || []), newAddress];
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), { addresses: updatedAddresses });
      setIsAdding(false);
      setEditingId(null);
      setFormData({ label: 'Home', address: '' });
    } catch (e) {
      console.error("Error saving address:", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user.uid) return;
    const updated = (user.addresses || []).filter(a => a.id !== id);
    try {
      await updateDoc(doc(db, 'users', user.uid), { addresses: updated });
    } catch (e) {
      console.error("Error deleting address:", e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 md:px-8">
      <div className="max-w-3xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-primary/10 rounded-[32px] flex items-center justify-center text-primary mx-auto">
            <MapPin className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Delivery Addresses</h1>
          <p className="text-gray-500 font-medium">Manage your shipping destinations for faster checkout.</p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Saved Addresses</h3>
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add New
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {(user.addresses || []).map((addr) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  key={addr.id}
                  className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {addr.label === 'Home' ? <Home className="w-6 h-6" /> : 
                       addr.label === 'Office' ? <Briefcase className="w-6 h-6" /> : 
                       <MapIcon className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900">{addr.label}</h4>
                      <p className="text-sm text-gray-500 font-medium line-clamp-1">{addr.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setEditingId(addr.id);
                        setFormData({ label: addr.label, address: addr.address });
                        setIsAdding(true);
                      }}
                      className="p-3 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                    >
                      <Plus className="w-5 h-5 rotate-45" />
                    </button>
                    <button 
                      onClick={() => handleDelete(addr.id)}
                      className="p-3 text-red-100 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isAdding && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-6"
              >
                <div 
                  className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                  onClick={() => setIsAdding(false)}
                />
                <motion.div className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl p-10 space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                      {editingId ? 'Edit Address' : 'New Address'}
                    </h3>
                  </div>
                  <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Address Label</label>
                      <div className="flex gap-2">
                        {['Home', 'Office', 'Other'].map(l => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => setFormData({ ...formData, label: l })}
                            className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all ${
                              formData.label === l ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'
                            }`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Address</label>
                      <textarea
                        required
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all min-h-[120px] resize-none"
                        placeholder="House no, Street name, Area, City..."
                      />
                    </div>
                    <div className="flex gap-4">
                      <button 
                        type="button"
                        onClick={() => setIsAdding(false)}
                        className="flex-1 py-4 text-gray-400 font-bold uppercase tracking-widest text-[10px]"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/30 uppercase tracking-widest text-[10px]"
                      >
                        Save Address
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AddressesPage: React.FC<AddressesPageProps> = (props) => (
  <PageLoader>
    <AddressesPageContent {...props} />
  </PageLoader>
);
