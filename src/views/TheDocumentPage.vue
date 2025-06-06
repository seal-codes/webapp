<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDocumentStore } from '../stores/documentStore'
import DocumentDropzone from '../components/document/DocumentDropzone.vue'
import DocumentPreview from '../components/document/DocumentPreview.vue'
import SocialAuthSelector from '../components/auth/SocialAuthSelector.vue'
import HowItWorks from '../components/document/HowItWorks.vue'

const router = useRouter()
const documentStore = useDocumentStore()

const isDocumentLoaded = computed(() => documentStore.hasDocument)
const isProcessing = ref(false)
const qrPosition = ref({ x: 50, y: 50 })
const qrSize = ref(20) // Default 20% of container width

const handleDocumentLoaded = (file: File) => {
  documentStore.setDocument(file)
}

const handleSocialAuth = async (provider: string) => {
  isProcessing.value = true
  try {
    await documentStore.authenticateWith(provider)
    await documentStore.sealDocument(qrPosition.value, qrSize.value)
    router.push(`/sealed/${documentStore.documentId}`)
  } catch (error) {
    console.error('Authentication error:', error)
  } finally {
    isProcessing.value = false
  }
}

// Calculate safe margins based on QR code size
const safeMargin = computed(() => {
  // Add extra margin for the identity section below QR code
  const identityHeightPercent = 10 // Approximate height of identity section as percentage
  const totalHeightPercent = qrSize.value + identityHeightPercent
  return Math.max(totalHeightPercent / 2, 10) // At least 10% margin
})

const setCornerPosition = (corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight') => {
  const margin = safeMargin.value
  
  const positions = {
    topLeft: { x: margin, y: margin },
    topRight: { x: 100 - margin, y: margin },
    bottomLeft: { x: margin, y: 100 - margin },
    bottomRight: { x: 100 - margin, y: 100 - margin },
  }
  
  qrPosition.value = positions[corner]
}

const chooseNewDocument = () => {
  documentStore.reset()
}

const updateQrPosition = (position: { x: number, y: number }) => {
  qrPosition.value = position
}

const updateQrSize = (size: number) => {
  qrSize.value = size
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <div class="mb-6">
        <h1 class="text-3xl font-bold">
          Load Your Document
        </h1>
      </div>
      
      <div class="grid md:grid-cols-3 gap-8">
        <!-- Main Content -->
        <div class="md:col-span-2">
          <div class="bg-white rounded-xl shadow-sm p-6">
            <DocumentDropzone 
              v-if="!isDocumentLoaded" 
              @file-loaded="handleDocumentLoaded" 
            />
            
            <div v-else>
              <div class="mb-4">
                <DocumentPreview 
                  :document="documentStore.uploadedDocument" 
                  :qr-position="qrPosition"
                  :qr-size-percent="qrSize"
                  :has-qr="false"
                  :attestation-data="documentStore.currentAttestationData"
                  :auth-provider="documentStore.authProvider || undefined"
                  :user-name="documentStore.userName || undefined"
                  @position-updated="updateQrPosition"
                  @size-updated="updateQrSize"
                />
              </div>
              
              <!-- Controls Bar -->
              <div class="flex justify-between items-center mb-6">
                <button 
                  class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  @click="chooseNewDocument"
                >
                  Choose Another Document
                </button>
                
                <div class="flex gap-2">
                  <button 
                    v-for="(position, key) in {
                      topLeft: '↖',
                      topRight: '↗',
                      bottomLeft: '↙',
                      bottomRight: '↘'
                    }"
                    :key="key"
                    class="w-10 h-10 bg-white rounded-lg shadow-sm hover:bg-gray-50 flex items-center justify-center border border-gray-200 transition-colors"
                    :title="`${key.replace(/([A-Z])/g, ' $1').trim()} Corner`"
                    @click="setCornerPosition(key as any)"
                  >
                    {{ position }}
                  </button>
                </div>
              </div>
              
              <div>
                <h3 class="text-xl font-medium mb-3">
                  Authenticate yourself with
                </h3>
                <SocialAuthSelector 
                  :is-processing="isProcessing"
                  @provider-selected="handleSocialAuth"
                />
              </div>
            </div>
          </div>
        </div>
        
        <!-- Sidebar -->
        <div class="md:col-span-1">
          <HowItWorks />
        </div>
      </div>
    </div>
  </div>
</template>