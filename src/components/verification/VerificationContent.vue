<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText } from 'lucide-vue-next'
import VerificationSealInfo from './VerificationSealInfo.vue'
import VerificationDocumentPreview from './VerificationDocumentPreview.vue'
import VerificationActions from './VerificationActions.vue'
import VerificationResults from './VerificationResults.vue'
import type {
  DecodedVerificationData,
  VerificationResult,
} from '@/services/verification-service'
import type { ScanState, VerificationState } from '@/stores/verificationStore'

interface Props {
  uploadedDocument: File;
  documentPreviewUrl: string | null;
  decodedData: DecodedVerificationData | null;
  verificationResult: VerificationResult | null;
  scanState: ScanState;
  verificationState: VerificationState;
  scanError: string | null;
  verificationError: string | null;
  hasValidData: boolean;
  canManuallySelect: boolean;
}

interface Emits {
  (e: 'verify-document'): void;
  (e: 'reset-verification'): void;
  (
    e: 'scan-selected-area',
    selection: { x: number; y: number; width: number; height: number }
  ): void;
}

defineProps<Props>()

const { t } = useI18n()
const documentPreviewRef = ref<InstanceType<
  typeof VerificationDocumentPreview
> | null>(null)

const emit = defineEmits<Emits>()

/**
 * Handle scanning of selected area and reset selection
 */
const handleScanSelectedArea = (selection: {
  x: number;
  y: number;
  width: number;
  height: number;
}) => {
  emit('scan-selected-area', selection)
  documentPreviewRef.value?.resetSelection()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Document Preview and Status -->
    <div class="bg-white rounded-xl shadow-sm p-6">
      <h2 class="text-xl font-bold mb-6 flex items-center gap-2">
        <FileText class="w-6 h-6 text-primary-500" />
        {{ t("verification.document.title") }}
      </h2>

      <!-- Document Preview with Selection -->
      <VerificationDocumentPreview
        ref="documentPreviewRef"
        :uploaded-document="uploadedDocument"
        :document-preview-url="documentPreviewUrl"
        :decoded-data="decodedData"
        :can-manually-select="canManuallySelect"
        @scan-selected-area="handleScanSelectedArea"
      />

      <!-- Certificate Information (if we have valid attestation data) -->
      <VerificationSealInfo
        v-if="hasValidData && decodedData"
        :decoded-data="decodedData"
      />

      <!-- QR Scanning Status – deactivated
      <VerificationQRScanner
        :scan-state="scanState"
        :scan-error="scanError"
      />
       -->

      <!-- Verification Results -->
      <VerificationResults
        v-if="verificationResult"
        :verification-result="verificationResult"
      />

      <!-- Verifying State -->
      <div
        v-else-if="verificationState === 'verifying'"
        class="flex justify-center items-center py-8"
      >
        <div
          class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"
        />
        <span class="ml-3">{{ t("verification.scanning") }}</span>
      </div>

      <!-- Action Buttons -->
      <VerificationActions
        :decoded-data="decodedData"
        :verification-result="verificationResult"
        :is-verifying="verificationState === 'verifying'"
        @verify-document="emit('verify-document')"
        @reset-verification="emit('reset-verification')"
      />
    </div>
  </div>
</template>
