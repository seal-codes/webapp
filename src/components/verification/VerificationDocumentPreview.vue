<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText } from 'lucide-vue-next'
import BaseMessage from '@/components/common/BaseMessage.vue'
import ExclusionZoneOverlay from './ExclusionZoneOverlay.vue'
import type { DecodedVerificationData } from '@/services/verification-service'
import { getExclusionZone } from '@/services/verification-service'

interface Props {
  uploadedDocument: File
  documentPreviewUrl: string
  decodedData: DecodedVerificationData | null
  canManuallySelect: boolean
}

interface Emits {
  (e: 'scan-selected-area', selection: { x: number; y: number; width: number; height: number }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

// Computed exclusion zone
const exclusionZone = computed(() => getExclusionZone(props.decodedData))

// QR Selection state
const isSelecting = ref(false)
const selectionStart = ref<{ x: number; y: number } | null>(null)
const selectionEnd = ref<{ x: number; y: number } | null>(null)
const imageElement = ref<HTMLImageElement | null>(null)
const imageLoaded = ref(false)

// Handle image load
const handleImageLoad = () => {
  imageLoaded.value = true
}

/**
 * Calculate the selection box coordinates and dimensions
 */
const selectionBox = computed(() => {
  if (!selectionStart.value || !selectionEnd.value) return null
  
  const start = selectionStart.value
  const end = selectionEnd.value
  
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y)
  }
})

/**
 * Handle mouse down event to start QR selection
 */
const handleMouseDown = (event: MouseEvent) => {
  if (!imageElement.value || !props.uploadedDocument?.type.startsWith('image/')) return
  
  event.preventDefault()
  
  const rect = imageElement.value.getBoundingClientRect()
  
  // Calculate position relative to the image
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  selectionStart.value = { x, y }
  selectionEnd.value = { x, y }
  isSelecting.value = true
  
  // Add mouse move and up listeners
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

/**
 * Handle mouse move event during selection
 */
const handleMouseMove = (event: MouseEvent) => {
  if (!isSelecting.value || !selectionStart.value || !imageElement.value) return
  
  const rect = imageElement.value.getBoundingClientRect()
  
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  selectionEnd.value = { x, y }
}

/**
 * Handle mouse up event to complete selection
 */
const handleMouseUp = () => {
  if (!isSelecting.value) return
  
  // Remove event listeners
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  
  // If we have a valid selection, emit the scan event
  if (selectionBox.value && selectionBox.value.width > 20 && selectionBox.value.height > 20) {
    scanSelectedArea()
  }
  
  isSelecting.value = false
}

/**
 * Emit the scan selected area event with proper coordinates
 */
const scanSelectedArea = () => {
  if (!selectionBox.value || !imageElement.value) return
  
  // Calculate the selection in image coordinates
  const imageRect = imageElement.value.getBoundingClientRect()
  const naturalWidth = imageElement.value.naturalWidth
  const naturalHeight = imageElement.value.naturalHeight
  
  // Scale selection from display coordinates to natural image coordinates
  const scaleX = naturalWidth / imageRect.width
  const scaleY = naturalHeight / imageRect.height
  
  const imageSelection = {
    x: Math.round(selectionBox.value.x * scaleX),
    y: Math.round(selectionBox.value.y * scaleY),
    width: Math.round(selectionBox.value.width * scaleX),
    height: Math.round(selectionBox.value.height * scaleY)
  }
  
  emit('scan-selected-area', imageSelection)
}

/**
 * Reset the selection state
 */
const resetSelection = () => {
  selectionStart.value = null
  selectionEnd.value = null
  isSelecting.value = false
  
  // Clean up event listeners
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

// Expose resetSelection for parent component
defineExpose({ resetSelection })
</script>

<template>
  <div class="mb-6">
    <div class="bg-gray-100 rounded-lg p-4">
      <div class="flex items-center gap-3 mb-4">
        <FileText class="w-5 h-5 text-gray-500" />
        <div>
          <p class="font-medium">{{ uploadedDocument.name }}</p>
          <p class="text-sm text-gray-600">{{ uploadedDocument.type }}</p>
        </div>
      </div>
      
      <!-- Image Preview with QR Selection -->
      <div v-if="uploadedDocument.type.startsWith('image/') && documentPreviewUrl" class="mt-4">
        <div class="relative inline-block">
          <img 
            ref="imageElement"
            :src="documentPreviewUrl" 
            :alt="uploadedDocument.name"
            class="max-w-full max-h-96 rounded border object-contain cursor-crosshair"
            @mousedown="handleMouseDown"
            @load="handleImageLoad"
            draggable="false"
          />
          
          <!-- Selection Box -->
          <div 
            v-if="selectionBox"
            class="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20 pointer-events-none"
            :style="{
              left: selectionBox.x + 'px',
              top: selectionBox.y + 'px',
              width: selectionBox.width + 'px',
              height: selectionBox.height + 'px'
            }"
          />

          <!-- Exclusion Zone Overlay -->
          <ExclusionZoneOverlay
            v-if="exclusionZone && imageElement && imageLoaded"
            :exclusion-zone="exclusionZone"
            :image-element="imageElement"
          />
          
          <!-- Instructions Overlay -->
          <div 
            v-if="canManuallySelect"
            class="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center pointer-events-none rounded"
          >
            <div class="text-white text-center bg-black bg-opacity-50 p-4 rounded">
              <p class="text-sm font-medium">{{ t('verification.document.selectQRHint') }}</p>
              <p class="text-xs mt-1">{{ t('verification.document.selectQRHintAlt') }}</p>
            </div>
          </div>
        </div>

        <!-- Manual Selection Hint - Only shown when automatic detection failed -->
        <BaseMessage
          v-if="canManuallySelect"
          type="info"
          :title="t('verification.document.manualSelectionTitle')"
          :message="t('verification.document.manualSelectionDescription')"
          class="mt-4"
        />
      </div>
      
      <!-- PDF Preview -->
      <div v-else-if="uploadedDocument.type === 'application/pdf' && documentPreviewUrl" class="mt-4">
        <iframe 
          :src="documentPreviewUrl" 
          class="w-full h-96 rounded border"
          title="PDF preview"
        />
      </div>
    </div>
  </div>
</template>
