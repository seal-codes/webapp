<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-vue-next'

type MessageType = 'success' | 'error' | 'warning' | 'info'

interface Props {
  type: MessageType
  title?: string
  message: string
  details?: string
  className?: string
}

const props = defineProps<Props>()

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
      text: 'text-green-700'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      title: 'text-red-800',
      text: 'text-red-700'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-600',
      title: 'text-yellow-800',
      text: 'text-yellow-700'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      title: 'text-blue-800',
      text: 'text-blue-700'
    }
  }

  return baseClasses[props.type]
})
</script>

<template>
  <div 
    :class="[
      colorClasses.bg,
      colorClasses.border,
      'border rounded-lg p-4',
      className
    ]"
  >
    <div class="flex items-start gap-3">
      <component 
        :is="icon"
        class="w-5 h-5 mt-0.5"
        :class="colorClasses.icon"
      />
      <div class="flex-1">
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
        <p 
          v-if="details"
          class="text-xs mt-2"
          :class="colorClasses.text"
        >
          {{ details }}
        </p>
      </div>
    </div>
  </div>
</template>
