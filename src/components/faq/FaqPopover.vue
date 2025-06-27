<template>
  <div class="relative inline-block">
    <!-- Trigger Element -->
    <div
      ref="triggerRef"
      :class="triggerClasses"
      tabindex="0"
      role="button"
      :aria-expanded="isVisible"
      :aria-describedby="isVisible ? popoverId : undefined"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleTriggerMouseLeave"
      @click="handleClick"
      @keydown.enter="handleClick"
      @keydown.escape="hidePopover"
    >
      <slot />
    </div>

    <!-- Popover Portal -->
    <Teleport to="body">
      <div v-if="isVisible">
        <!-- Invisible bridge to connect trigger and popover -->
        <div
          class="fixed z-40"
          :style="bridgeStyle"
          @mouseenter="handleBridgeMouseEnter"
          @mouseleave="handleBridgeMouseLeave"
        />
        
        <!-- Main popover -->
        <div
          :id="popoverId"
          ref="popoverRef"
          class="fixed z-50 max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg"
          :style="popoverStyle"
          role="tooltip"
          @mouseenter="handlePopoverMouseEnter"
          @mouseleave="handlePopoverMouseLeave"
        >
          <!-- Arrow -->
          <div
            class="absolute w-3 h-3 bg-white border-l border-t border-gray-200 transform rotate-45"
            :style="arrowStyle"
          />

          <!-- Content -->
          <div class="relative bg-white rounded-lg p-4 max-h-96 overflow-y-auto">
            <!-- Header -->
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-semibold text-gray-900">
                {{ $t('faq.helpTitle', 'Help') }}
              </h3>
              <button
                class="text-gray-400 hover:text-gray-600 transition-colors"
                :aria-label="$t('common.close')"
                @click="hidePopover"
              >
                <X class="w-4 h-4" />
              </button>
            </div>

            <!-- Loading State -->
            <div
              v-if="isLoading"
              class="text-center py-4"
            >
              <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />
              <p class="mt-2 text-xs text-gray-600">
                {{ $t('common.loading') }}
              </p>
            </div>

            <!-- Error State -->
            <div
              v-else-if="error"
              class="text-center py-4"
            >
              <p class="text-xs text-red-600">
                {{ error }}
              </p>
            </div>

            <!-- FAQ Entries -->
            <div
              v-else-if="faqEntries.length > 0"
              class="space-y-4"
            >
              <div
                v-for="faq in faqEntries"
                :key="faq.id"
                class="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0"
              >
                <h4 class="text-sm font-medium text-gray-900 mb-2">
                  {{ $t(faq.question) }}
                </h4>
              
                <!-- Analogy (simplified for popover) -->
                <div class="bg-amber-50 border border-amber-200 rounded p-2 mb-2">
                  <p class="text-xs text-amber-800 leading-relaxed">
                    {{ $t(faq.analogy) }}
                  </p>
                </div>

                <!-- Link to full FAQ -->
                <router-link
                  :to="`/faq#${faq.id}`"
                  class="inline-flex items-center text-xs text-primary-600 hover:text-primary-800 transition-colors"
                  @click="hidePopover"
                >
                  {{ $t('faq.readMore', 'Read more') }}
                  <ExternalLink class="w-3 h-3 ml-1" />
                </router-link>
              </div>
            </div>

            <!-- No entries found -->
            <div
              v-else
              class="text-center py-4"
            >
              <p class="text-xs text-gray-600">
                {{ $t('faq.noHelpAvailable', 'No help available for this topic.') }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { X, ExternalLink } from 'lucide-vue-next'
import faqService from '@/services/faqService'
import type { FaqEntry, PopoverTrigger } from '@/types/faq'

interface Props {
  faqIds: string | string[]
  trigger?: PopoverTrigger
  className?: string
  showIcon?: boolean
  iconPosition?: 'left' | 'right'
}

const props = withDefaults(defineProps<Props>(), {
  trigger: 'hover',
  className: '',
  showIcon: true,
  iconPosition: 'right',
})

const { t } = useI18n()

// State
const isVisible = ref(false)
const isLoading = ref(false)
const error = ref<string | null>(null)
const faqEntries = ref<FaqEntry[]>([])
const triggerRef = ref<HTMLElement>()
const popoverRef = ref<HTMLElement>()
const popoverStyle = ref({})
const arrowStyle = ref({})
const bridgeStyle = ref({})
const hideTimeout = ref<number | null>(null)

// Computed
const popoverId = computed(() => `faq-popover-${Math.random().toString(36).substr(2, 9)}`)

const triggerClasses = computed(() => {
  const baseClasses = 'cursor-help focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 rounded'
  return `${baseClasses} ${props.className}`
})

const faqIdArray = computed(() => {
  return Array.isArray(props.faqIds) ? props.faqIds : [props.faqIds]
})

// Methods
const loadFaqEntries = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    const entries = await faqService.getFaqsByIds(faqIdArray.value)
    faqEntries.value = entries
  } catch (err) {
    console.error('Error loading FAQ entries:', err)
    error.value = t('faq.loadError', 'Failed to load help content.')
  } finally {
    isLoading.value = false
  }
}

const calculatePosition = async () => {
  if (!triggerRef.value || !popoverRef.value) {
    return
  }

  await nextTick()

  const trigger = triggerRef.value.getBoundingClientRect()
  const popover = popoverRef.value.getBoundingClientRect()
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  }

  // Default position: below the trigger, centered
  let top = trigger.bottom + 8
  let left = trigger.left + (trigger.width / 2) - (popover.width / 2)

  // Adjust if popover would go off-screen horizontally
  if (left < 8) {
    left = 8
  } else if (left + popover.width > viewport.width - 8) {
    left = viewport.width - popover.width - 8
  }

  // Adjust if popover would go off-screen vertically
  let arrowTop = -6 // Arrow pointing up
  if (top + popover.height > viewport.height - 8) {
    // Position above the trigger instead
    top = trigger.top - popover.height - 8
    arrowTop = popover.height - 6 // Arrow pointing down
  }

  // Calculate arrow position
  const arrowLeft = trigger.left + (trigger.width / 2) - left - 6

  popoverStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
  }

  arrowStyle.value = {
    top: `${arrowTop}px`,
    left: `${Math.max(6, Math.min(arrowLeft, popover.width - 18))}px`,
  }

  // Calculate bridge area to connect trigger and popover
  const bridgeTop = Math.min(trigger.bottom, top)
  const bridgeBottom = Math.max(trigger.bottom, top)
  const bridgeLeft = Math.min(trigger.left, left)
  const bridgeRight = Math.max(trigger.right, left + popover.width)
  
  bridgeStyle.value = {
    top: `${bridgeTop}px`,
    left: `${bridgeLeft}px`,
    width: `${bridgeRight - bridgeLeft}px`,
    height: `${bridgeBottom - bridgeTop + 8}px`, // Add some padding
    pointerEvents: 'auto',
  }
}

const showPopover = async () => {
  if (isVisible.value) {
    return
  }

  isVisible.value = true
  await loadFaqEntries()
  await calculatePosition()
}

const hidePopover = () => {
  isVisible.value = false
}

const handleMouseEnter = () => {
  if (props.trigger === 'hover' || props.trigger === 'both') {
    clearHideTimeout()
    showPopover()
  }
}

const handleTriggerMouseLeave = () => {
  if (props.trigger === 'hover' || props.trigger === 'both') {
    scheduleHide()
  }
}

const handlePopoverMouseEnter = () => {
  clearHideTimeout()
}

const handlePopoverMouseLeave = () => {
  if (props.trigger === 'hover' || props.trigger === 'both') {
    scheduleHide()
  }
}

const handleBridgeMouseEnter = () => {
  clearHideTimeout()
}

const handleBridgeMouseLeave = () => {
  if (props.trigger === 'hover' || props.trigger === 'both') {
    scheduleHide()
  }
}

const scheduleHide = () => {
  hideTimeout.value = window.setTimeout(() => {
    hidePopover()
  }, 100) // Small delay to allow moving between elements
}

const clearHideTimeout = () => {
  if (hideTimeout.value) {
    clearTimeout(hideTimeout.value)
    hideTimeout.value = null
  }
}

const handleClick = () => {
  if (props.trigger === 'click' || props.trigger === 'both') {
    if (isVisible.value) {
      hidePopover()
    } else {
      showPopover()
    }
  }
}

const handleClickOutside = (event: MouseEvent) => {
  if (
    isVisible.value &&
    triggerRef.value &&
    popoverRef.value &&
    !triggerRef.value.contains(event.target as Node) &&
    !popoverRef.value.contains(event.target as Node)
  ) {
    hidePopover()
  }
}

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isVisible.value) {
    hidePopover()
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
  clearHideTimeout()
})
</script>
