<script setup lang="ts">
import { computed } from 'vue'
import type { QRCodeExclusionZone } from '@/types/qrcode'

interface Props {
  exclusionZone: QRCodeExclusionZone
  imageElement: HTMLImageElement | null
}

const props = defineProps<Props>()

// Calculate scaled position and size for the overlay
const overlayStyle = computed(() => {
  if (!props.imageElement) {
    return { display: 'none' }
  }

  // Calculate scaling factors from natural size to displayed size
  const scaleX = props.imageElement.offsetWidth / props.imageElement.naturalWidth
  const scaleY = props.imageElement.offsetHeight / props.imageElement.naturalHeight

  // Scale the exclusion zone coordinates
  return {
    left: `${Math.round(props.exclusionZone.x * scaleX)}px`,
    top: `${Math.round(props.exclusionZone.y * scaleY)}px`,
    width: `${Math.round(props.exclusionZone.width * scaleX)}px`,
    height: `${Math.round(props.exclusionZone.height * scaleY)}px`,
  }
})
</script>

<template>
  <div 
    class="absolute border-2 border-red-500 bg-red-500 bg-opacity-20 pointer-events-none z-10"
    :style="overlayStyle"
  >
    <!-- Add corner markers for better visibility -->
    <div class="absolute -left-1 -top-1 w-2 h-2 bg-red-500" />
    <div class="absolute -right-1 -top-1 w-2 h-2 bg-red-500" />
    <div class="absolute -left-1 -bottom-1 w-2 h-2 bg-red-500" />
    <div class="absolute -right-1 -bottom-1 w-2 h-2 bg-red-500" />
  </div>
</template>
