<script setup lang="ts">
/**
 * Canvas-based PDF Preview Component
 * Matches the UX of CanvasDocumentPreview for consistency
 */

import { ref, onMounted, watch, computed, onUnmounted } from 'vue'
import { qrCodeUICalculator } from '@/services/qrcode-ui-calculator'
import { qrSealRenderer } from '@/services/qr-seal-renderer'
import type { QRCodeUIPosition, AttestationData } from '@/types/qrcode'

// Interface for container element with ResizeObserver
interface ContainerElement extends HTMLDivElement {
  _resizeObserver?: ResizeObserver;
}

const props = defineProps<{
  pageCanvas: HTMLCanvasElement | null;
  qrPosition: QRCodeUIPosition;
  qrSizePercent: number;
  hasQr?: boolean;
  attestationData?: AttestationData;
  authProvider?: string;
  userName?: string;
}>()

const emit = defineEmits<{
  (e: 'positionUpdated', position: QRCodeUIPosition): void;
  (e: 'sizeUpdated', sizePercent: number): void;
}>()

// Canvas refs and state
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<ContainerElement | null>(null)
const isLoading = ref(true)
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

// PDF state
const pdfDimensions = ref({ width: 0, height: 0 })
const canvasDisplaySize = ref({ width: 0, height: 0 })
const scaleFactor = ref(1)

// QR seal state
const qrSealImage = ref<HTMLImageElement | null>(null)
const isGeneratingQR = ref(false)

// Computed properties for template
const qrSizePercent = computed(() => props.qrSizePercent)

// Calculate QR code position on screen for UI elements
const qrScreenPosition = computed(() => {
  if (!canvasRef.value || !pdfDimensions.value.width || !qrSealImage.value) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  // Get pixel calculation
  const pixelCalc = qrCodeUICalculator.calculateEmbeddingPixels(
    props.qrPosition,
    props.qrSizePercent,
    pdfDimensions.value,
    'pdf',
  )

  // Get canvas position within its container
  const canvasRect = canvasRef.value.getBoundingClientRect()
  const containerRect = containerRef.value?.getBoundingClientRect()
  
  if (!containerRect) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  // Convert to screen coordinates relative to canvas
  const screenX = pixelCalc.position.x / scaleFactor.value
  const screenY = pixelCalc.position.y / scaleFactor.value
  const screenWidth = pixelCalc.completeSealDimensions.width / scaleFactor.value
  const screenHeight = pixelCalc.completeSealDimensions.height / scaleFactor.value

  // Add canvas offset relative to container
  const canvasOffsetX = canvasRect.left - containerRect.left
  const canvasOffsetY = canvasRect.top - containerRect.top

  return {
    x: canvasOffsetX + screenX,
    y: canvasOffsetY + screenY,
    width: screenWidth,
    height: screenHeight,
  }
})

/**
 * Setup canvas when PDF canvas is ready
 */
const setupCanvasWhenReady = () => {
  if (!props.pageCanvas || !canvasRef.value || !containerRef.value) {
    return
  }
  
  // Get PDF dimensions from the source canvas
  pdfDimensions.value = {
    width: props.pageCanvas.width,
    height: props.pageCanvas.height,
  }
  
  setupCanvas()
  drawPDFOnly()
  
  // Generate QR seal in background
  generateQRSeal().then(() => {
    redrawCanvas()
  })
  
  isLoading.value = false
}

const setupCanvas = () => {
  if (!canvasRef.value || !containerRef.value || !pdfDimensions.value.width) {
    return
  }

  const container = containerRef.value
  const canvas = canvasRef.value
  
  // Get the container's actual available width
  const containerWidth = container.clientWidth - 32 // Account for padding
  const maxWidth = Math.min(containerWidth, 800) // Max 800px like image preview
  
  // Calculate display size maintaining aspect ratio
  const aspectRatio = pdfDimensions.value.width / pdfDimensions.value.height
  
  let displayWidth = maxWidth
  let displayHeight = maxWidth / aspectRatio
  
  // If height is too large, constrain by height instead
  const maxHeight = 600
  if (displayHeight > maxHeight) {
    displayHeight = maxHeight
    displayWidth = maxHeight * aspectRatio
  }
  
  // Set canvas display size
  canvasDisplaySize.value = { width: displayWidth, height: displayHeight }
  
  // Set canvas actual size (for drawing)
  canvas.width = displayWidth
  canvas.height = displayHeight
  
  // Set canvas CSS size
  canvas.style.width = `${displayWidth}px`
  canvas.style.height = `${displayHeight}px`
  
  // Calculate scale factor for coordinate conversion
  scaleFactor.value = displayWidth / pdfDimensions.value.width
}

/**
 * Draw only the PDF content
 */
const drawPDFOnly = () => {
  if (!canvasRef.value || !props.pageCanvas) {
    return
  }
  
  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return
  
  // Clear canvas
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  
  // Draw PDF page scaled to fit
  ctx.drawImage(
    props.pageCanvas,
    0, 0, props.pageCanvas.width, props.pageCanvas.height,
    0, 0, canvasRef.value.width, canvasRef.value.height
  )
}

/**
 * Generate QR seal image
 */
const generateQRSeal = async () => {
  if (!props.attestationData || !pdfDimensions.value.width) {
    return
  }
  
  isGeneratingQR.value = true
  
  try {
    // Calculate QR size in pixels
    const pixelCalc = qrCodeUICalculator.calculateEmbeddingPixels(
      props.qrPosition,
      props.qrSizePercent,
      pdfDimensions.value,
      'pdf',
    )
    
    // Generate QR seal
    const qrSeal = await qrSealRenderer.generateQRSeal(
      props.attestationData,
      pixelCalc.qrCodeDimensions.width,
      props.authProvider || 'unknown',
      props.userName || 'User',
    )
    
    // Create image element
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        qrSealImage.value = img
        resolve()
      }
      img.onerror = () => reject(new Error('Failed to load QR seal'))
      img.src = qrSeal.dataUrl
    })
    
  } catch (error) {
    console.error('Failed to generate QR seal:', error)
  } finally {
    isGeneratingQR.value = false
  }
}

/**
 * Redraw canvas with PDF and QR seal
 */
const redrawCanvas = async () => {
  if (!canvasRef.value) {
    return
  }
  
  // Draw PDF first
  drawPDFOnly()
  
  // Draw QR seal if available and not in sealed mode
  if (qrSealImage.value && !props.hasQr) {
    const ctx = canvasRef.value.getContext('2d')
    if (!ctx) return
    
    // Calculate QR position and size on canvas
    const pixelCalc = qrCodeUICalculator.calculateEmbeddingPixels(
      props.qrPosition,
      props.qrSizePercent,
      pdfDimensions.value,
      'pdf',
    )
    
    // Scale to canvas coordinates
    const canvasX = pixelCalc.position.x * scaleFactor.value
    const canvasY = pixelCalc.position.y * scaleFactor.value
    const canvasWidth = pixelCalc.completeSealDimensions.width * scaleFactor.value
    const canvasHeight = pixelCalc.completeSealDimensions.height * scaleFactor.value
    
    // Draw QR seal
    ctx.drawImage(
      qrSealImage.value,
      canvasX,
      canvasY,
      canvasWidth,
      canvasHeight
    )
  }
}

/**
 * Handle pointer events for dragging
 */
const handlePointerDown = (event: MouseEvent | TouchEvent) => {
  if (props.hasQr || !qrSealImage.value) {
    return
  }
  
  event.preventDefault()
  
  // Get pointer position
  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
  
  // Check if click is within QR area
  const rect = canvasRef.value!.getBoundingClientRect()
  const canvasX = clientX - rect.left
  const canvasY = clientY - rect.top
  
  // Convert to document coordinates
  const docX = canvasX / scaleFactor.value
  const docY = canvasY / scaleFactor.value
  
  // Check if within QR bounds
  const pixelCalc = qrCodeUICalculator.calculateEmbeddingPixels(
    props.qrPosition,
    props.qrSizePercent,
    pdfDimensions.value,
    'pdf',
  )
  
  const qrLeft = pixelCalc.position.x
  const qrTop = pixelCalc.position.y
  const qrRight = qrLeft + pixelCalc.completeSealDimensions.width
  const qrBottom = qrTop + pixelCalc.completeSealDimensions.height
  
  if (docX >= qrLeft && docX <= qrRight && docY >= qrTop && docY <= qrBottom) {
    // Start dragging
    isDragging.value = true
    dragOffset.value = {
      x: docX - qrLeft,
      y: docY - qrTop
    }
    
    // Add event listeners
    document.addEventListener('mousemove', handlePointerMove)
    document.addEventListener('mouseup', handlePointerUp)
    document.addEventListener('touchmove', handlePointerMove)
    document.addEventListener('touchend', handlePointerUp)
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none'
    document.body.style.touchAction = 'none'
  }
}

const handlePointerMove = (event: MouseEvent | TouchEvent) => {
  if (!isDragging.value || !canvasRef.value) {
    return
  }
  
  event.preventDefault()
  
  // Get pointer position
  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
  
  // Convert to canvas coordinates
  const rect = canvasRef.value.getBoundingClientRect()
  const canvasX = clientX - rect.left
  const canvasY = clientY - rect.top
  
  // Convert to document coordinates
  const docX = canvasX / scaleFactor.value
  const docY = canvasY / scaleFactor.value
  
  // Calculate new QR position accounting for drag offset
  const newQrX = docX - dragOffset.value.x
  const newQrY = docY - dragOffset.value.y
  
  // Convert to percentage
  const newPosition: QRCodeUIPosition = {
    x: Math.max(0, Math.min(100, (newQrX / pdfDimensions.value.width) * 100)),
    y: Math.max(0, Math.min(100, (newQrY / pdfDimensions.value.height) * 100))
  }
  
  // Emit position update
  emit('positionUpdated', newPosition)
}

const handlePointerUp = () => {
  if (!isDragging.value) {
    return
  }
  
  isDragging.value = false
  
  // Remove event listeners
  document.removeEventListener('mousemove', handlePointerMove)
  document.removeEventListener('mouseup', handlePointerUp)
  document.removeEventListener('touchmove', handlePointerMove)
  document.removeEventListener('touchend', handlePointerUp)
  
  // Restore text selection
  document.body.style.userSelect = ''
  document.body.style.touchAction = ''
}

/**
 * Handle size adjustment
 */
const adjustSize = (delta: number) => {
  const minSize = 15
  const maxSize = 35
  const newSize = Math.max(minSize, Math.min(maxSize, props.qrSizePercent + delta))
  
  if (newSize !== props.qrSizePercent) {
    emit('sizeUpdated', newSize)
  }
}

// Watch for changes
watch(() => props.pageCanvas, () => {
  setupCanvasWhenReady()
}, { immediate: true })

// Watch for refs becoming available
watch([canvasRef, containerRef], () => {
  if (props.pageCanvas) {
    setupCanvasWhenReady()
  }
}, { immediate: true })

watch([() => props.qrPosition, () => props.qrSizePercent], async () => {
  await redrawCanvas()
}, { deep: true })

watch(() => props.attestationData, async () => {
  await generateQRSeal()
  await redrawCanvas()
}, { deep: true })

// Handle window resize
const handleResize = () => {
  setupCanvas()
  redrawCanvas()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  
  // Set up ResizeObserver for container changes
  if (containerRef.value && window.ResizeObserver) {
    const resizeObserver = new ResizeObserver(() => {
      handleResize()
    })
    
    resizeObserver.observe(containerRef.value)
    
    // Store observer for cleanup
    containerRef.value._resizeObserver = resizeObserver
  }
})

// Cleanup
const cleanup = () => {
  window.removeEventListener('resize', handleResize)
  
  // Clean up ResizeObserver
  if (containerRef.value?._resizeObserver) {
    containerRef.value._resizeObserver.disconnect()
  }
  
  if (isDragging.value) {
    handlePointerUp()
  }
}

onUnmounted(() => {
  cleanup()
})

// Cursor style based on state
const canvasStyle = computed(() => ({
  cursor: props.hasQr ? 'default' : (isDragging.value ? 'grabbing' : 'grab'),
  touchAction: 'none',
}))
</script>

<template>
  <div class="bg-gray-100 rounded-lg">
    <!-- Loading indicator -->
    <div
      v-if="isLoading"
      class="flex justify-center items-center p-12"
    >
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
    </div>
    
    <!-- Canvas preview -->
    <div 
      v-else
      ref="containerRef"
      class="relative p-4 w-full"
      style="min-height: 400px;"
    >
      <div class="w-full flex justify-center">
        <canvas
          ref="canvasRef"
          :style="canvasStyle"
          class="rounded shadow-lg border border-gray-200"
          @mousedown="handlePointerDown"
          @touchstart="handlePointerDown"
        />
        
        <!-- QR generation overlay -->
        <div
          v-if="isGeneratingQR"
          class="absolute inset-0 bg-black bg-opacity-20 rounded flex items-center justify-center"
        >
          <div class="bg-white rounded-lg p-4 shadow-lg flex items-center gap-3">
            <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500" />
            <span class="text-sm text-gray-700">Generating QR code...</span>
          </div>
        </div>
        
        <!-- Size controls -->
        <div 
          v-if="!props.hasQr && qrSealImage"
          class="absolute flex gap-1 bg-white rounded-lg shadow-md p-1 border border-gray-200"
          :style="{
            left: `${qrScreenPosition.x + qrScreenPosition.width / 2}px`,
            top: `${qrScreenPosition.y + qrScreenPosition.height + 8}px`,
            transform: 'translateX(-50%)'
          }"
        >
          <button 
            class="w-9 h-9 flex items-center justify-center text-gray-600 
                   hover:bg-gray-100 active:bg-gray-200 rounded text-lg font-bold 
                   touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed 
                   transition-colors" 
            title="Make smaller"
            :disabled="qrSizePercent <= 15"
            @click="adjustSize(-3)"
          >
            −
          </button>
          <button 
            class="w-9 h-9 flex items-center justify-center 
                  text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded 
                  text-lg font-bold touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Make larger"
            :disabled="qrSizePercent >= 35"
            @click="adjustSize(3)"
          >
            +
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
canvas {
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
}
</style>
