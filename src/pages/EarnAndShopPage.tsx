import React from 'react';
import { UserProfile } from '../types';
import { EarnAndShop } from '../components/EarnAndShop';
import { motion } from 'motion/react';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EarnAndShopPageProps {
  user: UserProfile | null;
}

export const EarnAndShopPage: React.FC<EarnAndShopPageProps> = ({ user }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-primary transition-colors active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">Earn AND Shop</h1>
          </div>
          <div className="w-20" /> {/* Spacer */}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <EarnAndShop user={user} />
        </motion.div>
      </div>
    </div>
  );
};

export default EarnAndShopPage;
