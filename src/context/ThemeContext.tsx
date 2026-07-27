import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AppThemeMode,
  THEME_COLORS,
  ThemeColors,
} from '../theme/palette';

type ThemeContextValue = {
  colors: ThemeColors;
  isDarkTheme: boolean;
  setThemeMode: (nextThemeMode: AppThemeMode) => void;
  themeMode: AppThemeMode;
  toggleTheme: () => void;
};

const STORAGE_KEY = 'lekhpal-smart-work-theme';

const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined,
);

export const ThemeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [themeMode, setThemeModeState] =
    useState<AppThemeMode>('light');

  useEffect(() => {
    let isMounted = true;

    const loadStoredTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(STORAGE_KEY);

        if (
          isMounted &&
          (savedTheme === 'light' || savedTheme === 'dark')
        ) {
          setThemeModeState(savedTheme);
        }
      } catch {
        // Keep light theme if reading the saved theme fails.
      }
    };

    loadStoredTheme();

    return () => {
      isMounted = false;
    };
  }, []);

  const setThemeMode = useCallback(
    (nextThemeMode: AppThemeMode) => {
      setThemeModeState(nextThemeMode);
      AsyncStorage.setItem(STORAGE_KEY, nextThemeMode).catch(() => {
        // Ignore persistence failures and continue with the in-memory theme.
      });
    },
    [],
  );

  const toggleTheme = useCallback(() => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  }, [setThemeMode, themeMode]);

  const value = useMemo(
    () => ({
      colors: THEME_COLORS[themeMode],
      isDarkTheme: themeMode === 'dark',
      setThemeMode,
      themeMode,
      toggleTheme,
    }),
    [setThemeMode, themeMode, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }

  return context;
};
