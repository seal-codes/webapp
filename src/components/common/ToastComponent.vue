<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

interface Props {
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  toastId: string
}

const props = defineProps<Props>()
const { removeToast } = useToast()

const icon = computed(() => {
  switch (props.type) {
    case 'success':
      return CheckCircle
    case 'error':
      return XCircle
    case 'warning':
      return AlertCircle
    case 'info':
      return Info
    default:
      return Info
  }
})

const colorClasses = computed(() => {
  const baseClasses = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
      title: 'text-green-800',
      text: 'text-green-700',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      title: 'text-red-800',
      text: 'text-red-700',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-600',
      title: 'text-yellow-800',
      text: 'text-yellow-700',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      title: 'text-blue-800',
      text: 'text-blue-700',
    },
  }

  return baseClasses[props.type as keyof typeof baseClasses]
})

const handleClose = () => {
  removeToast(props.toastId)
}

// Auto-close after 5 seconds for non-error toasts
onMounted(() => {
  if (props.type !== 'error') {
    setTimeout(() => {
      removeToast(props.toastId)
    }, 5000)
  }
})
</script>

<template>
  <div 
    :class="[
      colorClasses.bg,
      colorClasses.border,
      'border rounded-lg p-4 shadow-lg max-w-md mx-auto'
    ]"
  >
    <div class="flex items-start gap-3">
      <component 
        :is="icon"
        class="w-5 h-5 mt-0.5 flex-shrink-0"
        :class="colorClasses.icon"
      />
      <div class="flex-1 min-w-0">
        <p 
          v-if="title"
          class="text-sm font-medium"
          :class="colorClasses.title"
        >
          {{ title }}
        </p>
        <p 
          class="text-sm"
          :class="[title ? 'mt-1' : '', colorClasses.text]"
        >
          {{ message }}
        </p>
      </div>
      <button
        class="flex-shrink-0 ml-2 p-1 rounded-md hover:bg-black hover:bg-opacity-10 transition-colors"
        :class="colorClasses.icon"
        @click="handleClose"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>