<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Shield, FileText, Calendar, User } from 'lucide-vue-next'
import LabeledText from '@/components/common/LabeledText.vue'
import { providers } from '@/types/auth'
import type { DecodedVerificationData } from '@/services/verification-service'
import type { Provider } from '@/types/auth'

interface Props {
  decodedData: DecodedVerificationData
}

const props = defineProps<Props>()
const { t } = useI18n()

/**
 * Get provider information based on the compact ID from attestation data
 */
const providerInfo = computed(() => {
  if (!props.decodedData?.attestationData?.i?.p) {
    return null
  }
  
  const provider = providers.find((p: Provider) => p.compactId === props.decodedData.attestationData.i.p)
  return provider || { name: 'Unknown Provider', id: 'unknown' }
})

/**
 * Format the attestation timestamp into a readable date string
 */
const attestationDate = computed(() => {
  if (!props.decodedData?.attestationData?.t) {
    return null
  }
  
  try {
    return new Date(props.decodedData.attestationData.t).toLocaleString()
  } catch {
    return 'Invalid date'
  }
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm p-6">
    <div class="flex items-center gap-3 mb-6">
      <Shield class="w-8 h-8 text-primary-500" />
      <div>
        <h2 class="text-xl font-bold text-gray-900">
          {{ t('verification.seal.title') }}
        </h2>
        <p class="text-sm text-gray-600 mt-1">
          {{ t('verification.seal.description') }}
        </p>
      </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Document Information -->
      <div class="space-y-6">
        <LabeledText
          :icon="FileText"
          :label="t('verification.seal.documentHash')"
          :value="decodedData.attestationData.h.c"
          :monospace="true"
        />
        
        <LabeledText
          :icon="Calendar"
          :label="t('verification.seal.sealedOn')"
          :value="attestationDate || 'Unknown'"
        />
      </div>
      
      <!-- Identity Information -->
      <div class="space-y-6">
        <LabeledText
          :icon="User"
          :label="t('verification.seal.sealedBy')"
          :value="decodedData.attestationData.i.id"
        />
        
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <div class="w-4 h-4">
              <img 
                v-if="providerInfo" 
                :src="providerInfo.icon" 
                :alt="providerInfo.name"
                class="w-4 h-4 object-contain"
              />
            </div>
            <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {{ t('verification.seal.authProvider') }}
            </span>
          </div>
          <p class="text-gray-900">
            {{ providerInfo?.name || 'Unknown' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
