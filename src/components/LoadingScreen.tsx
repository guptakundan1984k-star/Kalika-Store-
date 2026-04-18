import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './Logo';
import { Cookie, Wheat, Sparkles, PenTool, Package, ShoppingBag } from 'lucide-react';

const FMCG_ITEMS = [
  { icon: Cookie, color: 'text-amber-600', label: 'Biscuits' },
  { icon: Wheat, color: 'text-yellow-600', label: 'Staples' },
  { icon: Sparkles, color: 'text-blue-400', label: 'Cleaning' },
  { icon: PenTool, color: 'text-purple-500', label: 'Stationery' },
  { icon: Package, color: 'text-orange-500', label: 'Groceries' },
  { icon: ShoppingBag, color: 'text-primary', label: 'Essentials' },
];

export const LoadingScreen: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const [revealLogo, setRevealLogo] = useState(false);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    // Fall items one by one
    FMCG_ITEMS.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setVisibleItems(prev => [...prev, i]);
      }, i * 400));
    });

    // Reveal logo after items fall
    timers.push(setTimeout(() => {
      setRevealLogo(true);
    }, FMCG_ITEMS.length * 400 + 500));

    // Call onComplete after animations
    timers.push(setTimeout(() => {
      onComplete?.();
    }, 5000)); // Total duration around 5 seconds

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 1, ease: 'circOut' }}
      className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="relative flex flex-col items-center gap-12">
        {/* Decorative Background Elements */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.05, scale: 1 }}
          transition={{ duration: 2 }}
          className="absolute -inset-24 bg-primary rounded-full blur-[100px] pointer-events-none"
        />

        {/* Falling Items Container */}
        <div className="flex gap-8 h-24 items-end relative z-10">
          <AnimatePresence>
            {visibleItems.map((index) => {
              const Item = FMCG_ITEMS[index];
              return (
                <motion.div
                  key={index}
                  initial={{ y: -500, opacity: 0, rotate: -45 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  transition={{ 
                    type: "spring", 
                    damping: 12, 
                    stiffness: 100,
                    duration: 0.8 
                  }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={`w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-gray-200/50 ${Item.color} border border-gray-50`}>
                    <Item.icon className="w-8 h-8" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {Item.label}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Logo Reveal Section */}
        <div className="relative h-20 flex items-center justify-center overflow-hidden px-12">
          <AnimatePresence>
            {revealLogo && (
              <motion.div
                initial={{ x: '-100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "circOut" }}
                className="flex flex-col items-center"
              >
                <Logo />
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="h-0.5 bg-primary mt-4 rounded-full"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="text-[12px] font-black text-primary uppercase tracking-[0.5em] animate-pulse absolute -bottom-16"
        >
          Kalika Store Essentials
        </motion.p>
      </div>
    </motion.div>
  );
};
