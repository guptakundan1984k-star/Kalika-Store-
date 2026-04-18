import React, { useState } from 'react';
import { Camera, FileText, Loader2, Check, X, ShoppingCart, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parsePaperBill } from '../services/geminiService';
import { Product } from '../types';

interface PaperBillUploaderProps {
  products: Product[];
  onAddItems: (items: { product: Product, quantity: number }[]) => void;
}

export const PaperBillUploader: React.FC<PaperBillUploaderProps> = ({ products, onAddItems }) => {
  const [loading, setLoading] = useState(false);
  const [detectedItems, setDetectedItems] = useState<{ name: string, quantity: number, matchedProduct?: Product }[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await parsePaperBill(base64.split(',')[1]);
      
      const matched = result.items.map((item: any) => {
        // Simple fuzzy match
        const product = products.find(p => 
          p.name.toLowerCase().includes(item.name.toLowerCase()) || 
          item.name.toLowerCase().includes(p.name.toLowerCase())
        );
        return { ...item, matchedProduct: product };
      });

      setDetectedItems(matched);
      setShowConfirmation(true);
    } catch (error) {
      console.error("Failed to parse bill:", error);
      alert("Failed to read the bill. Please try a clearer photo.");
      setPreviewUrl(null);
    } finally {
      setLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleConfirm = () => {
    const toAdd = detectedItems
      .filter(item => item.matchedProduct)
      .map(item => ({ product: item.matchedProduct!, quantity: item.quantity }));
    
    onAddItems(toAdd);
    setShowConfirmation(false);
    setDetectedItems([]);
    setPreviewUrl(null);
  };

  return (
    <div className="relative">
      <div className="p-8 space-y-8">
        {!previewUrl ? (
          <div className="flex flex-col items-center justify-center py-12 border-4 border-dashed border-gray-100 rounded-[40px] space-y-6">
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-300">
              <Camera className="w-10 h-10" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Snap your bill</h3>
              <p className="text-sm text-gray-400 font-medium">Take a clear photo of your list</p>
            </div>
            <label className="bg-gray-900 text-white px-8 py-4 rounded-2xl cursor-pointer hover:bg-black transition-all active:scale-95 shadow-xl shadow-gray-900/20 flex items-center gap-3">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              <span className="text-xs font-black uppercase tracking-widest">Upload Photo</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={loading} />
            </label>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative aspect-[3/4] max-w-sm mx-auto rounded-[40px] overflow-hidden shadow-2xl border-8 border-white">
              <img src={previewUrl} alt="Bill Preview" className="w-full h-full object-cover" />
              {loading && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin" />
                  <p className="text-xs font-black uppercase tracking-widest">Analyzing Bill...</p>
                </div>
              )}
              {!loading && (
                <button 
                  onClick={() => setPreviewUrl(null)}
                  className="absolute top-4 right-4 p-3 bg-white/20 backdrop-blur-md text-white rounded-2xl hover:bg-white/40 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showConfirmation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowConfirmation(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 bg-gray-900 text-white">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">Bill Detected</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Confirm items to add to cart</p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                {detectedItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.matchedProduct ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {item.matchedProduct ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900">{item.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {item.matchedProduct ? `Matched: ${item.matchedProduct.name}` : 'No match found in store'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-900">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
                <button 
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 px-6 py-4 rounded-2xl text-sm font-black text-gray-400 uppercase tracking-widest hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirm}
                  className="flex-1 bg-primary text-white px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add to Cart
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
