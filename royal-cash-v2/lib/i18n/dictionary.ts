import { he } from './he'
import { en } from './en'
import type { Locale, TranslationDict } from './types'

let activeDict: TranslationDict = he

export function setActiveLocale(locale: Locale) {
  activeDict = locale === 'en' ? en : he
}

function nestedProxy<T extends object>(source: T): T {
  return new Proxy(source, {
    get(target, prop, receiver) {
      const val = Reflect.get(target, prop, receiver)
      if (val && typeof val === 'object') {
        return nestedProxy(val as object)
      }
      return val
    },
  }) as T
}

export const t = new Proxy({} as TranslationDict, {
  get(_target, prop) {
    const val = activeDict[prop as keyof TranslationDict]
    if (val && typeof val === 'object') {
      return nestedProxy(val as object)
    }
    return val
  },
}) as TranslationDict

export { he, en }
