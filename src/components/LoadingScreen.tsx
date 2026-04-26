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
  Star
} from 'lucide-react';

const ITEMS = [
  { label: 'PREMIUM STAPLES', icon: Wheat },
  { label: 'BEVERAGE', icon: Coffee },
  { label: 'BISCUITS', icon: Cookie },
  { label: 'CLEANING SUPPLIES', icon: Package },
  { label: 'AND MANY MORE..', icon: Sparkles },
];

export const LoadingScreen: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const [index, setIndex] = useState(0);
  const [showComplete, setShowComplete] = useState(false);

  useEffect(() => {
    if (index < ITEMS.length - 1) {
      const timer = setTimeout(() => {
        setIndex(prev => prev + 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (!showComplete) {
      const timer = setTimeout(() => {
        setShowComplete(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      const completeTimer = setTimeout(() => {
        onComplete?.();
      }, 2000);
      return () => clearTimeout(completeTimer);
    }
  }, [index, showComplete, onComplete]);

  const currentItem = ITEMS[index] || ITEMS[0];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
      className="fixed inset-0 z-[10000] bg-white flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background Decorative Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px]" 
        />
        <motion.div 
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px]" 
        />
      </div>

      <div className="relative flex flex-col items-center justify-center w-full max-w-lg">
        <AnimatePresence mode="wait">
          {!showComplete ? (
            <motion.div
              key={currentItem.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-8"
            >
              <div className="w-24 h-24 bg-primary/10 rounded-[32px] flex items-center justify-center text-primary relative">
                <motion.div
                  initial={{ scale: 0.5, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 12 }}
                >
                  <currentItem.icon className="w-12 h-12" />
                </motion.div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="flex items-baseline justify-center">
                  {currentItem.label.split('').map((char, i) => (
                    <motion.span
                      key={`${index}-${i}`}
                      initial={{ opacity: 0, filter: 'blur(5px)' }}
                      animate={{ opacity: 1, filter: 'blur(0px)' }}
                      transition={{ delay: i * 0.03 }}
                      className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter italic uppercase text-center"
                    >
                      {char === ' ' ? '\u00A0' : char}
                    </motion.span>
                  ))}
                </div>
                <div className="flex gap-2">
                  {ITEMS.map((_, i) => (
                    <div 
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-500 ${i === index ? 'w-10 bg-primary underline shadow-[0_0_10px_rgba(249,115,22,0.4)]' : 'w-2 bg-gray-100'}`} 
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <Logo showImage className="mb-4" />
                <motion.h1 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-6xl md:text-8xl font-black text-gray-900 tracking-tighter uppercase italic font-bubbly"
                >
                  Kalika Store
                </motion.h1>
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-xs md:text-sm font-black uppercase tracking-[0.5em] text-primary"
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
