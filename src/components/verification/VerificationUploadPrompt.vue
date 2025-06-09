<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { QrCode } from 'lucide-vue-next'
import DocumentDropzone from '@/components/document/DocumentDropzone.vue'
import BaseMessage from '@/components/common/BaseMessage.vue'
import VerificationSealInfo from './VerificationSealInfo.vue'
import type { DecodedVerificationData } from '@/services/verification-service'

interface Props {
  hasEncodedData: boolean
  decodedData: DecodedVerificationData | null
}

interface Emits {
  (e: 'file-loaded', file: File): void
}

defineProps<Props>()
defineEmits<Emits>()

const { t } = useI18n()
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <div class="bg-white rounded-xl shadow-sm p-8">
      <!-- Show decoded attestation data from URL if available -->
      <div v-if="decodedData?.isValid" class="mb-8">
        <BaseMessage
          type="info"
          :title="t('verification.upload.qrDataFound')"
          :message="t('verification.upload.qrDataFoundDescription')"
          class="mb-6"
        />
        
        <VerificationSealInfo :decoded-data="decodedData" />
      </div>
      
      <!-- Upload Section -->
      <div :class="{ 'mt-8': decodedData?.isValid }">
        <QrCode 
          class="w-16 h-16 text-primary-500 mx-auto mb-6" 
          :class="{ 'opacity-50': decodedData?.isValid }"
        />
        <h2 class="text-2xl font-bold mb-4">
          {{ decodedData?.isValid ? t('verification.upload.uploadToVerify') : t('verification.upload.title') }}
        </h2>
        <p class="text-gray-600 mb-6 max-w-2xl mx-auto">
          {{ decodedData?.isValid ? t('verification.upload.uploadToVerifyDescription') : t('verification.upload.description') }}
        </p>
        
        <div class="max-w-lg mx-auto">
          <DocumentDropzone @file-loaded="$emit('file-loaded', $event)" />
        </div>
      </div>
      
      <!-- Show error for invalid URL parameter -->
      <BaseMessage
        v-if="hasEncodedData && !decodedData?.isValid"
        type="error"
        :title="t('verification.upload.invalidLink')"
        :message="decodedData?.error || t('verification.upload.invalidLinkDescription')"
        :details="t('verification.upload.canStillUpload')"
        class="mt-6 max-w-2xl mx-auto"
      />
      
      <!-- How it works info -->
      <BaseMessage
        type="info"
        :title="t('common.howItWorks')"
        :message="t('verification.upload.howItWorks')"
        :details="t('verification.upload.privacy')"
        class="mt-6 max-w-2xl mx-auto"
      />
    </div>
  </div>
</template>
