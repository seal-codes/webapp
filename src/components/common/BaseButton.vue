<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'outline' | 'cta'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  type: 'button'
})

const buttonClasses = computed(() => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }
  
  const variantClasses = {
    primary: 'bg-primary-500 hover:bg-primary-600 text-white focus:ring-primary-500',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 focus:ring-gray-400',
    outline: 'bg-transparent hover:bg-gray-50 text-gray-700 border border-gray-300 focus:ring-gray-400',
    cta: 'bg-secondary-500 hover:bg-secondary-600 text-white focus:ring-secondary-500'
  }
  
  return [
    baseClasses,
    sizeClasses[props.size],
    variantClasses[props.variant]
  ].join(' ')
})
</script>

<template>
  <button 
    :type="type"
    :disabled="disabled || loading"
    :class="buttonClasses"
  >
    <!-- Loading spinner -->
    <div 
      v-if="loading"
      class="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2"
    />
    
    <!-- Button content -->
    <slot />
  </button>
</template>
