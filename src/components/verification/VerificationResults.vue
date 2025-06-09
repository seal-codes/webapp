<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-vue-next'
import type { VerificationResult } from '@/services/verification-service'

interface Props {
  verificationResult: VerificationResult
}

const props = defineProps<Props>()
const { t } = useI18n()

/**
 * Get the appropriate icon for the verification status
 */
const verificationIcon = computed(() => {
  switch (props.verificationResult.status) {
    case 'verified':
      return CheckCircle
    case 'modified':
    case 'hash_mismatch':
      return XCircle
    case 'error':
      return AlertCircle
    default:
      return AlertCircle
  }
})

/**
 * Get the appropriate color class for the verification status
 */
const verificationColor = computed(() => {
  switch (props.verificationResult.status) {
    case 'verified':
      return 'text-green-600'
    case 'modified':
    case 'hash_mismatch':
      return 'text-red-600'
    case 'error':
      return 'text-yellow-600'
    default:
      return 'text-gray-500'
  }
})

/**
 * Get the appropriate background color class for the verification status
 */
const verificationBgColor = computed(() => {
  if (props.verificationResult.isValid) {
    return 'bg-green-50 border border-green-200'
  } else if (props.verificationResult.status !== 'error') {
    return 'bg-red-50 border border-red-200'
  } else {
    return 'bg-yellow-50 border border-yellow-200'
  }
})

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
</script>

<template>
  <div class="space-y-6">
    <!-- Result Summary -->
    <div 
      class="flex items-center gap-4 p-4 rounded-lg"
      :class="verificationBgColor"
    >
      <component 
        :is="verificationIcon" 
        class="w-8 h-8"
        :class="verificationColor"
      />
      <div>
        <h3 class="font-medium" :class="verificationColor">
          {{ verificationTitle }}
        </h3>
        <p class="text-sm" :class="verificationColor.replace('600', '700')">
          {{ verificationResult.message }}
        </p>
      </div>
    </div>
    
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
