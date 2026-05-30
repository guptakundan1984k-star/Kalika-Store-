import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, ShoppingBag, Clock, IndianRupee } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { db, doc, updateDoc } from '../firebase';
import { deleteField } from 'firebase/firestore';

interface BonusBannerProps {
  user: UserProfile;
}

export const BonusBanner: React.FC<BonusBannerProps> = ({ user }) => {
  const navigate = useNavigate();
  const bonus = user?.pendingBonus;

  if (!user || !bonus) return null;

  const handleClose = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        pendingBonus: deleteField()
      });
    } catch (e) {
      console.error("Failed to clear bonus notification", e);
    }
  };

  const handleShopNow = () => {
    handleClose();
    navigate('/products');
  };

  const daysLeft = bonus.expiresAt ? Math.ceil((bonus.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)) : 3;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
      >
        <motion.div 
          initial={{ scale: 0.8, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, y: 50, opacity: 0 }}
          className="relative w-full max-w-sm rounded-[48px] overflow-hidden shadow-2xl bg-[#004D40]"
        >
          {/* Top Decorative Section */}
          <div className="relative h-64 bg-gray-900 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-20">
               <div className="grid grid-cols-4 gap-2 p-2">
                 {[...Array(8)].map((_, i) => (
                   <div key={i} className="aspect-square bg-white/10 rounded-2xl" />
                 ))}
               </div>
            </div>
            
            <button 
              onClick={handleClose}
              className="absolute top-6 right-6 w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-900 shadow-xl z-20 hover:scale-110 active:scale-95 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Main Badge Container */}
            <div className="relative z-10 w-full px-8 pt-12">
               <div className="bg-gradient-to-br from-amber-100 to-amber-200 p-8 rounded-[32px] border border-amber-300 shadow-md relative overflow-hidden text-center">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#004D40] px-6 py-2 rounded-xl border border-amber-300">
                    <span className="text-[11px] font-black text-amber-200 uppercase tracking-[0.2em]">FREE CASH</span>
                 </div>

                 <div className="mt-4 flex items-center justify-center gap-1">
                    <span className="text-5xl md:text-6xl font-black text-gray-900 tracking-tighter">₹{bonus.amount}</span>
                 </div>

                 <Sparkles className="absolute top-4 right-4 w-5 h-5 text-amber-500/40" />
               </div>

               {/* Standard Flat Badge Ring */}
               <div className="absolute -right-2 top-10 w-14 h-14 bg-amber-500 rounded-full shadow-md flex items-center justify-center border-4 border-white z-20">
                 <IndianRupee className="w-6 h-6 text-white" />
               </div>
               
               <div className="absolute -right-4 bottom-10 w-10 h-10 bg-amber-600 rounded-full shadow-md flex items-center justify-center border-2 border-white z-20">
                 <IndianRupee className="w-4 h-4 text-white" />
               </div>
            </div>
          </div>

          {/* Bottom Info Section */}
          <div className="p-10 text-center space-y-6">
            <div className="space-y-1">
               <h3 className="text-xl font-black text-white tracking-tight leading-none">Available in your wallet</h3>
               <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">{bonus.description}</p>
            </div>

            <div className="flex items-center justify-center gap-3 bg-black/40 px-6 py-4 rounded-2xl border border-white/10">
               <Clock className="w-5 h-5 text-amber-300" />
               <span className="text-lg font-bold text-white tracking-tight leading-none">Expires in {daysLeft} days.</span>
            </div>

            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest leading-relaxed">
              No minimum order value. *T&C applied.
            </p>

            <button 
              onClick={handleShopNow}
              className="w-full bg-white text-[#004D40] py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-md hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Shop now
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
