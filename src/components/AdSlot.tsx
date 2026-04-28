import React, { useEffect } from 'react';

interface AdSlotProps {
  slot?: string;
  className?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ slot = "9876543210", className = "" }) => {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <div className={`ad-container my-8 overflow-hidden rounded-2xl bg-gray-50 flex items-center justify-center p-4 border border-dashed border-gray-200 min-h-[100px] ${className}`}>
      <ins className="adsbygoogle"
           style={{ display: 'block', width: '100%' }}
           data-ad-client="ca-pub-5257999103693625"
           data-ad-slot={slot}
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>
  );
};
