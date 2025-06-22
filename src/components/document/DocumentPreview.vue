<script setup lang="ts">
import { ref, watch } from 'vue'
import CanvasDocumentPreview from './CanvasDocumentPreview.vue'
import PDFPageSelector from '../pdf/PDFPageSelector.vue'
import type { QRCodeUIPosition, AttestationData } from '@/types/qrcode'
import { useDocumentStore } from '@/stores/documentStore'

const props = defineProps<{
  document: File | null;
  qrPosition: QRCodeUIPosition;
  qrSizePercent: number;
  hasQr?: boolean;
  attestationData?: AttestationData;
  authProvider?: string;
  userName?: string;
}>()

const documentStore = useDocumentStore()
const documentType = ref<'image' | 'pdf' | null>(null)
const isLoading = ref(true)

// Determine document type when document changes
watch(() => props.document, (newDocument) => {
  if (!newDocument) {
    documentType.value = null
    isLoading.value = false
    return
  }
  
  isLoading.value = true
  
  if (newDocument.type.startsWith('image/')) {
    documentType.value = 'image'
  } else if (newDocument.type === 'application/pdf') {
    documentType.value = 'pdf'
  } else {
    documentType.value = null
  }
  
  isLoading.value = false
}, { immediate: true })

const emit = defineEmits<{
  (e: 'positionUpdated', position: QRCodeUIPosition): void;
  (e: 'sizeUpdated', sizePercent: number): void;
}>()

// PDF-specific handlers
const handlePageSelected = (pageNumber: number) => {
  documentStore.updateSelectedPage(pageNumber)
}

const handlePositionChanged = (position: QRCodeUIPosition) => {
  emit('positionUpdated', position)
}

const handleSizeChanged = (size: number) => {
  emit('sizeUpdated', size)
}
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
    
    <!-- Canvas-based image preview -->
    <CanvasDocumentPreview
      v-else-if="documentType === 'image' && document"
      :document="document"
      :qr-position="qrPosition"
      :qr-size-percent="qrSizePercent"
      :has-qr="hasQr"
      :attestation-data="attestationData"
      :auth-provider="authProvider"
      :user-name="userName"
      @position-updated="emit('positionUpdated', $event)"
      @size-updated="emit('sizeUpdated', $event)"
    />
    
    <!-- PDF preview with page selection -->
    <PDFPageSelector
      v-else-if="documentType === 'pdf' && document"
      :pdf-file="document"
      :selected-page="documentStore.selectedPage"
      :qr-position="qrPosition"
      :qr-size="qrSizePercent"
      @page-selected="handlePageSelected"
      @position-changed="handlePositionChanged"
      @size-changed="handleSizeChanged"
    />
    
    <!-- No preview available -->
    <div
      v-else
      class="flex justify-center items-center p-12 text-gray-500"
    >
      No preview available
    </div>
  </div>
</template>