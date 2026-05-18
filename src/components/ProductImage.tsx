import React from 'react';

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
  hasManualPhoto?: boolean;
}

export const ProductImage: React.FC<ProductImageProps> = ({ src, alt, className = '', hasManualPhoto }) => {
  const isMissing = !src || src === '' || src === 'undefined' || src === 'null';

  if (isMissing && !hasManualPhoto) {
    // Generate a reliable Unsplash placeholder based on alt text
    const keyword = alt.split(' ')[0] || 'grocery';
    const fallbackUrl = `https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800&keyword=${encodeURIComponent(keyword)}`;
    
    return (
      <div className={`relative overflow-hidden group ${className}`}>
        <img 
          src={fallbackUrl} 
          alt={alt} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
          <p className="text-white text-[10px] font-black uppercase tracking-widest leading-tight drop-shadow-md">
            Product photo coming soon
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
