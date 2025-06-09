<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-vue-next'
import BaseMessage from '@/components/common/BaseMessage.vue'
import type { VerificationResult } from '@/services/verification-service'

interface Props {
  verificationResult: VerificationResult
}

const props = defineProps<Props>()
const { t } = useI18n()

const messageType = computed(() => {
  if (props.verificationResult.isValid) return 'success'
  return props.verificationResult.status.startsWith('error_') ? 'error' : 'warning'
})

const messageTitle = computed(() => {
  if (props.verificationResult.isValid) return t('verification.results.verified')
  return props.verificationResult.status.startsWith('error_') 
    ? t('verification.results.error')
    : t('verification.results.failed')
})

const messageText = computed(() => {
  return t(`verification.results.status.${props.verificationResult.status}`)
})

const icon = computed(() => {
  if (props.verificationResult.isValid) return CheckCircle
  return props.verificationResult.status.startsWith('error_') ? AlertCircle : XCircle
})
</script>

<template>
  <div class="mb-6">
    <BaseMessage
      :type="messageType"
      :title="messageTitle"
      :message="messageText"
    />
    
    <!-- Detailed Results -->
    <div class="mt-4 p-4 bg-gray-50 rounded-lg">
      <h4 class="font-medium mb-3">{{ t('verification.details.title') }}</h4>
      
      <div class="space-y-2 text-sm">
        <div class="flex items-center justify-between">
          <span>{{ t('verification.results.cryptographicHash') }}:</span>
          <div class="flex items-center gap-2">
            <component 
              :is="verificationResult.details.cryptographicMatch ? CheckCircle : XCircle"
              :class="verificationResult.details.cryptographicMatch ? 'text-green-500' : 'text-red-500'"
              class="w-4 h-4"
            />
            <span>{{ verificationResult.details.cryptographicMatch ? t('verification.results.exactMatch') : t('verification.results.noMatch') }}</span>
          </div>
        </div>
        
        <div class="flex items-center justify-between">
          <span>{{ t('verification.results.perceptualHash') }}:</span>
          <div class="flex items-center gap-2">
            <component 
              :is="verificationResult.details.perceptualMatch ? CheckCircle : XCircle"
              :class="verificationResult.details.perceptualMatch ? 'text-green-500' : 'text-red-500'"
              class="w-4 h-4"
            />
            <span>{{ verificationResult.details.perceptualMatch ? t('verification.results.visualMatch') : t('verification.results.noMatch') }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
