<script setup lang="ts">
import { ref, computed } from 'vue';
import QRCode from 'qrcode';

const props = defineProps<{
  position: { x: number; y: number };
  containerWidth: number;
  containerHeight: number;
  authProvider?: string;
  userName?: string;
}>();

const emit = defineEmits<{
  (e: 'positionUpdated', position: { x: number; y: number }): void;
  (e: 'sizeUpdated', size: number): void;
}>();

const isDragging = ref(false);
const size = ref(20); // Default 20% of container width
const qrCodeUrl = ref('');
const dragOffset = ref({ x: 0, y: 0 });

// Generate QR code
const generateQrCode = async () => {
  try {
    qrCodeUrl.value = await QRCode.toDataURL('https://seal.codes', {
      width: 200,
      margin: 0,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
  }
};

generateQrCode();

// Calculate QR code dimensions including the identity section
const qrDimensions = computed(() => {
  const qrSize = (Math.min(props.containerWidth, props.containerHeight) * size.value) / 100;
  const identityHeight = 60; // Height of identity section in pixels
  return {
    width: qrSize,
    height: qrSize + identityHeight
  };
});

const startDragging = (e: MouseEvent) => {
  const element = e.currentTarget as HTMLElement;
  const rect = element.getBoundingClientRect();
  
  // Calculate offset from click position to element center
  dragOffset.value = {
    x: e.clientX - (rect.left + rect.width / 2),
    y: e.clientY - (rect.top + rect.height / 2)
  };
  
  isDragging.value = true;
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', stopDragging);
  
  // Prevent text selection while dragging
  document.body.style.userSelect = 'none';
};

const stopDragging = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDragging);
  document.body.style.userSelect = '';
};

const handleDrag = (e: MouseEvent) => {
  if (!isDragging.value) return;
  
  const container = document.querySelector('.document-preview');
  if (!container) return;
  
  const rect = container.getBoundingClientRect();
  
  // Calculate position as percentage
  const x = ((e.clientX - dragOffset.value.x - rect.left) / rect.width) * 100;
  const y = ((e.clientY - dragOffset.value.y - rect.top) / rect.height) * 100;
  
  // Calculate bounds considering QR code dimensions
  const qrWidthPercent = (qrDimensions.value.width / rect.width) * 100;
  const qrHeightPercent = (qrDimensions.value.height / rect.height) * 100;
  
  // Keep QR code fully within bounds
  const boundedX = Math.max(qrWidthPercent / 2, Math.min(100 - qrWidthPercent / 2, x));
  const boundedY = Math.max(qrHeightPercent / 2, Math.min(100 - qrHeightPercent / 2, y));
  
  emit('positionUpdated', { x: boundedX, y: boundedY });
};

const adjustSize = (delta: number) => {
  const newSize = Math.max(10, Math.min(30, size.value + delta));
  size.value = newSize;
  emit('sizeUpdated', newSize);
};

// Calculate actual size in pixels
const sizeInPixels = computed(() => {
  const minDimension = Math.min(props.containerWidth, props.containerHeight);
  return (minDimension * size.value) / 100;
});
</script>

<template>
  <div 
    class="absolute cursor-move select-none"
    :class="{ 'transition-none': isDragging }"
    :style="{
      left: `${position.x}%`,
      top: `${position.y}%`,
      transform: 'translate(-50%, -50%)',
      transition: isDragging ? 'none' : 'all 0.2s ease'
    }"
    @mousedown="startDragging"
  >
    <!-- QR Code Container -->
    <div 
      class="relative bg-white rounded-lg shadow-lg"
      :class="{ 'scale-105': isDragging }"
      :style="{
        transition: isDragging ? 'none' : 'transform 0.2s ease',
      }"
    >
      <!-- QR Code -->
      <div 
        :style="{
          width: `${sizeInPixels}px`,
          height: `${sizeInPixels}px`,
        }"
        class="p-[10px]"
      >
        <img 
          v-if="qrCodeUrl" 
          :src="qrCodeUrl" 
          alt="QR Code"
          class="w-full h-full"
          draggable="false"
        />
      </div>
      
      <!-- Auth Identity Placeholder (below QR code) -->
      <div class="px-2 py-3 border-t border-gray-100">
        <div class="flex items-center justify-center gap-2 mb-1">
          <div class="w-4 h-4 bg-gray-300 rounded-full"></div>
          <div class="w-16 h-3 bg-gray-300 rounded"></div>
        </div>
        <div class="flex justify-center">
          <div class="w-24 h-2 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
    
    <!-- Size Controls -->
    <div class="absolute left-1/2 transform -translate-x-1/2 mt-2 flex gap-2 bg-white rounded-lg shadow-md p-1">
      <button 
        @click="adjustSize(-2)" 
        class="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded"
      >
        −
      </button>
      <button 
        @click="adjustSize(2)"
        class="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded"
      >
        +
      </button>
    </div>
  </div>
</template>