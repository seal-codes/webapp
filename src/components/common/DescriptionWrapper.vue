<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-6 animate-fade-in">
    <h3 class="text-xl font-bold mb-4">{{ title }}</h3>
    
    <div class="prose prose-sm max-w-none">
      <slot></slot>
    </div>
  </div>
</template>