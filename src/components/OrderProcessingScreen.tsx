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
  RefreshCw
} from 'lucide-react';

const STEPS = [
  { id: 'validate', label: 'Validating Cart...', icon: Package },
  { id: 'balance', label: 'Securing Payment...', icon: CreditCard },
  { id: 'inventory', label: 'Syncing Inventory...', icon: RefreshCw },
  { id: 'store', label: 'Routing to Ranchi Store...', icon: MapPin },
  { id: 'finalize', label: 'Finalizing Order...', icon: Sparkles }
];

export const OrderProcessingScreen: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    if (currentStep < STEPS.length) {
      const timer = setTimeout(() => {
        setCompletedSteps(prev => [...prev, STEPS[currentStep].id]);
        if (currentStep < STEPS.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          // All steps done
          setTimeout(() => {
            onComplete?.();
          }, 800);
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [currentStep, onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] bg-white flex flex-col items-center justify-center p-6"
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

      <div className="w-full max-w-sm space-y-12">
        <div className="text-center space-y-4">
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-20 h-20 bg-primary/10 rounded-3xl mx-auto flex items-center justify-center text-primary"
          >
            <ShieldCheck className="w-10 h-10" />
          </motion.div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight italic uppercase">Processing Order</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">Securing your connection</p>
          </div>
        </div>

        <div className="space-y-4">
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
                className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 ${
                  isCurrent ? 'bg-primary/5 border border-primary/10' : 'bg-transparent'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isCompleted ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 
                  isCurrent ? 'bg-primary text-white shadow-lg shadow-primary/20 animate-pulse' : 
                  'bg-gray-100 text-gray-400'
                }`}>
                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className={`text-xs font-black uppercase tracking-widest ${
                    isCompleted ? 'text-gray-400 line-through decoration-primary decoration-2' : 
                    isCurrent ? 'text-gray-900' : 'text-gray-300'
                  }`}>
                    {step.label}
                  </p>
                  {isCurrent && (
                    <motion.div 
                      layoutId="progress"
                      className="h-1 bg-primary mt-2 rounded-full overflow-hidden"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.7 }}
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="flex justify-center pt-8">
           <div className="flex gap-2">
             {[0, 1, 2].map(i => (
               <motion.div 
                key={i}
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                className="w-2 h-2 bg-primary rounded-full"
               />
             ))}
           </div>
        </div>
      </div>
    </motion.div>
  );
};
