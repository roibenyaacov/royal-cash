import type { he } from './he'

type DeepStringRecord<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringRecord<T[K]>
}

export type TranslationDict = DeepStringRecord<typeof he>
export type Locale = 'he' | 'en'

export const LOCALE_STORAGE_KEY = 'royal-cash-locale'

export const localeMeta: Record<Locale, { label: string; dir: 'rtl' | 'ltr'; lang: string }> = {
  he: { label: 'עב', dir: 'rtl', lang: 'he' },
  en: { label: 'EN', dir: 'ltr', lang: 'en' },
}
