<template>
  <div class="mb-6">
    <!-- Prominent Header Display -->
    <div
      :class="[
        'rounded-xl border-2 p-6 cursor-pointer transition-all duration-200 hover:shadow-md',
        bgColor,
        borderColor,
      ]"
      @click="toggleDetails"
    >
      <!-- Main Header -->
      <div class="flex items-start gap-4">
        <!-- Icon -->
        <div class="flex-shrink-0">
          <component
            :is="icon"
            :class="[iconColor, 'w-8 h-8']"
          />
        </div>

        <!-- Content -->
        <div class="flex-grow">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xl font-bold text-gray-900 mb-1">
                {{ title }}
              </h3>
              <p class="text-gray-600 text-sm">
                {{ subtitle }}
              </p>
            </div>

            <!-- Expand/Collapse Indicator -->
            <div class="flex items-center gap-2 text-gray-500">
              <span class="text-sm">{{ detailsLabel }}</span>
              <component
                :is="showDetails ? ChevronDown : ChevronRight"
                class="w-5 h-5"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Expandable Details Section -->
    <div
      v-if="showDetails"
      class="mt-4 bg-white border border-gray-200 rounded-lg p-6 space-y-6"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, ChevronRight } from 'lucide-vue-next'

interface Props {
  title: string
  subtitle: string
  icon: any
  iconColor?: string
  bgColor?: string
  borderColor?: string
  detailsText?: string
}

const props = withDefaults(defineProps<Props>(), {
  iconColor: 'text-blue-500',
  bgColor: 'bg-blue-50',
  borderColor: 'border-blue-200',
})

const { t } = useI18n()
const showDetails = ref(false)

const detailsLabel = computed(() => props.detailsText || t('formatConversion.details'))

const toggleDetails = () => {
  showDetails.value = !showDetails.value
}

// Expose methods for parent components
const collapse = () => {
  showDetails.value = false
}

const expand = () => {
  showDetails.value = true
}

// Expose methods to parent components
defineExpose({
  collapse,
  expand,
  toggleDetails
})
</script>
