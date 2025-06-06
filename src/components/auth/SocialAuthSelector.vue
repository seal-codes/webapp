<script setup lang="ts">
import { providers } from '../../types/auth'

defineProps<{
  isProcessing: boolean;
}>()

const emit = defineEmits<{
  (e: 'providerSelected', provider: string): void;
}>()

const handleProviderSelect = (providerId: string) => {
  emit('providerSelected', providerId)
}
</script>

<template>
  <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
    <button 
      v-for="provider in providers" 
      :key="provider.id"
      :disabled="isProcessing"
      class="aspect-square flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors relative group"
      @click="handleProviderSelect(provider.id)"
    >
      <!-- Loading Spinner -->
      <div 
        v-if="isProcessing"
        class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-xl"
      >
        <div class="animate-spin h-5 w-5 border-2 border-primary-500 rounded-full border-t-transparent" />
      </div>
      
      <!-- Provider Icon -->
      <img 
        :src="provider.icon" 
        :alt="provider.name"
        class="w-8 h-8 object-contain mb-2"
      />
      
      <!-- Provider Name -->
      <span class="text-xs text-gray-600 text-center">{{ provider.name }}</span>
    </button>
  </div>
  
  <p class="text-xs text-gray-500 mt-4 text-center">
    By continuing, you agree to our Terms of Service and Privacy Policy
  </p>
</template>