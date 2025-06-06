<script setup lang="ts">
/**
 * QR Code Corner Controls Component
 * Provides quick positioning buttons for placing QR code in document corners
 */

import { computed } from 'vue';
import { qrCodeUICalculator } from '@/services/qrcode-ui-calculator';
import type { QRCodeUIPosition, DocumentDimensions } from '@/types/qrcode';

const props = defineProps<{
  /** Current QR code size as percentage */
  sizePercent: number;
  /** Document dimensions for safe margin calculation */
  documentDimensions: DocumentDimensions;
  /** Current position */
  currentPosition: QRCodeUIPosition;
}>();

const emit = defineEmits<{
  (e: 'positionSelected', position: QRCodeUIPosition): void;
}>();

// Get corner positions with safe margins
const cornerPositions = computed(() => {
  return qrCodeUICalculator.getCornerPositions(props.sizePercent);
});

// Check if current position matches a corner (within tolerance)
const isActiveCorner = (cornerName: string): boolean => {
  const corner = cornerPositions.value[cornerName];
  if (!corner) return false;
  
  const tolerance = 5; // 5% tolerance
  return Math.abs(props.currentPosition.x - corner.x) < tolerance &&
         Math.abs(props.currentPosition.y - corner.y) < tolerance;
};

// Handle corner selection
const selectCorner = (cornerName: string) => {
  const position = cornerPositions.value[cornerName];
  if (position) {
    emit('positionSelected', position);
  }
};

// Corner button configurations
const corners = [
  { name: 'topLeft', icon: '↖', label: 'Top Left' },
  { name: 'topRight', icon: '↗', label: 'Top Right' },
  { name: 'bottomLeft', icon: '↙', label: 'Bottom Left' },
  { name: 'bottomRight', icon: '↘', label: 'Bottom Right' }
];
</script>

<template>
  <div class="flex gap-2">
    <button
      v-for="corner in corners"
      :key="corner.name"
      @click="selectCorner(corner.name)"
      class="w-10 h-10 rounded-lg shadow-sm flex items-center justify-center border transition-all duration-200 text-lg"
      :class="{
        'bg-blue-500 text-white border-blue-500 shadow-md': isActiveCorner(corner.name),
        'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300': !isActiveCorner(corner.name)
      }"
      :title="`Place in ${corner.label} corner`"
    >
      {{ corner.icon }}
    </button>
  </div>
</template>
