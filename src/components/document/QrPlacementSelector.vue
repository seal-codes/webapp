<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  initialPosition: { x: number, y: number };
}>();

const emit = defineEmits<{
  (e: 'positionUpdated', position: { x: number, y: number }): void;
}>();

const xPosition = ref(props.initialPosition.x);
const yPosition = ref(props.initialPosition.y);

// Emit position changes
watch([xPosition, yPosition], ([newX, newY]) => {
  emit('positionUpdated', { x: newX, y: newY });
});
</script>

<template>
  <div class="space-y-4">
    <!-- X Position Slider -->
    <div>
      <div class="flex justify-between mb-2">
        <label for="xPosition" class="text-sm font-medium text-gray-700">Horizontal Position</label>
        <span class="text-sm text-gray-500">{{ xPosition }}%</span>
      </div>
      <input 
        id="xPosition"
        v-model.number="xPosition"
        type="range"
        min="5"
        max="95"
        step="1"
        class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <div class="flex justify-between text-xs text-gray-400 mt-1">
        <span>Left</span>
        <span>Right</span>
      </div>
    </div>
    
    <!-- Y Position Slider -->
    <div>
      <div class="flex justify-between mb-2">
        <label for="yPosition" class="text-sm font-medium text-gray-700">Vertical Position</label>
        <span class="text-sm text-gray-500">{{ yPosition }}%</span>
      </div>
      <input 
        id="yPosition"
        v-model.number="yPosition"
        type="range"
        min="5"
        max="95"
        step="1"
        class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <div class="flex justify-between text-xs text-gray-400 mt-1">
        <span>Top</span>
        <span>Bottom</span>
      </div>
    </div>
    
    <!-- Position Presets -->
    <div class="mt-4">
      <p class="text-sm font-medium text-gray-700 mb-2">Quick Positions</p>
      <div class="grid grid-cols-3 gap-2">
        <button 
          @click="xPosition = 10; yPosition = 10"
          class="p-2 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          Top Left
        </button>
        <button 
          @click="xPosition = 50; yPosition = 10"
          class="p-2 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          Top Center
        </button>
        <button 
          @click="xPosition = 90; yPosition = 10"
          class="p-2 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          Top Right
        </button>
        <button 
          @click="xPosition = 10; yPosition = 90"
          class="p-2 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          Bottom Left
        </button>
        <button 
          @click="xPosition = 50; yPosition = 90"
          class="p-2 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          Bottom Center
        </button>
        <button 
          @click="xPosition = 90; yPosition = 90"
          class="p-2 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          Bottom Right
        </button>
      </div>
    </div>
  </div>
</template>