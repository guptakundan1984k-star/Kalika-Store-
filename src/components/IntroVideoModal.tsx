
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Volume2, Sparkles, ShoppingCart, Search, Heart, MapPin, Languages, Mic, UserPlus } from 'lucide-react';

interface IntroVideoModalProps {
  onClose: () => void;
}

export const IntroVideoModal: React.FC<IntroVideoModalProps> = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const features = [
    {
      title: "Welcome to Kalika Store",
      hi: "कालिका स्टोर में आपका स्वागत है",
      description: "Experience the next generation of grocery shopping with AI power.",
      icon: Sparkles,
      color: "bg-primary"
    },
    {
      title: "Voice Search & Shopping",
      hi: "वॉइस सर्च और शॉपिंग",
      description: "Just speak to find items, add to cart, or place orders. Try 'Add milk to cart'.",
      icon: Mic,
      color: "bg-blue-500"
    },
    {
      title: "AI Image Search",
      hi: "एआई इमेज सर्च",
      description: "Upload a photo of any product to find it instantly in our catalog.",
      icon: Search,
      color: "bg-purple-500"
    },
    {
      title: "Wishlist & Cart",
      hi: "विशलिस्ट और कार्ट",
      description: "Save your favorites and manage your basket with ease.",
      icon: Heart,
      color: "bg-red-500"
    },
    {
      title: "Digital Bill System",
      hi: "डिजिटल बिल सिस्टम",
      description: "Automatic bill generation with photo verification for every order.",
      icon: ShoppingCart,
      color: "bg-green-500"
    },
    {
      title: "Multi-Language Support",
      hi: "बहु-भाषा सहायता",
      description: "Shop in English or Hindi with real-time translation support.",
      icon: Languages,
      color: "bg-orange-500"
    },
    {
      title: "Fast Delivery",
      hi: "तेज़ डिलीवरी",
      description: "We deliver within 10km in Ranchi. Track your orders in real-time.",
      icon: MapPin,
      color: "bg-indigo-500"
    }
  ];

  useEffect(() => {
    if (isPlaying) {
      const timer = setInterval(() => {
        setStep(prev => {
          if (prev === features.length - 1) {
            clearInterval(timer);
            return prev;
          }
          return prev + 1;
        });
      }, 5000);

      // Hindi Voiceover Simulation
      const speech = new SpeechSynthesisUtterance();
      speech.text = features[step].hi + ". " + features[step].description;
      speech.lang = 'hi-IN';
      window.speechSynthesis.speak(speech);

      return () => {
        clearInterval(timer);
        window.speechSynthesis.cancel();
      };
    }
  }, [isPlaying, step]);

  const currentFeature = features[step];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12 bg-black/90 backdrop-blur-xl">
      <AnimatePresence mode="wait">
        {!isPlaying ? (
          <motion.div 
            key="intro"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="text-center space-y-8 max-w-2xl"
          >
            <div className="w-32 h-32 bg-primary/20 rounded-[40px] flex items-center justify-center text-primary mx-auto shadow-2xl shadow-primary/20 animate-pulse">
              <Sparkles className="w-16 h-16" />
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter">Namaste! Discover KalikaStore</h2>
              <p className="text-xl text-white/60 font-medium tracking-tight">Watch our 30-second feature guide in Hindi.</p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <button 
                onClick={() => setIsPlaying(true)}
                className="bg-white text-black px-12 py-6 rounded-[32px] font-black text-lg flex items-center gap-4 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-white/10 group"
              >
                <Play className="w-6 h-6 fill-black group-hover:scale-110 transition-transform" />
                START TOUR
              </button>
              <button 
                onClick={onClose}
                className="text-white/40 font-black text-sm hover:text-white transition-colors"
              >
                Skip Induction
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="player"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full flex flex-col items-center justify-center gap-12"
          >
            <div className="absolute top-8 right-8">
              <button 
                onClick={onClose}
                className="p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="w-full max-w-5xl aspect-video rounded-[48px] overflow-hidden bg-white/5 border border-white/10 relative shadow-2xl flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={step}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="flex flex-col items-center text-center p-12 md:p-24 space-y-12"
                >
                  <div className={`w-32 h-32 md:w-48 md:h-48 ${currentFeature.color} rounded-[48px] flex items-center justify-center text-white shadow-2xl shadow-white/10`}>
                    <currentFeature.icon className="w-16 h-16 md:w-24 md:h-24" />
                  </div>
                  <div className="space-y-6">
                    <h3 className="text-4xl md:text-7xl font-black text-white tracking-tighter">{currentFeature.title}</h3>
                    <p className="text-2xl md:text-4xl font-black text-primary tracking-tight">{currentFeature.hi}</p>
                    <p className="text-lg md:text-xl text-white/50 font-medium max-w-2xl mx-auto">{currentFeature.description}</p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Player Controls UI (Static) */}
              <div className="absolute bottom-12 left-12 right-12 flex flex-col gap-6">
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((step + 1) / features.length) * 100}%` }}
                    className="h-full bg-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Volume2 className="w-5 h-5 text-primary" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Hindi Audio Enabled</span>
                  </div>
                  <div className="flex gap-2">
                    {features.map((_, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full ${i === step ? 'bg-primary shadow-lg shadow-primary/50' : 'bg-white/20'}`} />
                    ))}
                  </div>
                  <button 
                    onClick={onClose}
                    className="text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-white"
                  >
                    Finish
                  </button>
                </div>
              </div>
            </div>
            
            {step === features.length - 1 && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={onClose}
                className="bg-primary text-white px-12 py-5 rounded-[32px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
              >
                Let's Start Shopping
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
