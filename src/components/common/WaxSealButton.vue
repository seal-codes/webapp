<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  text: string;
}>()

const isPressed = ref(false)

const handlePress = () => {
  isPressed.value = true
  setTimeout(() => {
    isPressed.value = false
  }, 200)
}
</script>

<template>
  <button 
    class="relative group focus:outline-none"
    @mousedown="handlePress"
  >
    <!-- Button background -->
    <div 
      class="absolute inset-0 bg-secondary-500 rounded-full shadow-lg transition-all duration-200"
      :class="{
        'bg-secondary-600 scale-110 shadow-inner': isPressed,
        'bg-secondary-500 scale-100 shadow-lg': !isPressed
      }"
    />
    
    <!-- Button content -->
    <div 
      class="relative px-12 py-4 text-white text-xl font-semibold transition-all duration-200 rounded-full"
      :class="{
        'transform scale-110': isPressed,
        'transform scale-100': !isPressed
      }"
    >
      {{ text }}
    </div>
    
    <!-- Hover effect -->
    <div 
      class="absolute inset-0 bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
    />
  </button>
</template>