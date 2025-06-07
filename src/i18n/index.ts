import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import de from './locales/de.json'

/**
 * Supported locales for the application
 */
export const SUPPORTED_LOCALES = ['en', 'de'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

/**
 * Default locale for the application
 */
export const DEFAULT_LOCALE: SupportedLocale = 'en'

/**
 * Get the user's preferred locale from browser settings or localStorage
 * Falls back to default locale if not supported
 */
function getPreferredLocale(): SupportedLocale {
  // Check localStorage first
  const stored = localStorage.getItem('seal-codes-locale')
  if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
    return stored as SupportedLocale
  }

  // Check browser language
  const browserLang = navigator.language.split('-')[0]
  if (SUPPORTED_LOCALES.includes(browserLang as SupportedLocale)) {
    return browserLang as SupportedLocale
  }

  return DEFAULT_LOCALE
}

/**
 * Vue I18n instance configuration
 */
export const i18n = createI18n({
  legacy: false,
  locale: getPreferredLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: {
    en,
    de
  }
})

/**
 * Set the application locale and persist to localStorage
 */
export function setLocale(locale: SupportedLocale) {
  i18n.global.locale.value = locale
  localStorage.setItem('seal-codes-locale', locale)
  document.documentElement.lang = locale
}

/**
 * Get the current application locale
 */
export function getCurrentLocale(): SupportedLocale {
  return i18n.global.locale.value as SupportedLocale
}
