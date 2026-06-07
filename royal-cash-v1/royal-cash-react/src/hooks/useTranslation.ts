import { useCallback } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { translations, TranslationKey } from '../i18n/translations';
import { Language } from '../types';

export function useTranslation() {
  const { language, setLanguage } = useSettingsStore();

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[language][key] || key;
    },
    [language]
  );

  const changeLanguage = useCallback(
    (lang: Language) => {
      setLanguage(lang);
    },
    [setLanguage]
  );

  const isRTL = language === 'he';

  return {
    t,
    language,
    changeLanguage,
    isRTL,
  };
}
