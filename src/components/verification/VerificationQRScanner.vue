<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseMessage from '@/components/common/BaseMessage.vue'

interface Props {
  isScanning: boolean
  uploadedDocument: File | null
  hasValidData: boolean
  scanFailed: boolean
}

const props = defineProps<Props>()
const { t } = useI18n()

const messageType = computed(() => {
  if (props.isScanning) return 'info'
  if (props.hasValidData) return 'success'
  if (props.scanFailed) return 'warning'
  return 'info'
})

const messageTitle = computed(() => {
  if (props.isScanning) return t('verification.qr.scanning')
  if (props.hasValidData) return t('verification.qr.found')
  if (props.scanFailed) return t('verification.qr.failed')
  return ''
})

const messageText = computed(() => {
  if (props.isScanning) return t('verification.qr.scanningSelected')
  if (props.hasValidData) return t('verification.qr.foundMessage')
  if (props.scanFailed) return t('verification.qr.notFound')
  return ''
})
</script>

<template>
  <!-- QR Scanning Status -->
  <div v-if="isScanning || hasValidData || scanFailed" class="mb-6">
    <BaseMessage
      :type="messageType"
      :title="messageTitle"
      :message="messageText"
    />
  </div>
</template>
