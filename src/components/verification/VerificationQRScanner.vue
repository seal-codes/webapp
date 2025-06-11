<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseMessage from '@/components/common/BaseMessage.vue'
import type { ScanState } from '@/stores/verificationStore'

interface Props {
  scanState: ScanState
  scanError: string | null
}

const props = defineProps<Props>()
const { t } = useI18n()

const messageType = computed(() => {
  switch (props.scanState) {
    case 'scanning':
      return 'info'
    case 'success':
      return 'success'
    case 'failed':
      return 'warning'
    case 'error':
      return 'error'
    default:
      return 'info'
  }
})

const messageTitle = computed(() => {
  switch (props.scanState) {
    case 'scanning':
      return t('verification.qr.scanning')
    case 'success':
      return t('verification.qr.found')
    case 'failed':
      return t('verification.qr.failed')
    case 'error':
      return t('verification.qr.error')
    default:
      return ''
  }
})

const messageText = computed(() => {
  switch (props.scanState) {
    case 'scanning':
      return t('verification.qr.scanningSelected')
    case 'success':
      return t('verification.qr.foundMessage')
    case 'failed':
      return t('verification.qr.notFound')
    case 'error':
      return props.scanError || t('errors.unknown')
    default:
      return ''
  }
})
</script>

<template>
  <!-- QR Scanning Status -->
  <div
    v-if="scanState !== 'idle'"
    class="mb-6"
  >
    <BaseMessage
      :type="messageType"
      :title="messageTitle"
      :message="messageText"
    />
  </div>
</template>
