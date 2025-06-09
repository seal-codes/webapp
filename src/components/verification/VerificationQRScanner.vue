<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseMessage from '@/components/common/BaseMessage.vue'

interface Props {
  isScanning: boolean
  qrScanResult: string
  uploadedDocument: File | null
  isSuccess?: boolean
}


const { t } = useI18n()

const messageType = computed(() => {
  if (props.isScanning) return 'info'
  if (props.isSuccess) return 'success'
  return 'error'
})

const messageTitle = computed(() => {
  if (props.isScanning) return t('verification.qr.scanning')
  if (props.isSuccess) return t('verification.qr.found')
  return t('verification.qr.failed')
})

const props = defineProps<Props>()
</script>

<template>
  <!-- QR Scanning Status -->
  <div v-if="isScanning || qrScanResult" class="mb-6">
    <BaseMessage
      :type="messageType"
      :title="messageTitle"
      :message="qrScanResult"
      :details="!isSuccess && uploadedDocument?.type.startsWith('image/') ? t('verification.document.manualSelectionTip') : undefined"
    />
  </div>
</template>
