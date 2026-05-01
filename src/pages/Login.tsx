import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { Logo } from '../components/Logo';
import { Mail, Lock, ArrowRight, ShieldCheck, Sparkles, Phone, Eye, EyeOff, CheckCircle2, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db, signInWithPopup, googleProvider, getDoc, doc, RecaptchaVerifier, signInWithPhoneNumber, setDoc, signInWithEmailAndPassword, sendPasswordResetEmail } from '../firebase';

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

interface LoginProps {
  onLogin: (user: UserProfile) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDoc.exists()) {
        onLogin(userDoc.data() as UserProfile);
        navigate('/');
      } else {
        setError("User profile not found. Please register.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      
      const adminEmails = ['customercare@kalikastore.in', 'kalikastore.info@gmail.com', 'guptakundan1984k@gmail.com', 'anshgupta4525@gmail.com'];
      if (adminEmails.includes(result.user.email || '')) {
        if (userDoc.exists()) {
          onLogin(userDoc.data() as UserProfile);
        }
        navigate('/admin');
        return;
      }

      if (userDoc.exists()) {
        onLogin(userDoc.data() as UserProfile);
        navigate('/');
      } else {
        // Create a basic profile if it doesn't exist, but prompt for phone/address later
        const newUser: UserProfile = {
          uid: result.user.uid,
          name: result.user.displayName || 'Guest',
          email: result.user.email || '',
          phone: '',
          role: 'user',
          address: 'Ranchi, Jharkhand', // Default address
          walletBalance: 0,
          wishlist: []
        };
        await setDoc(doc(db, 'users', result.user.uid), newUser);
        onLogin(newUser);
        navigate('/profile'); // Redirect to profile to fill missing info
      }
    } catch (err: any) {
      setError(err.message || "Google sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col md:flex-row">
      {/* Left Side - Visual */}
      <div className="hidden md:flex flex-1 bg-gradient-to-br from-primary to-secondary relative overflow-hidden p-16 flex-col justify-between">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full -ml-48 -mb-48 blur-3xl" />
        
        <div className="flex flex-col items-center">
          <Logo large />
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-2">Welcome Back</p>
        </div>
        
        <div className="space-y-8 relative z-10">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl font-black text-white leading-tight tracking-tighter"
          >
            Welcome Back <br />
            To <span className="bg-white/20 px-3 py-1 rounded-xl backdrop-blur-sm border border-white/30 text-white ml-2 inline-block">Kalika Store</span>
          </motion.h1>
          <p className="text-white/80 font-medium text-lg max-w-md">
            Sign in to access your orders, track deliveries, and get personalized grocery recommendations.
          </p>
          
          <div className="grid grid-cols-2 gap-6 pt-8">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl space-y-2">
              <ShieldCheck className="w-8 h-8 text-white" />
              <h3 className="font-bold text-white">Secure Access</h3>
              <p className="text-xs text-white/60">Your data is encrypted and safe with us.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl space-y-2">
              <Wallet className="w-8 h-8 text-white" />
              <h3 className="font-bold text-white">Digital Wallet</h3>
              <p className="text-xs text-white/60">Pay faster and manage dues easily.</p>
            </div>
          </div>
        </div>
        
        <p className="text-white/60 text-xs font-bold uppercase tracking-widest">
          &copy; 2026 Kalika Store. All rights reserved.
        </p>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-16 bg-white">
        <div className="w-full max-w-md space-y-12">
          <div className="md:hidden flex justify-center mb-12">
            <Logo />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">Sign In</h2>
            <p className="text-sm text-gray-500 font-medium">Sign in with your email and password.</p>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Password</label>
                <button 
                  type="button" 
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-bold text-primary hover:underline uppercase tracking-widest"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-12 py-4 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-primary text-white font-bold px-10 py-5 rounded-3xl shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95 group disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest">
              <span className="bg-white px-4 text-gray-400">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-1">
            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex items-center justify-center gap-3 bg-gray-50 border border-gray-100 py-4 rounded-2xl font-bold text-gray-700 hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-50"
            >
              <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <Mail className="w-4 h-4 text-red-500" />
              </div>
              Continue with Google
            </button>
          </div>

          <p className="text-center text-sm font-medium text-gray-500">
            Don't have an account? <Link to="/register" className="text-primary font-bold hover:underline">Create Account</Link>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotModal(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden p-10 space-y-8"
            >
              <div className="space-y-4">
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">Reset Password</h3>
                <p className="text-sm text-gray-500 font-medium">Enter your email address and we'll send you a link to reset your password.</p>
              </div>

              {resetSent ? (
                <div className="bg-green-50 p-8 rounded-3xl border border-green-100 text-center space-y-4">
                  <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/30">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-black text-gray-900">Check your email</h4>
                    <p className="text-xs text-gray-500 font-medium">We've sent a password reset link to <span className="text-gray-900 font-bold">{resetEmail}</span></p>
                  </div>
                  <button 
                    onClick={() => {
                      setShowForgotModal(false);
                      setResetSent(false);
                      setResetEmail('');
                    }}
                    className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl hover:bg-black transition-all"
                  >
                    Back to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                      <input 
                        type="email" 
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="flex-1 bg-gray-100 text-gray-900 font-bold py-4 rounded-2xl hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="flex-[2] bg-primary text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50"
                    >
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;
