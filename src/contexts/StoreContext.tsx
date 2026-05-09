import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, doc, onSnapshot } from '../firebase';
import { StoreSettings, UserProfile, EnvStatus } from '../types';
import { checkEnvironmentStatus } from '../services/geminiService';

interface StoreContextType {
  settings: StoreSettings | null;
  loading: boolean;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  envStatus: EnvStatus | null;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null);

  useEffect(() => {
    const fetchEnvStatus = async () => {
      try {
        const status = await checkEnvironmentStatus();
        setEnvStatus(status);
      } catch (e) {
        console.error("Failed to check environment status:", e);
      }
    };

    fetchEnvStatus();
    // Check every hour
    const interval = setInterval(fetchEnvStatus, 3600000);
    return () => clearInterval(interval);
  }, []);

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
    }, (error) => {
      console.error("Store settings snapshot error:", error);
      setLoading(false); // Ensure app loads even if settings fail
    });

    return () => unsubscribe();
  }, []);

  const deliveryFee = settings?.deliveryFee ?? 20;
  const freeDeliveryThreshold = settings?.freeDeliveryThreshold ?? 499;

  return (
    <StoreContext.Provider value={{ settings, loading, deliveryFee, freeDeliveryThreshold, user, setUser, envStatus }}>
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
