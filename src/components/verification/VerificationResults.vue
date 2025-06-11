<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Shield,
  Eye,
  FileX,
  Settings
} from 'lucide-vue-next'
import type { VerificationResult } from '@/services/verification-service'

interface Props {
  verificationResult: VerificationResult
}

const props = defineProps<Props>()
const { t } = useI18n()
const showDetails = ref(false)

/**
 * Get confidence level configuration based on verification status
 */
const confidenceConfig = computed(() => {
  const { status } = props.verificationResult
  
  switch (status) {
    case 'verified_exact':
      return {
        level: 'high',
        icon: CheckCircle,
        iconColor: 'text-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        title: t('verification.results.confidence.verified_exact.title'),
        subtitle: t('verification.results.confidence.verified_exact.subtitle'),
        description: t('verification.results.confidence.verified_exact.description'),
        recommendation: t('verification.results.confidence.verified_exact.recommendation')
      }
    
    case 'verified_visual':
      return {
        level: 'medium',
        icon: Eye,
        iconColor: 'text-orange-500',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        title: t('verification.results.confidence.verified_visual.title'),
        subtitle: t('verification.results.confidence.verified_visual.subtitle'),
        description: t('verification.results.confidence.verified_visual.description'),
        recommendation: t('verification.results.confidence.verified_visual.recommendation')
      }
    
    case 'modified':
      return {
        level: 'none',
        icon: XCircle,
        iconColor: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        title: t('verification.results.confidence.modified.title'),
        subtitle: t('verification.results.confidence.modified.subtitle'),
        description: t('verification.results.confidence.modified.description'),
        recommendation: t('verification.results.confidence.modified.recommendation')
      }
    
    case 'error_processing':
      return {
        level: 'error',
        icon: Settings,
        iconColor: 'text-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        title: t('verification.results.confidence.error_processing.title'),
        subtitle: t('verification.results.confidence.error_processing.subtitle'),
        description: t('verification.results.confidence.error_processing.description'),
        recommendation: t('verification.results.confidence.error_processing.recommendation')
      }
    
    case 'error_invalid_format':
      return {
        level: 'error',
        icon: AlertCircle,
        iconColor: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        title: t('verification.results.confidence.error_invalid_format.title'),
        subtitle: t('verification.results.confidence.error_invalid_format.subtitle'),
        description: t('verification.results.confidence.error_invalid_format.description'),
        recommendation: t('verification.results.confidence.error_invalid_format.recommendation')
      }
    
    default:
      return {
        level: 'error',
        icon: AlertTriangle,
        iconColor: 'text-yellow-500',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        title: t('verification.results.confidence.default.title'),
        subtitle: t('verification.results.confidence.default.subtitle'),
        description: t('verification.results.confidence.default.description'),
        recommendation: t('verification.results.confidence.default.recommendation')
      }
  }
})

/**
 * Toggle details visibility
 */
const toggleDetails = () => {
  showDetails.value = !showDetails.value
}
</script>

<template>
  <div class="mb-6">
    <!-- Prominent Confidence Display -->
    <div 
      :class="[
        'rounded-xl border-2 p-6 cursor-pointer transition-all duration-200 hover:shadow-md',
        confidenceConfig.bgColor,
        confidenceConfig.borderColor
      ]"
      @click="toggleDetails"
    >
      <!-- Main Confidence Header -->
      <div class="flex items-start gap-4">
        <!-- Confidence Icon -->
        <div class="flex-shrink-0">
          <component 
            :is="confidenceConfig.icon"
            :class="[confidenceConfig.iconColor, 'w-8 h-8']"
          />
        </div>
        
        <!-- Confidence Content -->
        <div class="flex-grow">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xl font-bold text-gray-900 mb-1">
                {{ confidenceConfig.title }}
              </h3>
              <p class="text-gray-600 text-sm">
                {{ confidenceConfig.subtitle }}
              </p>
            </div>
            
            <!-- Expand/Collapse Indicator -->
            <div class="flex items-center gap-2 text-gray-500">
              <span class="text-sm">{{ t('verification.results.details') }}</span>
              <component 
                :is="showDetails ? ChevronDown : ChevronRight"
                class="w-5 h-5"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Expandable Details Section -->
    <div 
      v-if="showDetails"
      class="mt-4 bg-white border border-gray-200 rounded-lg p-6 space-y-6"
    >
      <!-- Explanation -->
      <div>
        <h4 class="font-semibold text-gray-900 mb-2">{{ t('verification.results.whatThisMeans') }}</h4>
        <p class="text-gray-700 mb-3">{{ confidenceConfig.description }}</p>
        <p class="text-sm text-gray-600 font-medium">{{ confidenceConfig.recommendation }}</p>
      </div>

      <!-- Technical Details -->
      <div>
        <h4 class="font-semibold text-gray-900 mb-3">{{ t('verification.results.technicalDetails') }}</h4>
        
        <div class="space-y-3">
          <!-- Verification Status -->
          <div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
            <span class="text-sm font-medium text-gray-700">{{ t('verification.results.verificationStatus') }}:</span>
            <span class="text-sm text-gray-900 font-mono">{{ verificationResult.status }}</span>
          </div>
          
          <!-- Cryptographic Hash -->
          <div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
            <span class="text-sm font-medium text-gray-700">{{ t('verification.results.cryptographicHash') }}:</span>
            <div class="flex items-center gap-2">
              <component 
                :is="verificationResult.details.cryptographicMatch ? CheckCircle : XCircle"
                :class="verificationResult.details.cryptographicMatch ? 'text-green-500' : 'text-red-500'"
                class="w-4 h-4"
              />
              <span class="text-sm text-gray-900">
                {{ verificationResult.details.cryptographicMatch ? t('verification.results.exactMatch') : t('verification.results.noMatch') }}
              </span>
            </div>
          </div>
          
          <!-- Perceptual Hash -->
          <div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
            <span class="text-sm font-medium text-gray-700">{{ t('verification.results.visualContent') }}:</span>
            <div class="flex items-center gap-2">
              <component 
                :is="verificationResult.details.perceptualMatch ? CheckCircle : XCircle"
                :class="verificationResult.details.perceptualMatch ? 'text-green-500' : 'text-red-500'"
                class="w-4 h-4"
              />
              <span class="text-sm text-gray-900">
                {{ verificationResult.details.perceptualMatch ? t('verification.results.visualMatch') : t('verification.results.noMatch') }}
              </span>
            </div>
          </div>
          
          <!-- Document Type -->
          <div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
            <span class="text-sm font-medium text-gray-700">{{ t('verification.results.documentType') }}:</span>
            <span class="text-sm text-gray-900 font-mono">{{ verificationResult.details.documentType }}</span>
          </div>
        </div>
      </div>

      <!-- Confidence Level Indicator -->
      <div>
        <h4 class="font-semibold text-gray-900 mb-3">{{ t('verification.results.confidenceLevel') }}</h4>
        <div class="flex items-center gap-3">
          <!-- Confidence Bar -->
          <div class="flex-grow bg-gray-200 rounded-full h-2">
            <div 
              :class="[
                'h-2 rounded-full transition-all duration-300',
                confidenceConfig.level === 'high' ? 'bg-green-500 w-full' :
                confidenceConfig.level === 'medium' ? 'bg-orange-500 w-3/4' :
                confidenceConfig.level === 'none' ? 'bg-red-500 w-1/4' :
                'bg-gray-400 w-0'
              ]"
            />
          </div>
          <!-- Confidence Label -->
          <span 
            :class="[
              'text-sm font-medium px-2 py-1 rounded-full',
              confidenceConfig.level === 'high' ? 'bg-green-100 text-green-800' :
              confidenceConfig.level === 'medium' ? 'bg-orange-100 text-orange-800' :
              confidenceConfig.level === 'none' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            ]"
          >
            {{ t(`verification.results.confidence.${confidenceConfig.level}`) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
