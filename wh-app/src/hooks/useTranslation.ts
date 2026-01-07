import { useState, useEffect } from 'react';
import { translations, Language } from '../locales';
import settingsService from '../services/settingsService';
import type { TranslationKeys } from '../locales/en';

let currentLanguage: Language = 'english';
let currentTranslations: TranslationKeys = translations.english;
const listeners: Set<() => void> = new Set();

function getNestedTranslation(obj: any, path: string): string {
  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return path; 
    }
  }

  return typeof result === 'string' ? result : path;
}

const initializeLanguage = async () => {
  try {
    const settings = await settingsService.getCachedSettings();
    const savedLanguage = settings.preferences?.language as Language;

    if (savedLanguage && translations[savedLanguage]) {
      currentLanguage = savedLanguage;
      currentTranslations = translations[savedLanguage];
    }
  } catch (error) {
    console.error('[useTranslation] Error loading language:', error);
  }
};

initializeLanguage();

export const changeLanguage = async (language: Language) => {
  if (translations[language]) {
    currentLanguage = language;
    currentTranslations = translations[language];

    listeners.forEach(listener => listener());

    try {
      await settingsService.updatePreferences({ language });
    } catch (error) {
      console.error('[useTranslation] Error saving language:', error);
    }
  }
};

export const getCurrentLanguage = (): Language => currentLanguage;

export const useTranslation = () => {
  const [updateCount, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => {
      forceUpdate(prev => prev + 1);
    };
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const translation = getNestedTranslation(currentTranslations, key);

    if (params) {
      let result = translation;
      Object.keys(params).forEach(param => {
        result = result.replace(`{${param}}`, String(params[param]));
      });
      return result;
    }

    return translation;
  };

  return {
    t,
    language: currentLanguage,
    changeLanguage,
  };
};

export const t = (
  key: string,
  params?: Record<string, string | number>,
): string => {
  let translation = getNestedTranslation(currentTranslations, key);

  if (params) {
    Object.keys(params).forEach(param => {
      translation = translation.replace(`{${param}}`, String(params[param]));
    });
  }

  return translation;
};
