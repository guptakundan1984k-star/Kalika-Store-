import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './Logo';
import { 
  Cookie, 
  PenTool, 
  Wheat, 
  Sparkles, 
  Box, 
  GlassWater,
  Milk,
  Package,
  ShoppingBag,
  Carrot,
  Apple,
  Croissant,
  Beef,
  Coffee,
  Truck,
  Star,
  SprayCan,
  RefreshCw,
  User,
  ShieldCheck
} from 'lucide-react';

const ITEMS = [
  { label: 'BISCUIT', icon: Cookie, duration: 1000 },
  { label: 'STAPLES', icon: Wheat, duration: 1000 },
  { label: 'CLEANING SUPPLIES', icon: SprayCan, duration: 1000 },
  { label: 'AND MANY MORE..', icon: Sparkles, duration: 300 },
];

export const LoadingScreen: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const [index, setIndex] = useState(0);
  const [showComplete, setShowComplete] = useState(false);

  useEffect(() => {
    const currentDuration = ITEMS[index]?.duration || 1000;
    
    if (index < ITEMS.length - 1) {
      const timer = setTimeout(() => {
        setIndex(prev => prev + 1);
      }, currentDuration);
      return () => clearTimeout(timer);
    } else if (!showComplete) {
      const timer = setTimeout(() => {
        setShowComplete(true);
      }, currentDuration);
      return () => clearTimeout(timer);
    } else {
      const completeTimer = setTimeout(() => {
        onComplete?.();
      }, 1500); // Shorter final reveal
      return () => clearTimeout(completeTimer);
    }
  }, [index, showComplete, onComplete]);

  const currentItem = ITEMS[index] || ITEMS[0];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="fixed inset-0 z-[10000] bg-white flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="relative flex flex-col items-center justify-center w-full max-w-lg">
        <AnimatePresence mode="wait">
          {!showComplete ? (
            <motion.div
              key={currentItem.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col items-center gap-8"
            >
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-2xl flex items-center justify-center relative">
                <motion.div
                  initial={{ scale: 0.8, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 15 }}
                >
                  <currentItem.icon className="w-10 h-10" />
                </motion.div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="flex justify-center flex-wrap px-4 gap-1">
                  {currentItem.label.split('').map((char, i) => (
                    <motion.span
                      key={`${index}-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase text-center"
                    >
                      {char === ' ' ? '\u00A0' : char}
                    </motion.span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  {ITEMS.map((_, i) => (
                    <div 
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-8 bg-primary shadow-sm' : 'w-2 bg-gray-100'}`} 
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <Logo large />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gray-50 px-8 py-4 rounded-2xl border border-gray-150 shadow-sm relative"
                >
                  <h1 
                    className="text-5xl md:text-6xl font-black text-gray-900 tracking-tighter uppercase font-sans relative z-10"
                  >
                    Kalika Store
                  </h1>
                </motion.div>
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xs md:text-xs font-bold uppercase tracking-[0.4em] text-primary"
                >
                  Premium Essentials Delivered
                </motion.span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>

  );
};
