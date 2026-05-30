import React, { useState } from 'react';
import { 
  Sparkles, Upload, Loader2, Plus, Trash2, 
  CheckCircle2, AlertCircle, ShoppingBag, 
  X, Save, ImageIcon, Search
} from 'lucide-react';
import { Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { aiService } from '../services/aiService';
import { storage, ref, uploadBytes, getDownloadURL } from '../firebase';
import { optimizeImage } from '../lib/utils';

interface AdminBulkAIUploaderProps {
  onBulkAdd: (products: Partial<Product>[]) => Promise<void>;
  categories: string[];
  products?: Product[];
}

export const AdminBulkAIUploader: React.FC<AdminBulkAIUploaderProps> = ({ onBulkAdd, categories, products = [] }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [detectedProducts, setDetectedProducts] = useState<Partial<Product>[]>([]);
  const [showAlert, setShowAlert] = useState<{ show: boolean, message: string, type: 'success' | 'error' | 'info' }>({ show: false, message: '', type: 'info' });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles(prev => [...prev, ...selectedFiles]);
      
      selectedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });

      setShowAlert({ 
        show: true, 
        message: `${selectedFiles.length} photo(s) selected and ready for analysis.`, 
        type: 'success' 
      });
      setTimeout(() => setShowAlert({ show: false, message: '', type: 'info' }), 4000);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const startAnalysis = async () => {
    if (files.length === 0) return;
    setIsAnalyzing(true);
    
    try {
      const imagesData = await Promise.all(files.map(async file => {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        return { data: base64, mimeType: file.type };
      }));

      const results = await aiService.detectProductsBulk(imagesData);
      
      if (results.length === 0) {
        setShowAlert({ show: true, message: "AI couldn't detect any clear products. Please try better photos.", type: 'error' });
        setTimeout(() => setShowAlert({ show: false, message: '', type: 'info' }), 5000);
        return;
      }

      // Ensure mapping is 1:1 using files array as base
      const resultsWithSortedImages = await Promise.all(files.map(async (file, idx) => {
        // Find corresponding AI result or use a fallback
        const p = results[idx] || { 
          name: 'Manual Product Entry', 
          category: categories[0], 
          description: 'AI couldn\'t identify this product details. Please fill manually.',
          price: 0,
          weight: ''
        };
        
        let url = "";
        try {
          const storageRef = ref(storage, `products/bulk_${Date.now()}_${idx}_${file.name}`);
          await uploadBytes(storageRef, file);
          url = await getDownloadURL(storageRef);
        } catch (storageError) {
          console.warn("Storage failed for bulk AI upload, falling back to Base64:", storageError);
          url = await optimizeImage(file, 1024, 0.7);
        }
        
        return { 
          ...p, 
          image: url, 
          images: [url], 
          hasManualPhoto: true,
          stock: 100,
          price: p.price || 0,
          weight: p.weight || '',
          category: p.category || categories[0]
        };
      }));

      setDetectedProducts(resultsWithSortedImages);
    } catch (e) {
      console.error("AI Analysis failed", e);
      setShowAlert({ show: true, message: "AI recognition failed. Please check your network or try smaller batches.", type: 'error' });
      setTimeout(() => setShowAlert({ show: false, message: '', type: 'info' }), 5000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreate = async () => {
    // Check for duplicates before adding
    const existingNames = new Set(products.map(p => p.name.toLowerCase()));
    const duplicates = detectedProducts.filter(p => p.name && existingNames.has(p.name.toLowerCase()));
    
    if (duplicates.length > 0) {
      if (!window.confirm(`Warning: ${duplicates.length} products (like "${duplicates[0].name}") already exist in your catalog. Do you want to add them anyway?`)) {
        return;
      }
    }

    setIsSaving(true);
    try {
      await onBulkAdd(detectedProducts);
      setDetectedProducts([]);
      setFiles([]);
      setPreviews([]);
      setShowAlert({ show: true, message: "Products created successfully!", type: 'success' });
      setTimeout(() => setShowAlert({ show: false, message: '', type: 'info' }), 5000);
    } catch (e) {
      console.error("Bulk create failed", e);
      setShowAlert({ show: true, message: "Failed to save products.", type: 'error' });
      setTimeout(() => setShowAlert({ show: false, message: '', type: 'info' }), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 p-6">
      {/* Photo Selection Alert */}
      <AnimatePresence>
        {showAlert.show && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, x: '-50%' }}
            className={`fixed top-24 left-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[300px] border backdrop-blur-xl ${
              showAlert.type === 'success' ? 'bg-green-600 border-green-500 text-white' : 
              showAlert.type === 'error' ? 'bg-red-600 border-red-500 text-white' : 
              'bg-[#00AEEF] border-blue-500 text-white'
            }`}
          >
            {showAlert.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="text-sm font-black uppercase tracking-widest">{showAlert.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            AI Bulk Product Creator
          </h2>
          <p className="text-sm text-gray-500 font-medium">Upload photos, and AI will detect names, categories, and generate descriptions automatically.</p>
        </div>
        
        {detectedProducts.length > 0 && (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setDetectedProducts([])}
              className="px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl transition-all active:scale-95"
            >
              Clear List
            </button>
            <button 
              onClick={handleCreate}
              disabled={isSaving}
              className="flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-2xl shadow-xl shadow-primary/20 hover:bg-black transition-all active:scale-95 font-bold disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Create All Products
            </button>
          </div>
        )}
      </div>

      {!detectedProducts.length ? (
        <div className="max-w-4xl mx-auto">
          <div 
            className={`relative border-4 border-dashed rounded-[40px] p-12 transition-all text-center ${
              files.length > 0 ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white hover:border-primary/50'
            }`}
          >
            <input 
              type="file" 
              multiple 
              accept="*/*" 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            
            <div className="space-y-4">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto">
                <Upload className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-gray-900">Drop Product Photos Here</h3>
                <p className="text-sm text-gray-500 font-medium font-hindi">उत्पादों की तस्वीरें यहाँ डालें</p>
              </div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Supports multiple JPG, PNG, WEBP</p>
            </div>
          </div>

          <AnimatePresence>
            {previews.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">{previews.length} Photos Selected</h4>
                  <button 
                    onClick={startAnalysis}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2 bg-black text-white px-8 py-3 rounded-2xl shadow-xl hover:bg-primary transition-all active:scale-95 font-bold disabled:opacity-50"
                  >
                    {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    {isAnalyzing ? 'Analyzing with Gemini...' : 'Start AI Detection'}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  {previews.map((preview, i) => (
                    <div key={i} className="relative group aspect-square rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                      <img src={preview || undefined} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeFile(i)}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {detectedProducts.map((p, i) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              key={i}
              className="bg-white rounded-[40px] border border-gray-100 shadow-lg overflow-hidden group hover:border-primary/30 transition-all"
            >
              <div className="aspect-video relative overflow-hidden bg-gray-50">
                <img src={p.image || undefined} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute top-4 left-4">
                  <span className="bg-primary/95 text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest backdrop-blur-sm">
                    AI Detected
                  </span>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <input 
                    type="text" 
                    value={p.name}
                    onChange={(e) => {
                      const updated = [...detectedProducts];
                      updated[i].name = e.target.value;
                      setDetectedProducts(updated);
                    }}
                    className="w-full text-xl font-black text-gray-900 border-none p-0 focus:ring-0 bg-transparent mb-1"
                  />
                  <select 
                    value={p.category}
                    onChange={(e) => {
                      const updated = [...detectedProducts];
                      updated[i].category = e.target.value;
                      setDetectedProducts(updated);
                    }}
                    className="text-[10px] font-black text-primary uppercase tracking-widest border-none p-0 focus:ring-0 bg-transparent appearance-none"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <textarea 
                  value={p.description}
                  onChange={(e) => {
                    const updated = [...detectedProducts];
                    updated[i].description = e.target.value;
                    setDetectedProducts(updated);
                  }}
                  className="w-full text-xs font-medium text-gray-500 bg-gray-50 rounded-2xl p-4 border-none focus:ring-2 focus:ring-primary/10 transition-all resize-none h-24"
                />

                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Price (Required)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                      <input 
                        type="number" 
                        placeholder="0.00"
                        value={p.price || ''}
                        onChange={(e) => {
                          const updated = [...detectedProducts];
                          updated[i].price = parseFloat(e.target.value) || 0;
                          setDetectedProducts(updated);
                        }}
                        className="w-full bg-gray-50 border-none rounded-xl pl-8 pr-4 py-3 font-black text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Initial Stock</label>
                    <input 
                      type="number" 
                      value={p.stock || 0}
                      onChange={(e) => {
                        const updated = [...detectedProducts];
                        updated[i].stock = parseInt(e.target.value) || 0;
                        setDetectedProducts(updated);
                      }}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-black text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                <button 
                  onClick={() => setDetectedProducts(prev => prev.filter((_, idx) => idx !== i))}
                  className="w-full py-3 bg-red-50 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Discard
                </button>
              </div>
            </motion.div>
          ))}
          
          <button 
            onClick={() => { setDetectedProducts([]); setFiles([]); setPreviews([]); }}
            className="flex flex-col items-center justify-center p-8 border-4 border-dashed border-gray-100 rounded-[40px] hover:border-primary/20 hover:bg-primary/5 transition-all group"
          >
            <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-all mb-4">
              <Plus className="w-8 h-8" />
            </div>
            <p className="text-sm font-black text-gray-400 uppercase tracking-widest group-hover:text-primary transition-all">Add More Photos</p>
          </button>
        </div>
      )}

      {/* Global Analysis Overlay */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center text-center p-6"
          >
            <div className="relative w-40 h-40 mb-10">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-full shadow-sm"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h3 className="text-3xl font-black text-white tracking-tight mb-4">Gemini Vision is Scanning...</h3>
            <p className="max-w-md text-gray-400 font-medium text-base">Identifying product packaging, extracting names, and generating professional descriptions for your catalog.</p>
            
            <div className="mt-12 flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-3 rounded-xl">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="text-xs font-black text-white uppercase tracking-[0.2em]">Processing {files.length} Photos</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
