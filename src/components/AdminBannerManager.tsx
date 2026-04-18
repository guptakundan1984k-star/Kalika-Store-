import React, { useState } from 'react';
import { Plus, Trash2, Image as ImageIcon, Save, X, Power } from 'lucide-react';
import { Banner } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface AdminBannerManagerProps {
  banners: Banner[];
  onAdd: (banner: Partial<Banner>) => void;
  onUpdate: (id: string, banner: Partial<Banner>) => void;
  onDelete: (id: string) => void;
}

export const AdminBannerManager: React.FC<AdminBannerManagerProps> = ({ banners, onAdd, onUpdate, onDelete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newBanner, setNewBanner] = useState<Partial<Banner>>({
    title: '',
    image: '',
    link: '',
    active: true
  });

  const handleSave = () => {
    if (!newBanner.title || !newBanner.image) {
      alert("Please provide both a title and an image URL.");
      return;
    }
    onAdd(newBanner);
    setIsAdding(false);
    setNewBanner({ title: '', image: '', link: '', active: true });
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Banner Management</h2>
          <p className="text-sm text-gray-500 font-medium">Manage home page promotional banners.</p>
        </div>
        
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 font-bold"
        >
          <Plus className="w-5 h-5" />
          Add Banner
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {banners.map((banner) => (
          <div key={banner.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden group">
            <div className="relative h-48 overflow-hidden bg-gray-100">
              {banner.image ? (
                <img 
                  src={banner.image} 
                  alt={banner.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
              <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={() => onUpdate(banner.id, { active: !banner.active })}
                  className={`p-2 rounded-xl shadow-lg transition-all ${banner.active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}
                >
                  <Power className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => onDelete(banner.id)}
                  className="p-2 bg-white text-red-500 rounded-xl shadow-lg hover:bg-red-50 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-black text-gray-900 tracking-tight">{banner.title}</h3>
              <p className="text-xs text-gray-400 font-medium mt-1">{banner.link || 'No link'}</p>
            </div>
          </div>
        ))}
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
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 bg-gray-900 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-6 h-6" />
                  <h3 className="text-xl font-black tracking-tight">New Banner</h3>
                </div>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Banner Title</label>
                  <input 
                    type="text" 
                    value={newBanner.title}
                    onChange={(e) => setNewBanner(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                    placeholder="E.G. Summer Sale"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Image URL</label>
                  <input 
                    type="text" 
                    value={newBanner.image}
                    onChange={(e) => setNewBanner(prev => ({ ...prev, image: e.target.value }))}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Link URL (Optional)</label>
                  <input 
                    type="text" 
                    value={newBanner.link}
                    onChange={(e) => setNewBanner(prev => ({ ...prev, link: e.target.value }))}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                    placeholder="/products"
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
                  onClick={handleSave}
                  className="bg-primary text-white px-8 py-3 rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 font-bold flex items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Save Banner
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
