<template>
  <div class="qr-engine-status" v-if="showStatus">
    <div class="status-indicator" :class="statusClass">
      <div class="status-icon">{{ statusIcon }}</div>
      <div class="status-text">
        <div class="engine-name">{{ engineName }}</div>
        <div class="status-message">{{ statusMessage }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { wasmPreloader } from '@/services/wasm-preloader'

interface Props {
  showStatus?: boolean
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showStatus: true,
  compact: false
})

const wasmState = ref({
  isLoaded: false,
  isLoading: false,
  loadTime: undefined as number | undefined,
})

const metrics = ref({
  isReady: false,
  recommendedEngine: 'jsqr' as 'jsqr' | 'rxing-wasm',
  startupLoadingEnabled: false,
})

let updateInterval: number | null = null

const updateStatus = () => {
  const state = wasmPreloader.getWasmState()
  wasmState.value = {
    isLoaded: state.isLoaded,
    isLoading: state.isLoading,
    loadTime: state.loadTime,
  }
  metrics.value = wasmPreloader.getMetrics()
}

const statusClass = computed(() => {
  if (wasmState.value.isLoading) return 'loading'
  if (wasmState.value.isLoaded) return 'loaded'
  return 'fallback'
})

const statusIcon = computed(() => {
  if (wasmState.value.isLoading) return '⏳'
  if (wasmState.value.isLoaded) return '🚀'
  return '📱'
})

const engineName = computed(() => {
  if (wasmState.value.isLoaded) return 'High-Performance QR Scanner'
  if (wasmState.value.isLoading) return 'Loading Enhanced Scanner...'
  return 'Standard QR Scanner'
})

const statusMessage = computed(() => {
  if (wasmState.value.isLoading) {
    return 'Preparing enhanced QR scanning...'
  }
  if (wasmState.value.isLoaded) {
    const loadTime = wasmState.value.loadTime
    return loadTime ? `Ready (loaded in ${loadTime}ms)` : 'Ready'
  }
  if (!metrics.value.startupLoadingEnabled) {
    return 'Using lightweight fallback'
  }
  return 'Standard scanning ready'
})

onMounted(() => {
  updateStatus()
  
  // Update status every 500ms while loading
  updateInterval = window.setInterval(() => {
    updateStatus()
    
    // Stop updating once loaded and stable
    if (wasmState.value.isLoaded && !wasmState.value.isLoading) {
      if (updateInterval) {
        clearInterval(updateInterval)
        updateInterval = null
      }
    }
  }, 500)
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})
</script>

<style scoped>
.qr-engine-status {
  margin: 0.5rem 0;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

.status-indicator.loading {
  background-color: #fef3c7;
  border: 1px solid #f59e0b;
  color: #92400e;
}

.status-indicator.loaded {
  background-color: #d1fae5;
  border: 1px solid #10b981;
  color: #065f46;
}

.status-indicator.fallback {
  background-color: #e5e7eb;
  border: 1px solid #6b7280;
  color: #374151;
}

.status-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.status-text {
  flex: 1;
  min-width: 0;
}

.engine-name {
  font-weight: 600;
  margin-bottom: 0.125rem;
}

.status-message {
  font-size: 0.75rem;
  opacity: 0.8;
}

/* Compact mode */
.qr-engine-status.compact .status-indicator {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
}

.qr-engine-status.compact .status-icon {
  font-size: 1rem;
}

.qr-engine-status.compact .engine-name {
  font-size: 0.75rem;
}

.qr-engine-status.compact .status-message {
  font-size: 0.625rem;
}

/* Loading animation */
.status-indicator.loading .status-icon {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
