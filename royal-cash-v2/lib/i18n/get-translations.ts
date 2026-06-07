import { cookies } from 'next/headers'
import { he } from './he'
import { en } from './en'
import { LOCALE_STORAGE_KEY, localeMeta, type Locale } from './types'

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  return cookieStore.get(LOCALE_STORAGE_KEY)?.value === 'en' ? 'en' : 'he'
}

export async function getTranslations() {
  const locale = await getLocale()
  return locale === 'en' ? en : he
}

export { localeMeta }
