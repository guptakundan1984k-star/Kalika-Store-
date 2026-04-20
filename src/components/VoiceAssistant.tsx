
import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { Product } from '../types';

interface VoiceAssistantProps {
  onAddToCart: (productName: string) => boolean;
  onPlaceOrder: () => void;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onAddToCart, onPlaceOrder }) => {
  const { language, t, isVoiceEnabled, setIsVoiceEnabled } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const speak = useCallback((text: string) => {
    if (!isVoiceEnabled) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
    window.speechSynthesis.speak(utterance);
  }, [isVoiceEnabled, language]);

  const processCommand = useCallback((text: string) => {
    const lowerText = text.toLowerCase().trim();
    console.log("Processing command:", lowerText);
    
    // English Commands
    if (language === 'en') {
      if (lowerText.includes('fresh milk')) {
        onAddToCart('Fresh Milk');
        speak("Fresh milk added to cart");
        setFeedback("Milk Added");
        return;
      }
      if ((lowerText.includes('add') || lowerText.includes('put')) && (lowerText.includes('cart') || lowerText.includes('basket'))) {
        const productName = lowerText
          .replace(/add|put|to my cart|to cart|in my cart|in cart|this|please/g, '')
          .trim();
        
        const success = onAddToCart(productName);
        if (success) {
          setTimeout(() => {
            speak(t('addedToCart'));
            setFeedback(t('addedToCart'));
          }, 500);
        } else {
          speak("I couldn't find that product. Please try again.");
          setFeedback("Product not found");
        }
      } else if (lowerText.includes('place order') || lowerText.includes('order my cart') || lowerText.includes('checkout')) {
        onPlaceOrder();
        speak(t('voiceAskAddress'));
        setFeedback(t('voiceAskAddress'));
      }
    } 
    // Hindi Commands
    else if (language === 'hi') {
      // "कार्ट में जोड़ें", "इसे कार्ट में डालें", "दूध कार्ट में जोड़ें"
      if ((lowerText.includes('जोड़ें') || lowerText.includes('डालें') || lowerText.includes('add')) && (lowerText.includes('कार्ट') || lowerText.includes('cart'))) {
        const productName = lowerText
          .replace(/जोड़ें|डालें|कार्ट में|कार्ट|में|इसे|कृपया|add|cart/g, '')
          .trim();

        const success = onAddToCart(productName);
        if (success) {
          setTimeout(() => {
            speak("कार्ट में जोड़ दिया गया है");
            setFeedback("कार्ट में जोड़ा गया");
          }, 500);
        } else {
          speak("मुझे वह उत्पाद नहीं मिला। कृपया फिर से प्रयास करें।");
          setFeedback("उत्पाद नहीं मिला");
        }
      } else if (lowerText.includes('ऑर्डर दें') || lowerText.includes('आर्डर') || lowerText.includes('चेकआउट') || lowerText.includes('order')) {
        onPlaceOrder();
        speak("कृपया अपना पता बताएं");
        setFeedback("पता बताएं");
      }
    }
  }, [language, onAddToCart, onPlaceOrder, speak, t]);

  useEffect(() => {
    if (!isListening) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech recognition not supported in this browser.");
      setFeedback("Speech recognition not supported in this browser.");
      setIsListening(false);
      return;
    }

    console.log("Starting speech recognition...");
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      console.log("Speech recognition started");
      setFeedback(t('voiceListening'));
    };

    recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript;
      console.log("Speech recognition result:", result);
      setTranscript(result);
      processCommand(result);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setFeedback("Microphone access denied. Please allow it in settings.");
      } else if (event.error === 'no-speech') {
        setFeedback("No speech detected. Try again.");
      } else {
        setFeedback(t('voiceError'));
      }
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start recognition:", e);
      setIsListening(false);
    }

    return () => {
      recognition.stop();
    };
  }, [isListening, language, processCommand, t]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  if (!isVoiceEnabled) return null;

  return (
    <motion.div 
      drag="y"
      dragConstraints={{ top: -500, bottom: 0 }}
      className="fixed bottom-24 left-6 z-50 flex flex-col items-start gap-4 touch-none cursor-grab active:cursor-grabbing"
    >
      <AnimatePresence>
        {isVoiceEnabled && !isListening && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -20 }}
            className="bg-white/80 backdrop-blur-md p-4 rounded-3xl shadow-xl border border-gray-100 max-w-[200px] space-y-2"
          >
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">{t('voiceSupport')}</span>
            </div>
            <p className="text-[10px] font-bold text-gray-500 leading-tight">
              {t('voiceCommandHint')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-primary text-white px-4 py-2 rounded-2xl shadow-xl text-xs font-bold"
          >
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        {isListening && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1.5 }}
            className="absolute inset-0 bg-red-500/20 rounded-full -z-10"
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsListening(!isListening)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all ${
            isListening ? 'bg-red-500 text-white' : 'bg-primary text-white hover:bg-primary-dark'
          }`}
          aria-label={isListening ? "Stop listening" : "Start listening"}
        >
          {isListening ? <Loader2 className="w-6 h-6 animate-spin" /> : <Mic className="w-6 h-6" />}
        </motion.button>
      </div>
    </motion.div>
  );
};
