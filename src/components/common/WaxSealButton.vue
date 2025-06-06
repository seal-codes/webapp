<script setup lang="ts">
defineProps<{
  text: string;
}>();
</script>

<template>
  <button 
    class="relative group"
  >
    <div 
      class="absolute inset-0 bg-secondary-500 rounded-full transition-all duration-300 group-hover:scale-110 group-hover:blur-sm group-active:scale-125 group-active:blur-md"
    ></div>
    
    <!-- Wax seal effect -->
    <div 
      class="absolute -inset-1 bg-secondary-500 rounded-full opacity-0 transition-all duration-300
      group-hover:opacity-50 group-hover:scale-[1.2] group-hover:blur-lg
      group-active:opacity-70 group-active:scale-[1.4] group-active:blur-xl"
    >
      <!-- Wax bulges -->
      <div class="absolute top-0 left-1/4 w-4 h-4 bg-secondary-500 rounded-full transform -translate-y-1/2"></div>
      <div class="absolute top-0 right-1/4 w-4 h-4 bg-secondary-500 rounded-full transform -translate-y-1/2"></div>
      <div class="absolute bottom-0 left-1/4 w-4 h-4 bg-secondary-500 rounded-full transform translate-y-1/2"></div>
      <div class="absolute bottom-0 right-1/4 w-4 h-4 bg-secondary-500 rounded-full transform translate-y-1/2"></div>
    </div>
    
    <!-- Button content -->
    <div 
      class="relative px-12 py-4 bg-secondary-500 text-white text-xl rounded-full shadow-lg transition-transform duration-300 group-hover:transform group-hover:scale-105 group-active:scale-110"
    >
      {{ text }}
    </div>
  </button>
</template>