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
  ShoppingBag
} from 'lucide-react';

const ITEMS = [
  { icon: Cookie, label: 'Biscuits', color: 'text-orange-500', bg: 'bg-orange-50' },
  { icon: PenTool, label: 'Quality Pens', color: 'text-blue-500', bg: 'bg-blue-50' },
  { icon: Wheat, label: 'Rice Pack', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { icon: Sparkles, label: 'Kurkure Munch', color: 'text-red-500', bg: 'bg-red-50' },
  { icon: Box, label: 'Tetra Juice', color: 'text-green-500', bg: 'bg-green-50' },
  { icon: GlassWater, label: 'Bottle', color: 'text-cyan-500', bg: 'bg-cyan-50' },
];

export const LoadingScreen: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const [index, setIndex] = useState(0);
  const [showLogo, setShowLogo] = useState(false);

  useEffect(() => {
    // 7 seconds total sequence
    const totalItems = ITEMS.length;
    const itemInterval = 800; // 800ms per item * 6 = 4.8s
    
    const interval = setInterval(() => {
      setIndex(prev => {
        if (prev === totalItems - 1) {
          setShowLogo(true);
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, itemInterval);

    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, 7000); // 7 seconds

    return () => {
      clearInterval(interval);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

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

      <div className="relative flex flex-col items-center justify-center w-full max-w-sm">
        <AnimatePresence mode="wait">
          {!showLogo ? (
            <motion.div
              key={ITEMS[index].label}
              initial={{ x: 200, opacity: 0, scale: 0.5, rotate: 10 }}
              animate={{ x: 0, opacity: 1, scale: 1, rotate: 0 }}
              exit={{ x: -200, opacity: 0, scale: 0.5, rotate: -10 }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 25
              }}
              className="flex flex-col items-center gap-8"
            >
              <div className={`w-36 h-36 ${ITEMS[index].bg} rounded-[48px] flex items-center justify-center shadow-2xl shadow-gray-200 border-4 border-white`}>
                {React.createElement(ITEMS[index].icon, {
                  className: `w-20 h-20 ${ITEMS[index].color}`,
                  strokeWidth: 2
                })}
              </div>
              <div className="flex flex-col items-center gap-3">
                <motion.span 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm font-black uppercase tracking-[0.5em] text-gray-900"
                >
                  {ITEMS[index].label}
                </motion.span>
                <div className="flex gap-1.5 mt-2">
                  {ITEMS.map((_, i) => (
                    <motion.div 
                      key={i}
                      layoutId="indicator"
                      className={`h-1 rounded-full transition-all duration-300 ${i === index ? 'w-8 bg-primary' : 'w-2 bg-gray-100'}`} 
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
              <Logo />
              <div className="flex flex-col items-center gap-4">
                <div className="w-56 h-1.5 bg-gray-50 rounded-full overflow-hidden relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1.2, ease: "circIn" }}
                    className="absolute inset-0 bg-primary shadow-[0_0_15px_rgba(255,103,31,0.5)]"
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.7em] text-primary animate-pulse">
                    Kalika Store
                  </span>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400">
                    Quality Essentials Delivered
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
