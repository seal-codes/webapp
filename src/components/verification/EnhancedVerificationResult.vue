<template>
  <div class="space-y-6">
    <!-- Main Status Card -->
    <div 
      class="rounded-lg border-2 p-6"
      :class="statusColorClass"
    >
      <div class="flex items-start space-x-4">
        <div class="text-3xl">
          {{ statusIcon }}
        </div>
        <div class="flex-1">
          <h3 class="text-xl font-semibold mb-2">
            {{ verificationMessage.title }}
          </h3>
          <p class="text-lg mb-3">
            {{ verificationMessage.subtitle }}
          </p>
          <p class="mb-4">
            {{ verificationMessage.description }}
          </p>
          <div 
            v-if="verificationMessage.recommendation"
            class="p-3 rounded-md bg-white/50 border"
          >
            <p class="font-medium">
              {{ verificationMessage.recommendation }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Detailed Status Breakdown -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Document Integrity Status -->
      <div class="bg-white rounded-lg border p-4">
        <h4 class="font-semibold mb-3 flex items-center">
          <span class="mr-2">📄</span>
          {{ $t('verification.results.documentIntegrity') }}
        </h4>
        <div class="flex items-center space-x-2">
          <span class="text-xl">{{ documentIntegrityStatus.icon }}</span>
          <span :class="documentIntegrityStatus.class">
            {{ documentIntegrityStatus.text }}
          </span>
        </div>
      </div>

      <!-- Identity Verification Status -->
      <div class="bg-white rounded-lg border p-4">
        <h4 class="font-semibold mb-3 flex items-center">
          <span class="mr-2">👤</span>
          {{ $t('verification.results.identityVerification') }}
        </h4>
        <div class="flex items-center space-x-2">
          <span class="text-xl">{{ identityStatus.icon }}</span>
          <span :class="identityStatus.class">
            {{ identityStatus.text }}
          </span>
        </div>
      </div>
    </div>

    <!-- Technical Details (Collapsible) -->
    <div class="bg-gray-50 rounded-lg border">
      <button
        @click="showTechnicalDetails = !showTechnicalDetails"
        class="w-full p-4 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <span class="font-medium">
          {{ $t('verification.results.technicalDetails') }}
        </span>
        <span class="transform transition-transform" :class="{ 'rotate-180': showTechnicalDetails }">
          ▼
        </span>
      </button>
      
      <div v-if="showTechnicalDetails" class="px-4 pb-4 space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span class="font-medium">{{ $t('verification.results.publicKeyId') }}:</span>
            <span class="ml-2 font-mono text-xs">{{ result.publicKeyId }}</span>
          </div>
          <div>
            <span class="font-medium">{{ $t('verification.results.timestamp') }}:</span>
            <span class="ml-2">{{ formatTimestamp(result.timestamp) }}</span>
          </div>
          <div>
            <span class="font-medium">{{ $t('verification.results.provider') }}:</span>
            <span class="ml-2">{{ result.identity.provider }}</span>
          </div>
          <div>
            <span class="font-medium">{{ $t('verification.results.identifier') }}:</span>
            <span class="ml-2">{{ result.identity.identifier }}</span>
          </div>
        </div>
        
        <div v-if="result.details" class="mt-4 p-3 bg-white rounded border">
          <h5 class="font-medium mb-2">{{ $t('verification.results.verificationDetails') }}</h5>
          <div class="space-y-1 text-sm">
            <div class="flex items-center space-x-2">
              <span>{{ result.details.keyFound ? '✅' : '❌' }}</span>
              <span>{{ $t('verification.results.keyFound') }}</span>
            </div>
            <div class="flex items-center space-x-2">
              <span>{{ result.details.signatureMatch ? '✅' : '❌' }}</span>
              <span>{{ $t('verification.results.signatureMatch') }}</span>
            </div>
            <div class="flex items-center space-x-2">
              <span>{{ result.details.timestampValid ? '✅' : '❌' }}</span>
              <span>{{ $t('verification.results.timestampValid') }}</span>
            </div>
          </div>
        </div>

        <div v-if="result.error" class="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <h5 class="font-medium text-red-800 mb-1">{{ $t('verification.results.errorDetails') }}</h5>
          <p class="text-sm text-red-700">{{ result.error }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useVerificationMessages } from '@/composables/useVerificationMessages'
import type { SignatureVerificationResult } from '@/services/signature-verification-service'

interface Props {
  result: SignatureVerificationResult
}

const props = defineProps<Props>()
const { t } = useI18n()
const { 
  getVerificationMessage, 
  getStatusIcon, 
  getStatusColorClass,
  getDocumentIntegrityMessage,
  getIdentityStatusMessage 
} = useVerificationMessages()

const showTechnicalDetails = ref(false)

// Computed properties for enhanced messaging
const verificationMessage = computed(() => getVerificationMessage(props.result))
const statusIcon = computed(() => getStatusIcon.value(verificationMessage.value))
const statusColorClass = computed(() => getStatusColorClass.value(verificationMessage.value))
const documentIntegrityStatus = computed(() => getDocumentIntegrityMessage.value(verificationMessage.value.documentIntegrityStatus))
const identityStatus = computed(() => getIdentityStatusMessage.value(verificationMessage.value.identityStatus))

// Helper function to format timestamp
const formatTimestamp = (timestamp: string) => {
  try {
    return new Date(timestamp).toLocaleString()
  } catch {
    return timestamp
  }
}
</script>
