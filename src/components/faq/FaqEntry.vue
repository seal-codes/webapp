<template>
  <div :id="faq.id" class="mb-6 bg-white border border-gray-200 rounded-lg overflow-hidden">
    <!-- Question Header (Always Visible) -->
    <div 
      class="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors"
      @click="toggleExpanded"
    >
      <div class="flex items-start gap-3 flex-1">
        <div class="flex-shrink-0">
          <HelpCircle class="w-6 h-6 text-blue-500 mt-0.5" />
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-900 mb-1">
            {{ $t(faq.question) }}
          </h3>
          <!-- One-line preview from analogy (only when collapsed) -->
          <p
            v-if="!isExpanded"
            class="text-sm text-gray-600 line-clamp-1"
          >
            {{ $t(faq.analogy) }}
          </p>
        </div>
      </div>
      
      <!-- Expand/Collapse Icon -->
      <div class="flex-shrink-0 ml-4">
        <ChevronDown 
          class="w-5 h-5 text-gray-400 transition-transform duration-200"
          :class="{ 'rotate-180': isExpanded }"
        />
      </div>
    </div>

    <!-- Expandable Content -->
    <div 
      v-if="isExpanded"
      class="border-t border-gray-200 p-6 space-y-6"
    >
      <!-- Analogy Section -->
      <div class="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0">
            <Lightbulb class="w-6 h-6 text-amber-600 mt-0.5" />
          </div>
          <div>
            <h4 class="font-semibold text-amber-800 mb-2">
              {{ $t('faq.analogyTitle', 'Simple Explanation') }}
            </h4>
            <p class="text-amber-700 leading-relaxed">
              {{ $t(faq.analogy) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Technical Section -->
      <div class="bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200 rounded-lg p-4">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0">
            <Cog class="w-6 h-6 text-slate-600 mt-0.5" />
          </div>
          <div>
            <h4 class="font-semibold text-slate-800 mb-2">
              {{ $t('faq.technicalTitle', 'Technical Details') }}
            </h4>
            <p class="text-slate-700 leading-relaxed">
              {{ $t(faq.technical) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { HelpCircle, Lightbulb, Cog, ChevronDown } from 'lucide-vue-next'
import type { FaqEntry } from '@/types/faq'

interface Props {
  faq: FaqEntry
  initialExpanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  initialExpanded: false,
})

const isExpanded = ref(props.initialExpanded)

// Watch for changes in initialExpanded prop
watch(() => props.initialExpanded, (newValue) => {
  isExpanded.value = newValue
})

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}
</script>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
