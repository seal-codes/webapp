<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Shield, Upload } from 'lucide-vue-next'
import BaseButton from '@/components/common/BaseButton.vue'
import type { DecodedVerificationData, VerificationResult } from '@/services/verification-service'

interface Props {
  decodedData: DecodedVerificationData | null
  verificationResult: VerificationResult | null
  isVerifying: boolean
}

interface Emits {
  (e: 'verify-document'): void
  (e: 'reset-verification'): void
}

defineProps<Props>()
defineEmits<Emits>()

const { t } = useI18n()
</script>

<template>
  <div class="flex gap-3 mt-6">
    <!-- Verify Document -->
    <BaseButton 
      v-if="decodedData?.isValid && !verificationResult && !isVerifying"
      variant="primary"
      @click="$emit('verify-document')"
    >
      <Shield class="w-4 h-4 mr-2" />
      {{ t('verification.actions.verifyIntegrity') }}
    </BaseButton>
    
    <!-- Upload Different Document -->
    <BaseButton 
      variant="outline"
      @click="$emit('reset-verification')"
    >
      <Upload class="w-4 h-4 mr-2" />
      {{ t('verification.actions.uploadDifferent') }}
    </BaseButton>
  </div>
</template>
