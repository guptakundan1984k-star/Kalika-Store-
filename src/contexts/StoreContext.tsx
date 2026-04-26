import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, doc, onSnapshot } from '../firebase';
import { StoreSettings, UserProfile } from '../types';

interface StoreContextType {
  settings: StoreSettings | null;
  loading: boolean;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'store'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as StoreSettings;
        
        // Automated Open/Close Logic
        const now = new Date();
        const day = now.getDay(); 
        const currentTimeInMins = now.getHours() * 60 + now.getMinutes();

        const parseTime = (timeStr: string) => {
          const [h, m] = timeStr.split(':').map(Number);
          return h * 60 + m;
        };

        let isOpenBySchedule = true;
        if (data.autoSchedule) {
          if (day === 0) { // Sunday
            const open = parseTime(data.sundayOpeningTime || '10:40');
            const close = parseTime(data.sundayClosingTime || '15:00');
            isOpenBySchedule = currentTimeInMins >= open && currentTimeInMins < close;
          } else { // Mon-Sat
            const open = parseTime(data.openingTime || '10:40');
            const close = parseTime(data.closingTime || '20:00');
            isOpenBySchedule = currentTimeInMins >= open && currentTimeInMins < close;
          }
        }

        const functionallyReady = data.isOpen && (!data.autoSchedule || isOpenBySchedule);
        
        setSettings({
          ...data,
          isFunctionallyOpen: functionallyReady
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const deliveryFee = settings?.deliveryFee ?? 20;
  const freeDeliveryThreshold = settings?.freeDeliveryThreshold ?? 200;

  return (
    <StoreContext.Provider value={{ settings, loading, deliveryFee, freeDeliveryThreshold, user, setUser }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
