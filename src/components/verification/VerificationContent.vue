<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText } from 'lucide-vue-next'
import BaseMessage from '@/components/common/BaseMessage.vue'
import VerificationSealInfo from './VerificationSealInfo.vue'
import VerificationDocumentPreview from './VerificationDocumentPreview.vue'
import VerificationQRScanner from './VerificationQRScanner.vue'
import VerificationActions from './VerificationActions.vue'
import VerificationResults from './VerificationResults.vue'
import type { DecodedVerificationData, VerificationResult } from '@/services/verification-service'

interface Props {
  uploadedDocument: File
  documentPreviewUrl: string
  decodedData: DecodedVerificationData | null
  verificationResult: VerificationResult | null
  isScanning: boolean
  isVerifying: boolean
  qrScanResult: string
}

interface Emits {
  (e: 'verify-document'): void
  (e: 'reset-verification'): void
  (e: 'scan-selected-area', selection: { x: number; y: number; width: number; height: number }): void
}

defineProps<Props>()

const { t } = useI18n()
const documentPreviewRef = ref<InstanceType<typeof VerificationDocumentPreview> | null>(null)

const emit = defineEmits<Emits>()

/**
 * Handle scanning of selected area and reset selection
 */
const handleScanSelectedArea = (selection: { x: number; y: number; width: number; height: number }) => {
  emit('scan-selected-area', selection)
  documentPreviewRef.value?.resetSelection()
}
</script>

<template>
  <div class="lg:col-span-2 space-y-6">
    <!-- Certificate Information (if we have valid attestation data) -->
    <VerificationSealInfo 
      v-if="decodedData?.isValid" 
      :decoded-data="decodedData"
    />

    <!-- Upload Required Message (when we have attestation data but no document) -->
    <BaseMessage
      v-if="decodedData?.isValid && !uploadedDocument"
      type="warning"
      :title="t('verification.document.uploadRequired')"
      :message="t('verification.document.uploadRequiredDescription')"
      class="mb-6"
    />

    <!-- Document Preview and Status -->
    <div v-if="uploadedDocument" class="bg-white rounded-xl shadow-sm p-6">
      <h2 class="text-xl font-bold mb-6 flex items-center gap-2">
        <FileText class="w-6 h-6 text-primary-500" />
        {{ t('verification.document.title') }}
      </h2>
      
      <!-- Document Preview with Selection -->
      <VerificationDocumentPreview
        ref="documentPreviewRef"
        :uploaded-document="uploadedDocument"
        :document-preview-url="documentPreviewUrl"
        :decoded-data="decodedData"
        :is-scanning="isScanning"
        @scan-selected-area="handleScanSelectedArea"
      />
      
      <!-- QR Scanning Status -->
      <VerificationQRScanner
        :is-scanning="isScanning"
        :qr-scan-result="qrScanResult"
        :uploaded-document="uploadedDocument"
        :is-success="decodedData?.isValid"
      />
      
      <!-- Verification Results -->
      <VerificationResults
        v-if="verificationResult"
        :verification-result="verificationResult"
      />
      
      <!-- Verifying State -->
      <div v-else-if="isVerifying" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500" />
        <span class="ml-3">{{ t('verification.scanning') }}</span>
      </div>
      
      <!-- Action Buttons -->
      <VerificationActions
        :decoded-data="decodedData"
        :verification-result="verificationResult"
        :is-verifying="isVerifying"
        @verify-document="emit('verify-document')"
        @reset-verification="emit('reset-verification')"
      />
    </div>
  </div>
</template>
