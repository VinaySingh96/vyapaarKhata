import en from './locales/en.json' with { type: 'json' };
import hi from './locales/hi.json' with { type: 'json' };

export type Language = 'en' | 'hi';

export interface TranslationDictionary {
  [key: string]: string;
}

export const translations: Record<Language, TranslationDictionary> = {
  en,
  hi,
};
