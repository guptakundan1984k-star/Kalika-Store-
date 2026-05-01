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
               <motion.div 
                 animate={{ y: [0, -10, 0] }}
                 transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                 className="bg-gradient-to-br from-orange-300 via-orange-100 to-orange-400 p-8 rounded-[40px] shadow-[0_20px_50px_rgba(251,191,36,0.3)] relative overflow-hidden text-center"
               >
                 {/* Shine Effect */}
                 <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shine" />
                 
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#004D40] px-6 py-2 rounded-2xl border-2 border-orange-300">
                    <span className="text-[14px] font-black text-orange-300 uppercase tracking-[0.2em]">FREE CASH</span>
                 </div>

                 <div className="mt-4 flex items-center justify-center gap-1">
                    <span className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter">₹{bonus.amount}</span>
                 </div>

                 {/* Decorative Sparkles */}
                 <Sparkles className="absolute top-4 right-4 w-6 h-6 text-orange-400 opacity-50" />
                 <div className="absolute bottom-4 left-4 w-8 h-8 bg-white/30 rounded-full blur-xl" />
               </motion.div>

               {/* Floating Coins */}
               <motion.div 
                 animate={{ y: [-5, 5, -5], rotate: [5, -5, 5] }}
                 transition={{ duration: 2.5, repeat: Infinity }}
                 className="absolute -right-2 top-10 w-16 h-16 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full shadow-2xl flex items-center justify-center border-4 border-yellow-200 z-20"
               >
                 <IndianRupee className="w-8 h-8 text-white" />
               </motion.div>
               
               <motion.div 
                 animate={{ y: [5, -5, 5], rotate: [-10, 10, -10] }}
                 transition={{ duration: 3, repeat: Infinity }}
                 className="absolute -right-4 bottom-10 w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-700 rounded-full shadow-2xl flex items-center justify-center border-2 border-yellow-200 z-20"
               >
                 <IndianRupee className="w-6 h-6 text-white" />
               </motion.div>

               <motion.div 
                 animate={{ x: [-2, 2, -2] }}
                 transition={{ duration: 2, repeat: Infinity }}
                 className="absolute -left-6 bottom-4 w-10 h-10 border-4 border-white/20 rounded-xl rotate-12"
               />
            </div>
          </div>

          {/* Bottom Info Section */}
          <div className="p-10 text-center space-y-6">
            <div className="space-y-1">
               <h3 className="text-2xl font-black text-white tracking-tight leading-none">Available in your wallet</h3>
               <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">{bonus.description}</p>
            </div>

            <div className="flex items-center justify-center gap-3 bg-black/40 px-6 py-4 rounded-[28px] border border-white/10 backdrop-blur-sm">
               <Clock className="w-8 h-8 text-orange-300" />
               <span className="text-xl font-black text-white tracking-tight leading-none">Expires in {daysLeft} days.</span>
            </div>

            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest leading-relaxed">
              No minimum order value. *T&C applied.
            </p>

            <button 
              onClick={handleShopNow}
              className="w-full bg-white text-[#004D40] py-6 rounded-[32px] font-black text-xl uppercase tracking-widest shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              Shop now
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
