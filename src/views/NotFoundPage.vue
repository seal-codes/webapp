<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import BaseButton from '../components/common/BaseButton.vue'

const router = useRouter()
const { t } = useI18n()

const goHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="text-center">
      <h1 class="text-6xl font-bold text-primary-500 mb-4">
        404
      </h1>
      <h2 class="text-3xl font-medium mb-6">
        {{ t('notFound.title') }}
      </h2>
      <p class="text-gray-600 mb-8 max-w-md mx-auto">
        {{ t('notFound.subtitle') }}
      </p>
      <BaseButton variant="primary" @click="goHome">
        {{ t('notFound.backHome') }}
      </BaseButton>
    </div>
  </div>
</template>