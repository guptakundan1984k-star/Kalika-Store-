import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Flyer {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  image?: string;
}

export const FlyToCartOverlay: React.FC = () => {
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const lastClickRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  useEffect(() => {
    // Globally record the last click coordinates to act as a fallback for any add-to-cart actions
    const recordLastClick = (e: MouseEvent) => {
      if (e.clientX > 0 && e.clientY > 0) {
        lastClickRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    window.addEventListener('click', recordLastClick, { capture: true, passive: true });
    return () => {
      window.removeEventListener('click', recordLastClick, { capture: true });
    };
  }, []);

  useEffect(() => {
    const handleFly = (e: Event) => {
      const customEvent = e as CustomEvent<{ startX?: number; startY?: number; image?: string; productId?: string }>;
      const { startX, startY, image, productId } = customEvent.detail || {};
      
      const cartBtn = document.getElementById('navbar-cart-btn');
      let endX = window.innerWidth - 60;
      let endY = 40;

      if (cartBtn) {
        const rect = cartBtn.getBoundingClientRect();
        endX = rect.left + rect.width / 2;
        endY = rect.top + rect.height / 2;
      }

      // 1. Try passed explicit coordinates
      // 2. Try looking up DOM element related to product as starting position
      // 3. Fall back to the user's last recorded cursor click coordinate
      let finalStartX = startX ?? 0;
      let finalStartY = startY ?? 0;

      if (!finalStartX || !finalStartY) {
        if (productId) {
          const matchingElem = document.querySelector(`[data-product-id="${productId}"]`);
          if (matchingElem) {
            const rect = matchingElem.getBoundingClientRect();
            finalStartX = rect.left + rect.width / 2;
            finalStartY = rect.top + rect.height / 2;
          }
        }
      }

      if (!finalStartX || !finalStartY) {
        finalStartX = lastClickRef.current.x;
        finalStartY = lastClickRef.current.y;
      }

      const id = Math.random().toString(36).substring(2, 9);
      setFlyers(prev => [...prev, { id, startX: finalStartX, startY: finalStartY, endX, endY, image }]);
    };

    window.addEventListener('fly-to-cart', handleFly);
    return () => {
      window.removeEventListener('fly-to-cart', handleFly);
    };
  }, []);

  const removeFlyer = (id: string) => {
    setFlyers(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden">
      <AnimatePresence>
        {flyers.map(flyer => {
          // Precise mathematical control coordinates for custom parabolic flight arc path:
          // Mid-point calculated to form a natural arc jump curving upwards first
          const midX = (flyer.startX + flyer.endX) / 2;
          const midY = Math.min(flyer.startY, flyer.endY) - 140;

          return (
            <motion.div
              key={flyer.id}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 52,
                height: 52,
              }}
              initial={{ 
                x: flyer.startX - 26, 
                y: flyer.startY - 26,
                scale: 0.8,
                opacity: 0.3
              }}
              animate={{ 
                x: [flyer.startX - 26, midX - 26, flyer.endX - 12], 
                y: [flyer.startY - 26, midY, flyer.endY - 12],
                scale: [0.8, 1.4, 0.15],
                opacity: [0.4, 1, 0.7]
              }}
              transition={{ 
                duration: 0.9, 
                ease: [0.25, 1, 0.5, 1] // Custom cubicBezier for snappy, smooth, responsive curves
              }}
              onAnimationComplete={() => removeFlyer(flyer.id)}
              className="rounded-full border-[3px] border-[#00AEEF] bg-white shadow-2xl overflow-hidden flex items-center justify-center flex-shrink-0 z-[100000]"
            >
              {flyer.image ? (
                <img 
                  src={flyer.image} 
                  alt="Item thumbnail" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-lg font-bold">🛒</span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
