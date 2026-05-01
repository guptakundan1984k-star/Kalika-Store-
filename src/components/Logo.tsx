import React from 'react';
import { ShoppingCart } from 'lucide-react';

export const Logo: React.FC<{ 
  className?: string, 
  showImage?: boolean, 
  showBg?: boolean,
  large?: boolean,
  onClick?: () => void
}> = ({ className, showImage, showBg, large, onClick }) => {
  return (
    <div 
      className={`flex flex-col items-center justify-center cursor-pointer ${className}`}
      onClick={onClick}
    >
      {showImage && (
        <img 
          src="/logo.png" 
          alt="Kalika Store Logo" 
          className={`${large ? 'w-32 h-32' : 'w-24 h-24'} mb-4 object-contain`}
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      )}
      <div className={`
        relative flex items-center justify-center overflow-hidden transition-all
        ${showBg ? 'w-full max-w-4xl h-64 md:h-96 rounded-none shadow-none bg-primary border-none overflow-hidden' : ''}
      `}>
        {/* Vegetable-less background - Solid color as requested */}
        {showBg && (
          <div className="absolute inset-0 bg-white z-0" />
        )}
        
        {showBg && (
          <div className="relative z-10 text-center transition-all duration-500 bg-white px-12 py-8 rounded-[4rem] border-4 border-blue-600 shadow-2xl ring-8 ring-blue-50">
            <span className={`${large ? 'text-6xl md:text-8xl' : 'text-5xl md:text-7xl'} font-black text-gray-900 tracking-tighter uppercase`}>
              Kalika <span className="text-blue-600">Store</span>
            </span>
          </div>
        )}
        {!showBg && (
          <div className={`
            flex items-center gap-2 transition-all duration-300 
            bg-white/90 backdrop-blur-md
            ${large ? 'px-12 py-6 rounded-[3rem] border-4' : 'px-6 py-3 rounded-2xl border-2'} 
            border-blue-500 
            shadow-[0_0_20px_rgba(37,99,235,0.2),inset_0_0_10px_rgba(37,99,235,0.1)] 
            hover:shadow-[0_0_40px_rgba(37,99,235,0.4)] 
            hover:scale-105 active:scale-95
          `}>
            <span className={`${large ? 'text-4xl md:text-6xl' : 'text-xl md:text-2xl'} font-black tracking-tighter leading-none uppercase text-blue-600`}>
              Kalika <span className="text-gray-900">Store</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
