<template>
  <FaqPopover
    :faq-ids="faqIds"
    :trigger="trigger"
    :class-name="linkClasses"
    :show-icon="showIcon"
    :icon-position="iconPosition"
  >
    <span class="inline-flex items-center gap-1">
      <HelpCircle
        v-if="showIcon && iconPosition === 'left'"
        class="w-4 h-4 text-current opacity-70"
      />
      
      <span :class="textClasses">
        <slot />
      </span>
      
      <HelpCircle
        v-if="showIcon && iconPosition === 'right'"
        class="w-4 h-4 text-current opacity-70"
      />
    </span>
  </FaqPopover>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { HelpCircle } from 'lucide-vue-next'
import FaqPopover from './FaqPopover.vue'
import type { PopoverTrigger } from '@/types/faq'

interface Props {
  faqIds: string | string[]
  trigger?: PopoverTrigger
  variant?: 'underline' | 'subtle' | 'button' | 'plain'
  showIcon?: boolean
  iconPosition?: 'left' | 'right'
  className?: string
}

const props = withDefaults(defineProps<Props>(), {
  trigger: 'hover',
  variant: 'underline',
  showIcon: true,
  iconPosition: 'right',
  className: '',
})

// Computed
const linkClasses = computed(() => {
  const baseClasses = 'inline-flex items-center transition-colors duration-200'
  const variantClasses = {
    underline: 'text-primary-600 hover:text-primary-800 border-b border-dotted border-primary-400 hover:border-primary-600',
    subtle: 'text-gray-600 hover:text-primary-600',
    button: 'px-2 py-1 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded',
    plain: 'text-current',
  }
  
  return `${baseClasses} ${variantClasses[props.variant]} ${props.className}`
})

const textClasses = computed(() => {
  return props.variant === 'underline' ? 'border-b border-dotted border-current' : ''
})
</script>
