
import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language, TranslationKey } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  isVoiceEnabled: boolean;
  setIsVoiceEnabled: (enabled: boolean) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('app_language');
      return (saved as Language) || 'en';
    } catch (e) {
      console.warn('LocalStorage not available for language preference');
      return 'en';
    }
  });

  const [isVoiceEnabled, setIsVoiceEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('app_voice_enabled');
      return saved === null ? true : saved === 'true';
    } catch (e) {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_language', language);
    } catch (e) { /* ignore */ }
  }, [language]);

  useEffect(() => {
    try {
      localStorage.setItem('app_voice_enabled', isVoiceEnabled.toString());
    } catch (e) { /* ignore */ }
  }, [isVoiceEnabled]);

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isVoiceEnabled, setIsVoiceEnabled }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
