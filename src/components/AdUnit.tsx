import React, { useEffect } from 'react';

interface AdUnitProps {
  client?: string;
  slot: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  responsive?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const AdUnit: React.FC<AdUnitProps> = ({ 
  client = 'ca-pub-5257999103693625', 
  slot, 
  format = 'auto', 
  responsive = true, 
  style = { display: 'block' },
  className = ''
}) => {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.warn('AdSense error:', e);
    }
  }, []);

  return (
    <div className={`ad-container my-8 overflow-hidden ${className}`}>
      <ins
        className="adsbygoogle"
        style={style}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
};
