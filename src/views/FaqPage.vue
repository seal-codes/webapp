<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200">
      <div class="container mx-auto px-4 py-8">
        <div class="text-center">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">
            {{ $t('faq.title') }}
          </h1>
          <p class="text-lg text-gray-600 max-w-2xl mx-auto">
            {{ $t('faq.subtitle') }}
          </p>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="container mx-auto px-4 py-8">
      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="text-center py-12"
      >
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        <p class="mt-2 text-gray-600">
          {{ $t('common.loading') }}
        </p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="text-center py-12"
      >
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <p class="text-red-800">
            {{ error }}
          </p>
          <button
            class="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            @click="loadFaqData"
          >
            {{ $t('common.retry') }}
          </button>
        </div>
      </div>

      <!-- FAQ Content -->
      <div
        v-else
        class="max-w-4xl mx-auto"
      >
        <!-- Category Filter (Simplified) -->
        <div class="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="max-w">
            <label
              for="category-filter"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              {{ $t('faq.filterByCategory') }}
            </label>
            <select
              id="category-filter"
              v-model="selectedCategory"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">
                {{ $t('faq.allCategories') }}
              </option>
              <option
                v-for="category in categories"
                :key="category.id"
                :value="category.id"
              >
                {{ $t(category.title) }}
              </option>
            </select>
          </div>
        </div>

        <!-- No Results -->
        <div
          v-if="filteredFaqs.length === 0"
          class="text-center py-12"
        >
          <div class="bg-gray-50 border border-gray-200 rounded-lg p-8">
            <HelpCircle class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p class="text-gray-600">
              {{ $t('faq.noResults') }}
            </p>
          </div>
        </div>

        <!-- FAQ Categories and Entries -->
        <div
          v-else
          class="space-y-8"
        >
          <div
            v-for="category in visibleCategories"
            :key="category.id"
            class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            <!-- Category Header -->
            <div class="bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200 p-6">
              <div class="flex items-center gap-4">
                <div class="flex-shrink-0">
                  <component
                    :is="getIconComponent(category.icon)"
                    class="w-8 h-8 text-primary-600"
                  />
                </div>
                <div>
                  <h2 class="text-xl font-bold text-primary-900">
                    {{ $t(category.title) }}
                  </h2>
                  <p class="text-primary-700 mt-1">
                    {{ $t(category.description) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Category FAQs -->
            <div class="p-6">
              <div class="space-y-4">
                <FaqEntry
                  v-for="faq in getCategoryFaqs(category.id)"
                  :key="faq.id"
                  :faq="faq"
                  :initial-expanded="expandedFaqId === faq.id"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { HelpCircle, Shield, Cog, Lock, AlertCircle } from 'lucide-vue-next'
import FaqEntry from '@/components/faq/FaqEntry.vue'
import faqService from '@/services/faqService'
import type { FaqEntry as FaqEntryType, FaqCategory } from '@/types/faq'

const { t } = useI18n()
const route = useRoute()

// State
const isLoading = ref(true)
const error = ref<string | null>(null)
const categories = ref<FaqCategory[]>([])
const faqs = ref<FaqEntryType[]>([])

// Filters (simplified - only category)
const selectedCategory = ref('')

// Hash navigation state
const expandedFaqId = ref<string | null>(null)

// Icon mapping
const iconComponents = {
  HelpCircle,
  Shield,
  Cog,
  Lock,
  AlertCircle,
}

// Computed
const filteredFaqs = computed(() => {
  if (!selectedCategory.value) {
    return faqs.value
  }
  return faqs.value.filter(faq => faq.category === selectedCategory.value)
})

const visibleCategories = computed(() => {
  const faqCategoryIds = new Set(filteredFaqs.value.map(faq => faq.category))
  return categories.value.filter(category => faqCategoryIds.has(category.id))
})

// Methods
const getIconComponent = (iconName: string) => {
  return iconComponents[iconName as keyof typeof iconComponents] || HelpCircle
}

const getCategoryFaqs = (categoryId: string) => {
  return filteredFaqs.value.filter(faq => faq.category === categoryId)
}

const loadFaqData = async () => {
  try {
    isLoading.value = true
    error.value = null

    const [categoriesData, faqsData] = await Promise.all([
      faqService.getCategories(),
      faqService.getFaqs(),
    ])

    categories.value = categoriesData
    faqs.value = faqsData
  } catch (err) {
    console.error('Error loading FAQ data:', err)
    error.value = t('faq.loadError', 'Failed to load FAQ data. Please try again.')
  } finally {
    isLoading.value = false
  }
}

// Hash navigation and scroll functionality
const scrollToAnchor = async (hash: string) => {
  if (!hash) {
    expandedFaqId.value = null
    return
  }
  
  // Remove the # from the hash
  const elementId = hash.replace('#', '')
  
  // Set the FAQ to be expanded
  expandedFaqId.value = elementId
  
  // Wait for the next tick to ensure DOM is updated
  await nextTick()
  
  // Find the element
  const element = document.getElementById(elementId)
  if (element) {
    // Scroll to the element with smooth behavior
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }
}

// Watch for route changes to handle hash navigation
watch(
  () => route.hash,
  (newHash) => {
    if (newHash && !isLoading.value) {
      scrollToAnchor(newHash)
    }
  },
  { immediate: true }
)

// Lifecycle
onMounted(async () => {
  await loadFaqData()
  
  // Handle initial hash if present
  if (route.hash) {
    // Add a small delay to ensure all FAQ entries are rendered
    setTimeout(() => {
      scrollToAnchor(route.hash)
    }, 100)
  }
})
</script>
