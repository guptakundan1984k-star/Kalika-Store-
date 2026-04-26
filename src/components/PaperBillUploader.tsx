import React, { useState } from 'react';
import { Camera, FileText, Loader2, Check, X, ShoppingCart, Plus, Printer, Bluetooth, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parsePaperBill } from '../services/geminiService';
import { Product } from '../types';

interface DetectedItem {
  name: string;
  quantity: number;
  matchedProduct?: Product;
  price?: number;
}

interface PaperBillUploaderProps {
  products: Product[];
  onAddItems: (items: { product: Product, quantity: number }[]) => void;
}

export const PaperBillUploader: React.FC<PaperBillUploaderProps> = ({ products, onAddItems }) => {
  const [loading, setLoading] = useState(false);
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [bluetoothStatus, setBluetoothStatus] = useState<'idle' | 'searching' | 'connected' | 'error'>('idle');

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
        const product = products.find(p => 
          p.name.toLowerCase().includes(item.name.toLowerCase()) || 
          item.name.toLowerCase().includes(p.name.toLowerCase())
        );
        return { ...item, matchedProduct: product, price: product?.price || 0 };
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

  const handleUpdateItem = (index: number, updates: Partial<DetectedItem>) => {
    setDetectedItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], ...updates };
      
      // If name changed, try to rematch
      if (updates.name) {
        const product = products.find(p => 
          p.name.toLowerCase().includes(updates.name!.toLowerCase()) || 
          updates.name!.toLowerCase().includes(p.name.toLowerCase())
        );
        newItems[index].matchedProduct = product;
        if (product) newItems[index].price = product.price;
      }
      
      return newItems;
    });
  };

  const handleRemoveItem = (index: number) => {
    setDetectedItems(prev => prev.filter((_, i) => i !== index));
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

  const handleBluetoothPrint = async () => {
    setBluetoothStatus('searching');
    setIsPrinting(true);
    
    // Simulate Bluetooth Connection (Web Bluetooth API is restricted in most iframes/preview)
    try {
      await new Promise(r => setTimeout(r, 2000));
      setBluetoothStatus('connected');
      
      // Mock Printing process
      await new Promise(r => setTimeout(r, 1500));
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const billHtml = `
          <html>
            <head>
              <title>Print Receipt</title>
              <style>
                body { font-family: 'Courier New', Courier, monospace; width: 300px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                .item { display: flex; justify-content: space-between; margin: 5px 0; font-size: 14px; }
                .total { border-top: 1px solid #000; margin-top: 10px; padding-top: 10px; font-weight: bold; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h2>KALIKA STORE</h2>
                <p>Digitalized Bill Receipt</p>
                <p>${new Date().toLocaleString()}</p>
              </div>
              ${detectedItems.map(item => `
                <div class="item">
                  <span>${item.name} x${item.quantity}</span>
                  <span>₹${(item.price || 0) * item.quantity}</span>
                </div>
              `).join('')}
              <div class="total item">
                <span>TOTAL</span>
                <span>₹${detectedItems.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0)}</span>
              </div>
              <div class="footer">
                <p>Thank you for shopping!</p>
                <p>Visit us again at KalikaStore.in</p>
              </div>
              <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
          </html>
        `;
        printWindow.document.write(billHtml);
        printWindow.document.close();
      }
      
      setBluetoothStatus('idle');
    } catch (e) {
      setBluetoothStatus('error');
      setTimeout(() => setBluetoothStatus('idle'), 3000);
    } finally {
      setIsPrinting(false);
    }
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
                  <div key={`detected-${i}`} className="flex flex-col p-4 bg-gray-50 rounded-2xl border border-gray-100 gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.matchedProduct ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {item.matchedProduct ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <input 
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItem(i, { name: e.target.value })}
                            className="bg-transparent border-none p-0 text-sm font-black text-gray-900 focus:ring-0 w-full"
                          />
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
                            {item.matchedProduct ? `Matched: ${item.matchedProduct.name}` : 'No exact match - Manual edit required'}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveItem(i)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100/50">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Qty</span>
                        <div className="flex items-center bg-white rounded-xl border border-gray-100 px-1 shadow-sm">
                          <button onClick={() => handleUpdateItem(i, { quantity: Math.max(1, item.quantity - 1) })} className="p-1 px-2 text-gray-400">-</button>
                          <span className="px-2 text-xs font-black">{item.quantity}</span>
                          <button onClick={() => handleUpdateItem(i, { quantity: item.quantity + 1 })} className="p-1 px-2 text-gray-400">+</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Price</span>
                        <input 
                          type="number"
                          value={item.price}
                          onChange={(e) => handleUpdateItem(i, { price: parseFloat(e.target.value) || 0 })}
                          className="w-16 bg-white border border-gray-100 rounded-xl px-2 py-1 text-xs font-black text-right"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {detectedItems.length === 0 && (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto text-gray-300">
                      <FileText className="w-8 h-8" />
                    </div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No items in the bill</p>
                  </div>
                )}
              </div>

              <div className="p-8 bg-gray-50 border-t border-gray-100 flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estimated Total</span>
                    <span className="text-2xl font-black text-gray-900 tracking-tight">
                      ₹{detectedItems.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0)}
                    </span>
                  </div>
                  <button 
                    onClick={handleBluetoothPrint}
                    disabled={isPrinting || detectedItems.length === 0}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                      bluetoothStatus === 'connected' ? 'bg-green-500 text-white shadow-green-200' : 'bg-gray-900 text-white shadow-gray-200'
                    } shadow-xl active:scale-95 disabled:opacity-50`}
                  >
                    {isPrinting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      bluetoothStatus === 'connected' ? <Check className="w-4 h-4" /> : <Printer className="w-4 h-4" />
                    )}
                    {bluetoothStatus === 'searching' ? 'Searching...' : 
                     bluetoothStatus === 'connected' ? 'Printing Bill...' : 'Print Bill (BT)'}
                  </button>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowConfirmation(false)}
                    className="flex-1 px-6 py-4 rounded-2xl text-sm font-black text-gray-400 uppercase tracking-widest hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200"
                  >
                    Discard
                  </button>
                  <button 
                    onClick={handleConfirm}
                    disabled={detectedItems.filter(i => i.matchedProduct).length === 0}
                    className="flex-1 bg-primary text-white px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5" />
                    Add {detectedItems.filter(i => i.matchedProduct).length} to Cart
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
