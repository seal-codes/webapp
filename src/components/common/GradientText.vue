<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  startColor?: string
  endColor?: string
  direction?: 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top'
}

const props = withDefaults(defineProps<Props>(), {
  startColor: '#961a1a', // Secondary-500 (red)
  endColor: '#2ab5b5', // Primary-500 (teal)
  direction: 'left-to-right'
})

const gradientDirection = computed(() => {
  switch (props.direction) {
    case 'left-to-right': return 'to right'
    case 'right-to-left': return 'to left'
    case 'top-to-bottom': return 'to bottom'
    case 'bottom-to-top': return 'to top'
    default: return 'to right'
  }
})

const gradientStyle = computed(() => {
  return {
    background: `linear-gradient(${gradientDirection.value}, ${props.startColor}, ${props.endColor})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    display: 'inline-block'
  }
})
</script>

<template>
  <span :style="gradientStyle">
    <slot></slot>
  </span>
</template>