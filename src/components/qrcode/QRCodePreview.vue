<script setup lang="ts">
/**
 * QR Code Preview Component
 * Shows draggable QR code preview with size controls for document sealing
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { qrCodeService } from '@/services/qrcode-service'
import { qrCodeUICalculator } from '@/services/qrcode-ui-calculator'
import type { 
  QRCodeUIPosition, 
  DocumentDimensions, 
  AttestationData, 
} from '@/types/qrcode'

const props = defineProps<{
  /** Position as percentages */
  position: QRCodeUIPosition;
  /** Size as percentage (10-30) */
  sizePercent: number;
  /** Container dimensions for calculations */
  containerDimensions: DocumentDimensions;
  /** Document type for accurate preview */
  documentType: 'image';
  /** Attestation data to encode (optional for placeholder) */
  attestationData?: AttestationData;
  /** Whether this is just a placeholder */
  isPlaceholder?: boolean;
  /** Authentication provider for identity display */
  authProvider?: string;
  /** User name for identity display */
  userName?: string;
}>()

const emit = defineEmits<{
  (e: 'positionUpdated', position: QRCodeUIPosition): void;
  (e: 'sizeUpdated', sizePercent: number): void;
}>()

// Component state
const isDragging = ref(false)
const qrCodeUrl = ref('')
const dragOffset = ref({ x: 0, y: 0 })
const isGenerating = ref(false)

// Calculate actual QR code size in pixels for preview
const qrSizeInPixels = computed(() => {
  const result = qrCodeUICalculator.calculateEmbeddingPixels(
    props.position,
    props.sizePercent,
    props.containerDimensions,
    props.documentType,
  )
  return result.sizeInPixels
})

// Generate QR code when attestation data changes
const generateQRCode = async () => {
  if (props.isPlaceholder || !props.attestationData) {
    // Generate placeholder QR code
    qrCodeUrl.value = await generatePlaceholderQR()
    return
  }

  isGenerating.value = true
  try {
    const result = await qrCodeService.generateQRCode({
      data: props.attestationData,
      sizeInPixels: qrSizeInPixels.value,
      errorCorrectionLevel: 'H',
      margin: 1,
    })
    
    qrCodeUrl.value = result.dataUrl
  } catch (error) {
    console.error('Failed to generate QR code:', error)
    qrCodeUrl.value = await generatePlaceholderQR()
  } finally {
    isGenerating.value = false
  }
}

// Generate placeholder QR code for preview
const generatePlaceholderQR = async (): Promise<string> => {
  try {
    return await qrCodeService.generateQRCode({
      data: {
        h: { c: 'placeholder', p: { p: 'placeholder', d: 'placeholder' } },
        t: new Date().toISOString(),
        i: { p: 'g', id: 'preview@example.com' },
        s: { n: 'sc', k: 'preview-key' },
        e: { x: 0, y: 0, w: 100, h: 100, f: 'FFFFFF' },
      },
      sizeInPixels: qrSizeInPixels.value,
      errorCorrectionLevel: 'H',
    }).then(result => result.dataUrl)
  } catch (error) {
    console.error('Failed to generate placeholder QR:', error)
    return ''
  }
}

// Watch for changes that require QR regeneration
watch([() => props.attestationData, qrSizeInPixels], generateQRCode, { deep: true })

// Generate initial QR code
onMounted(generateQRCode)

// Cleanup event listeners on unmount
onUnmounted(() => {
  if (isDragging.value) {
    stopDragging()
  }
})

// Drag handling - supports both mouse and touch events
const startDragging = (e: MouseEvent | TouchEvent) => {
  e.preventDefault()
  
  const element = e.currentTarget as HTMLElement
  const rect = element.getBoundingClientRect()
  
  // Get coordinates from either mouse or touch event
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  
  dragOffset.value = {
    x: clientX - (rect.left + rect.width / 2),
    y: clientY - (rect.top + rect.height / 2),
  }
  
  isDragging.value = true
  
  // Add both mouse and touch event listeners
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDragging)
  document.addEventListener('touchmove', handleDrag, { passive: false })
  document.addEventListener('touchend', stopDragging)
  
  document.body.style.userSelect = 'none'
  document.body.style.touchAction = 'none' // Prevent scrolling on mobile
}

const stopDragging = () => {
  isDragging.value = false
  
  // Remove all event listeners
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDragging)
  document.removeEventListener('touchmove', handleDrag)
  document.removeEventListener('touchend', stopDragging)
  
  document.body.style.userSelect = ''
  document.body.style.touchAction = ''
}

const handleDrag = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value) {
    return
  }
  
  e.preventDefault()
  
  const container = document.querySelector('.document-preview')
  if (!container) {
    return
  }
  
  const rect = container.getBoundingClientRect()
  
  // Ensure we have valid container dimensions
  if (rect.width < 10 || rect.height < 10) {
    return
  }
  
  // Get coordinates from either mouse or touch event
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  
  // Calculate position as percentage
  const x = ((clientX - dragOffset.value.x - rect.left) / rect.width) * 100
  const y = ((clientY - dragOffset.value.y - rect.top) / rect.height) * 100
  
  // Use actual container dimensions from the DOM
  const actualDimensions = {
    width: rect.width,
    height: rect.height,
  }
  
  // Calculate safe margins using the actual container dimensions
  const margins = qrCodeUICalculator.calculateSafeMargins(
    props.sizePercent,
    actualDimensions,
  )
  
  // Keep QR code within safe bounds with extra safety check
  const boundedX = Math.max(margins.horizontal, Math.min(100 - margins.horizontal, x))
  const boundedY = Math.max(margins.vertical, Math.min(100 - margins.vertical, y))
  
  // Additional safety check to ensure position is within 0-100 range
  const safeX = Math.max(0, Math.min(100, boundedX))
  const safeY = Math.max(0, Math.min(100, boundedY))
  
  emit('positionUpdated', { x: safeX, y: safeY })
}

// Size adjustment with improved constraints
const adjustSize = (delta: number) => {
  // Set minimum size to 15% and maximum to 35% for better usability
  const minSize = 15
  const maxSize = 35
  const newSize = Math.max(minSize, Math.min(maxSize, props.sizePercent + delta))
  
  // Only emit if the size actually changed
  if (newSize !== props.sizePercent) {
    emit('sizeUpdated', newSize)
  }
}
</script>

<template>
  <div 
    class="absolute cursor-move select-none z-10 touch-none"
    :class="{ 'transition-none': isDragging }"
    :style="{
      left: `${position.x}%`,
      top: `${position.y}%`,
      transform: 'translate(-50%, -50%)',
      transition: isDragging ? 'none' : 'all 0.2s ease'
    }"
    @mousedown="startDragging"
    @touchstart="startDragging"
  >
    <!-- QR Code Container -->
    <div 
      class="relative bg-white rounded-lg shadow-lg border-2"
      :class="{ 
        'scale-105 border-blue-400': isDragging,
        'border-gray-200 hover:border-gray-300': !isDragging
      }"
      :style="{
        transition: isDragging ? 'none' : 'transform 0.2s ease, border-color 0.2s ease',
      }"
    >
      <!-- Loading indicator -->
      <div 
        v-if="isGenerating" 
        class="flex items-center justify-center p-4"
        :style="{ width: `${qrSizeInPixels}px`, height: `${qrSizeInPixels}px` }"
      >
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
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
        >
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
          <div class="w-3 h-3 bg-blue-500 rounded-full" />
          <div class="text-xs font-medium text-gray-700">
            {{ authProvider || 'Provider' }}
          </div>
        </div>
        <div class="text-center">
          <div class="text-xs text-gray-500 truncate max-w-[120px]">
            {{ userName || 'user@example.com' }}
          </div>
        </div>
        <!-- Drag indicator -->
        <div class="flex justify-center mt-1">
          <div class="flex gap-0.5">
            <div class="w-1 h-1 bg-gray-400 rounded-full" />
            <div class="w-1 h-1 bg-gray-400 rounded-full" />
            <div class="w-1 h-1 bg-gray-400 rounded-full" />
            <div class="w-1 h-1 bg-gray-400 rounded-full" />
          </div>
        </div>
      </div>
    </div>
    
    <!-- Size Controls -->
    <div 
      v-if="!isDragging"
      class="absolute left-1/2 transform -translate-x-1/2 mt-2 flex gap-1 bg-white rounded-lg shadow-md p-1 border border-gray-200"
      @mousedown.stop
      @touchstart.stop
    >
      <button 
        class="w-9 h-9 md:w-8 md:h-8 flex items-center justify-center text-gray-600 
               hover:bg-gray-100 active:bg-gray-200 rounded text-lg font-bold 
               touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed 
               transition-colors" 
        title="Make smaller"
        :disabled="sizePercent <= 15"
        @click.stop="adjustSize(-3)"
      >
        −
      </button>
      <button 
        class="w-9 h-9 md:w-8 md:h-8 flex items-center justify-center 
              text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded 
              text-lg font-bold touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Make larger"
        :disabled="sizePercent >= 35"
        @click.stop="adjustSize(3)"
      >
        +
      </button>
    </div>
  </div>
</template>
