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
      alert("Please provide both a title and media URL.");
      return;
    }
    const mediaType = newBanner.type || (newBanner.image.startsWith('data:video') ? 'video' : 'image');
    onAdd({ ...newBanner, type: mediaType });
    setIsAdding(false);
    setNewBanner({ title: '', image: '', link: '', active: true, type: 'image' });
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Banner Management</h2>
          <p className="text-sm text-gray-500 font-medium">Manage home page promotional banners. All saved banners can be reused by toggling the active status.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex flex-col items-end mr-2">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Vault Strength</span>
            <span className="text-sm font-black text-gray-900">{banners.length} Saved Assets</span>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 font-bold"
          >
            <Plus className="w-5 h-5" />
            Add New Banner
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {banners.map((banner) => (
          <div key={banner.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden group">
            <div className="relative h-48 overflow-hidden bg-gray-100">
              {banner.image ? (
                banner.type === 'video' ? (
                  <video 
                    src={banner.image} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    muted
                    loop
                    onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
                    onMouseOut={(e) => (e.target as HTMLVideoElement).pause()}
                  />
                ) : (
                  <img 
                    src={banner.image} 
                    alt={banner.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
              <div className="absolute top-4 left-4 z-10">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl border ${banner.active ? 'bg-green-500 text-white border-green-400' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                  {banner.active ? 'Live Now' : 'Idle in Vault'}
                </span>
              </div>
              <div className="absolute top-4 right-4 flex gap-2 z-10">
                <button 
                  onClick={() => onUpdate(banner.id, { active: !banner.active })}
                  className={`p-2 rounded-xl shadow-xl transition-all active:scale-90 ${banner.active ? 'bg-white text-green-500' : 'bg-white text-gray-400'}`}
                  title={banner.active ? 'Deactivate' : 'Activate'}
                >
                  <Power className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => onDelete(banner.id)}
                  className="p-2 bg-white text-red-500 rounded-xl shadow-xl hover:bg-red-50 transition-all active:scale-90"
                  title="Delete Forever"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                  {banner.type === 'video' ? 'Video' : 'Image'}
                </span>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">{banner.title}</h3>
              </div>
              <p className="text-xs text-gray-400 font-medium">{banner.link || 'No link'}</p>
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

                <div className="space-y-4">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Banner Media</label>
                  <div className="flex items-center gap-4 mb-2">
                    <button 
                      onClick={() => setNewBanner(prev => ({ ...prev, type: 'image' }))}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${newBanner.type !== 'video' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}
                    >
                      Image
                    </button>
                    <button 
                      onClick={() => setNewBanner(prev => ({ ...prev, type: 'video' }))}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${newBanner.type === 'video' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}
                    >
                      Video
                    </button>
                  </div>
                  <div className="flex flex-col gap-4">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-3xl cursor-pointer hover:bg-gray-50 transition-all group">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                        <ImageIcon className="w-8 h-8 text-gray-300 group-hover:scale-110 transition-transform mb-2" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Upload Image or Video (MP4)</p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*,video/mp4"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const isVideo = file.type.startsWith('video/');
                            const reader = new FileReader();
                            reader.onload = () => {
                              setNewBanner(prev => ({ 
                                ...prev, 
                                image: reader.result as string,
                                type: isVideo ? 'video' : 'image'
                              }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                        <ImageIcon className="w-4 h-4 text-gray-400" />
                      </div>
                      <input 
                        type="text" 
                        value={newBanner.image}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewBanner(prev => ({ ...prev, image: val }));
                        }}
                        className="w-full bg-gray-50 border-none rounded-2xl pl-11 pr-4 py-4 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all"
                        placeholder="Or paste media URL..."
                      />
                    </div>
                    {newBanner.image && (
                      <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-gray-100 shadow-inner">
                        {newBanner.type === 'video' ? (
                          <video src={newBanner.image} className="w-full h-full object-cover" muted autoPlay loop />
                        ) : (
                          <img src={newBanner.image} className="w-full h-full object-cover" />
                        )}
                        <button 
                          onClick={() => setNewBanner(prev => ({ ...prev, image: '' }))}
                          className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
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
