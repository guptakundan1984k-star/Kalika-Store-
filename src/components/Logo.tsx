import React from 'react';
import { ShoppingCart } from 'lucide-react';

export const Logo: React.FC<{ className?: string, showImage?: boolean, showBg?: boolean }> = ({ className, showImage, showBg }) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {showImage && (
        <img 
          src="/logo.png" 
          alt="Kalika Store Logo" 
          className="w-24 h-24 mb-4 object-contain"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      )}
      <div className={`
        relative flex items-center justify-center overflow-hidden transition-all
        ${showBg ? 'w-full max-w-4xl h-64 md:h-96 rounded-[48px] shadow-2xl border-x-4 border-b-8 border-white' : 'px-6 py-3'}
      `}>
        {showBg && (
          <img 
            src="/unnamed.webp" 
            className="absolute inset-0 w-full h-full object-cover"
            alt="Store Background"
          />
        )}
        {!showBg && (
          <span className={`
            relative z-10 font-black tracking-tighter leading-none font-bubbly drop-shadow-2xl
            text-xl md:text-2xl text-gray-900
          `}>
            Kalika<span className="text-primary">Store</span>
          </span>
        )}
      </div>
    </div>
  );
};
