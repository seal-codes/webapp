<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface Props {
  title: string
  lastUpdated?: string
}

const props = defineProps<Props>()
const { t } = useI18n()

const pageTitle = computed(() => props.title)
const lastUpdatedText = computed(() => 
  props.lastUpdated ? t('legal.lastUpdated', { date: props.lastUpdated }) : null,
)
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <!-- Header -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="px-8 py-8 border-b border-gray-200">
          <h1 class="text-3xl font-bold text-gray-900 mb-3">
            {{ pageTitle }}
          </h1>
          <p v-if="lastUpdatedText" class="text-sm text-gray-600">
            {{ lastUpdatedText }}
          </p>
        </div>
        
        <!-- Content -->
        <div class="px-8 py-8">
          <div class="legal-prose prose-lg max-w-none">
            <slot />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Global styles for legal page content - not scoped to ensure they apply to v-html content */
.legal-prose {
  @apply text-gray-700 leading-relaxed;
  line-height: 1.75;
}

.legal-prose h2 {
  @apply text-2xl font-semibold text-gray-900;
  margin-top: 4rem !important;
  margin-bottom: 2rem !important;
}

.legal-prose h2:first-child {
  margin-top: 0 !important;
}

.legal-prose h3 {
  @apply text-xl font-medium text-gray-900;
  margin-top: 3rem !important;
  margin-bottom: 1.5rem !important;
}

.legal-prose h4 {
  @apply text-lg font-medium text-gray-900;
  margin-top: 2rem !important;
  margin-bottom: 1rem !important;
}

.legal-prose p {
  @apply text-base leading-7;
  margin-bottom: 1.5rem !important;
}

.legal-prose ul {
  @apply list-disc list-outside space-y-3 pl-6;
  margin-bottom: 1.5rem !important;
}

.legal-prose ol {
  @apply list-decimal list-outside space-y-3 pl-6;
  margin-bottom: 1.5rem !important;
}

.legal-prose li {
  @apply text-gray-700 leading-7;
}

.legal-prose li p {
  margin-bottom: 0.75rem !important;
}

.legal-prose a {
  @apply text-primary-600 hover:text-primary-700 underline;
}

.legal-prose strong {
  @apply font-semibold text-gray-900;
}

.legal-prose em {
  @apply italic;
}

/* Better spacing for lists after headings */
.legal-prose h2 + ul,
.legal-prose h2 + ol,
.legal-prose h3 + ul,
.legal-prose h3 + ol {
  margin-top: 1.5rem !important;
}
</style>
