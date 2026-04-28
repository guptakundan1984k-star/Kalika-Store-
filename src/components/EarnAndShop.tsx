import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Gift, Play, ArrowRight, User, CreditCard, 
  CheckCircle2, Clock, Info, ShieldCheck, AlertCircle, Loader2
} from 'lucide-react';
import { UserProfile, AdEarning } from '../types';
import { db, doc, updateDoc, collection, addDoc, query, where, onSnapshot, getDocs } from '../firebase';

interface EarnAndShopProps {
  user: UserProfile | null;
}

export const EarnAndShop: React.FC<EarnAndShopProps> = ({ user }) => {
  const [upiId, setUpiId] = useState(user?.upiId || '');
  const [upiName, setUpiName] = useState(user?.upiName || '');
  const [isUpdatingUpi, setIsUpdatingUpi] = useState(false);
  const [watchCooldown, setWatchCooldown] = useState(false);
  const [adEarnings, setAdEarnings] = useState<AdEarning[]>([]);
  const [isWatching, setIsWatching] = useState(false);
  const [guestBalance, setGuestBalance] = useState(0);

  const [isCopying, setIsCopying] = useState(false);

  const handleCopyLink = () => {
    const inviteLink = `${window.location.origin}/register?ref=${user?.uid || 'guest'}`;
    navigator.clipboard.writeText(inviteLink);
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 2000);
  };

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'adEarnings'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdEarning));
      setAdEarnings(docs.sort((a, b) => b.lastWatchedAt - a.lastWatchedAt));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'adEarnings', false);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error('AdSense push error:', e);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleUpdateUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !upiId || !upiName) return;
    setIsUpdatingUpi(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        upiId,
        upiName,
        updatedAt: Date.now()
      });
      alert('UPI Registration Successful!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsUpdatingUpi(false);
    }
  };

  const simulateAdWatch = async () => {
    if (watchCooldown) return;
    setIsWatching(true);
    
    // Simulate ad watching for 5 seconds
    const watchTimer = setTimeout(async () => {
      try {
        if (user?.uid) {
          const adCount = (user.adViewsCount || 0) + 1;
          await updateDoc(doc(db, 'users', user.uid), {
            adViewsCount: adCount,
            lastActiveAt: Date.now()
          });

          // Add to adEarnings collection
          await addDoc(collection(db, 'adEarnings'), {
            userId: user.uid,
            userName: user.name,
            count: 1,
            lastWatchedAt: Date.now(),
            paymentStatus: 'pending',
            upiId: user.upiId || upiId,
            upiName: user.upiName || upiName,
            createdAt: Date.now()
          });
        } else {
          setGuestBalance(prev => prev + 0.5);
        }

        setIsWatching(false);
        setWatchCooldown(true);
        setTimeout(() => setWatchCooldown(false), 30000); // 30s cooldown
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'adEarnings', false);
        setIsWatching(false);
      }
    }, 5000);

    return () => clearTimeout(watchTimer);
  };

  return (
    <div className="space-y-8 pb-32">
      {/* Brand Hero Banner */}
      <div className="relative h-64 md:h-80 rounded-[40px] overflow-hidden group">
        <img 
          src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=2000" 
          alt="Grocery Store"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-8 md:p-12">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl inline-block w-fit">
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase mb-2">Kalika Store</h1>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <p className="text-xs font-black text-primary uppercase tracking-[0.3em]">Official Earning Partner</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header Card */}
      <div className="relative overflow-hidden bg-gray-900 rounded-[40px] p-8 md:p-12 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20 backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">Earn & Shop</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter">Watch Ads,<br />Earn Real Money</h2>
            <p className="text-white/60 font-medium max-w-sm">Every ad you see adds money to your payout pool. {!user && <span className="text-primary font-black">Login to save your rewards permanently!</span>}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 flex flex-col items-center text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">{user ? 'Your Total Balance' : 'Current Potential Balance'}</p>
            <p className="text-5xl font-black tracking-tighter">₹{user ? (user.adViewsCount || 0) * 0.5 : guestBalance.toFixed(2)}</p>
            <div className="flex items-center gap-2 mt-4 text-white/40">
              <Info className="w-3 h-3" />
              <span className="text-[10px] uppercase font-bold tracking-widest">Payouts Processed Weekly</span>
            </div>
          </div>
        </div>
      </div>

      {!user && (
        <div className="bg-primary/5 border border-primary/20 p-6 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary text-white rounded-3xl flex items-center justify-center shadow-lg shadow-primary/20">
              <User className="w-8 h-8" />
            </div>
            <div>
               <h4 className="font-black text-lg text-gray-900 tracking-tight">Login Required for Bank Transfers</h4>
               <p className="text-xs text-gray-500 font-medium">Create an account to transfer your ₹{guestBalance.toFixed(2)} earnings to your bank via UPI.</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.href = '/login'}
            className="w-full md:w-auto bg-gray-900 text-white font-black px-10 py-5 rounded-2xl text-xs uppercase tracking-widest hover:scale-105 transition-transform"
          >
            Login / Register
          </button>
        </div>
      )}

      {/* UPI Info Card */}
      {user && (
        <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <CreditCard className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 leading-tight">UPI Account Details</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Used automatically for all weekly payouts</p>
            </div>
          </div>

          <form onSubmit={handleUpdateUpi} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Account Holder Name</label>
              <input 
                type="text" 
                value={upiName}
                onChange={(e) => setUpiName(e.target.value)}
                placeholder="Full name as per bank"
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-indigo-500/10 transition-all border border-transparent focus:border-indigo-100"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">UPI ID (VPA)</label>
              <input 
                type="text" 
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. mobile@upi or name@okaxis"
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-indigo-500/10 transition-all border border-transparent focus:border-indigo-100"
                required
              />
            </div>
            <div className="md:col-span-2 pt-2">
              <button 
                type="submit" 
                disabled={isUpdatingUpi}
                className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-gray-900/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {isUpdatingUpi ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Payout Details'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ad Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-gray-900">Watch & Earn Hub</h3>
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Verified Payouts</span>
              </div>
            </div>

            {/* Ad Placeholder (This is where AdSense would live) */}
            <div className="aspect-video bg-gray-50 border-4 border-dashed border-gray-100 rounded-[32px] flex items-center justify-center p-8 text-center group relative overflow-hidden">
               <div className="absolute inset-0 z-0 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                  <ins className="adsbygoogle"
                       style={{display:'block', width: '100%', height: '100%'}}
                       data-ad-client="ca-pub-5257999103693625"
                       data-ad-slot="9876543210" 
                       data-ad-format="auto"
                       data-full-width-responsive="true"></ins>
               </div>
               
               <div className="relative z-10 space-y-4 pointer-events-none">
                  <div className="w-20 h-20 bg-white rounded-[32px] shadow-2xl flex items-center justify-center mx-auto text-primary group-hover:scale-110 transition-transform duration-500">
                    <Play className="w-10 h-10 fill-current translate-x-0.5" />
                  </div>
                  <p className="text-lg font-black text-gray-900 tracking-tight">Your Ad Will Appear Here</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Partner Verified Ad Slot</p>
               </div>

               {isWatching && (
                 <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="absolute inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center text-white z-20"
                 >
                    <div className="relative w-24 h-24 mb-8">
                       <div className="absolute inset-0 border-4 border-white/10 rounded-full" />
                       <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
                       <div className="absolute inset-0 flex items-center justify-center font-black text-xl mb-1">
                          5s
                       </div>
                    </div>
                    <p className="text-2xl font-black tracking-tighter">Confirming View...</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] mt-4 text-primary animate-pulse">Earning Rewards...</p>
                 </motion.div>
               )}
            </div>

            <button 
              onClick={simulateAdWatch}
              disabled={watchCooldown || isWatching || (user && !upiId)}
              className={`w-full py-8 rounded-[32px] font-black text-sm uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-4 ${
                watchCooldown 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-primary text-white shadow-[0_20px_50px_rgba(255,102,0,0.3)] hover:shadow-[0_20px_50px_rgba(255,102,0,0.5)] hover:scale-[1.01] active:scale-95'
              }`}
            >
              {watchCooldown ? (
                <>
                  <Clock className="w-6 h-6" />
                  Wait 30s for next ad
                </>
              ) : (
                <>
                  <Play className="w-6 h-6 fill-current" />
                  {isWatching ? 'Earning...' : 'Watch Ad to Earn ₹0.50'}
                </>
              )}
            </button>
            
            {user && !upiId && (
              <div className="flex items-start gap-4 p-5 bg-orange-50 border border-orange-100 rounded-3xl">
                <AlertCircle className="w-6 h-6 text-orange-500 flex-shrink-0" />
                <p className="text-[10px] font-bold text-orange-700 leading-relaxed uppercase tracking-widest">
                  Action Required: Please register your UPI ID above to unlock the watch button and start earning real cash payouts.
                </p>
              </div>
            )}
          </div>

          {user && (
            <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-gray-900">Earning Statement</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Last 10 Views</p>
               </div>
               <div className="space-y-4">
                  {adEarnings.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                       <Clock className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                       <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No payout activity logged yet</p>
                    </div>
                  ) : (
                    adEarnings.slice(0, 10).map((earning) => (
                      <div key={earning.id} className="flex items-center justify-between p-5 rounded-3xl bg-gray-50 border border-gray-100 transition-all hover:bg-gray-100/50">
                         <div className="flex items-center gap-5">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${earning.paymentStatus === 'paid' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                               {earning.paymentStatus === 'paid' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                            </div>
                            <div>
                               <p className="text-sm font-black text-gray-900 tracking-tight">Ad View Reward</p>
                               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(earning.lastWatchedAt).toLocaleDateString()} • {new Date(earning.lastWatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-lg font-black text-gray-900">₹0.50</p>
                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${earning.paymentStatus === 'paid' ? 'text-green-500' : 'text-orange-500'}`}>
                               {earning.paymentStatus}
                            </p>
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
          )}
        </div>

        <div className="space-y-8">
           <div className="bg-gray-900 rounded-[40px] p-8 space-y-6 text-white relative overflow-hidden group">
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/40 transition-all" />
              <Gift className="w-16 h-16 text-primary" />
              <div>
                <h3 className="text-2xl font-black tracking-tighter mb-2">Refer & Earn</h3>
                <p className="text-xs text-white/50 font-bold leading-loose uppercase tracking-wider">Share your link and get ₹5.00 for every friend who joins Kalika Store.</p>
              </div>
              
              <button 
                onClick={handleCopyLink}
                className="w-full py-5 bg-white text-gray-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.05] active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {isCopying ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <ArrowRight className="w-4 h-4" />}
                {isCopying ? 'Link Copied!' : 'Get Invite Link'}
              </button>
           </div>
           
           <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Info className="w-5 h-5 text-primary" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Official Payout Policy</h4>
              </div>
              <ul className="space-y-4">
                 {[
                   "Minimum Payout: ₹50.00",
                   "Weekly Processing Window",
                   "Daily View Limit: 50 Ads",
                   "Verified UPI ID Mandatory",
                   "Fraud detection enabled"
                 ].map((t, idx) => (
                   <li key={idx} className="flex items-center gap-3 text-[11px] font-black text-gray-700 uppercase tracking-widest">
                     <div className="w-2 h-2 bg-primary rounded-full shrink-0" />
                     {t}
                   </li>
                 ))}
              </ul>
           </div>

           <div className="p-8 bg-blue-50 rounded-[40px] border border-blue-100 flex flex-col items-center text-center gap-4">
              <ShieldCheck className="w-10 h-10 text-blue-600" />
              <p className="text-[10px] font-black text-blue-800 uppercase tracking-[0.1em] leading-relaxed">
                All earnings are backed by our AdSense partnership and processed directly through NPCI UPI rails for 100% security.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};
