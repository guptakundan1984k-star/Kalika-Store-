import React, { useState } from 'react';
import { Phone, Mail, MapPin, Instagram, Lock, ShieldCheck, X, ExternalLink } from 'lucide-react';
import { Logo } from './Logo';
import { Link } from 'react-router-dom';
import { SUPPORT_EMAIL, SUPPORT_PHONES } from '../constants';
import { motion, AnimatePresence } from 'motion/react';

export const Footer: React.FC = () => {
  const [showTerms, setShowTerms] = useState(false);

  return (
    <footer className="bg-gray-50 pt-16 pb-24 md:pb-12 px-6 border-t border-gray-100">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="space-y-6">
          <Logo />
          <p className="text-sm text-gray-500 leading-relaxed">
            Your neighborhood grocery store, now online. Fresh products delivered to your doorstep across Jharkhand.
          </p>
          <div className="flex items-center gap-4">
            <a href="https://instagram.com/kalikastore2010" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-gray-600 hover:text-primary hover:shadow-md transition-all font-bold text-sm">
              <Instagram className="w-5 h-5" />
              kalikastore2010
            </a>
          </div>
        </div>
        
        <div className="space-y-6">
          <h3 className="font-bold text-gray-900 tracking-tight">Quick Links</h3>
          <ul className="space-y-3">
            <li><Link to="/" className="text-sm text-gray-500 hover:text-primary transition-colors">Home</Link></li>
            <li><Link to="/products" className="text-sm text-gray-500 hover:text-primary transition-colors">All Products</Link></li>
            <li><Link to="/cart" className="text-sm text-gray-500 hover:text-primary transition-colors">My Cart</Link></li>
            <li><Link to="/profile" className="text-sm text-gray-500 hover:text-primary transition-colors">My Profile</Link></li>
          </ul>
        </div>
        
        <div className="space-y-6">
          <h3 className="font-bold text-gray-900 tracking-tight">Support</h3>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Call Us</span>
                {SUPPORT_PHONES.map(phone => (
                  <a key={phone} href={`tel:${phone}`} className="text-sm font-bold text-gray-700 hover:text-primary transition-colors">
                    +91 {phone}
                  </a>
                ))}
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email Us</span>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-sm font-bold text-gray-700 hover:text-primary transition-colors">
                  {SUPPORT_EMAIL}
                </a>
              </div>
            </li>
          </ul>
        </div>
        
        <div className="space-y-6">
          <h3 className="font-bold text-gray-900 tracking-tight">Store Info</h3>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Visit Us</span>
              <p className="text-sm font-bold text-gray-700">
                opp. Krishi Market beside hotel white House, Ranchi, Jharkhand
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-gray-100 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
          <p className="text-xs text-gray-400 font-medium">
            &copy; {new Date().getFullYear()} Kalika Store.
          </p>
          <div className="flex items-center gap-6">
            <button onClick={() => setShowTerms(true)} className="text-xs text-gray-400 hover:text-primary transition-colors">Privacy Policy</button>
            <button onClick={() => setShowTerms(true)} className="text-xs text-gray-400 hover:text-primary transition-colors">Terms of Service</button>
            <button 
              onClick={() => setShowTerms(true)}
              className="text-xs text-gray-400 hover:text-primary transition-colors"
            >
              Return Policy
            </button>
          </div>
        </div>

        <div className="bg-primary/5 p-6 rounded-[32px] border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <p className="text-sm font-black text-gray-900 tracking-tight">Want a website or app like this?</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Get your business online today</p>
          </div>
          <a 
            href="tel:6205284423"
            className="flex items-center gap-3 bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 group"
          >
            Call: 6205284423
            <ExternalLink className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </a>
        </div>
      </div>

      {/* Terms & Conditions Modal */}
      <AnimatePresence>
        {showTerms && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTerms(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-8 bg-gray-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                  <h3 className="text-2xl font-black tracking-tight">Terms & Conditions</h3>
                </div>
                <button onClick={() => setShowTerms(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-8">
                <section className="space-y-3">
                  <h4 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <div className="w-2 h-6 bg-primary rounded-full" />
                    Return Policy
                  </h4>
                  <p className="text-sm font-medium text-gray-500 leading-relaxed">
                    Only defective items are allowed for return. Customers are requested to check their items at the time of delivery. Any issues reported after the delivery partner has left may not be eligible for return or refund.
                  </p>
                </section>

                <section className="space-y-3">
                  <h4 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <div className="w-2 h-6 bg-primary rounded-full" />
                    Order History Policy
                  </h4>
                  <p className="text-sm font-medium text-gray-500 leading-relaxed">
                    To maintain system performance and security, order history is preserved for a maximum of 3 months. If a customer is inactive for more than 3 months, their previous order records will be automatically removed from the active database.
                  </p>
                </section>

                <section className="space-y-3">
                  <h4 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <div className="w-2 h-6 bg-primary rounded-full" />
                    Loyalty Points (Kalika Coins)
                  </h4>
                  <p className="text-sm font-medium text-gray-500 leading-relaxed">
                    Customers earn Kalika Coins on every successful order. Points are only earned and can only be redeemed on orders with a minimum subtotal of ₹100. Points are calculated based on the final payable amount.
                  </p>
                </section>

                <section className="space-y-3">
                  <h4 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <div className="w-2 h-6 bg-primary rounded-full" />
                    Delivery Policy
                  </h4>
                  <p className="text-sm font-medium text-gray-500 leading-relaxed">
                    We currently deliver only within Ranchi, Jharkhand. Delivery times may vary based on location and order volume, typically ranging from 1-2 hours for express delivery.
                  </p>
                </section>
              </div>

              <div className="p-8 bg-gray-50 border-t border-gray-100">
                <button 
                  onClick={() => setShowTerms(false)}
                  className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 uppercase tracking-widest text-xs"
                >
                  I Accept Terms & Conditions
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </footer>
  );
};
