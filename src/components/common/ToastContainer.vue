<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import ToastComponent from './ToastComponent.vue'

const { toasts } = useToast()
</script>

<template>
  <div 
    class="fixed top-4 right-4 z-50 space-y-2 pointer-events-none"
    aria-live="polite"
    aria-label="Notifications"
  >
    <TransitionGroup
      name="toast"
      tag="div"
      class="space-y-2"
    >
      <ToastComponent
        v-for="toast in toasts"
        :key="toast.id"
        :type="toast.type"
        :title="toast.title"
        :message="toast.message"
        :toast-id="toast.id"
        class="pointer-events-auto"
      />
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>