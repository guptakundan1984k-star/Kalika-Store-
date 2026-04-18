import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Package, User, CheckCircle2 } from 'lucide-react';
import { db, collection, addDoc } from '../firebase';

interface ProductRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProductName?: string;
}

export const ProductRequestModal: React.FC<ProductRequestModalProps> = ({ isOpen, onClose, initialProductName = '' }) => {
  const [productName, setProductName] = useState(initialProductName);
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const requestData = {
        productName,
        customerName,
        status: 'Pending',
        createdAt: Date.now()
      };
      
      await addDoc(collection(db, 'product_requests'), requestData);
      
      // Notify Admins via WhatsApp
      const adminNumbers = ['916205284423', '919608123427', '919905516803'];
      const message = `New Product Request!%0AProduct: ${productName}%0ACustomer: ${customerName}`;
      window.open(`https://wa.me/${adminNumbers[0]}?text=${message}`, '_blank');
      
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting request:", error);
      alert("Failed to send request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-hidden">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden pointer-events-auto"
            style={{ touchAction: 'none' }}
          >
            <div className="p-10 space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Request Product</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ask owner to add an item</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              {submitted ? (
                <div className="text-center space-y-6 py-8">
                  <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-500/30">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-gray-900">Request Sent!</h4>
                    <p className="text-sm text-gray-500 font-medium">We've notified the store owner about your request for <span className="text-gray-900 font-bold">{productName}</span>.</p>
                  </div>
                  <button 
                    onClick={onClose}
                    className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl hover:bg-black transition-all"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Product Name</label>
                    <div className="relative group">
                      <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                      <input 
                        type="text" 
                        required
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="e.g. Organic Honey"
                        className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Your Name</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                      <input 
                        type="text" 
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-primary text-white font-bold py-5 rounded-3xl shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95 disabled:opacity-50 group"
                  >
                    {loading ? 'Sending...' : (
                      <>
                        Send Request
                        <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
