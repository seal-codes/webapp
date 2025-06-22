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
        :width="pageCanvas?.width || 0"
        :height="pageCanvas?.height || 0"
        class="absolute inset-0 w-full h-full object-contain"
      />
      
      <!-- QR code overlay -->
      <div
        v-if="qrPosition"
        ref="qrOverlay"
        class="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-50 cursor-move"
        :style="qrOverlayStyle"
        @mousedown="startDrag"
        @touchstart="startDrag"
      >
        <!-- QR code preview -->
        <div class="w-full h-full flex items-center justify-center">
          <div class="text-blue-600 text-xs font-medium">QR</div>
        </div>
        
        <!-- Resize handles -->
        <div
          class="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 cursor-se-resize"
          @mousedown.stop="startResize"
          @touchstart.stop="startResize"
        ></div>
      </div>
    </div>
    
    <!-- Size control -->
    <div class="mt-4 flex items-center space-x-4">
      <label class="text-sm font-medium text-gray-700">
        {{ $t('document.qr_size') }}:
      </label>
      <input
        type="range"
        :value="qrSize"
        min="5"
        max="25"
        step="1"
        class="flex-1"
        @input="updateSize"
      />
      <span class="text-sm text-gray-600 w-12">{{ qrSize }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
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

const containerWidth = ref(600)
const containerHeight = ref(800)
const isDragging = ref(false)
const isResizing = ref(false)
const dragStart = ref({ x: 0, y: 0 })

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
  
  // Set container size (max 600px width)
  const maxWidth = 600
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
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('touchmove', handleTouchMove)
  document.addEventListener('touchend', handleTouchEnd)
}

const startDrag = (event: MouseEvent | TouchEvent) => {
  event.preventDefault()
  isDragging.value = true
  
  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
  
  dragStart.value = { x: clientX, y: clientY }
}

const startResize = (event: MouseEvent | TouchEvent) => {
  event.preventDefault()
  isResizing.value = true
  
  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
  
  dragStart.value = { x: clientX, y: clientY }
}

const handleMouseMove = (event: MouseEvent) => {
  handleMove(event.clientX, event.clientY)
}

const handleTouchMove = (event: TouchEvent) => {
  event.preventDefault()
  handleMove(event.touches[0].clientX, event.touches[0].clientY)
}

const handleMove = (clientX: number, clientY: number) => {
  if (!isDragging.value && !isResizing.value) return
  if (!previewContainer.value) return
  
  const rect = previewContainer.value.getBoundingClientRect()
  
  if (isDragging.value) {
    // Calculate new position as percentage
    const deltaX = clientX - dragStart.value.x
    const deltaY = clientY - dragStart.value.y
    
    const currentPixelX = (props.qrPosition.x * containerWidth.value) / 100
    const currentPixelY = (props.qrPosition.y * containerHeight.value) / 100
    
    const newPixelX = Math.max(0, Math.min(currentPixelX + deltaX, containerWidth.value - (containerWidth.value * props.qrSize) / 100))
    const newPixelY = Math.max(0, Math.min(currentPixelY + deltaY, containerHeight.value - (containerHeight.value * props.qrSize) / 100))
    
    const newPosition: QRCodeUIPosition = {
      x: (newPixelX / containerWidth.value) * 100,
      y: (newPixelY / containerHeight.value) * 100,
    }
    
    emit('positionChange', newPosition)
    dragStart.value = { x: clientX, y: clientY }
  } else if (isResizing.value) {
    // Calculate new size based on mouse movement
    const deltaX = clientX - dragStart.value.x
    const sizeChange = (deltaX / containerWidth.value) * 100
    const newSize = Math.max(5, Math.min(25, props.qrSize + sizeChange))
    
    emit('sizeChange', newSize)
    dragStart.value = { x: clientX, y: clientY }
  }
}

const handleMouseUp = () => {
  isDragging.value = false
  isResizing.value = false
}

const handleTouchEnd = () => {
  isDragging.value = false
  isResizing.value = false
}

const updateSize = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('sizeChange', parseInt(target.value))
}
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
