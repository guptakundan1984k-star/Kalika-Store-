import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, RefreshCw, ShoppingBag, MapPin, CreditCard, Wallet, Banknote, Smartphone, Clock, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { Product, UserProfile } from '../types';
import { answerAdminQuery } from '../services/geminiService';
import { aiService } from '../services/aiService';
import { db, doc, setDoc, updateDoc, arrayUnion } from '../firebase';

interface VoiceAssistantProps {
  onAddToCart: (productName: string, quantity?: number, productId?: string) => boolean;
  onPlaceOrder: () => void;
  onSearch: (query: string) => void;
  onLogout?: () => void;
  user?: UserProfile;
  cart: any[];
  products: Product[];
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onAddToCart, onPlaceOrder, onSearch, onLogout, user, cart, products }) => {
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

    // NAVIGATIONAL QUICK MATCHES
    if (lowerText.includes('wishlist') || lowerText.includes('पसंद') || lowerText.includes('लिस्ट')) {
      navigate('/wishlist');
      speak(isHindi ? "विशलिस्ट खोल रहा हूँ" : "Opening wishlist");
      return;
    }
    if (lowerText.includes('support') || lowerText.includes('help') || lowerText.includes('मदद')) {
      navigate('/help');
      speak(isHindi ? "सपोर्ट पेज पर जा रहे हैं" : "Opening support page");
      return;
    }
    if (lowerText.includes('address') || lowerText.includes('पता')) {
      navigate('/addresses');
      speak(isHindi ? "आपका पता दिखा रहा हूँ" : "Showing your addresses");
      return;
    }
    if (lowerText.includes('home') || lowerText.includes('घर') || lowerText.includes('शुरुआत')) {
      navigate('/');
      speak(isHindi ? "होम पेज" : "Going home");
      return;
    }
    if (lowerText.includes('profile') || lowerText.includes('प्रोफाइल') || lowerText.includes('खाता')) {
      navigate('/profile');
      speak(isHindi ? "आपकी प्रोफाइल" : "Opening profile");
      return;
    }
    if (lowerText.includes('orders') || lowerText.includes('इतिहास') || lowerText.includes('history')) {
      navigate('/orders');
      speak(isHindi ? "आर्डर इतिहास" : "Showing your orders history");
      return;
    }
    if (lowerText.includes('categories') || lowerText.includes('कैटेगरी')) {
      navigate('/categories');
      speak(isHindi ? "सभी कैटेगरी" : "Showing all categories");
      return;
    }

    // AI POWERED PROCESSING
    setIsAiProcessing(true);
    setFeedback("Processing...");
    
    try {
      const aiResult = await aiService.parseVoiceCommand(text, cart, products);
      console.log("AI Parsed Result:", aiResult);

      let responseText = "";

      if (aiResult.intent === 'add_to_cart') {
        const qty = aiResult.multiplier || aiResult.quantity || 1;
        const success = onAddToCart(aiResult.productName || '', qty, aiResult.productId);
        
        if (success) {
          const product = products.find(p => p.id === aiResult.productId || p.name === aiResult.productName);
          responseText = isHindi 
            ? `${product?.name || 'उत्पाद'} के ${qty} पीस जोड़ दिए गए हैं। क्या आप कार्ट में जाना चाहते हैं?` 
            : `Added ${qty} of ${product?.name || 'the product'} to your cart.`;
          
          setFeedback(isHindi ? `${product?.name} जोड़ा गया` : `Added ${product?.name}`);
        } else {
          responseText = isHindi ? "क्षमा करें, मुझे वह उत्पाद नहीं मिला।" : "Sorry, I couldn't find that product.";
        }
      } else if (aiResult.intent === 'search') {
        const query = aiResult.searchQuery || aiResult.productName || text;
        onSearch(query);
        responseText = isHindi ? `${query} के लिए परिणाम दिखा रहा हूँ` : `Showing results for ${query}`;
        setFeedback(responseText);
      } else if (aiResult.intent === 'checkout') {
        if (cart.length === 0) {
          responseText = isHindi ? "आपका कार्ट खाली है।" : "Your cart is empty. Please add items first.";
        } else {
          onPlaceOrder();
          responseText = isHindi ? "चेकआउट खोल रहा हूँ" : "Opening checkout";
        }
      } else {
        // Fallback to Knowledge Query
        responseText = await answerAdminQuery(text, { user, language });
      }

      speak(responseText);
      setFeedback(responseText);

      // Sync to admin support if logged in
      if (user?.uid && responseText) {
        try {
          const timestamp = Date.now();
          const qRef = doc(db, 'support_queries', user.uid);
          await setDoc(qRef, {
            userId: user.uid,
            userName: user.name || 'Anonymous',
            userEmail: user.email || 'No email',
            status: 'pending',
            updatedAt: timestamp
          }, { merge: true });

          await updateDoc(qRef, {
            chatHistory: arrayUnion(
              { role: 'user', content: `[Voice] ${text}`, timestamp },
              { role: 'ai', content: responseText, timestamp }
            ),
            updatedAt: timestamp
          });
        } catch (syncError) {
          console.warn("Failed to sync voice chat:", syncError);
        }
      }

    } catch (e) {
      console.error("AI Assistant error:", e);
      setFeedback(t('voiceError'));
    } finally {
      setIsAiProcessing(false);
    }
  }, [cart, language, onAddToCart, onPlaceOrder, onSearch, products, speak, t, user, navigate]);

  useEffect(() => {
    const handleTrigger = () => {
      setIsListening(true);
    };
    window.addEventListener('trigger-voice-assistant', handleTrigger);
    return () => window.removeEventListener('trigger-voice-assistant', handleTrigger);
  }, []);

  useEffect(() => {
    if (!isListening) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setFeedback("Speech recognition not supported.");
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setFeedback(t('voiceListening'));
    recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript;
      setTranscript(result);
      processCommand(result);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setFeedback(t('voiceError'));
    };

    recognition.onend = () => setIsListening(false);

    try {
      recognition.start();
      return () => recognition.stop();
    } catch (e) {
      setIsListening(false);
    }
  }, [isListening, language, processCommand, t]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  if (!isVoiceEnabled) return null;

  return (
    <div className="fixed bottom-24 right-6 z-[100] flex flex-col items-end gap-4 pointer-events-none">
      <AnimatePresence>
        {(feedback || isAiProcessing) && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-gray-900/95 backdrop-blur-xl text-white px-6 py-4 rounded-[28px] shadow-2xl border border-white/10 max-w-[280px] pointer-events-auto"
          >
            <div className="flex items-start gap-3">
              {isAiProcessing ? (
                <RefreshCw className="w-4 h-4 text-primary animate-spin mt-1 shrink-0" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0 animate-pulse" />
              )}
              <div className="space-y-1">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">
                  Voice Assistant
                </p>
                <p className="text-sm font-bold tracking-tight leading-relaxed">
                  {feedback}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative pointer-events-auto">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsListening(!isListening)}
          className={`w-16 h-16 rounded-[24px] flex items-center justify-center shadow-2xl relative z-10 transition-all duration-500 ${
            isListening 
              ? 'bg-red-500 text-white' 
              : 'bg-primary text-white'
          }`}
        >
          {isListening ? (
            <MicOff className="w-8 h-8" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
          
          {isListening && (
            <>
              <motion.div
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 bg-red-400 rounded-[24px] -z-10"
              />
              <motion.div
                initial={{ scale: 1, opacity: 0.3 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                className="absolute inset-0 bg-red-400 rounded-[24px] -z-10"
              />
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
};
