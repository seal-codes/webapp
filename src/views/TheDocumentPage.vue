<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDocumentStore } from '../stores/documentStore'
import { useAuthStore } from '../stores/authStore'
import { useToast } from '@/composables/useToast'
import { OAuthProviderError, CodedError } from '@/types/errors'
import DocumentDropzone from '../components/document/DocumentDropzone.vue'
import DocumentPreview from '../components/document/DocumentPreview.vue'
import SocialAuthSelector from '../components/auth/SocialAuthSelector.vue'
import HowItWorks from '../components/document/HowItWorks.vue'
import BaseButton from '../components/common/BaseButton.vue'
import { QRCodeUIPosition } from '@/types/qrcode'

const router = useRouter()
const { t } = useI18n()
const documentStore = useDocumentStore()
const authStore = useAuthStore()
const { success, error, info } = useToast()

const isDocumentLoaded = computed(() => documentStore.hasDocument)
const isProcessing = ref(false)

// Use QR position and size from the store
const qrPosition = computed({
  get: () => documentStore.qrPosition,
  set: (value: QRCodeUIPosition) => documentStore.updateQRPosition(value)
})

const qrSize = computed({
  get: () => documentStore.qrSizePercent,
  set: (value: number) => documentStore.updateQRSize(value)
})

const handleDocumentLoaded = async (file: File) => {
  console.log('🔥 Document loaded in TheDocumentPage:', file.name, file.type)
  try {
    await documentStore.setDocument(file)
    console.log('✅ Document successfully set in store')
  } catch (err) {
    console.error('❌ Error setting document in store:', err)
    
    if (err instanceof CodedError) {
      error(t(`errors.${err.code}`))
    } else {
      error(t('errors.document_load_failed'))
    }
  }
}

const handleAuthenticateAndSeal = async (provider: string) => {
  if (!documentStore.hasDocument) {
    error(t('Please load a document first'))
    return
  }

  isProcessing.value = true
  try {
    info(t('Redirecting to authentication...'))
    
    // This will save the current state and redirect to OAuth
    await documentStore.authenticateWith(provider)
    
    // Note: User will be redirected to OAuth provider
    // When they return, the auth state change will trigger automatic sealing
    
  } catch (err) {
    console.error('Authentication error:', err)
    
    // Handle OAuth provider configuration errors
    if (err instanceof OAuthProviderError && err.isConfigurationError) {
      error(t('errors.provider_not_configured', { provider: err.provider }))
    } else if (err instanceof CodedError) {
      error(t(`errors.${err.code}`))
    } else {
      // Handle other authentication errors
      error(t('errors.authentication_failed'))
    }
  } finally {
    isProcessing.value = false
  }
}

const handleManualSeal = async () => {
  if (!documentStore.hasDocument || !authStore.isAuthenticated) {
    error(t('Document and authentication required'))
    return
  }

  isProcessing.value = true
  try {
    info(t('Sealing your document...'))
    
    const documentId = await documentStore.sealDocument()
    
    success(t('Document sealed successfully!'))
    router.push(`/sealed/${documentId}`)
    
  } catch (err) {
    console.error('Manual sealing error:', err)
    
    if (err instanceof CodedError) {
      error(t(`errors.${err.code}`))
    } else {
      error(t('errors.document_seal_failed'))
    }
  } finally {
    isProcessing.value = false
  }
}

const chooseNewDocument = () => {
  documentStore.reset()
}

const updateQrPosition = (position: { x: number; y: number }) => {
  documentStore.updateQRPosition(position)
}

const updateQrSize = (size: number) => {
  documentStore.updateQRSize(size)
}

// Watch for successful authentication and handle post-auth flow
watch(
  () => authStore.isAuthenticated,
  async (isAuthenticated) => {
    if (isAuthenticated) {
      console.log('🎉 User authenticated, checking for post-auth flow...')
      try {
        const documentId = await documentStore.handlePostAuthFlow()
        if (documentId) {
          success(t('Document sealed successfully!'))
          router.push(`/sealed/${documentId}`)
        }
      } catch (err) {
        console.error('Post-auth flow error:', err)
        if (err instanceof CodedError) {
          error(t(`errors.${err.code}`))
        } else {
          error(t('errors.document_seal_failed'))
        }
      }
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <div class="mb-6">
        <h1 class="text-3xl font-bold">
          {{ t("document.title") }}
        </h1>
      </div>

      <div class="grid md:grid-cols-3 gap-8">
        <!-- Main Content -->
        <div class="md:col-span-2">
          <div class="bg-white rounded-xl shadow-sm p-6">
            <!-- Document Upload Section -->
            <div v-if="!isDocumentLoaded">
              <DocumentDropzone @file-loaded="handleDocumentLoaded" />
            </div>

            <!-- Document Preview and Controls Section -->
            <div v-else>
              <div class="mb-4">
                <DocumentPreview
                  :document="documentStore.uploadedDocument"
                  :qr-position="qrPosition"
                  :qr-size-percent="qrSize"
                  :has-qr="false"
                  :attestation-data="documentStore.currentAttestationData"
                  :auth-provider="documentStore.authProvider || undefined"
                  :user-name="documentStore.userName || undefined"
                  @position-updated="updateQrPosition"
                  @size-updated="updateQrSize"
                />
              </div>

              <!-- Controls Bar -->
              <div class="flex justify-between items-center mb-6">
                <BaseButton
                  variant="outline"
                  @click="chooseNewDocument"
                >
                  {{ t("document.controls.chooseAnother") }}
                </BaseButton>
              </div>

              <!-- Authentication Section - Always Visible -->
              <div class="border-t pt-6">
                <!-- Already Authenticated -->
                <div v-if="authStore.isAuthenticated" class="space-y-4">
                  <!-- Authentication Status -->
                  <div class="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                      <div>
                        <p class="font-medium text-green-800">
                          Authenticated as {{ authStore.userName }}
                        </p>
                        <p class="text-sm text-green-600">
                          via {{ authStore.authProvider }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- Seal Document Button -->
                  <div class="text-center">
                    <BaseButton
                      variant="cta"
                      size="lg"
                      :loading="isProcessing"
                      :disabled="isProcessing"
                      @click="handleManualSeal"
                    >
                      🔒 Seal This Document
                    </BaseButton>
                    <p class="text-sm text-gray-600 mt-2">
                      This will create a permanent seal with your current authentication
                    </p>
                  </div>

                  <!-- Option to Sign Out and Use Different Provider -->
                  <div class="text-center pt-4 border-t">
                    <p class="text-sm text-gray-600 mb-3">
                      Want to use a different account?
                    </p>
                    <BaseButton
                      variant="outline"
                      size="sm"
                      @click="authStore.signOut"
                    >
                      Sign Out & Choose Different Account
                    </BaseButton>
                  </div>
                </div>

                <!-- Not Authenticated -->
                <div v-else>
                  <h3 class="text-xl font-medium mb-3">
                    {{ t("document.controls.authenticateWith") }}
                  </h3>
                  <p class="text-gray-600 mb-4">
                    Choose how you want to authenticate your identity for this seal:
                  </p>
                  <SocialAuthSelector
                    :is-processing="isProcessing"
                    @provider-selected="handleAuthenticateAndSeal"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="md:col-span-1">
          <HowItWorks />
        </div>
      </div>
    </div>
  </div>
</template>