<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import QrCodePlaceholder from './QrCodePlaceholder.vue';

const props = defineProps<{
  document: File | null;
  qrPosition: { x: number, y: number };
  hasQr?: boolean;
}>();

const previewUrl = ref('');
const documentType = ref<'pdf' | 'image' | null>(null);
const isLoading = ref(true);
const containerWidth = ref(0);
const containerHeight = ref(0);
const previewRef = ref<HTMLElement | null>(null);

// Create document preview
watch(() => props.document, async (newDocument) => {
  if (!newDocument) return;
  
  isLoading.value = true;
  
  // Determine document type
  if (newDocument.type === 'application/pdf') {
    documentType.value = 'pdf';
  } else if (newDocument.type.startsWith('image/')) {
    documentType.value = 'image';
  } else {
    documentType.value = null;
    isLoading.value = false;
    return;
  }
  
  // Create object URL for preview
  previewUrl.value = URL.createObjectURL(newDocument);
  isLoading.value = false;
}, { immediate: true });

// Update container dimensions when image loads
onMounted(() => {
  const updateDimensions = () => {
    if (previewRef.value) {
      const rect = previewRef.value.getBoundingClientRect();
      containerWidth.value = rect.width;
      containerHeight.value = rect.height;
    }
  };

  window.addEventListener('resize', updateDimensions);
  
  // Initial update after image loads
  const img = new Image();
  img.onload = updateDimensions;
  if (previewUrl.value) {
    img.src = previewUrl.value;
  }

  return () => {
    window.removeEventListener('resize', updateDimensions);
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value);
    }
  };
});

const emit = defineEmits<{
  (e: 'positionUpdated', position: { x: number, y: number }): void;
  (e: 'sizeUpdated', size: number): void;
}>();
</script>

<template>
  <div class="bg-gray-100 rounded-lg">
    <!-- Loading indicator -->
    <div v-if="isLoading" class="flex justify-center items-center p-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
    </div>
    
    <!-- Image preview -->
    <div 
      v-else-if="documentType === 'image' && previewUrl" 
      ref="previewRef"
      class="relative document-preview"
    >
      <img 
        :src="previewUrl" 
        alt="Document preview" 
        class="w-full rounded" 
        @load="() => {
          if (previewRef.value) {
            const rect = previewRef.value.getBoundingClientRect();
            containerWidth = rect.width;
            containerHeight = rect.height;
          }
        }"
      />
      
      <!-- QR code placeholder -->
      <QrCodePlaceholder
        v-if="!hasQr && containerWidth && containerHeight"
        :position="qrPosition"
        :container-width="containerWidth"
        :container-height="containerHeight"
        @position-updated="$emit('positionUpdated', $event)"
        @size-updated="$emit('sizeUpdated', $event)"
      />
    </div>
    
    <!-- PDF preview -->
    <div 
      v-else-if="documentType === 'pdf' && previewUrl" 
      ref="previewRef"
      class="relative document-preview w-full h-[600px]"
    >
      <iframe 
        :src="`${previewUrl}#view=FitH`" 
        class="w-full h-full rounded" 
        title="PDF preview"
      />
      
      <!-- QR code placeholder -->
      <QrCodePlaceholder
        v-if="!hasQr && containerWidth && containerHeight"
        :position="qrPosition"
        :container-width="containerWidth"
        :container-height="containerHeight"
        @position-updated="$emit('positionUpdated', $event)"
        @size-updated="$emit('sizeUpdated', $event)"
      />
    </div>
    
    <!-- No preview available -->
    <div v-else class="flex justify-center items-center p-12 text-gray-500">
      No preview available
    </div>
  </div>
</template>