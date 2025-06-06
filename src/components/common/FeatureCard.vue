<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  icon: string;
  step?: string;
}>()
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm p-6 transition-all duration-200 hover:shadow-md relative">
    <!-- Step indicator (if provided) -->
    <div 
      v-if="step" 
      class="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold shadow-md"
    >
      {{ step }}
    </div>
    
    <!-- Card content -->
    <div class="text-3xl mb-4">
      {{ icon }}
    </div>
    <h3 class="text-xl font-medium mb-2">
      {{ title }}
    </h3>
    <p class="text-gray-600">
      {{ description }}
    </p>
  </div>
</template>