import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, X, Sparkles, ShieldCheck, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginPromptModal: React.FC<LoginPromptModalProps> = ({ isOpen, onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('hideLoginPrompt', 'true');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden"
        >
          <div className="p-10 space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Join Kalika Store</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sign in for a better experience</p>
              </div>
              <button 
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Earn Loyalty Points</h4>
                  <p className="text-xs text-gray-500 font-medium">Get Kalika Coins on every purchase and redeem them for discounts.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Track Your Orders</h4>
                  <p className="text-xs text-gray-500 font-medium">Real-time updates on your deliveries and order history.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Secure Checkout</h4>
                  <p className="text-xs text-gray-500 font-medium">Save your addresses and payment methods for faster shopping.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Link 
                to="/login"
                onClick={handleClose}
                className="w-full flex items-center justify-center gap-3 bg-primary text-white font-bold py-5 rounded-3xl shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95"
              >
                <LogIn className="w-6 h-6" />
                Sign In Now
              </Link>
              
              <div className="flex items-center justify-center gap-2">
                <input 
                  type="checkbox" 
                  id="dontShow"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="dontShow" className="text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer">
                  Don't show this again
                </label>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
