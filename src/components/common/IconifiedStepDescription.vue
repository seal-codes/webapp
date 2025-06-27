<script setup lang="ts">
import { type Component } from 'vue'

defineProps<{
  icon: Component;
  title: string;
  description?: string;
}>()
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow duration-200">
    <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <component
        :is="icon"
        class="w-8 h-8 text-primary-600"
      />
    </div>
    <h2 class="text-xl font-bold mb-3">
      {{ title }}
    </h2>
    <div class="text-gray-600">
      <slot v-if="$slots.default" />
      <p v-else-if="description">
        {{ description }}
      </p>
    </div>
  </div>
</template>