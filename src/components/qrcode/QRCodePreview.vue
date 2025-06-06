<script setup lang="ts">
/**
 * QR Code Preview Component
 * Shows draggable QR code preview with size controls for document sealing
 */

import { ref, computed, onMounted, watch } from 'vue';
import { qrCodeService } from '@/services/qrcode-service';
import { qrCodeUICalculator } from '@/services/qrcode-ui-calculator';
import type { 
  QRCodeUIPosition, 
  DocumentDimensions, 
  AttestationData 
} from '@/types/qrcode';

const props = defineProps<{
  /** Position as percentages */
  position: QRCodeUIPosition;
  /** Size as percentage (10-30) */
  sizePercent: number;
  /** Container dimensions for calculations */
  containerDimensions: DocumentDimensions;
  /** Document type for accurate preview */
  documentType: 'pdf' | 'image';
  /** Attestation data to encode (optional for placeholder) */
  attestationData?: AttestationData;
  /** Whether this is just a placeholder */
  isPlaceholder?: boolean;
  /** Authentication provider for identity display */
  authProvider?: string;
  /** User name for identity display */
  userName?: string;
}>();

const emit = defineEmits<{
  (e: 'positionUpdated', position: QRCodeUIPosition): void;
  (e: 'sizeUpdated', sizePercent: number): void;
}>();

// Component state
const isDragging = ref(false);
const qrCodeUrl = ref('');
const dragOffset = ref({ x: 0, y: 0 });
const isGenerating = ref(false);

// Calculate actual QR code size in pixels for preview
const qrSizeInPixels = computed(() => {
  const result = qrCodeUICalculator.calculateEmbeddingPixels(
    props.position,
    props.sizePercent,
    props.containerDimensions,
    props.documentType
  );
  return result.sizeInPixels;
});

// Generate QR code when attestation data changes
const generateQRCode = async () => {
  if (props.isPlaceholder || !props.attestationData) {
    // Generate placeholder QR code
    qrCodeUrl.value = await generatePlaceholderQR();
    return;
  }

  isGenerating.value = true;
  try {
    const result = await qrCodeService.generateQRCode({
      data: props.attestationData,
      sizeInPixels: qrSizeInPixels.value,
      errorCorrectionLevel: 'H',
      margin: 1
    });
    
    qrCodeUrl.value = result.dataUrl;
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    qrCodeUrl.value = await generatePlaceholderQR();
  } finally {
    isGenerating.value = false;
  }
};

// Generate placeholder QR code for preview
const generatePlaceholderQR = async (): Promise<string> => {
  try {
    return await qrCodeService.generateQRCode({
      data: {
        h: { c: 'placeholder', p: { p: 'placeholder', d: 'placeholder' } },
        t: new Date().toISOString(),
        i: { p: 'g', id: 'preview@example.com' },
        s: { n: 'sc', k: 'preview-key' }
      },
      sizeInPixels: qrSizeInPixels.value,
      errorCorrectionLevel: 'H'
    }).then(result => result.dataUrl);
  } catch (error) {
    console.error('Failed to generate placeholder QR:', error);
    return '';
  }
};

// Watch for changes that require QR regeneration
watch([() => props.attestationData, qrSizeInPixels], generateQRCode, { deep: true });

// Generate initial QR code
onMounted(generateQRCode);

// Drag handling
const startDragging = (e: MouseEvent) => {
  const element = e.currentTarget as HTMLElement;
  const rect = element.getBoundingClientRect();
  
  dragOffset.value = {
    x: e.clientX - (rect.left + rect.width / 2),
    y: e.clientY - (rect.top + rect.height / 2)
  };
  
  isDragging.value = true;
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', stopDragging);
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
  
  // Calculate safe margins
  const margins = qrCodeUICalculator.calculateSafeMargins(
    props.sizePercent,
    props.containerDimensions
  );
  
  // Keep QR code within safe bounds
  const boundedX = Math.max(margins.horizontal, Math.min(100 - margins.horizontal, x));
  const boundedY = Math.max(margins.vertical, Math.min(100 - margins.vertical, y));
  
  emit('positionUpdated', { x: boundedX, y: boundedY });
};

// Size adjustment
const adjustSize = (delta: number) => {
  const newSize = Math.max(10, Math.min(30, props.sizePercent + delta));
  emit('sizeUpdated', newSize);
};
</script>

<template>
  <div 
    class="absolute cursor-move select-none z-10"
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
      class="relative bg-white rounded-lg shadow-lg border-2"
      :class="{ 
        'scale-105 border-blue-400': isDragging,
        'border-gray-200': !isDragging
      }"
      :style="{
        transition: isDragging ? 'none' : 'transform 0.2s ease',
      }"
    >
      <!-- Loading indicator -->
      <div 
        v-if="isGenerating" 
        class="flex items-center justify-center p-4"
        :style="{ width: `${qrSizeInPixels}px`, height: `${qrSizeInPixels}px` }"
      >
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
      
      <!-- QR Code -->
      <div 
        v-else
        :style="{
          width: `${qrSizeInPixels}px`,
          height: `${qrSizeInPixels}px`,
        }"
        class="p-2"
      >
        <img 
          v-if="qrCodeUrl" 
          :src="qrCodeUrl" 
          alt="QR Code Preview"
          class="w-full h-full rounded"
          draggable="false"
        />
        <div 
          v-else 
          class="w-full h-full bg-gray-200 rounded flex items-center justify-center text-gray-500 text-xs"
        >
          QR Code
        </div>
      </div>
      
      <!-- Identity Section -->
      <div class="px-3 py-2 border-t border-gray-100 bg-gray-50 rounded-b-lg">
        <div class="flex items-center justify-center gap-2 mb-1">
          <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
          <div class="text-xs font-medium text-gray-700">
            {{ authProvider || 'Provider' }}
          </div>
        </div>
        <div class="text-center">
          <div class="text-xs text-gray-500 truncate max-w-[120px]">
            {{ userName || 'user@example.com' }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Size Controls -->
    <div 
      v-if="!isDragging"
      class="absolute left-1/2 transform -translate-x-1/2 mt-2 flex gap-1 bg-white rounded-lg shadow-md p-1 border border-gray-200"
    >
      <button 
        @click="adjustSize(-2)" 
        class="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded text-sm font-medium"
        title="Decrease size"
      >
        −
      </button>
      <div class="flex items-center px-2 text-xs text-gray-500 font-medium">
        {{ sizePercent }}%
      </div>
      <button 
        @click="adjustSize(2)"
        class="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded text-sm font-medium"
        title="Increase size"
      >
        +
      </button>
    </div>
  </div>
</template>
