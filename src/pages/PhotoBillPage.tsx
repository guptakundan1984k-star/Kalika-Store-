import React, { useState, useRef } from 'react';
import { Product, UserProfile } from '../types';
import { Camera, Image as ImageIcon, Sparkles, Loader2, ArrowRight, ShoppingCart, Trash2, ShoppingBag, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { PageLoader } from '../components/PageLoader';

interface PhotoBillPageProps {
  products: Product[];
  user: UserProfile | null;
  onAddToCart: (product: Product, quantity?: number, redirectToCheckout?: boolean, selectedUnit?: string) => void;
}

const PhotoBillPageContent: React.FC<PhotoBillPageProps> = ({ products, user, onAddToCart }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedItems, setDetectedItems] = useState<{ product: Product, quantity: number }[]>([]);
  const [errorNote, setErrorNote] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;
    setIsAnalyzing(true);
    setErrorNote(null);
    try {
      const response = await fetch("/api/gemini/analyze-bill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: selectedImage,
          products: products.map(p => ({ id: p.id, name: p.name })),
        }),
      });

      if (!response.ok) {
        throw new Error("Analysis request failed. Please check your network connection.");
      }

      const resData = await response.json();
      if (!resData.success) {
        throw new Error(resData.error || "Analysis failed");
      }

      const items = resData.items || [];
      const detected = items.map((item: any) => {
        const product = products.find(p => p.id === item.productId || p.name.toLowerCase().includes(String(item.productId || "").toLowerCase()));
        return product ? { product, quantity: Number(item.quantity) || 1 } : null;
      }).filter(Boolean) as { product: Product, quantity: number }[];

      setDetectedItems(detected);
      if (detected.length === 0) {
        setErrorNote("No matching catalog items detected. Please take a clearer photo with legible items.");
      }
    } catch (e: any) {
      console.error("Analysis error:", e);
      setErrorNote(e.message || "Gemini Lens service is currently unavailable. Please try again in a moment.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddAll = () => {
    detectedItems.forEach(item => onAddToCart(item.product, item.quantity));
    setDetectedItems([]);
    setSelectedImage(null);
  };

  return (
    <>
      {/* Floating Result Bar (Matched to Previous UI) */}
      <AnimatePresence>
        {detectedItems.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[92%] max-w-lg z-50 pointer-events-none"
          >
            <div className="bg-[#00AEEF] text-white p-6 rounded-[32px] shadow-2xl flex items-center justify-between pointer-events-auto border-4 border-white/20 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Detected</p>
                  <p className="text-xl font-black">{detectedItems.length} Products</p>
                </div>
              </div>
              <button 
                onClick={handleAddAll}
                className="bg-white text-[#00AEEF] font-black px-8 py-3 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest"
              >
                Add to Cart
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-gray-50 pt-24 pb-40 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-[#00AEEF]/10 rounded-[32px] flex items-center justify-center text-[#00AEEF] mx-auto">
            <Camera className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Gemini Lens Paper Scanner</h1>
          <p className="text-gray-500 font-medium">Upload a photo of your paper list/handwritten bill and our advanced Gemini Lens will instantly add items to your cart.</p>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Upload Section */}
          <div className="space-y-6">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`aspect-video w-full rounded-[40px] border-4 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all overflow-hidden relative group ${selectedImage ? 'border-none' : ''}`}
            >
              {selectedImage ? (
                <>
                  <img src={selectedImage || undefined} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-white font-black uppercase tracking-widest text-xs">Change Photo</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors mb-4">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-black text-gray-900 uppercase tracking-widest">Click to Upload List</p>
                  <p className="text-xs text-gray-400 mt-2">JPG, PNG supported</p>
                </>
              )}
              <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageSelect} />
            </div>

            {selectedImage && (
              <div className="space-y-4">
                <button 
                  onClick={analyzeImage}
                  disabled={isAnalyzing}
                  className="w-full bg-primary text-white font-black py-5 rounded-[28px] shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 hover:bg-primary-dark transition-all disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="uppercase tracking-widest text-sm">Magic Scanning...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6" />
                      <span className="uppercase tracking-widest text-sm">Extract Items</span>
                    </>
                  )}
                </button>
                
                {errorNote && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-2xl border border-red-100"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest leading-tight">{errorNote}</p>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* Result Section */}
          <div className="space-y-6">
            <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Detected Items
            </h3>
            
            <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl min-h-[300px] flex flex-col">
              <div className="flex-1 space-y-4">
                {detectedItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <p className="text-sm text-gray-400 font-bold italic">Upload a photo to see results.</p>
                  </div>
                ) : (
                  detectedItems.map((item, i) => (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={`${item.product.id}-${i}`}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100"
                    >
                      <div className="flex items-center gap-4">
                        <img src={item.product.image || undefined} className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <p className="font-black text-gray-900 text-sm leading-tight">{item.product.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setDetectedItems(prev => prev.filter((_, idx) => idx !== i))}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  </>
  );
};

export const PhotoBillPage: React.FC<PhotoBillPageProps> = (props) => (
  <PageLoader>
    <PhotoBillPageContent {...props} />
  </PageLoader>
);
