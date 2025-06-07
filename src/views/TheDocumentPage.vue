<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDocumentStore } from '../stores/documentStore'
import { qrCodeUICalculator } from '@/services/qrcode-ui-calculator'
import DocumentDropzone from '../components/document/DocumentDropzone.vue'
import DocumentPreview from '../components/document/DocumentPreview.vue'
import SocialAuthSelector from '../components/auth/SocialAuthSelector.vue'
import HowItWorks from '../components/document/HowItWorks.vue'
import BaseButton from '../components/common/BaseButton.vue'

const router = useRouter()
const { t } = useI18n()
const documentStore = useDocumentStore()

const isDocumentLoaded = computed(() => documentStore.hasDocument)
const isProcessing = ref(false)
const qrPosition = ref({ x: 50, y: 50 })
const qrSize = ref(20) // Default 20% of container width (between min 15% and max 35%)

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

// Calculate safe margins based on QR code size using the UI calculator
const cornerPositions = computed(() => {
  return qrCodeUICalculator.getCornerPositions(qrSize.value)
})

const setCornerPosition = (corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight') => {
  const position = cornerPositions.value[corner]
  if (position) {
    qrPosition.value = position
  }
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
          {{ t('document.title') }}
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
                <BaseButton 
                  variant="outline"
                  @click="chooseNewDocument"
                >
                  {{ t('document.controls.chooseAnother') }}
                </BaseButton>
                
                <div class="flex gap-2">
                  <button 
                    v-for="(position, key) in {
                      topLeft: '↖',
                      topRight: '↗',
                      bottomLeft: '↙',
                      bottomRight: '↘'
                    }"
                    :key="key"
                    class="w-12 h-12 md:w-10 md:h-10 bg-white rounded-lg shadow-sm hover:bg-gray-50 active:bg-gray-100 flex items-center justify-center border border-gray-200 transition-colors touch-manipulation"
                    :title="t(`document.preview.corners.${key}`)"
                    @click="setCornerPosition(key as any)"
                  >
                    {{ position }}
                  </button>
                </div>
              </div>
              
              <div>
                <h3 class="text-xl font-medium mb-3">
                  {{ t('document.controls.authenticateWith') }}
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
