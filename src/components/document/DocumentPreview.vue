<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import QRCodePreview from '@/components/qrcode/QRCodePreview.vue'
import type { QRCodeUIPosition, AttestationData } from '@/types/qrcode'

const props = defineProps<{
  document: File | null;
  qrPosition: QRCodeUIPosition;
  qrSizePercent: number;
  hasQr?: boolean;
  attestationData?: AttestationData;
  authProvider?: string;
  userName?: string;
}>()

const previewUrl = ref('')
const documentType = ref<'image' | null>(null)
const isLoading = ref(true)
const containerWidth = ref(0)
const containerHeight = ref(0)
const previewRef = ref<HTMLElement | null>(null)

// Container dimensions for QR calculations
const containerDimensions = computed(() => ({
  width: containerWidth.value,
  height: containerHeight.value,
}))

// Create document preview
watch(() => props.document, async (newDocument) => {
  if (!newDocument) {
    return
  }
  
  isLoading.value = true
  
  // Determine document type
  if (newDocument.type.startsWith('image/')) {
    documentType.value = 'image'
  } else {
    documentType.value = null
    isLoading.value = false
    return
  }
  
  // Create object URL for preview
  previewUrl.value = URL.createObjectURL(newDocument)
  isLoading.value = false
}, { immediate: true })

// Update container dimensions when image loads
onMounted(() => {
  const updateDimensions = () => {
    if (previewRef.value) {
      const rect = previewRef.value.getBoundingClientRect()
      containerWidth.value = rect.width
      containerHeight.value = rect.height
    }
  }

  // Use ResizeObserver for more reliable dimension tracking
  let resizeObserver: ResizeObserver | null = null
  
  const setupObserver = () => {
    if (window.ResizeObserver && previewRef.value) {
      resizeObserver = new ResizeObserver(updateDimensions)
      resizeObserver.observe(previewRef.value)
    }
  }

  window.addEventListener('resize', updateDimensions)
  window.addEventListener('orientationchange', () => {
    // Delay update after orientation change to ensure layout is complete
    setTimeout(updateDimensions, 100)
  })
  
  // Initial update after image loads
  const img = new Image()
  img.onload = () => {
    updateDimensions()
    setupObserver()
  }
  if (previewUrl.value) {
    img.src = previewUrl.value
  }

  // Watch for previewRef changes
  watch(previewRef, () => {
    if (resizeObserver) {
      resizeObserver.disconnect()
    }
    setupObserver()
    updateDimensions()
  })

  return () => {
    window.removeEventListener('resize', updateDimensions)
    window.removeEventListener('orientationchange', updateDimensions)
    if (resizeObserver) {
      resizeObserver.disconnect()
    }
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
    }
  }
})

const emit = defineEmits<{
  (e: 'positionUpdated', position: QRCodeUIPosition): void;
  (e: 'sizeUpdated', sizePercent: number): void;
}>()
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
          if (previewRef) {
            const rect = previewRef.getBoundingClientRect();
            containerWidth = rect.width;
            containerHeight = rect.height;
          }
        }"
      >
      
      <!-- QR code preview -->
      <QRCodePreview
        v-if="!hasQr && containerDimensions.width && containerDimensions.height && documentType"
        :position="qrPosition"
        :size-percent="qrSizePercent"
        :container-dimensions="containerDimensions"
        :document-type="documentType"
        :attestation-data="attestationData"
        :is-placeholder="!attestationData"
        :auth-provider="authProvider"
        :user-name="userName"
        @position-updated="emit('positionUpdated', $event)"
        @size-updated="emit('sizeUpdated', $event)"
      />
    </div>
    

    
    <!-- No preview available -->
    <div
      v-else
      class="flex justify-center items-center p-12 text-gray-500"
    >
      No preview available
    </div>
  </div>
</template>