
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Volume2, VolumeX, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { Product, UserProfile } from '../types';
import { answerAdminQuery } from '../services/geminiService';
import { db, doc, setDoc, updateDoc, arrayUnion } from '../firebase';

interface VoiceAssistantProps {
  onAddToCart: (productName: string) => boolean;
  onPlaceOrder: () => void;
  onSearch: (query: string) => void;
  onLogout?: () => void;
  user?: UserProfile;
  cart: any[];
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onAddToCart, onPlaceOrder, onSearch, onLogout, user, cart }) => {
  const navigate = useNavigate();
  const { language, t, isVoiceEnabled, setIsVoiceEnabled } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const speak = useCallback((text: string) => {
    if (!isVoiceEnabled) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
    window.speechSynthesis.speak(utterance);
  }, [isVoiceEnabled, language]);

  const processCommand = useCallback(async (text: string) => {
    const lowerText = text.toLowerCase().trim();
    console.log("Processing command:", lowerText);
    
    if (!lowerText) return;

    const isHindi = language === 'hi';

    // Command: Search
    if (
      lowerText.includes('search') || lowerText.includes('find') || lowerText.includes('खोजें') || lowerText.includes('ढूँढें') || lowerText.includes('दिखाओ')
    ) {
      const query = lowerText
        .replace(/search for|search|find|please|show me|खोजें|ढूँढें|दिखाओ|कृपया|मुझे|दिखाएं|सर्च/g, '')
        .trim();
      
      onSearch(query);
      const msg = isHindi ? `${query} खोज रहा हूँ` : `Searching for ${query}`;
      speak(msg);
      setFeedback(msg);
      return;
    }
    
    // Command: Add to Cart
    if (
      (lowerText.includes('add') || lowerText.includes('put') || lowerText.includes('डालें') || lowerText.includes('जोड़ें') || lowerText.includes('लेना है')) &&
      (lowerText.includes('cart') || lowerText.includes('basket') || lowerText.includes('कार्ट') || lowerText.includes('टोकरी'))
    ) {
      const productName = lowerText
        .replace(/add|put|to my cart|to cart|in my cart|in cart|this|please|जोड़ें|डालें|कार्ट में|कार्ट|में|इसे|कृपया|टोकरी|आड|एक|दें/g, '')
        .trim();
      
      const success = onAddToCart(productName);
      if (success) {
        setTimeout(() => {
          const msg = isHindi ? "कार्ट में जोड़ दिया गया है" : t('addedToCart');
          speak(msg);
          setFeedback(msg);
        }, 500);
      } else {
        const msg = isHindi ? "मुझे वह उत्पाद नहीं मिला।" : "I couldn't find that product.";
        speak(msg);
        setFeedback(msg);
      }
      return;
    }

    // Command: Wishlist
    if (lowerText.includes('wishlist') || lowerText.includes('पसंद') || lowerText.includes('लिस्ट')) {
      window.location.href = '/wishlist';
      speak(isHindi ? "विशलिस्ट खोल रहा हूँ" : "Opening wishlist");
      return;
    }

    // Command: Checkout / Place Order
    if (lowerText.includes('order') || lowerText.includes('checkout') || lowerText.includes('खरीदें') || lowerText.includes('आर्डर')) {
      if (cart.length === 0) {
        const msg = isHindi ? "आपका कार्ट खाली है।" : "Your cart is empty. Please add items first.";
        speak(msg);
        setFeedback(msg);
        return;
      }
      onPlaceOrder();
      const msg = isHindi ? "कृपया चेकआउट पूरा करें" : "Opening checkout";
      speak(msg);
      setFeedback(msg);
      return;
    }

    // Command: Mapping/Help Navigation
    if (lowerText.includes('support') || lowerText.includes('help') || lowerText.includes('मदद')) {
      window.location.href = '/support';
      speak(isHindi ? "सपोर्ट पेज पर जा रहे हैं" : "Opening support page");
      return;
    }

    // Command: Address
    if (lowerText.includes('address') || lowerText.includes('पता')) {
      window.location.href = '/addresses';
      speak(isHindi ? "आपका पता दिखा रहा हूँ" : "Showing your addresses");
      return;
    }

    // Command: Navigation
    if (lowerText.includes('home') || lowerText.includes('घर') || lowerText.includes('शुरुआत')) {
      window.location.href = '/';
      speak(isHindi ? "होम पेज" : "Going home");
      return;
    }

    if (lowerText.includes('profile') || lowerText.includes('प्रोफाइल') || lowerText.includes('खाता')) {
      window.location.href = '/profile';
      speak(isHindi ? "आपकी प्रोफाइल" : "Opening profile");
      return;
    }

    if (lowerText.includes('orders') || lowerText.includes('इतिहास') || lowerText.includes('history')) {
      window.location.href = '/profile?tab=orders';
      speak(isHindi ? "आर्डर इतिहास" : "Showing your orders history");
      return;
    }

    if (lowerText.includes('categories') || lowerText.includes('कैटेगरी')) {
      window.location.href = '/items';
      speak(isHindi ? "सभी कैटेगरी" : "Showing all categories");
      return;
    }

    // Default: AI Knowledge Support
    setIsAiProcessing(true);
    setFeedback("Processing with Kalika AI...");
    try {
      if (lowerText.includes('refresh') || lowerText.includes('reload')) {
        window.location.reload();
        return;
      }
      if (lowerText.includes('go back') || lowerText.includes('पिछला')) {
        window.history.back();
        return;
      }
      if (lowerText.includes('locate me') || lowerText.includes('कहाँ हूँ')) {
        const locateBtn = document.querySelector('[onClick*="handleFetchLocation"]') as HTMLElement;
        if (locateBtn) locateBtn.click();
        speak("Attempting to find your location");
        return;
      }
      if (lowerText.includes('cart') || lowerText.includes('टोकरी')) {
        navigate('/cart');
        speak(isHindi ? "आपका कार्ट खोल रहा हूँ" : "Opening your cart");
        return;
      }
      if (lowerText.includes('logout') || lowerText.includes('लॉग आउट')) {
        speak(isHindi ? "लॉग आउट कर रहा हूँ" : "Logging you out");
        onLogout?.();
        return;
      }
      if (lowerText.includes('admin') || lowerText.includes('पैनल')) {
        navigate('/admin');
        speak(isHindi ? "एडमिन पैनल खोल रहा हूँ" : "Opening admin panel");
        return;
      }

      const resp = await answerAdminQuery(text, { user, language });
      setFeedback(null);
      // Speak the AI response
      speak(resp);
      setFeedback(resp);

      // Sync to admin support if logged in
      if (user?.uid) {
        const timestamp = Date.now();
        await setDoc(doc(db, 'support_queries', user.uid), {
          userId: user.uid,
          userName: user.name,
          userEmail: user.email,
          userPhone: user.phone || 'Not provided',
          status: 'pending',
          updatedAt: timestamp,
          createdAt: timestamp
        }, { merge: true });

        await updateDoc(doc(db, 'support_queries', user.uid), {
          chatHistory: arrayUnion(
            { role: 'user', content: `[Voice] ${text}` },
            { role: 'ai', content: resp }
          )
        });
      }
    } catch (e) {
      console.error("AI Assistant error:", e);
      setFeedback(t('voiceError'));
    } finally {
      setIsAiProcessing(false);
    }
  }, [cart, language, onAddToCart, onPlaceOrder, speak, t, user]);

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
      } else if (event.error === 'aborted') {
        console.log("Speech recognition aborted.");
        // Usually happens when stopped requested or browser interrupts. No need for error feedback.
      } else {
        setFeedback(t('voiceError'));
      }
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      setIsListening(false);
    };

    try {
      // Small timeout to ensure previous instances are fully cleaned up
      const startTimer = setTimeout(() => {
        try {
          recognition.start();
        } catch (e) {
          console.error("Failed to start recognition:", e);
          setIsListening(false);
        }
      }, 50);
      return () => {
        clearTimeout(startTimer);
        recognition.stop();
      };
    } catch (e) {
      console.error("Failed to setup recognition start:", e);
      setIsListening(false);
    }
  }, [isListening, language, processCommand, t]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  if (!isVoiceEnabled) return null;

  return (
    <div className="floating-container !left-auto">
      <AnimatePresence>
        {isVoiceEnabled && !isListening && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="bg-white/80 backdrop-blur-md p-4 rounded-3xl shadow-xl border border-gray-100 max-w-[200px] space-y-2 mr-0"
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
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-primary text-white px-4 py-2 rounded-2xl shadow-xl text-xs font-bold mr-0"
          >
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative pointer-events-auto">
        {isListening && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1.5 }}
            className="absolute inset-0 bg-red-500/20 rounded-full -z-10"
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}
        <button 
          onClick={() => setIsListening(!isListening)}
          className={`floating-btn ${
            isListening ? 'bg-red-500 text-white' : 'bg-primary text-white hover:bg-primary-dark'
          }`}
          aria-label={isListening ? "Stop listening" : "Start listening"}
        >
          {isListening ? <Loader2 className="w-6 h-6 animate-spin" /> : <Mic className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
};
