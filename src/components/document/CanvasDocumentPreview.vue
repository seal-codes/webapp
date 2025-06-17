<script setup lang="ts">
/**
 * Canvas-based Document Preview Component
 * Uses canvas for both preview and QR positioning to ensure pixel-perfect consistency with sealing
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
  document: File | null;
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

// Document state
const documentImage = ref<HTMLImageElement | null>(null)
const documentDimensions = ref({ width: 0, height: 0 })
const canvasDisplaySize = ref({ width: 0, height: 0 })
const scaleFactor = ref(1)

// QR seal state
const qrSealImage = ref<HTMLImageElement | null>(null)
const isGeneratingQR = ref(false)

// Computed properties for template
const qrSizePercent = computed(() => props.qrSizePercent)

// Calculate QR code position on screen for UI elements
const qrScreenPosition = computed(() => {
  if (!canvasRef.value || !documentDimensions.value.width || !qrSealImage.value) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  // Get pixel calculation
  const pixelCalc = qrCodeUICalculator.calculateEmbeddingPixels(
    props.qrPosition,
    props.qrSizePercent,
    documentDimensions.value,
    'image',
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
 * Load and setup the document image
 */
const loadDocument = async () => {
  if (!props.document) {
    return
  }

  isLoading.value = true
  
  try {
    const img = new Image()
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        documentImage.value = img
        documentDimensions.value = {
          width: img.naturalWidth,
          height: img.naturalHeight,
        }
        resolve()
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(props.document!)
    })
    
  } catch (error) {
    console.error('Failed to load document:', error)
  } finally {
    isLoading.value = false
  }
}

/**
 * Setup canvas when both document and refs are ready
 */
const setupCanvasWhenReady = () => {
  if (!documentImage.value || !canvasRef.value || !containerRef.value) {
    return
  }
  
  setupCanvas()
  drawDocumentOnly()
  
  // Generate QR seal in background
  generateQRSeal().then(() => {
    redrawCanvas()
  })
}

const setupCanvas = () => {
  if (!canvasRef.value || !containerRef.value || !documentDimensions.value.width) {
    return
  }

  const container = containerRef.value
  const canvas = canvasRef.value
  
  // Get the container's actual available width
  const containerWidth = container.clientWidth
  const availableWidth = containerWidth > 0 ? containerWidth - 40 : 760 // fallback
  const maxHeight = 600
  
  // Calculate display size maintaining aspect ratio
  const aspectRatio = documentDimensions.value.width / documentDimensions.value.height
  
  let displayWidth = Math.min(availableWidth, 800) // max 800px wide
  let displayHeight = displayWidth / aspectRatio
  
  if (displayHeight > maxHeight) {
    displayHeight = maxHeight
    displayWidth = maxHeight * aspectRatio
  }
  
  // Ensure minimum size
  displayWidth = Math.max(displayWidth, 300)
  displayHeight = Math.max(displayHeight, 200)
  
  // Set canvas display size
  canvasDisplaySize.value = {
    width: displayWidth,
    height: displayHeight,
  }
  
  // Set canvas actual size to match document for pixel-perfect positioning
  canvas.width = documentDimensions.value.width
  canvas.height = documentDimensions.value.height
  
  // Set canvas display size via CSS
  canvas.style.width = `${displayWidth}px`
  canvas.style.height = `${displayHeight}px`
  
  // Calculate scale factor for coordinate conversion
  scaleFactor.value = documentDimensions.value.width / displayWidth
}

/**
 * Generate QR seal image
 */
const generateQRSeal = async () => {
  if (!props.attestationData && !props.authProvider) {
    return
  }

  isGeneratingQR.value = true
  
  try {
    // Calculate QR size in actual document pixels
    const pixelCalc = qrCodeUICalculator.calculateEmbeddingPixels(
      props.qrPosition,
      props.qrSizePercent,
      documentDimensions.value,
      'image',
    )

    // Generate the complete QR seal
    const sealResult = await qrSealRenderer.generateSeal({
      attestationData: props.attestationData || {
        h: { c: 'preview', p: { p: 'preview', d: 'preview' } },
        t: new Date().toISOString(),
        i: { p: 'g', id: 'preview@example.com' },
        s: { n: 'sc', k: 'preview-key' },
        e: { x: 0, y: 0, w: 100, h: 100, f: 'FFFFFF' },
      },
      qrSizeInPixels: pixelCalc.sizeInPixels,
      providerId: props.authProvider || 'google',
      userIdentifier: props.userName || 'preview@example.com',
      baseUrl: window.location.origin,
    })

    // Load the seal image
    const sealImg = new Image()
    await new Promise<void>((resolve, reject) => {
      sealImg.onload = () => {
        qrSealImage.value = sealImg
        resolve()
      }
      sealImg.onerror = () => reject(new Error('Failed to load QR seal'))
      sealImg.src = sealResult.dataUrl
    })
    
  } catch (error) {
    console.error('Failed to generate QR seal:', error)
  } finally {
    isGeneratingQR.value = false
  }
}

/**
 * Draw just the document image (without QR code)
 */
const drawDocumentOnly = () => {
  if (!canvasRef.value || !documentImage.value) {
    return
  }

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw document image at full resolution
  ctx.drawImage(documentImage.value, 0, 0)
}

/**
 * Redraw the entire canvas
 */
const redrawCanvas = async () => {
  if (!canvasRef.value || !documentImage.value) {
    return
  }

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw document image at full resolution
  ctx.drawImage(documentImage.value, 0, 0)

  // Always draw QR seal if available (unless explicitly hidden)
  if (qrSealImage.value && !props.hasQr) {
    const pixelCalc = qrCodeUICalculator.calculateEmbeddingPixels(
      props.qrPosition,
      props.qrSizePercent,
      documentDimensions.value,
      'image',
    )

    ctx.drawImage(
      qrSealImage.value,
      pixelCalc.position.x,
      pixelCalc.position.y,
      pixelCalc.completeSealDimensions.width,
      pixelCalc.completeSealDimensions.height,
    )
  }
}

/**
 * Handle mouse/touch events for dragging
 */
const handlePointerDown = (e: MouseEvent | TouchEvent) => {
  if (props.hasQr || !canvasRef.value || !qrSealImage.value) {
    return
  }

  e.preventDefault()
  
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  
  // Get pointer coordinates
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  
  // Convert to canvas coordinates (accounting for display scaling)
  const canvasX = (clientX - rect.left) * scaleFactor.value
  const canvasY = (clientY - rect.top) * scaleFactor.value
  
  // Check if click is on QR seal
  const pixelCalc = qrCodeUICalculator.calculateEmbeddingPixels(
    props.qrPosition,
    props.qrSizePercent,
    documentDimensions.value,
    'image',
  )
  
  // Check if click is anywhere on canvas (make entire canvas draggable)
  if (canvasX >= 0 && canvasX <= documentDimensions.value.width &&
      canvasY >= 0 && canvasY <= documentDimensions.value.height) {
    
    // Start dragging
    isDragging.value = true
    
    // Calculate drag offset from QR center
    const qrCenterX = pixelCalc.position.x + pixelCalc.completeSealDimensions.width / 2
    const qrCenterY = pixelCalc.position.y + pixelCalc.completeSealDimensions.height / 2
    
    dragOffset.value = {
      x: canvasX - qrCenterX,
      y: canvasY - qrCenterY,
    }
    
    // Add event listeners
    document.addEventListener('mousemove', handlePointerMove)
    document.addEventListener('mouseup', handlePointerUp)
    document.addEventListener('touchmove', handlePointerMove, { passive: false })
    document.addEventListener('touchend', handlePointerUp)
    
    // Prevent text selection
    document.body.style.userSelect = 'none'
    document.body.style.touchAction = 'none'
  }
}

const handlePointerMove = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value || !canvasRef.value) {
    return
  }

  e.preventDefault()
  
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  
  // Get pointer coordinates
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  
  // Convert to canvas coordinates
  const canvasX = (clientX - rect.left) * scaleFactor.value
  const canvasY = (clientY - rect.top) * scaleFactor.value
  
  // Calculate new QR center position (accounting for drag offset)
  const newCenterX = canvasX - dragOffset.value.x
  const newCenterY = canvasY - dragOffset.value.y
  
  // Convert to percentage coordinates
  const newPositionPercent = {
    x: (newCenterX / documentDimensions.value.width) * 100,
    y: (newCenterY / documentDimensions.value.height) * 100,
  }
  
  // Apply bounds checking using the calculator
  const margins = qrCodeUICalculator.calculateSafeMargins(
    props.qrSizePercent,
    documentDimensions.value,
  )
  
  const boundedPosition = {
    x: Math.max(margins.horizontal, Math.min(100 - margins.horizontal, newPositionPercent.x)),
    y: Math.max(margins.vertical, Math.min(100 - margins.vertical, newPositionPercent.y)),
  }
  
  // Emit position update
  emit('positionUpdated', boundedPosition)
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
watch(() => props.document, loadDocument, { immediate: true })

// Watch for refs becoming available
watch([canvasRef, containerRef, documentImage], () => {
  setupCanvasWhenReady()
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
  // If we already have a document, set up the canvas
  if (documentImage.value && documentDimensions.value.width > 0) {
    setupCanvas()
    redrawCanvas()
  }
  
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
  if (documentImage.value?.src.startsWith('blob:')) {
    URL.revokeObjectURL(documentImage.value.src)
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
