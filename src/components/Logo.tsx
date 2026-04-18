import React from 'react';
import { ShoppingCart } from 'lucide-react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-primary shadow-lg shadow-primary/20">
        <ShoppingCart className="w-6 h-6 text-white" />
      </div>
      <div className="flex flex-col relative">
        <div className="absolute -inset-x-4 -inset-y-2 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] bg-amber-50/50 rounded-lg -z-10 opacity-50" />
        <span className="text-xl font-black tracking-tighter text-gray-900 leading-none relative">
          Kalika<span className="text-primary">Store</span>
        </span>
      </div>
    </div>
  );
};
