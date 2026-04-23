import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, doc, onSnapshot } from '../firebase';
import { StoreSettings } from '../types';

interface StoreContextType {
  settings: StoreSettings | null;
  loading: boolean;
  deliveryFee: number;
  freeDeliveryThreshold: number;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'store'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as StoreSettings;
        setSettings(data);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const deliveryFee = settings?.deliveryFee ?? 20;
  const freeDeliveryThreshold = settings?.freeDeliveryThreshold ?? 200;

  return (
    <StoreContext.Provider value={{ settings, loading, deliveryFee, freeDeliveryThreshold }}>
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
