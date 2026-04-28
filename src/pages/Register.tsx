import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Logo } from '../components/Logo';
import { User, Mail, Lock, Phone, ArrowRight, ShieldCheck, Sparkles, Eye, EyeOff, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db, setDoc, doc, RecaptchaVerifier, signInWithPhoneNumber, createUserWithEmailAndPassword, updateProfile } from '../firebase';

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

interface RegisterProps {
  onRegister: (user: UserProfile) => void;
}

const Register: React.FC<RegisterProps> = ({ onRegister }) => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      
      const newUser: UserProfile = {
        uid: userCredential.user.uid,
        name,
        email,
        phone,
        password, // Store password in Firestore as requested
        role: 'user',
        address: 'Ranchi, Jharkhand',
        walletBalance: 0,
        wishlist: []
      };
      
      await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
      alert("Registration successful! Please sign in with your new account.");
      navigate('/login');
    } catch (err: any) {
      setError(err.message || "Registration failed. Check OTP or details.");
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
        
        <Logo className="text-white brightness-0 invert" />
        
        <div className="space-y-8 relative z-10">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl font-black text-white leading-tight tracking-tighter"
          >
            Join The <br />
            <span className="text-gray-900">Kalika Family</span>
          </motion.h1>
          <p className="text-white/80 font-medium text-lg max-w-md">
            Create an account to enjoy faster checkout, real-time tracking, and exclusive member-only offers.
          </p>
          
          <div className="grid grid-cols-2 gap-6 pt-8">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl space-y-2">
              <ShieldCheck className="w-8 h-8 text-white" />
              <h3 className="font-bold text-white">Verified Quality</h3>
              <p className="text-xs text-white/60">Only the freshest products for you.</p>
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
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">Create Account</h2>
            <p className="text-sm text-gray-500 font-medium">Join us today and start shopping fresh.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Phone Number</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                  <input 
                    type="tel" 
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Password</label>
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
                  Register
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm font-medium text-gray-500">
            Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
