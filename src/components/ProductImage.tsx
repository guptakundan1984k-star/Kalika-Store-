import React from 'react';

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({ src, alt, className = '' }) => {
  const isPlaceholder = !src || src.includes('picsum.photos') || src.includes('placeholder');

  if (isPlaceholder) {
    return (
      <div className={`relative overflow-hidden flex flex-col items-center justify-center ${className}`}>
        {/* Literal Half Blue Half Cyan */}
        <div className="absolute inset-0 flex">
          <div className="flex-1 bg-[#00AEEF]" />
          <div className="flex-1 bg-[#00FFFF]" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl mb-2">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-white text-[10px] font-black uppercase tracking-widest leading-tight drop-shadow-md">
            Product photo will be shared soon in your number once you order
          </p>
        </div>
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
      referrerPolicy="no-referrer"
      onError={(e) => {
        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x800?text=Product+Image';
      }}
    />
  );
};
