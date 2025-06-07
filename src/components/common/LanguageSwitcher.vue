<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale, getCurrentLocale, SUPPORTED_LOCALES, type SupportedLocale } from '@/i18n'
import { ChevronDown } from 'lucide-vue-next'

const { locale } = useI18n()
const isOpen = ref(false)

/**
 * Language options with their display names and flag emojis
 */
const languages = {
  en: { name: 'English', flag: '🇺🇸' },
  de: { name: 'Deutsch', flag: '🇩🇪' }
} as const

const currentLanguage = computed(() => {
  const currentLocale = getCurrentLocale()
  return languages[currentLocale]
})

/**
 * Toggle the language dropdown
 */
const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

/**
 * Change the application language
 */
const changeLanguage = (newLocale: SupportedLocale) => {
  setLocale(newLocale)
  isOpen.value = false
}

/**
 * Close dropdown when clicking outside
 */
const closeDropdown = () => {
  isOpen.value = false
}
</script>

<template>
  <div class="relative">
    <button
      class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-500 rounded-md transition-colors duration-200"
      @click="toggleDropdown"
      @blur="closeDropdown"
    >
      <span>{{ currentLanguage.flag }}</span>
      <span class="hidden sm:inline">{{ currentLanguage.name }}</span>
      <ChevronDown 
        :class="[
          'w-4 h-4 transition-transform duration-200',
          isOpen ? 'rotate-180' : ''
        ]"
      />
    </button>

    <div
      v-if="isOpen"
      class="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg border border-gray-200 z-50"
    >
      <div class="py-1">
        <button
          v-for="(lang, code) in languages"
          :key="code"
          class="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
          :class="{ 'bg-primary-50 text-primary-700': getCurrentLocale() === code }"
          @click="changeLanguage(code as SupportedLocale)"
        >
          <span>{{ lang.flag }}</span>
          <span>{{ lang.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
