import React from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

interface PageLoaderProps {
  children?: React.ReactNode;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ children }) => {
  if (children) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[60vh] py-20">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shadow-sm"
      >
        <Loader2 className="w-6 h-6 text-primary" />
      </motion.div>
      <p className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Loading Kalika Store...</p>
    </div>
  );
};
