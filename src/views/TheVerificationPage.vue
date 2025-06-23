<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useVerificationStore } from '@/stores/verificationStore'
import VerificationHeader from '@/components/verification/VerificationHeader.vue'
import VerificationUploadPrompt from '@/components/verification/VerificationUploadPrompt.vue'
import VerificationContent from '@/components/verification/VerificationContent.vue'
import VerificationSidebar from '@/components/verification/VerificationSidebar.vue'

const route = useRoute()
const verificationStore = useVerificationStore()
const isLoading = ref(true)

// Get reactive refs from store
const {
  uploadedDocument,
  documentPreviewUrl,
  decodedData,
  verificationResult,
  scanState,
  verificationState,
  hasEncodedData,
  hasValidData,
  canManuallySelect,
  scanError,
  verificationError,
} = storeToRefs(verificationStore)

// Check for encoded data in URL
const encodedData = computed(() => {
  const pathSegments = route.path.split('/')
  return pathSegments.length > 2 ? pathSegments[2] : null
})

onMounted(async () => {
  try {
    // If we have encoded data in the URL, decode it
    if (encodedData.value) {
      verificationStore.setEncodedData(encodedData.value)
    }
    
    isLoading.value = false
  } catch (error) {
    console.error('Error initializing verification page:', error)
    isLoading.value = false
  }
})

// Event handlers
const handleDocumentUpload = async (file: File) => {
  console.log('🔥 handleDocumentUpload called with:', file.name, file.type)
  await verificationStore.setUploadedDocument(file)
}

const handleVerifyDocument = async () => {
  await verificationStore.verifyDocument()
}

const handleResetVerification = () => {
  verificationStore.reset()
}

const handleScanSelectedArea = async (selection: { x: number; y: number; width: number; height: number }) => {
  await verificationStore.scanSelectedArea(selection)
}

const handleQRInput = async (encodedData: string) => {
  console.log('🔍 Manual QR input received:', encodedData)
  verificationStore.setEncodedData(encodedData)
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <VerificationHeader />

      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="flex justify-center items-center py-12"
      >
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>

      <!-- Main Content Grid -->
      <div
        v-else
        class="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        <!-- Main Content Area -->
        <div class="lg:col-span-2">
          <!-- No document uploaded yet -->
          <VerificationUploadPrompt
            v-if="!uploadedDocument"
            :has-encoded-data="hasEncodedData"
            :decoded-data="decodedData"
            @file-loaded="handleDocumentUpload"
          />

          <!-- Document uploaded - show verification interface -->
          <VerificationContent
            v-else
            :uploaded-document="uploadedDocument"
            :document-preview-url="documentPreviewUrl"
            :decoded-data="decodedData"
            :verification-result="verificationResult"
            :scan-state="scanState"
            :verification-state="verificationState"
            :scan-error="scanError"
            :verification-error="verificationError"
            :has-valid-data="hasValidData"
            :can-manually-select="canManuallySelect"
            @verify-document="handleVerifyDocument"
            @reset-verification="handleResetVerification"
            @scan-selected-area="handleScanSelectedArea"
            @qr-input="handleQRInput"
          />
        </div>
        
        <!-- Sidebar - Always visible -->
        <div class="lg:col-span-1">
          <VerificationSidebar />
        </div>
      </div>
    </div>
  </div>
</template>
