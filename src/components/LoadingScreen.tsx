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
  { label: 'MANY MORE', icon: Sparkles },
];

export const LoadingScreen: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const [index, setIndex] = useState(0);
  const [showLogo, setShowLogo] = useState(false);

  useEffect(() => {
    if (index < ITEMS.length - 1) {
      const timer = setTimeout(() => {
        setIndex(prev => prev + 1);
      }, 1000); // 1 sec each
      return () => clearTimeout(timer);
    } else if (!showLogo) {
      const timer = setTimeout(() => {
        setShowLogo(true);
      }, 1000); // 1 sec for last item
      return () => clearTimeout(timer);
    } else {
      const completeTimer = setTimeout(() => {
        onComplete?.();
      }, 2000); // 2 secs for Kalika Store photo
      return () => clearTimeout(completeTimer);
    }
  }, [index, showLogo, onComplete]);

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
          {!showLogo ? (
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
                      className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter italic uppercase"
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
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="flex flex-col items-center gap-10"
            >
              <div className="relative">
                <motion.div 
                  initial={{ rotate: -5, scale: 0.9 }}
                  animate={{ rotate: 0, scale: 1 }}
                  className="w-full max-w-2xl bg-white rounded-[40px] shadow-2xl shadow-primary/10 flex items-center justify-center relative overflow-hidden p-2"
                >
                  <img 
                    src="/shop_front.png" 
                    alt="Kalika Store Photo" 
                    className="w-full h-auto rounded-[32px] object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1601599561213-832382fd07ba?auto=format&fit=crop&q=80&w=1920";
                    }}
                  />
                </motion.div>
              </div>

              <div className="flex flex-col items-center gap-4 text-center">
                <motion.h1 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter uppercase italic"
                >
                  Kalika Store
                </motion.h1>
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-[10px] md:text-xs font-black uppercase tracking-[0.5em] text-primary"
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
