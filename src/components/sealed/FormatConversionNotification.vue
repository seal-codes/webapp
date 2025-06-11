<template>
  <div
    v-if="conversionResult?.wasConverted"
    class="format-conversion-notification"
  >
    <div class="notification-header">
      <Icon
        name="mdi:file-swap"
        class="conversion-icon"
      />
      <h3>Format Converted for Optimal Sealing</h3>
    </div>
    
    <div class="conversion-details">
      <div class="format-change">
        <span class="format-badge original">{{ getFormatDisplayName(conversionResult.originalFormat) }}</span>
        <Icon
          name="mdi:arrow-right"
          class="arrow-icon"
        />
        <span class="format-badge converted">{{ getFormatDisplayName(conversionResult.finalFormat) }}</span>
      </div>
      
      <div
        v-if="conversionResult.sizeComparison"
        class="size-comparison"
      >
        <div class="size-item">
          <span class="label">Original:</span>
          <span class="value">{{ formatFileSize(conversionResult.sizeComparison.originalSize) }}</span>
        </div>
        <div class="size-item">
          <span class="label">Sealed:</span>
          <span class="value">{{ formatFileSize(conversionResult.sizeComparison.finalSize) }}</span>
        </div>
        <div
          class="size-change"
          :class="sizeChangeClass"
        >
          {{ sizeChangeText }}
        </div>
      </div>
    </div>


    <div class="verification-benefit">
      <div class="benefit-item">
        <Icon
          name="mdi:check-circle"
          class="check-icon"
        />
        <span>Exact verification (instead of visual-only)</span>
      </div>
      <div class="benefit-item">
        <Icon
          name="mdi:shield-check"
          class="check-icon"
        />
        <span>Pixel-perfect integrity validation</span>
      </div>
    </div>
    
    <div class="explanation">
      <div class="reason">
        <Icon
          name="mdi:information"
          class="info-icon"
        />
        <span>{{ conversionResult.conversionReason }}</span>
      </div>
      
      <div class="user-message">
        {{ userMessage }}
      </div>
    </div>
    
    <div
      v-if="showDetails"
      class="technical-details"
    >
      <h4>Technical Information</h4>
      <ul>
        <li><strong>Original Format:</strong> {{ conversionResult.originalFormat }}</li>
        <li><strong>Final Format:</strong> {{ conversionResult.finalFormat }}</li>
        <li><strong>Conversion Method:</strong> Canvas API with lossless settings</li>
        <li><strong>Quality:</strong> Lossless (no quality degradation)</li>
        <li><strong>Verification Type:</strong> Exact cryptographic matching</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FormatConversionResult } from '@/services/format-conversion-service'

interface Props {
  conversionResult: FormatConversionResult | null
}

const props = defineProps<Props>()
const showDetails = ref(false)

const sizeChangeClass = computed(() => {
  if (!props.conversionResult?.sizeComparison) {
    return ''
  }
  const change = props.conversionResult.sizeComparison.percentageChange
  return change > 0 ? 'size-increase' : 'size-decrease'
})

const sizeChangeText = computed(() => {
  if (!props.conversionResult?.sizeComparison) {
    return ''
  }
  const change = props.conversionResult.sizeComparison.percentageChange
  const absChange = Math.abs(change)
  return change > 0 ? `+${absChange}%` : `-${absChange}%`
})

const userMessage = computed(() => {
  if (!props.conversionResult) {
    return ''
  }
  
  const { originalFormat, finalFormat, sizeComparison } = props.conversionResult
  
  const originalName = getFormatDisplayName(originalFormat)
  const targetName = getFormatDisplayName(finalFormat)
  
  const sizeChange = sizeComparison?.percentageChange || 0
  const sizeDescription = sizeChange > 0 
    ? `${sizeChange}% larger` 
    : `${Math.abs(sizeChange)}% smaller`
  
  let message = `Your ${originalName} image has been converted to ${targetName} format for optimal verification. `
  
  // Add format-specific explanations
  if (originalFormat.includes('jpeg')) {
    message += 'This ensures exact verification instead of visual-only verification. '
  }
  
  message += `The sealed document will be ${sizeDescription} than the original. `
  
  // Add consequences explanation
  message += `\n\n📋 Important: The sealed document is now in ${targetName} format. `
  message += `If you need to use this document elsewhere, note that it's no longer in the original ${originalName} format.`
  
  return message
})

function getFormatDisplayName(mimeType: string): string {
  const formatNames: Record<string, string> = {
    'image/jpeg': 'JPEG',
    'image/jpg': 'JPEG',
    'image/png': 'PNG',
    'image/webp': 'WebP Lossless',
    'image/gif': 'GIF',
    'image/bmp': 'BMP',
    'image/tiff': 'TIFF',
  }
  return formatNames[mimeType] || mimeType
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes'
  }
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
</script>

<style scoped>
.format-conversion-notification {
  background: linear-gradient(135deg, #f8f9ff 0%, #e8f2ff 100%);
  border: 2px solid #3b82f6;
  border-radius: 12px;
  padding: 24px;
  margin: 16px 0;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.notification-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.conversion-icon {
  font-size: 24px;
  color: #3b82f6;
}

.notification-header h3 {
  margin: 0;
  color: #1e40af;
  font-size: 18px;
  font-weight: 600;
}

.conversion-details {
  margin-bottom: 20px;
}

.format-change {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.format-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
}

.format-badge.original {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #f59e0b;
}

.format-badge.converted {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #10b981;
}

.arrow-icon {
  color: #6b7280;
  font-size: 18px;
}

.size-comparison {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
}

.size-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.size-item .label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.size-item .value {
  font-weight: 600;
  color: #374151;
}

.size-change {
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
}

.size-change.size-increase {
  background: #fef3c7;
  color: #92400e;
}

.size-change.size-decrease {
  background: #d1fae5;
  color: #065f46;
}

.explanation {
  margin-bottom: 20px;
}

.reason {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 500;
  color: #374151;
}

.info-icon {
  color: #3b82f6;
  font-size: 16px;
}

.user-message {
  background: rgba(255, 255, 255, 0.8);
  padding: 16px;
  border-radius: 8px;
  line-height: 1.6;
  color: #374151;
  white-space: pre-line;
}

.verification-benefit {
  margin-bottom: 20px;
  padding: 16px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.benefit-item:last-child {
  margin-bottom: 0;
}

.check-icon {
  color: #10b981;
  font-size: 16px;
}

.actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.acknowledge-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.acknowledge-btn:hover {
  background: #2563eb;
}

.details-btn {
  background: transparent;
  color: #3b82f6;
  border: 2px solid #3b82f6;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.details-btn:hover {
  background: #3b82f6;
  color: white;
}

.technical-details {
  background: rgba(255, 255, 255, 0.9);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.technical-details h4 {
  margin: 0 0 12px 0;
  color: #374151;
  font-size: 16px;
}

.technical-details ul {
  margin: 0;
  padding-left: 20px;
}

.technical-details li {
  margin-bottom: 6px;
  color: #4b5563;
  line-height: 1.5;
}
</style>
