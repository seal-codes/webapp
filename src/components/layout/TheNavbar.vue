<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from '../common/LanguageSwitcher.vue'

const router = useRouter()
const { t } = useI18n()
const isMenuOpen = ref(false)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const navigateTo = (path: string) => {
  router.push(path)
  isMenuOpen.value = false
}
</script>

<template>
  <header class="bg-white border-b border-gray-100 shadow-sm">
    <div class="container mx-auto px-4">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <div class="flex items-center">
          <a href="/" class="flex items-center" @click.prevent="navigateTo('/')">
            <span class="text-xl font-bold text-secondary-500">seal.codes</span>
          </a>
        </div>
        
        <!-- Desktop Navigation -->
        <nav class="hidden md:flex items-center space-x-8">
          <a 
            href="/" 
            class="text-gray-700 hover:text-primary-500 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            @click.prevent="navigateTo('/')"
          >
            {{ t('navigation.home') }}
          </a>
          <a 
            href="/document" 
            class="text-gray-700 hover:text-primary-500 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            @click.prevent="navigateTo('/document')"
          >
            {{ t('navigation.sealDocument') }}
          </a>
          <a 
            href="/verify" 
            class="text-gray-700 hover:text-primary-500 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            @click.prevent="navigateTo('/verify')"
          >
            Verify Document
          </a>
          
          <LanguageSwitcher />
        </nav>
        
        <!-- Mobile Menu Button -->
        <div class="md:hidden">
          <button 
            class="text-gray-700 hover:text-primary-500 focus:outline-none" 
            @click="toggleMenu"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              class="h-6 w-6" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                v-if="!isMenuOpen" 
                stroke-linecap="round" 
                stroke-linejoin="round" 
                stroke-width="2" 
                d="M4 6h16M4 12h16M4 18h16"
              />
              <path 
                v-else 
                stroke-linecap="round" 
                stroke-linejoin="round" 
                stroke-width="2" 
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Mobile Navigation -->
      <div 
        v-if="isMenuOpen" 
        class="md:hidden"
      >
        <div class="pt-2 pb-4 space-y-1">
          <a 
            href="/" 
            class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-500 hover:bg-gray-50"
            @click.prevent="navigateTo('/')"
          >
            {{ t('navigation.home') }}
          </a>
          <a 
            href="/document" 
            class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-500 hover:bg-gray-50"
            @click.prevent="navigateTo('/document')"
          >
            {{ t('navigation.sealDocument') }}
          </a>
          <a 
            href="/verify" 
            class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-500 hover:bg-gray-50"
            @click.prevent="navigateTo('/verify')"
          >
            Verify Document
          </a>
          
          <div class="px-3 py-2">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </div>
  </header>
</template>