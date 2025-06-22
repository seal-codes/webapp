<template>
  <div class="pdf-page-preview">
    <div 
      ref="previewContainer"
      class="relative border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm"
      :style="{ width: containerWidth + 'px', height: containerHeight + 'px' }"
    >
      <!-- PDF page canvas -->
      <canvas
        ref="pageCanvas"
        :width="containerWidth"
        :height="containerHeight"
        class="absolute inset-0 w-full h-full object-contain"
        :style="canvasStyle"
        @mousedown="handlePointerDown"
        @touchstart="handlePointerDown"
      />
      
      <!-- QR code overlay with drag functionality -->
      <div
        v-if="qrPosition"
        ref="qrOverlay"
        class="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-20 cursor-move"
        :style="qrOverlayStyle"
        @mousedown="handlePointerDown"
        @touchstart="handlePointerDown"
      >
        <!-- QR code preview -->
        <div class="w-full h-full flex items-center justify-center">
          <div class="text-blue-600 text-xs font-medium">QR</div>
        </div>
      </div>
      
      <!-- Floating size controls (like image sealing) -->
      <div 
        v-if="qrPosition"
        class="absolute flex gap-1 bg-white rounded-lg shadow-md p-1 border border-gray-200"
        :style="sizeControlsStyle"
      >
        <button 
          class="w-9 h-9 flex items-center justify-center text-gray-600 
                 hover:bg-gray-100 active:bg-gray-200 rounded text-lg font-bold 
                 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed 
                 transition-colors" 
          title="Make smaller"
          :disabled="qrSize <= 15"
          @click="adjustSize(-3)"
        >
          −
        </button>
        <button 
          class="w-9 h-9 flex items-center justify-center 
                text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded 
                text-lg font-bold touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Make larger"
          :disabled="qrSize >= 35"
          @click="adjustSize(3)"
        >
          +
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { QRCodeUIPosition } from '@/types/qrcode'

interface Props {
  pageCanvas: HTMLCanvasElement | null
  qrPosition: QRCodeUIPosition
  qrSize: number
}

interface Emits {
  positionChange: [position: QRCodeUIPosition]
  sizeChange: [size: number]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

const previewContainer = ref<HTMLDivElement>()
const pageCanvas = ref<HTMLCanvasElement>()
const qrOverlay = ref<HTMLDivElement>()

const containerWidth = ref(800)
const containerHeight = ref(600)
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

// Calculate QR overlay style based on position and size
const qrOverlayStyle = computed(() => {
  if (!props.qrPosition) return {}
  
  const qrPixelSize = (containerWidth.value * props.qrSize) / 100
  
  return {
    left: `${props.qrPosition.x * containerWidth.value / 100}px`,
    top: `${props.qrPosition.y * containerHeight.value / 100}px`,
    width: `${qrPixelSize}px`,
    height: `${qrPixelSize}px`,
  }
})

// Calculate floating size controls position (below QR code)
const sizeControlsStyle = computed(() => {
  if (!props.qrPosition) return {}
  
  const qrPixelSize = (containerWidth.value * props.qrSize) / 100
  const qrLeft = props.qrPosition.x * containerWidth.value / 100
  const qrTop = props.qrPosition.y * containerHeight.value / 100
  
  return {
    left: `${qrLeft + qrPixelSize / 2}px`,
    top: `${qrTop + qrPixelSize + 8}px`,
    transform: 'translateX(-50%)',
  }
})

// Canvas cursor style
const canvasStyle = computed(() => ({
  cursor: isDragging.value ? 'grabbing' : 'grab',
  touchAction: 'none',
}))

onMounted(async () => {
  await updatePreview()
  setupEventListeners()
})

watch(() => props.pageCanvas, async () => {
  await updatePreview()
})

const updatePreview = async () => {
  if (!props.pageCanvas || !pageCanvas.value) return
  
  // Calculate container size maintaining aspect ratio
  const canvas = props.pageCanvas
  const aspectRatio = canvas.width / canvas.height
  
  // Set container size (max 800px width for better visibility)
  const maxWidth = 800
  if (canvas.width > maxWidth) {
    containerWidth.value = maxWidth
    containerHeight.value = maxWidth / aspectRatio
  } else {
    containerWidth.value = canvas.width
    containerHeight.value = canvas.height
  }
  
  await nextTick()
  
  // Draw the PDF page on our canvas
  const ctx = pageCanvas.value.getContext('2d')
  if (ctx) {
    pageCanvas.value.width = containerWidth.value
    pageCanvas.value.height = containerHeight.value
    
    ctx.clearRect(0, 0, containerWidth.value, containerHeight.value)
    ctx.drawImage(canvas, 0, 0, containerWidth.value, containerHeight.value)
  }
}

const setupEventListeners = () => {
  document.addEventListener('mousemove', handlePointerMove)
  document.addEventListener('mouseup', handlePointerUp)
  document.addEventListener('touchmove', handlePointerMove)
  document.addEventListener('touchend', handlePointerUp)
}

const handlePointerDown = (event: MouseEvent | TouchEvent) => {
  event.preventDefault()
  
  // Get pointer position
  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
  
  // Get container position
  if (!previewContainer.value) return
  const rect = previewContainer.value.getBoundingClientRect()
  
  // Calculate position relative to container
  const containerX = clientX - rect.left
  const containerY = clientY - rect.top
  
  // Check if click is within QR area
  const qrPixelSize = (containerWidth.value * props.qrSize) / 100
  const qrLeft = props.qrPosition.x * containerWidth.value / 100
  const qrTop = props.qrPosition.y * containerHeight.value / 100
  const qrRight = qrLeft + qrPixelSize
  const qrBottom = qrTop + qrPixelSize
  
  if (containerX >= qrLeft && containerX <= qrRight && 
      containerY >= qrTop && containerY <= qrBottom) {
    // Start dragging
    isDragging.value = true
    dragOffset.value = {
      x: containerX - qrLeft,
      y: containerY - qrTop
    }
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none'
    document.body.style.touchAction = 'none'
  }
}

const handlePointerMove = (event: MouseEvent | TouchEvent) => {
  if (!isDragging.value || !previewContainer.value) return
  
  event.preventDefault()
  
  // Get pointer position
  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
  
  // Get container position
  const rect = previewContainer.value.getBoundingClientRect()
  
  // Calculate position relative to container
  const containerX = clientX - rect.left
  const containerY = clientY - rect.top
  
  // Calculate new QR position accounting for drag offset
  const newQrX = containerX - dragOffset.value.x
  const newQrY = containerY - dragOffset.value.y
  
  // Convert to percentage and constrain to container bounds
  const qrPixelSize = (containerWidth.value * props.qrSize) / 100
  const maxX = containerWidth.value - qrPixelSize
  const maxY = containerHeight.value - qrPixelSize
  
  const constrainedX = Math.max(0, Math.min(newQrX, maxX))
  const constrainedY = Math.max(0, Math.min(newQrY, maxY))
  
  const newPosition: QRCodeUIPosition = {
    x: (constrainedX / containerWidth.value) * 100,
    y: (constrainedY / containerHeight.value) * 100
  }
  
  emit('positionChange', newPosition)
}

const handlePointerUp = () => {
  if (!isDragging.value) return
  
  isDragging.value = false
  
  // Restore text selection
  document.body.style.userSelect = ''
  document.body.style.touchAction = ''
}

/**
 * Handle size adjustment (like image sealing)
 */
const adjustSize = (delta: number) => {
  const minSize = 15
  const maxSize = 35
  const newSize = Math.max(minSize, Math.min(maxSize, props.qrSize + delta))
  
  if (newSize !== props.qrSize) {
    emit('sizeChange', newSize)
  }
}

// Cleanup
onUnmounted(() => {
  document.removeEventListener('mousemove', handlePointerMove)
  document.removeEventListener('mouseup', handlePointerUp)
  document.removeEventListener('touchmove', handlePointerMove)
  document.removeEventListener('touchend', handlePointerUp)
  
  if (isDragging.value) {
    handlePointerUp()
  }
})
</script>

<style scoped>
.pdf-page-preview {
  user-select: none;
}

.cursor-move {
  cursor: move;
}

.cursor-se-resize {
  cursor: se-resize;
}
</style>
