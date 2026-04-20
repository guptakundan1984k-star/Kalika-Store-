
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import { StoreSettings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface StoreStatusBannerProps {
  settings?: StoreSettings | null;
}

export const StoreStatusBanner: React.FC<StoreStatusBannerProps> = ({ settings }) => {
  const { t } = useLanguage();
  if (!settings) return null;

  // Manual closed is RED
  const isManuallyClosed = settings.isOpen === false;
  // Schedule closed is ORANGE (if not manually closed)
  const isScheduleClosed = !isManuallyClosed && !settings.isFunctionallyOpen;

  return (
    <AnimatePresence>
      {(isManuallyClosed || isScheduleClosed) && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className={`w-full ${isManuallyClosed ? 'bg-red-600' : 'bg-orange-500'} text-white overflow-hidden`}
        >
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-[10px] md:text-sm font-black uppercase tracking-widest leading-none">
                {isManuallyClosed 
                  ? t('storeClosedManual') || "Store is currently closed for maintenance. Only Pre-orders are allowed." 
                  : t('preOrderOnly') || "Standard delivery hours ended. Currently accepting PRE-ORDERS only."
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest">{t('preOrderNow')}</span>
              </div>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
