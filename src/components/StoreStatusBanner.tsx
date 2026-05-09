
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, ShoppingBag, Clock, CloudRain, Calendar } from 'lucide-react';
import { StoreSettings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useStore } from '../contexts/StoreContext';

interface StoreStatusBannerProps {
  settings?: StoreSettings | null;
  user?: any;
}

export const StoreStatusBanner: React.FC<StoreStatusBannerProps> = ({ settings, user }) => {
  const { t } = useLanguage();
  const { envStatus } = useStore();
  
  if (!settings && !envStatus) return null;

  const isAdmin = user?.role === 'admin';

  // Environmental Status (Weather/Calendar)
  const isEnvClosed = envStatus?.status === 'closed';
  const isEnvDelayed = envStatus?.status === 'delayed';

  // Store is functionally closed by schedule or manual setting
  const isStoreClosed = !settings?.isFunctionallyOpen;

  if (!isStoreClosed && !isEnvClosed && !isEnvDelayed) return null;

  let bannerConfig = {
    bg: 'bg-red-600',
    icon: <ShoppingBag className="w-5 h-5 text-white" />,
    message: 'Currently accepting PRE-ORDERS only',
    reason: settings?.message
  };

  if (isEnvClosed) {
    bannerConfig = {
      bg: 'bg-red-700',
      icon: <Calendar className="w-5 h-5 text-white" />,
      message: 'Delivery Closed Tomorrow',
      reason: envStatus?.reason || 'Holiday/Occasion'
    };
  } else if (isEnvDelayed) {
    bannerConfig = {
      bg: 'bg-amber-600',
      icon: <CloudRain className="w-5 h-5 text-white" />,
      message: 'Delivery Delayed',
      reason: envStatus?.reason || 'Weather conditions'
    };
  } else if (isStoreClosed) {
    bannerConfig = {
      bg: 'bg-gray-900',
      icon: <Clock className="w-5 h-5 text-white" />,
      message: 'Store is currently closed',
      reason: settings?.message || 'Check our operating hours'
    };
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={`w-full ${bannerConfig.bg} text-white overflow-hidden`}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                {bannerConfig.icon}
              </div>
              <p className="text-xs md:text-sm font-black uppercase tracking-[0.2em] text-white">
                {bannerConfig.message}
              </p>
            </div>
            {bannerConfig.reason && (
              <p className="text-[10px] md:text-xs font-bold text-white/80 uppercase tracking-widest border-t md:border-t-0 md:border-l border-white/20 pt-1 md:pt-0 md:pl-6">
                {bannerConfig.reason}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
