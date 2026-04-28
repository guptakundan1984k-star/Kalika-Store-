import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Languages, Sparkles, Volume2, Video, CheckCircle2 } from 'lucide-react';

interface FeatureExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeatureExplainerModal: React.FC<FeatureExplainerModalProps> = ({ isOpen, onClose }) => {
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  const features = {
    en: [
      { title: "Digital Wallet", desc: "Pay instantly and manage your dues with our secure wallet integration." },
      { title: "Voice Search", desc: "Simply speak to find any medicine or grocery item in our store." },
      { title: "AI Bill Analysis", desc: "Upload photos of your bills or prescriptions for instant smart processing." },
      { title: "Real-time Tracking", desc: "Track your delivery live on the map from our store to your doorstep." }
    ],
    hi: [
      { title: "डिजिटल वॉलेट", desc: "हमारे सुरक्षित वॉलेट इंटीग्रेशन के साथ तुरंत भुगतान करें और अपने बकाया का प्रबंधन करें।" },
      { title: "वॉयस सर्च", desc: "हमारे स्टोर में किसी भी दवा या किराने की वस्तु को खोजने के लिए बस बोलें।" },
      { title: "AI बिल विश्लेषण", desc: "त्वरित स्मार्ट प्रोसेसिंग के लिए अपने बिलों या नुस्खों की तस्वीरें अपलोड करें।" },
      { title: "रियल-टाइम ट्रैकिंग", desc: "हमारे स्टोर से अपने दरवाजे तक मानचित्र पर अपनी डिलीवरी को लाइव ट्रैक करें।" }
    ]
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="bg-white w-full max-w-4xl rounded-[40px] overflow-hidden shadow-2xl relative z-10 flex flex-col md:flex-row h-[85vh] md:h-auto md:max-h-[85vh]"
          >
            {/* Left Column: Video Placeholder */}
            <div className="md:w-3/5 bg-black relative flex items-center justify-center group overflow-hidden">
               {/* Video would go here. Using a high-quality placeholder with Gemini/Veo branding context */}
               <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-black pointer-events-none" />
               <div className="flex flex-col items-center gap-6 animate-pulse text-center p-12">
                  <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-xl border border-white/20">
                     <Video className="w-12 h-12 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white tracking-tight">AI Generated Explainer</h3>
                    <p className="text-white/60 text-sm font-medium uppercase tracking-widest">Powered by Google Veo 3</p>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20 backdrop-blur-md">
                     <Languages className="w-4 h-4 text-primary" />
                     <span className="text-[10px] font-black text-white uppercase tracking-widest">
                       {lang === 'en' ? 'Playing in English' : 'हिंदी में चल रहा है'}
                     </span>
                  </div>
               </div>
               
               <button className="absolute bottom-8 left-8 flex items-center gap-3 px-6 py-3 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">
                  <Play className="w-4 h-4 fill-current" />
                  Restart Video
               </button>
            </div>

            {/* Right Column: Features List */}
            <div className="md:w-2/5 p-8 md:p-12 flex flex-col h-full bg-gray-50">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <Sparkles className="w-6 h-6" />
                     </div>
                     <h2 className="text-2xl font-black text-gray-900 tracking-tight">Features</h2>
                  </div>
                  <button onClick={onClose} className="p-2 transition-colors text-gray-400 hover:text-gray-900">
                     <X className="w-6 h-6" />
                  </button>
               </div>

               {/* Language Toggle */}
               <div className="flex bg-white p-1 rounded-2xl border border-gray-100 mb-8 shadow-sm">
                  <button 
                    onClick={() => setLang('en')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${lang === 'en' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    English
                  </button>
                  <button 
                    onClick={() => setLang('hi')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${lang === 'hi' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Hindi
                  </button>
               </div>

               <div className="space-y-6 overflow-y-auto pr-4">
                  {features[lang].map((f, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="group"
                    >
                      <div className="flex gap-4 p-4 rounded-3xl group-hover:bg-white border border-transparent group-hover:border-gray-100 transition-all">
                        <div className="mt-1">
                           <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-black text-gray-900 text-sm">{f.title}</h4>
                          <p className="text-xs text-gray-500 font-medium leading-relaxed italic">{f.desc}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
               </div>

               <div className="mt-auto pt-8">
                  <button className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-gray-900/20 hover:scale-[1.02] active:scale-95 transition-all">
                    Start Shopping Now
                  </button>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
