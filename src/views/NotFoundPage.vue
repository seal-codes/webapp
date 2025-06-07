<script setup lang="ts">
import { useRouter } from 'vue-router'
import BaseButton from '../components/common/BaseButton.vue'

const router = useRouter()

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
        Page Not Found
      </h2>
      <p class="text-gray-600 mb-8 max-w-md mx-auto">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <BaseButton variant="primary" @click="goHome">
        Return to Home
      </BaseButton>
    </div>
  </div>
</template>