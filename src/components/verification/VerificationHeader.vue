<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="mb-8">
    <h1 class="text-3xl font-bold mb-2">
      {{ t('verification.title') }}
    </h1>
    <p class="text-gray-600">
      {{ t('verification.subtitle') }}
    </p>
  </div>
</template>
