<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const steps = [
  {
    number: 1,
    text: t('document.howItWorks.steps.upload.description'),
  },
  {
    number: 2,
    text: t('document.howItWorks.steps.position.description'),
  },
  {
    number: 3,
    text: t('document.howItWorks.steps.authenticate.description'),
  },
  {
    number: 4,
    text: t('document.howItWorks.steps.download.description'),
  },
]

const fileTypes = ['PNG', 'JPG/JPEG', 'WebP']
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm p-6">
    <h2 class="text-xl font-bold mb-6">
      {{ t('document.howItWorks.title') }}
    </h2>
    
    <!-- Steps -->
    <div class="space-y-4 mb-8">
      <div 
        v-for="step in steps" 
        :key="step.number"
        class="flex items-start gap-3"
      >
        <div class="numbered-circle">
          {{ step.number }}
        </div>
        <p class="text-gray-700">
          {{ step.text }}
        </p>
      </div>
    </div>
    
    <!-- Supported File Types -->
    <div>
      <h3 class="text-lg font-medium mb-4">
        Supported File Types
      </h3>
      <div class="flex gap-4">
        <div 
          v-for="type in fileTypes" 
          :key="type"
          class="bg-gray-100 px-6 py-2 rounded-lg text-gray-600"
        >
          {{ type }}
        </div>
      </div>
    </div>
  </div>
</template>