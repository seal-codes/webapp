<template>
  <span>{{ displayValue }}{{ suffix }}</span>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

interface Props {
  target: number
  duration?: number
  suffix?: string
  prefix?: string
}

const props = withDefaults(defineProps<Props>(), {
  duration: 2000,
  suffix: '',
  prefix: ''
})

const displayValue = ref(0)

const animateCounter = () => {
  const startTime = Date.now()
  const startValue = 0
  const endValue = props.target
  
  const animate = () => {
    const currentTime = Date.now()
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / props.duration, 1)
    
    // Easing function for smooth animation
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
    const easedProgress = easeOutCubic(progress)
    
    displayValue.value = Math.round(startValue + (endValue - startValue) * easedProgress)
    
    if (progress < 1) {
      requestAnimationFrame(animate)
    }
  }
  
  requestAnimationFrame(animate)
}

onMounted(() => {
  // Start animation after a short delay
  setTimeout(animateCounter, 500)
})

// Re-animate if target changes
watch(() => props.target, () => {
  displayValue.value = 0
  animateCounter()
})
</script>
