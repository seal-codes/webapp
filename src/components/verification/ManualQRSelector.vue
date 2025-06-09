<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { qrReaderService } from '@/services/qr-reader-service'
import BaseButton from '@/components/common/BaseButton.vue'
import { Square, MousePointer } from 'lucide-vue-next'

const props = defineProps<{
  imageFile: File;
}>()

const emit = defineEmits<{
  (e: 'qrFound', data: { attestationData: any; location: any }): void;
  (e: 'cancel'): void;
}>()

// State
const imageUrl = ref('')
const isSelecting = ref(false)
const isScanning = ref(false)
const selectionStart = ref<{ x: number; y: number } | null>(null)
const selectionEnd = ref<{ x: number; y: number } | null>(null)
const imageElement = ref<HTMLImageElement | null>(null)
const containerElement = ref<HTMLDivElement | null>(null)
const scanResult = ref('')

// Computed
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

// Methods
const startSelection = () => {
  isSelecting.value = true
  selectionStart.value = null
  selectionEnd.value = null
  scanResult.value = ''
}

const handleMouseDown = (event: MouseEvent) => {
  if (!isSelecting.value || !imageElement.value || !containerElement.value) return
  
  event.preventDefault()
  
  const rect = imageElement.value.getBoundingClientRect()
  const containerRect = containerElement.value.getBoundingClientRect()
  
  // Calculate position relative to the image
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  selectionStart.value = { x, y }
  selectionEnd.value = { x, y }
  
  // Add mouse move and up listeners
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const handleMouseMove = (event: MouseEvent) => {
  if (!isSelecting.value || !selectionStart.value || !imageElement.value) return
  
  const rect = imageElement.value.getBoundingClientRect()
  
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  selectionEnd.value = { x, y }
}

const handleMouseUp = () => {
  if (!isSelecting.value) return
  
  // Remove event listeners
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  
  // If we have a valid selection, scan it
  if (selectionBox.value && selectionBox.value.width > 20 && selectionBox.value.height > 20) {
    scanSelectedArea()
  }
  
  isSelecting.value = false
}

const scanSelectedArea = async () => {
  if (!selectionBox.value || !imageElement.value) return
  
  isScanning.value = true
  scanResult.value = 'Scanning selected area...'
  
  try {
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
    
    console.log('🎯 Scanning selected area:', imageSelection)
    
    // Scan the selected area
    const result = await qrReaderService.scanForAttestationData(props.imageFile, imageSelection)
    
    if (result.found && result.attestationData) {
      scanResult.value = 'QR code found and decoded successfully!'
      emit('qrFound', {
        attestationData: result.attestationData,
        location: result.qrLocation
      })
    } else {
      scanResult.value = result.error || 'No QR code found in selected area'
    }
  } catch (error) {
    console.error('Error scanning selected area:', error)
    scanResult.value = 'Error scanning selected area: ' + (error instanceof Error ? error.message : 'Unknown error')
  } finally {
    isScanning.value = false
  }
}

const resetSelection = () => {
  selectionStart.value = null
  selectionEnd.value = null
  scanResult.value = ''
  isSelecting.value = false
}

const cancel = () => {
  emit('cancel')
}

// Lifecycle
onMounted(() => {
  imageUrl.value = URL.createObjectURL(props.imageFile)
})

onUnmounted(() => {
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
  }
  
  // Clean up event listeners
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm p-6">
    <div class="mb-6">
      <h3 class="text-lg font-bold mb-2 flex items-center gap-2">
        <Square class="w-5 h-5 text-primary-500" />
        Manual QR Code Selection
      </h3>
      <p class="text-gray-600 text-sm">
        Click and drag to select the QR code area in the image below.
      </p>
    </div>
    
    <!-- Image Container -->
    <div 
      ref="containerElement"
      class="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden mb-4"
      :class="{ 'border-blue-500': isSelecting }"
    >
      <img 
        ref="imageElement"
        :src="imageUrl"
        alt="Document to scan"
        class="w-full h-auto max-h-96 object-contain cursor-crosshair"
        :class="{ 'cursor-crosshair': isSelecting }"
        @mousedown="handleMouseDown"
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
      
      <!-- Instructions Overlay -->
      <div 
        v-if="isSelecting && !selectionStart"
        class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center pointer-events-none"
      >
        <div class="text-white text-center">
          <MousePointer class="w-8 h-8 mx-auto mb-2" />
          <p class="text-sm">Click and drag to select the QR code area</p>
        </div>
      </div>
    </div>
    
    <!-- Controls -->
    <div class="flex gap-3 mb-4">
      <BaseButton 
        v-if="!isSelecting"
        variant="primary" 
        @click="startSelection"
      >
        <Square class="w-4 h-4 mr-2" />
        Select QR Code Area
      </BaseButton>
      
      <BaseButton 
        v-if="selectionBox && !isScanning"
        variant="secondary"
        @click="resetSelection"
      >
        Clear Selection
      </BaseButton>
      
      <BaseButton 
        variant="outline"
        @click="cancel"
      >
        Cancel
      </BaseButton>
    </div>
    
    <!-- Scan Result -->
    <div v-if="scanResult" class="mb-4">
      <div 
        class="p-3 rounded-lg text-sm"
        :class="{
          'bg-blue-50 text-blue-800': isScanning,
          'bg-green-50 text-green-800': scanResult.includes('successfully'),
          'bg-red-50 text-red-800': !isScanning && !scanResult.includes('successfully')
        }"
      >
        <div v-if="isScanning" class="flex items-center gap-2">
          <div class="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500" />
          {{ scanResult }}
        </div>
        <div v-else>
          {{ scanResult }}
        </div>
      </div>
    </div>
    
    <!-- Instructions -->
    <div class="bg-gray-50 p-4 rounded-lg">
      <h4 class="font-medium mb-2">Instructions:</h4>
      <ol class="text-sm text-gray-600 space-y-1">
        <li>1. Click "Select QR Code Area" to start selection mode</li>
        <li>2. Click and drag to draw a rectangle around the QR code</li>
        <li>3. Release the mouse to automatically scan the selected area</li>
        <li>4. If no QR code is found, try selecting a different area</li>
      </ol>
    </div>
  </div>
</template>