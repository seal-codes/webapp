<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  authProvidersService,
  type AuthProvider,
} from '@/services/auth-providers-service'

defineProps<{
  isProcessing: boolean;
}>()

const emit = defineEmits<{
  'provider-selected': [provider: string]
}>()

const providers = ref<AuthProvider[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)

const handleProviderClick = (providerId: string) => {
  console.log(`🔐 Provider selected: ${providerId}`)
  emit('provider-selected', providerId)
}

onMounted(async () => {
  try {
    console.log('📡 Loading authentication providers...')
    providers.value = await authProvidersService.getEnabledProviders()
    console.log(`✅ Loaded ${providers.value.length} providers`)
  } catch (err) {
    console.error('❌ Failed to load providers:', err)
    error.value =
      err instanceof Error
        ? err.message
        : 'Failed to load authentication providers'

    // Fallback to hardcoded providers if API fails
    providers.value = [
      {
        id: 'google',
        name: 'Google',
        enabled: true,
        icon_url:
          'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg',
        created_at: '',
        updated_at: '',
      },
      {
        id: 'github',
        name: 'GitHub',
        enabled: true,
        icon_url:
          'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
        created_at: '',
        updated_at: '',
      },
    ]
    console.log('🔄 Using fallback providers')
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div>
    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="flex justify-center items-center py-8"
    >
      <div
        class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"
      />
      <span class="ml-3 text-gray-600">Loading authentication providers...</span>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4"
    >
      <p class="text-yellow-800 text-sm">
        <strong>Warning:</strong> {{ error }}
      </p>
      <p class="text-yellow-700 text-xs mt-1">
        Using fallback providers. Some features may be limited.
      </p>
    </div>

    <!-- Providers Grid -->
    <div
      v-if="providers.length > 0"
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
    >
      <button
        v-for="provider in providers"
        :key="provider.id"
        :disabled="isProcessing"
        class="aspect-square flex flex-col items-center justify-center p-4 border border-gray-200 
          rounded-xl hover:bg-gray-50 transition-colors relative group disabled:opacity-50 
          disabled:cursor-not-allowed"
        @click="handleProviderClick(provider.id)"
      >
        <!-- Loading Spinner -->
        <div
          v-if="isProcessing"
          class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-xl"
        >
          <div
            class="animate-spin h-5 w-5 border-2 border-primary-500 rounded-full border-t-transparent"
          />
        </div>

        <!-- Provider Icon -->
        <img
          v-if="provider.icon_url"
          :src="provider.icon_url"
          :alt="provider.name"
          class="w-8 h-8 object-contain mb-2"
          @error="($event.target as HTMLElement).style.display = 'none'"
        >
        <div
          v-else
          class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mb-2"
        >
          <span class="text-gray-500 text-xs">{{
            provider.name.charAt(0)
          }}</span>
        </div>

        <!-- Provider Name -->
        <span class="text-xs text-gray-600 text-center">{{
          provider.name
        }}</span>
      </button>
    </div>

    <!-- No Providers Available -->
    <div
      v-else-if="!isLoading"
      class="text-center py-8"
    >
      <p class="text-gray-500">
        No authentication providers available.
      </p>
      <p class="text-gray-400 text-sm mt-1">
        Please contact support if this issue persists.
      </p>
    </div>

    <p class="text-xs text-gray-500 mt-4 text-center">
      By continuing, you agree to our Terms of Service and Privacy Policy
    </p>
  </div>
</template>
