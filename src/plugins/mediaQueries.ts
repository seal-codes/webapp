import { ref, onMounted, onUnmounted } from 'vue'

// Media query breakpoints (matching Tailwind's default breakpoints)
const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
}

// Create a reactive object to hold the current media query states
const mq = ref({
  sm: false,
  md: false,
  lg: false,
  xl: false,
  '2xl': false
})

// Update media query states based on window width
const updateMediaQueries = () => {
  const width = window.innerWidth
  mq.value.sm = width >= breakpoints.sm
  mq.value.md = width >= breakpoints.md
  mq.value.lg = width >= breakpoints.lg
  mq.value.xl = width >= breakpoints.xl
  mq.value['2xl'] = width >= breakpoints['2xl']
}

// Plugin installation
export default {
  install: (app) => {
    // Initialize media queries
    updateMediaQueries()
    
    // Set up event listener for window resize
    onMounted(() => {
      window.addEventListener('resize', updateMediaQueries)
    })
    
    // Clean up event listener
    onUnmounted(() => {
      window.removeEventListener('resize', updateMediaQueries)
    })
    
    // Make media queries available globally in components
    app.config.globalProperties.$mq = mq
    
    // Provide media queries for composition API
    app.provide('mq', mq)
  }
}

// Composition API hook
export function useMediaQueries() {
  return { mq }
}