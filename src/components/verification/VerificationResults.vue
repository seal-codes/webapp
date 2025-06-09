<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CheckCircle, XCircle } from 'lucide-vue-next'
import BaseMessage from '@/components/common/BaseMessage.vue'
import type { VerificationResult } from '@/services/verification-service'

interface Props {
  verificationResult: VerificationResult
}

const props = defineProps<Props>()
const { t } = useI18n()

/**
 * Get the verification status title
 */
const verificationTitle = computed(() => {
  if (props.verificationResult.isValid) {
    return t('verification.results.verified')
  } else if (props.verificationResult.status === 'error') {
    return t('verification.results.error')
  } else {
    return t('verification.results.failed')
  }
})

/**
 * Get the message type based on verification status
 */
const messageType = computed(() => {
  if (props.verificationResult.isValid) {
    return 'success'
  } else if (props.verificationResult.status === 'error') {
    return 'warning'
  } else {
    return 'error'
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Result Summary -->
    <BaseMessage
      :type="messageType"
      :title="verificationTitle"
      :message="verificationResult.message"
    />
    
    <!-- Detailed Results -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-gray-50 p-4 rounded-lg">
        <h4 class="font-medium mb-2">{{ t('verification.results.cryptographicHash') }}</h4>
        <div class="flex items-center gap-2">
          <component 
            :is="verificationResult.details.cryptographicMatch ? CheckCircle : XCircle"
            class="w-5 h-5"
            :class="verificationResult.details.cryptographicMatch ? 'text-green-600' : 'text-red-600'"
          />
          <span class="text-sm">
            {{ verificationResult.details.cryptographicMatch ? t('verification.results.exactMatch') : t('verification.results.noMatch') }}
          </span>
        </div>
      </div>
      
      <div class="bg-gray-50 p-4 rounded-lg">
        <h4 class="font-medium mb-2">{{ t('verification.results.perceptualHash') }}</h4>
        <div class="flex items-center gap-2">
          <component 
            :is="verificationResult.details.perceptualMatch ? CheckCircle : XCircle"
            class="w-5 h-5"
            :class="verificationResult.details.perceptualMatch ? 'text-green-600' : 'text-red-600'"
          />
          <span class="text-sm">
            {{ verificationResult.details.perceptualMatch ? t('verification.results.visualMatch') : t('verification.results.noMatch') }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
