<template>
  <div class="mb-6">
    <ExpandableDetails
      :title="$t(faq.question)"
      :subtitle="$t('faq.entries.clickToExpand', 'Click to expand')"
      :icon="HelpCircle"
      icon-color="text-blue-500"
      bg-color="bg-blue-50"
      border-color="border-blue-200"
      :details-text="$t('common.details', 'Details')"
    >
      <div class="space-y-6">
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

        <!-- Tags -->
        <div
          v-if="faq.tags.length > 0"
          class="flex flex-wrap gap-2"
        >
          <span
            v-for="tag in faq.tags"
            :key="tag"
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            {{ tag }}
          </span>
        </div>
      </div>
    </ExpandableDetails>
  </div>
</template>

<script setup lang="ts">
import { HelpCircle, Lightbulb, Cog } from 'lucide-vue-next'
import ExpandableDetails from '@/components/common/ExpandableDetails.vue'
import type { FaqEntry } from '@/types/faq'

interface Props {
  faq: FaqEntry
}

defineProps<Props>()
</script>
