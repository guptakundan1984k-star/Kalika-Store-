
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import { StoreSettings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface StoreStatusBannerProps {
  settings?: StoreSettings | null;
  user?: any;
}

export const StoreStatusBanner: React.FC<StoreStatusBannerProps> = ({ settings, user }) => {
  const { t } = useLanguage();
  if (!settings) return null;

  const isAdmin = user?.role === 'admin';

  // Manual closed is RED
  const isManuallyClosed = settings.isOpen === false;

  // USER REQUEST: remove the store open bar only display it when the store is closed
  if (settings.isFunctionallyOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="w-full bg-red-600 text-white overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs md:text-sm font-black uppercase tracking-[0.2em] text-white">
              Currently accepting PRE-ORDERS only
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
