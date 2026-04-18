import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight } from 'lucide-react';

export const Banner: React.FC = () => {
  return (
    <div className="relative w-full h-[300px] md:h-[400px] rounded-3xl overflow-hidden shadow-2xl shadow-primary/10">
      <img 
        src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1920" 
        alt="Fresh Groceries"
        className="absolute inset-0 w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex flex-col justify-center px-8 md:px-16">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 bg-primary/20 backdrop-blur-md border border-primary/30 w-fit px-3 py-1 rounded-full mb-4"
        >
          <Sparkles className="w-4 h-4 text-secondary" />
          <span className="text-xs font-bold text-white uppercase tracking-widest">Grand Opening Offer</span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-4xl md:text-6xl font-black text-white leading-tight mb-4 tracking-tighter"
        >
          Freshness Delivered <br />
          <span className="text-secondary">To Your Doorstep</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-gray-300 text-sm md:text-lg max-w-md mb-8 font-medium"
        >
          Get up to <span className="text-white font-bold">50% OFF</span> on your first order. 
          Free delivery on orders above ₹200.
        </motion.p>
        
        <motion.button 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 bg-primary text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-primary/30 w-fit hover:bg-primary-dark transition-all group"
        >
          Shop Now
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </div>
      
      <div className="absolute bottom-6 right-6 flex gap-2">
        <div className="w-2 h-2 bg-white rounded-full" />
        <div className="w-2 h-2 bg-white/30 rounded-full" />
        <div className="w-2 h-2 bg-white/30 rounded-full" />
      </div>
    </div>
  );
};
