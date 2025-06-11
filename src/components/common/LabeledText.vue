<script setup lang="ts">
defineProps<{
  label: string;
  value: string;
  icon?: any;
  monospace?: boolean;
}>()
</script>

<template>
  <div class="space-y-1">
    <div class="flex items-center gap-2">
      <component 
        :is="icon" 
        v-if="icon" 
        class="w-4 h-4 text-gray-400" 
      />
      <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {{ label }}
      </span>
    </div>
    <p 
      class="text-gray-900"
      :class="{ 'font-mono text-sm break-all': monospace }"
    >
      {{ value }}
    </p>
  </div>
</template>