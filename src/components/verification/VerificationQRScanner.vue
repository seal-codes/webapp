<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { CheckCircle, XCircle } from 'lucide-vue-next'

interface Props {
  isScanning: boolean
  qrScanResult: string
  uploadedDocument: File | null
}

defineProps<Props>()

const { t } = useI18n()
</script>

<template>
  <!-- QR Scanning Status -->
  <div v-if="isScanning" class="mb-6">
    <div class="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
      <div class="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500" />
      <span class="text-blue-800">
        {{ qrScanResult || t('verification.qr.scanning') }}
      </span>
    </div>
  </div>
  
  <!-- QR Scan Result -->
  <div v-else-if="qrScanResult" class="mb-6">
    <div 
      class="p-4 rounded-lg"
      :class="{
        'bg-green-50 border border-green-200': qrScanResult.includes('successfully'),
        'bg-red-50 border border-red-200': !qrScanResult.includes('successfully')
      }"
    >
      <div class="flex items-start gap-3">
        <component 
          :is="qrScanResult.includes('successfully') ? CheckCircle : XCircle"
          class="w-5 h-5 mt-0.5"
          :class="qrScanResult.includes('successfully') ? 'text-green-600' : 'text-red-600'"
        />
        <div class="flex-1">
          <p 
            class="text-sm font-medium"
            :class="qrScanResult.includes('successfully') ? 'text-green-800' : 'text-red-800'"
          >
            {{ qrScanResult.includes('successfully') ? t('verification.qr.found') : t('verification.qr.failed') }}
          </p>
          <p 
            class="text-sm mt-1"
            :class="qrScanResult.includes('successfully') ? 'text-green-700' : 'text-red-700'"
          >
            {{ qrScanResult }}
          </p>
          
          <!-- Manual selection hint -->
          <div v-if="!qrScanResult.includes('successfully') && uploadedDocument?.type.startsWith('image/')" class="mt-2">
            <p class="text-xs text-red-600">
              {{ t('verification.document.manualSelectionTip') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
