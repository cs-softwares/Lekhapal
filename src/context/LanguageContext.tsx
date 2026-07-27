import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {translations} from '../config/translations';
import {LanguageCode} from '../types/tool';

type AppStrings = Record<keyof typeof translations.en, string>;

type LanguageContextValue = {
  language: LanguageCode;
  strings: AppStrings;
  setLanguage: (nextLanguage: LanguageCode) => void;
};

const STORAGE_KEY = 'lekhpal-smart-work-language';

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

export const LanguageProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  useEffect(() => {
    let isMounted = true;

    const loadStoredLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem(STORAGE_KEY);

        if (
          isMounted &&
          (savedLanguage === 'en' || savedLanguage === 'hi')
        ) {
          setLanguageState(savedLanguage);
        }
      } catch {
        // Keep the default language when storage read fails.
      }
    };

    loadStoredLanguage();

    return () => {
      isMounted = false;
    };
  }, []);

  const setLanguage = (nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage);
    AsyncStorage.setItem(STORAGE_KEY, nextLanguage).catch(() => {
      // Ignore persistence failures and continue with the in-memory state.
    });
  };

  const value = {
    language,
    strings: translations[language] as AppStrings,
    setLanguage,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }

  return context;
};
