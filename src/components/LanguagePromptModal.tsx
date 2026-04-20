
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Languages, Check, X, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const LanguagePromptModal: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hasPrompted = localStorage.getItem('app_language_prompted');
    if (!hasPrompted && language === 'en') {
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [language]);

  const handleTranslate = () => {
    setLanguage('hi');
    localStorage.setItem('app_language_prompted', 'true');
    setShow(false);
  };

  const handleDecline = () => {
    localStorage.setItem('app_language_prompted', 'true');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[40px] shadow-2xl border border-primary/20 p-8 max-w-sm w-full space-y-6 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
            
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary relative">
                <Languages className="w-10 h-10" />
                <div className="absolute -top-2 -right-2 bg-white p-2 rounded-xl shadow-lg border border-gray-100">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-black text-gray-900 tracking-tight leading-tight">
                  क्या आप हिंदी में अनुवाद करना चाहते हैं?
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Translate to Hindi?
                </p>
                <p className="text-sm font-medium text-gray-500">
                  पूरे स्टोर को हिंदी भाषा में देखने के लिए हाँ चुनें।
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleDecline}
                className="flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all border border-gray-100"
              >
                <X className="w-4 h-4" /> No
              </button>
              <button
                onClick={handleTranslate}
                className="flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-primary text-white shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
              >
                <Check className="w-4 h-4" /> हाँ / Yes
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
