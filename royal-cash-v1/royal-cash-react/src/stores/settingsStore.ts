import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Language } from '../types';

interface SettingsState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'he',
      setLanguage: (language) => {
        // Update document direction
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
        set({ language });
      },
    }),
    {
      name: 'royal-cash-settings',
      onRehydrateStorage: () => (state) => {
        // Apply language direction on rehydration
        if (state) {
          document.documentElement.lang = state.language;
          document.documentElement.dir = state.language === 'he' ? 'rtl' : 'ltr';
        }
      },
    }
  )
);
