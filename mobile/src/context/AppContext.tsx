import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AppContextType = {
  token: string | null;
  setToken: (value: string | null) => Promise<void>;
  user: any | null;
  setUser: (value: any | null) => Promise<void>;
  language: 'en' | 'ar';
  setLanguage: (value: 'en' | 'ar') => Promise<void>;
  theme: 'light' | 'dark' | 'system';
  setTheme: (value: 'light' | 'dark' | 'system') => Promise<void>;
  accent: 'blue' | 'cyan' | 'purple' | 'red' | 'green' | 'orange';
  setAccent: (value: 'blue' | 'cyan' | 'purple' | 'red' | 'green' | 'orange') => Promise<void>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUserState] = useState<any | null>(null);
  const [language, setLanguageState] = useState<'en' | 'ar'>('en');
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('dark');
  const [accent, setAccentState] = useState<'blue' | 'cyan' | 'purple' | 'red' | 'green' | 'orange'>('blue');

  useEffect(() => {
    (async () => {
      const storedToken = await SecureStore.getItemAsync('carcare_token');
      const storedUser = await AsyncStorage.getItem('carcare_user');
      const storedLanguage = await AsyncStorage.getItem('carcare_language');
      const storedTheme = await AsyncStorage.getItem('carcare_theme');
      const storedAccent = await AsyncStorage.getItem('carcare_accent');

      setTokenState(storedToken ?? null);
      setUserState(storedUser ? JSON.parse(storedUser) : null);
      setLanguageState(storedLanguage === 'ar' ? 'ar' : 'en');
      setThemeState(storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system' ? storedTheme : 'dark');
      setAccentState(storedAccent as any ?? 'blue');
    })();
  }, []);

  const setToken = async (value: string | null) => {
    setTokenState(value);
    if (value) {
      await SecureStore.setItemAsync('carcare_token', value);
    } else {
      await SecureStore.deleteItemAsync('carcare_token');
    }
  };

  const setUser = async (value: any | null) => {
    setUserState(value);
    if (value) {
      await AsyncStorage.setItem('carcare_user', JSON.stringify(value));
    } else {
      await AsyncStorage.removeItem('carcare_user');
    }
  };

  const setLanguage = async (value: 'en' | 'ar') => {
    setLanguageState(value);
    await AsyncStorage.setItem('carcare_language', value);
  };

  const setTheme = async (value: 'light' | 'dark' | 'system') => {
    setThemeState(value);
    await AsyncStorage.setItem('carcare_theme', value);
  };

  const setAccent = async (value: 'blue' | 'cyan' | 'purple' | 'red' | 'green' | 'orange') => {
    setAccentState(value);
    await AsyncStorage.setItem('carcare_accent', value);
  };

  const value = useMemo(() => ({
    token,
    setToken,
    user,
    setUser,
    language,
    setLanguage,
    theme,
    setTheme,
    accent,
    setAccent,
  }), [token, user, language, theme, accent]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('AppContext provider missing');
  }
  return context;
}
