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
  documentPreviewUrl: string | null
  decodedData: DecodedVerificationData | null
  canManuallySelect: boolean
}

interface Emits {
  (e: 'scan-selected-area', selection: { x: number; y: number; width: number; height: number }): void
  (e: 'qr-input', data: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

// Document type detection
const isImage = computed(() => props.uploadedDocument.type.startsWith('image/'))
const isPDF = computed(() => props.uploadedDocument.type === 'application/pdf')

// QR Input for PDFs
const qrInput = ref('')

// Computed exclusion zone
const exclusionZone = computed(() => getExclusionZone(props.decodedData))

// QR Selection state
const isSelecting = ref(false)
const selectionStart = ref<{ x: number; y: number } | null>(null)
const selectionEnd = ref<{ x: number; y: number } | null>(null)
const imageElement = ref<HTMLImageElement | null>(null)
const imageLoaded = ref(false)

// Handle QR input for PDFs
const handleQRInput = () => {
  const input = qrInput.value.trim()
  if (!input) return
  
  // Extract encoded data from URL if it's a full verification URL
  let encodedData = input
  if (input.includes('/v/')) {
    const urlParts = input.split('/v/')
    if (urlParts.length > 1) {
      encodedData = urlParts[1]
    }
  }
  
  emit('qr-input', encodedData)
  qrInput.value = ''
}

// Handle image load
const handleImageLoad = () => {
  imageLoaded.value = true
}

/**
 * Calculate the selection box coordinates and dimensions
 */
const selectionBox = computed(() => {
  if (!selectionStart.value || !selectionEnd.value) {
    return null
  }
  
  const start = selectionStart.value
  const end = selectionEnd.value
  
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  }
})

/**
 * Handle mouse down event to start QR selection
 */
const handleMouseDown = (event: MouseEvent) => {
  if (!imageElement.value || !props.uploadedDocument?.type.startsWith('image/')) {
    return
  }
  
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
  if (!isSelecting.value || !selectionStart.value || !imageElement.value) {
    return
  }
  
  const rect = imageElement.value.getBoundingClientRect()
  
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  selectionEnd.value = { x, y }
}

/**
 * Handle mouse up event to complete selection
 */
const handleMouseUp = () => {
  if (!isSelecting.value) {
    return
  }
  
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
  if (!selectionBox.value || !imageElement.value) {
    return
  }
  
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
    height: Math.round(selectionBox.value.height * scaleY),
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
          <p class="font-medium">
            {{ uploadedDocument.name }}
          </p>
          <p class="text-sm text-gray-600">
            {{ uploadedDocument.type }}
          </p>
        </div>
      </div>
      
      <!-- Image Preview with QR Selection -->
      <div
        v-if="isImage && documentPreviewUrl"
        class="mt-4"
      >
        <div class="relative inline-block">
          <img 
            ref="imageElement"
            :src="documentPreviewUrl" 
            :alt="uploadedDocument.name"
            class="max-w-full max-h-96 rounded border object-contain cursor-crosshair"
            draggable="false"
            @mousedown="handleMouseDown"
            @load="handleImageLoad"
          >
          
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
              <p class="text-sm font-medium">
                {{ t('verification.document.selectQRHint') }}
              </p>
              <p class="text-xs mt-1">
                {{ t('verification.document.selectQRHintAlt') }}
              </p>
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
      <div
        v-else-if="isPDF"
        class="mt-4"
      >
        <!-- Show manual input only if no QR data was automatically extracted -->
        <div 
          v-if="!decodedData?.isValid"
          class="bg-white rounded-lg shadow-sm p-6 text-center"
        >
          <div class="mb-4">
            <svg class="w-16 h-16 mx-auto text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">
            PDF Document Uploaded
          </h3>
          <p class="text-gray-600 mb-4">
            To verify this PDF document, scan the QR code embedded in the document or paste the verification URL below.
          </p>
          <p class="text-sm text-gray-500 mb-6">
            Filename: {{ uploadedDocument.name }}
          </p>
          
          <!-- Manual QR Code Input -->
          <div class="max-w-md mx-auto">
            <label for="qr-input" class="block text-sm font-medium text-gray-700 mb-2">
              Verification URL or QR Code Data
            </label>
            <div class="flex gap-2">
              <input
                id="qr-input"
                v-model="qrInput"
                type="text"
                placeholder="Paste verification URL here..."
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                @keyup.enter="handleQRInput"
              >
              <button
                @click="handleQRInput"
                :disabled="!qrInput.trim()"
                class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Verify
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              Scan the QR code in your PDF with a mobile device and paste the URL here
            </p>
          </div>
        </div>

        <!-- Show success message when QR data was automatically extracted -->
        <div 
          v-else
          class="bg-white rounded-lg shadow-sm p-6 text-center"
        >
          <div class="mb-4">
            <svg class="w-16 h-16 mx-auto text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">
            PDF QR Code Detected
          </h3>
          <p class="text-gray-600 mb-4">
            The QR code was automatically detected and extracted from your PDF document.
          </p>
          <p class="text-sm text-gray-500">
            Filename: {{ uploadedDocument.name }}
          </p>
        </div>

        <!-- Manual QR Scanning Hint for PDFs (only when automatic extraction failed) -->
        <BaseMessage
          v-if="canManuallySelect && !decodedData?.isValid"
          type="info"
          title="QR Code Required"
          message="Please scan the QR code from the PDF document using a QR code scanner or mobile device camera, then paste the verification URL above."
          class="mt-4"
        />
      </div>

      <!-- Unsupported Document Type -->
      <div
        v-else
        class="mt-4"
      >
        <BaseMessage
          type="error"
          title="Unsupported Document Type"
          message="This document type is not supported for verification. Please upload an image or PDF document."
        />
      </div>
    </div>
  </div>
</template>
