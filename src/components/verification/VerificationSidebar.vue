<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm p-6">
    <h3 class="text-lg font-bold mb-4">
      {{ t('verification.sidebar.title') }}
    </h3>
    
    <div class="space-y-4">
      <div class="flex items-start gap-3">
        <div class="numbered-circle">
          1
        </div>
        <div>
          <h4 class="font-medium mb-1">
            {{ t('verification.sidebar.step1.title') }}
          </h4>
          <p class="text-sm text-gray-600">
            {{ t('verification.sidebar.step1.description') }}
          </p>
        </div>
      </div>
      
      <div class="flex items-start gap-3">
        <div class="numbered-circle">
          2
        </div>
        <div>
          <h4 class="font-medium mb-1">
            {{ t('verification.sidebar.step2.title') }}
          </h4>
          <p class="text-sm text-gray-600">
            {{ t('verification.sidebar.step2.description') }}
          </p>
        </div>
      </div>
      
      <div class="flex items-start gap-3">
        <div class="numbered-circle">
          3
        </div>
        <div>
          <h4 class="font-medium mb-1">
            {{ t('verification.sidebar.step3.title') }}
          </h4>
          <p class="text-sm text-gray-600">
            {{ t('verification.sidebar.step3.description') }}
          </p>
        </div>
      </div>
      
      <div class="flex items-start gap-3">
        <div class="numbered-circle">
          4
        </div>
        <div>
          <h4 class="font-medium mb-1">
            {{ t('verification.sidebar.step4.title') }}
          </h4>
          <p class="text-sm text-gray-600">
            {{ t('verification.sidebar.step4.description') }}
          </p>
        </div>
      </div>
    </div>
    
    <div class="mt-6 p-4 bg-blue-50 rounded-lg">
      <p class="text-sm text-blue-700">
        <strong>{{ t('common.privacy') }}:</strong> {{ t('verification.sidebar.privacy') }}
      </p>
    </div>
  </div>
</template>
