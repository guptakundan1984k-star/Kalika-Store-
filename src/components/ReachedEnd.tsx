import React, { useEffect } from 'react';
import { motion, useInView } from 'motion/react';
import { Flag, Star, ArrowUp } from 'lucide-react';

export const ReachedEnd: React.FC = () => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.1 });

  useEffect(() => {
    const handleScroll = (e: WheelEvent | TouchEvent) => {
      if (isInView) {
        // Find if user is trying to scroll down
        let isScrollingDown = false;
        if ('deltaY' in e) {
          isScrollingDown = e.deltaY > 0;
        } else if ('touches' in e) {
          // Simplification for touch
          // isScrollingDown = true; // Can be more complex with touchstart tracking
        }

        if (isScrollingDown) {
          e.preventDefault();
        }
      }
    };

    if (isInView) {
      document.body.style.overflow = 'hidden';
      // To allow scrolling UP but not DOWN is hard with overflow: hidden.
      // So we use a fixed positioning or specific event block.
      // Let's stick to the visual request: "don't allow scroll after reach at end"
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isInView]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
       document.body.style.overflow = 'auto';
    }, 100);
  };

  return (
    <motion.div 
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`py-16 px-6 text-center flex flex-col items-center transition-colors duration-1000 bg-white`}
    >
      <div className="relative mb-6">
        {/* Decorative Circles */}
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }} 
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute inset-0 bg-yellow-400/20 blur-3xl rounded-full"
        />
        
        <div className="relative w-24 h-24 bg-yellow-100 rounded-[40px] flex items-center justify-center border-4 border-white shadow-xl shadow-yellow-200/50">
          <Flag className="w-10 h-10 text-yellow-600" />
        </div>
        
        {/* Floating Stars */}
        <motion.div 
          animate={{ y: [-5, 5, -5], rotate: 45 }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute -top-2 -right-2 text-yellow-500"
        >
          <Star className="w-6 h-6 fill-current" />
        </motion.div>
        
        <motion.div 
          animate={{ y: [5, -5, 5], rotate: -20 }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="absolute -bottom-2 -left-2 text-yellow-400"
        >
          <Star className="w-5 h-5 fill-current" />
        </motion.div>
      </div>

      <div className="space-y-2 mb-8">
        <h3 className="text-2xl font-black text-gray-900 tracking-tight italic">
          You've reached <span className="text-yellow-600">the end!</span>
        </h3>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
          That's all for now. Happy Shopping!
        </p>
      </div>

      <button 
        onClick={scrollToTop}
        className="flex items-center gap-2 px-8 py-4 bg-yellow-400 text-yellow-900 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-yellow-200 transition-all hover:scale-105 active:scale-95 group"
      >
        <ArrowUp className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
        Back to top
      </button>

      {/* Decorative Moon Surface Line */}
      <div className="w-32 h-1.5 bg-yellow-100 rounded-full mt-12 opacity-50" />
    </motion.div>
  );
};
