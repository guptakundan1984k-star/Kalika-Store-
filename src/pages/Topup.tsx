import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, IndianRupee, Send, Clock, CheckCircle2, 
  ArrowLeft, Smartphone, Building2, Copy, Sparkles, 
  ArrowRight, ShieldCheck, CreditCard, Landmark,
  Image as ImageIcon, Camera, Upload, AlertCircle, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { db, collection, addDoc, doc, onSnapshot, auth, handleFirestoreError, OperationType } from '../firebase';
import { Logo } from '../components/Logo';

interface TopupProps {
  user: UserProfile | null;
}

const Topup: React.FC<TopupProps> = ({ user }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'amount' | 'method' | 'payment' | 'success'>('amount');
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<'online' | 'offline' | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const MAX_WALLET_BALANCE = 250000;
  const currentTotal = (user?.walletBalance || 0) + amount;
  const isOverLimit = currentTotal > MAX_WALLET_BALANCE;
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [step]);

  const handleAmountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount >= 10) {
      setStep('method');
    }
  };

  const handleMethodSelect = (m: 'online' | 'offline') => {
    setMethod(m);
    setStep('payment');
  };

  const handlePaymentComplete = async () => {
    if (!user) return;
    if (isOverLimit) {
      alert(`Wallet balance cannot exceed ₹${MAX_WALLET_BALANCE.toLocaleString()}`);
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'walletRequests'), {
        userId: user.uid,
        userName: user.name,
        userPhone: user.phone || '',
        amount: amount,
        method: method,
        status: 'pending',
        screenshot: screenshot,
        createdAt: Date.now()
      });
      setSuccessMsg('Request submitted! Owner will verify it and soon your amount will be credited.');
      // Short delay to show the green tick on the button
      setTimeout(() => {
        setStep('success');
      }, 2500);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'walletRequests');
    } finally {
      setLoading(false);
    }
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size must be less than 2MB');
        return;
      }
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot(reader.result as string);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const [upiOpened, setUpiOpened] = useState(false);

  const handleUPILink = () => {
    const upiUrl = `upi://pay?pa=6205284423@fam&pn=Ansh Gupta&am=${amount}&cu=INR`;
    window.location.href = upiUrl;
    setUpiOpened(true);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Header */}
      <div className="bg-white px-6 py-6 border-b border-gray-100 flex items-center gap-4 sticky top-0 z-40">
        <button 
          onClick={() => {
            if (step === 'method') setStep('amount');
            else if (step === 'payment') setStep('method');
            else navigate(-1);
          }} 
          className="p-2 hover:bg-gray-50 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-900" />
        </button>
        <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">Wallet Top-up</h1>
      </div>

      <div className="max-w-xl mx-auto p-6 space-y-8">
        <AnimatePresence mode="wait">
          {/* Step 1: Amount */}
          {step === 'amount' && (
            <motion.div 
              key="amount"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
              ref={scrollRef}
            >
              <div className="text-center space-y-2">
                <div className="w-20 h-20 bg-primary/10 rounded-[32px] flex items-center justify-center text-primary mx-auto">
                  < IndianRupee className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Enter Top-up Amount</h2>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Minimum ₹10 required</p>
              </div>

              <form onSubmit={handleAmountSubmit} className="space-y-6">
                <div className="relative group">
                  <span className="absolute left-8 top-1/2 -translate-y-1/2 text-4xl font-black text-gray-300 group-focus-within:text-primary transition-colors">₹</span>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    className="w-full bg-white border-2 border-gray-100 rounded-[32px] py-8 pl-16 pr-8 text-5xl font-black focus:border-primary focus:ring-8 focus:ring-primary/5 transition-all outline-none"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {[100, 500, 1000, 2000].map(val => (
                    <button 
                      key={val}
                      type="button"
                      onClick={() => setAmount(prev => prev + val)}
                      className="py-4 bg-white rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400 border border-gray-100 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all active:scale-95 shadow-sm"
                    >
                      +₹{val}
                    </button>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => setAmount(0)}
                    className="py-4 bg-red-50 text-red-500 rounded-2xl font-black text-xs uppercase tracking-widest border border-red-100 hover:bg-red-500 hover:text-white transition-all col-span-2 sm:col-span-1"
                  >
                    Reset
                  </button>
                </div>

                {isOverLimit && (
                  <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-[10px] font-black uppercase tracking-widest">
                    <AlertCircle className="w-4 h-4" />
                    Limit Exceeded: Max wallet balance is ₹2.5L
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={amount < 10 || isOverLimit}
                  className="w-full bg-gray-900 text-white font-black py-6 rounded-[32px] shadow-2xl hover:bg-black disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  Confirm Amount
                  <ArrowRight className="w-6 h-6" />
                </button>
              </form>
            </motion.div>
          )}

          {/* Step 2: Method */}
          {step === 'method' && (
            <motion.div 
              key="method"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-8"
              ref={scrollRef}
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Select Payment Method</h2>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest italic">Choose how you want to pay ₹{amount}</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={() => handleMethodSelect('online')}
                  className="bg-white p-8 rounded-[40px] border-2 border-gray-50 hover:border-primary hover:shadow-xl transition-all flex items-center gap-6 group text-left"
                >
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                    <Smartphone className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">Online Payment</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Pay via UPI App (GPay, PhonePe...)</p>
                  </div>
                  <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 group-hover:bg-primary group-hover:text-white transition-all">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </button>

                <button 
                  onClick={() => handleMethodSelect('offline')}
                  className="bg-white p-8 rounded-[40px] border-2 border-gray-50 hover:border-gray-900 hover:shadow-xl transition-all flex items-center gap-6 group text-left"
                >
                  <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">Offline Payment</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Pay Cash at Shop / In-person</p>
                  </div>
                  <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 group-hover:bg-gray-900 group-hover:text-white transition-all">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </button>
              </div>

              <button onClick={() => setStep('amount')} className="w-full py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] hover:text-gray-600 transition-colors">
                Change Amount
              </button>
            </motion.div>
          )}

          {/* Step 3: Payment Details */}
          {step === 'payment' && (
            <motion.div 
              key="payment"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
              ref={scrollRef}
            >
              {method === 'online' ? (
                <div className="bg-white p-8 rounded-[48px] border-2 border-gray-100 shadow-2xl space-y-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
                  
                  <div className="text-center space-y-4">
                    <span className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/20">UPI Secure Hub</span>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Pay ₹{amount} to Admin</h2>
                  </div>

                  <div className="bg-gray-900 text-white p-8 rounded-[40px] space-y-6 shadow-2xl relative group overflow-hidden">
                    <div className="absolute -right-12 -top-12 w-32 h-32 bg-primary/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                    
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-primary font-black text-2xl">AG</div>
                      <div>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Merchant Name</p>
                        <h4 className="text-xl font-black tracking-tight">Ansh Gupta</h4>
                      </div>
                    </div>

                    <div className="p-6 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-between group-hover:bg-white/10 transition-all">
                      <div>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">UPI ID</p>
                        <p className="font-black text-lg">6205284423@fam</p>
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText('6205284423@fam');
                          alert('UPI ID Copied!');
                        }}
                        className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>

                    <button 
                      onClick={handleUPILink}
                      className="w-full bg-primary text-white font-black py-6 rounded-[32px] text-sm uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      {upiOpened ? 'Pay Again' : 'Open Payment App'} <CreditCard className="w-6 h-6" />
                    </button>

                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest text-center">Step 2: Upload Screenshot</p>
                      <label className="block relative cursor-pointer">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleScreenshotUpload}
                          className="hidden" 
                        />
                        <div className={`w-full py-5 rounded-[24px] border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${screenshot ? 'border-primary bg-primary/20 text-white' : 'border-white/20 bg-white/5 text-white/60 hover:bg-white/10'}`}>
                          {isUploading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                          ) : screenshot ? (
                            <>
                              <CheckCircle2 className="w-6 h-6 text-primary" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Screenshot Attached</span>
                            </>
                          ) : (
                            <>
                              <Camera className="w-6 h-6" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Upload Payment Proof</span>
                            </>
                          )}
                        </div>
                      </label>
                    </div>

                    {upiOpened && !screenshot && (
                      <div className="bg-primary/20 p-6 rounded-3xl border-2 border-primary/30 text-center animate-pulse space-y-2">
                        <p className="text-sm font-black text-primary uppercase tracking-widest">
                          Sent Request of ₹{amount}
                        </p>
                        <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest leading-tight">
                          Please complete payment in your UPI app and tap "Confirm" below
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
                      <ShieldCheck className="w-6 h-6 text-blue-500" />
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Safe & Secured by family UPI</p>
                    </div>

                    <button 
                      onClick={handlePaymentComplete}
                      disabled={loading}
                      className={`w-full py-6 font-black rounded-3xl transition-all flex items-center justify-center gap-3 border ${
                        loading ? 'bg-gray-100 text-gray-400 border-gray-200' : 
                        'bg-gray-900 text-white border-black hover:bg-black shadow-xl shadow-gray-200 active:scale-95'
                      }`}
                    >
                      {loading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : successMsg ? (
                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                      ) : (
                        <>
                          Confirm Payment Sent
                          <ArrowRight className="w-6 h-6" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-8 rounded-[48px] border-2 border-gray-100 shadow-2xl space-y-8 text-center">
                  <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mx-auto">
                    <Building2 className="w-12 h-12" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Offline Deposit</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed px-4">
                      Please pay ₹{amount} in cash to the delivery partner or at Kalika Store checkout counter. 
                      Once paid, confirm here.
                    </p>
                  </div>

                  <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100 space-y-4">
                    <h4 className="text-xs font-black text-orange-900 uppercase tracking-widest">Store Location</h4>
                    <p className="text-sm font-bold text-orange-800 tracking-tight">Opp. Krishi Bazaar, Beside Bank Of India, Ranchi</p>
                  </div>

                  <button 
                    onClick={handlePaymentComplete}
                    disabled={loading}
                    className="w-full bg-gray-900 text-white font-black py-6 rounded-3xl shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'I Have Paid Cash'}
                    <CheckCircle2 className="w-6 h-6" />
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8 py-12"
              ref={scrollRef}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-green-500 blur-[80px] opacity-20" />
                <div className="w-32 h-32 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl relative z-10 animate-bounce">
                  <CheckCircle2 className="w-16 h-16" />
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">{successMsg}</h2>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Request ID: #TUP-{Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
              </div>

              <button 
                onClick={() => navigate('/profile')}
                className="w-full bg-gray-900 text-white font-black py-6 rounded-[32px] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                Go to Wallet History
                <ArrowRight className="w-6 h-6" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent md:hidden flex justify-center">
        <span className="text-[10px] font-black text-gray-200 uppercase tracking-[0.5em]">Kalika Store</span>
      </div>
    </div>
  );
};

export default Topup;
