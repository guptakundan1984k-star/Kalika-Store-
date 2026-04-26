import React, { useState, useEffect } from 'react';
import { LoadingScreen } from './LoadingScreen';
import { AnimatePresence, motion } from 'motion/react';

interface PageLoaderProps {
  children: React.ReactNode;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};
