import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, 
  Loader2, 
  ShieldCheck, 
  Package, 
  MapPin, 
  CreditCard, 
  Smartphone,
  Sparkles,
  RefreshCw,
  Store
} from 'lucide-react';
import { CartItem } from '../types';

const STEPS = [
  { id: 'validate', label: 'Validating Cart...', icon: Package, duration: 1000 },
  { id: 'balance', label: 'Securing Payment...', icon: CreditCard, duration: 1000 },
  { id: 'inventory', label: 'Syncing Inventory...', icon: RefreshCw, duration: 1000 },
  { id: 'store', label: 'Routing to Ranchi Store...', icon: MapPin, duration: 1000 },
  { id: 'finalize', label: 'Finalizing Order...', icon: Sparkles, duration: 1000 },
  { id: 'more', label: 'And Many More..', icon: Loader2, duration: 300 },
  { id: 'kalika', label: 'Kalika Store', icon: Store, duration: 1000 }
];

export const OrderProcessingScreen: React.FC<{ 
  onComplete?: () => void;
  items?: CartItem[];
}> = ({ onComplete, items }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    // Immediate voice feedback for starting process
    if (currentStep === 0) {
      try {
        const utterance = new SpeechSynthesisUtterance("Processing your order. Please wait.");
        utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
      } catch (e) {}
    }

    if (currentStep < STEPS.length) {
      const stepDuration = STEPS[currentStep].duration;
      
      // Voice synthesis for specific steps
      if (STEPS[currentStep].id === 'finalize') {
        const utterance = new SpeechSynthesisUtterance("Order Placed");
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
      }

      const timer = setTimeout(() => {
        setCompletedSteps(prev => [...prev, STEPS[currentStep].id]);
        if (currentStep < STEPS.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          // All steps done
          setTimeout(() => {
            onComplete?.();
          }, 200);
        }
      }, stepDuration);
      return () => clearTimeout(timer);
    }
  }, [currentStep, onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] bg-white flex flex-col items-center justify-center p-6 overflow-y-auto"
    >
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-20 w-80 h-80 bg-green-500/10 rounded-full blur-[100px]" 
        />
        <motion.div 
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-20 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px]" 
        />
      </div>

      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-4">
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-16 h-16 bg-primary/10 rounded-2xl mx-auto flex items-center justify-center text-primary"
          >
            <ShieldCheck className="w-8 h-8" />
          </motion.div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-gray-900 tracking-tight italic uppercase">Processing Order</h2>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em]">Securing your connection</p>
          </div>
        </div>

        {/* Display Items being processed */}
        {items && items.length > 0 && (
          <div className="bg-gray-50/50 rounded-3xl p-4 border border-gray-100/50 space-y-3">
             <div className="flex items-center gap-2 mb-1">
               <Package className="w-3 h-3 text-gray-400" />
               <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Preparing Items</span>
             </div>
             <div className="flex flex-wrap gap-2">
               {items.map((item, idx) => (
                 <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  key={idx} 
                  className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm"
                 >
                   <span className="text-[10px] font-bold text-gray-900">{item.name}</span>
                   <span className="bg-primary/10 text-primary text-[8px] font-black px-1.5 py-0.5 rounded-lg">x{item.quantity}</span>
                 </motion.div>
               ))}
             </div>
          </div>
        )}

        <div className="space-y-3">
          {STEPS.map((step, idx) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = currentStep === idx;

            return (
              <motion.div 
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ 
                  opacity: (isCurrent || isCompleted) ? 1 : 0.3,
                  x: 0 
                }}
                className={`flex items-center gap-4 p-3 rounded-2xl transition-all duration-500 ${
                  isCurrent ? 'bg-primary/5 border border-primary/10' : 'bg-transparent'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isCompleted ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 
                  isCurrent ? 'bg-primary text-white shadow-lg shadow-primary/20 animate-pulse' : 
                  'bg-gray-100 text-gray-400'
                }`}>
                  {isCompleted ? <CheckCircle className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${
                    isCompleted ? 'text-gray-400 line-through decoration-primary decoration-2' : 
                    isCurrent ? 'text-gray-900' : 'text-gray-300'
                  }`}>
                    {step.label}
                  </p>
                  {isCurrent && (
                    <motion.div 
                      layoutId="progress"
                      className="h-1 bg-primary mt-1.5 rounded-full overflow-hidden"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: step.duration / 1000 }}
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="pt-4 space-y-4">
           <div className="flex justify-center">
             <div className="flex gap-2">
               {[0, 1, 2].map(i => (
                 <motion.div 
                  key={i}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  className="w-1.5 h-1.5 bg-primary rounded-full"
                 />
               ))}
             </div>
           </div>

           <div className="text-center px-4">
             <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
               <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest leading-relaxed">
                 T&C: Order with many items may take more delivery time than expected.
               </p>
             </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
};
