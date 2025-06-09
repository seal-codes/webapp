<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { verificationService } from '@/services/verification-service'
import { qrReaderService } from '@/services/qr-reader-service'
import { attestationBuilder } from '@/services/attestation-builder'
import type { DecodedVerificationData, VerificationResult } from '@/services/verification-service'
import VerificationHeader from '@/components/verification/VerificationHeader.vue'
import VerificationUploadPrompt from '@/components/verification/VerificationUploadPrompt.vue'
import VerificationContent from '@/components/verification/VerificationContent.vue'
import VerificationSidebar from '@/components/verification/VerificationSidebar.vue'

const route = useRoute()
const { t } = useI18n()

// State
const decodedData = ref<DecodedVerificationData | null>(null)
const isLoading = ref(true)
const verificationResult = ref<VerificationResult | null>(null)
const uploadedDocument = ref<File | null>(null)
const documentPreviewUrl = ref<string>('')
const isVerifying = ref(false)
const isScanning = ref(false)
const qrScanResult = ref('')
const scanDebugInfo = ref<any>(null)

// Computed properties
const encodedData = computed(() => route.params.encodedData as string)
const hasEncodedData = computed(() => !!encodedData.value)

// Methods
const decodeQRData = () => {
  if (!encodedData.value) {
    decodedData.value = null
    return
  }
  
  console.log('Decoding QR data from URL parameter:', encodedData.value)
  const result = verificationService.decodeFromQR(encodedData.value)
  console.log('Decoded attestation data from URL:', result)
  decodedData.value = result
}

const handleDocumentUpload = async (file: File) => {
  console.log('🔥 handleDocumentUpload called with:', file.name, file.type)
  uploadedDocument.value = file
  
  // Create preview URL
  if (documentPreviewUrl.value) {
    URL.revokeObjectURL(documentPreviewUrl.value)
  }
  documentPreviewUrl.value = URL.createObjectURL(file)
  
  // Reset previous results
  verificationResult.value = null
  qrScanResult.value = ''
  scanDebugInfo.value = null
  
  // If we don't have attestation data yet, try to scan the image for QR code
  if (!decodedData.value?.isValid && file.type.startsWith('image/')) {
    console.log('No attestation data yet, scanning image for QR code...')
    await scanImageForQR(file)
  }
  
  // If we have attestation data, proceed with verification
  if (decodedData.value?.isValid) {
    console.log('Have attestation data, proceeding with verification...')
    await verifyDocument()
  }
}

const scanImageForQR = async (imageFile: File) => {
  console.log('Starting QR scan for:', imageFile.name)
  isScanning.value = true
  qrScanResult.value = ''
  scanDebugInfo.value = null
  
  try {
    // First, try to get exclusion zone if we have attestation data
    let exclusionZone = undefined
    if (decodedData.value?.attestationData) {
      try {
        exclusionZone = attestationBuilder.extractExclusionZone(decodedData.value.attestationData)
        console.log('Using exclusion zone for scanning:', exclusionZone)
      } catch (error) {
        console.warn('Could not extract exclusion zone:', error)
      }
    }
    
    const scanResult = await qrReaderService.scanForAttestationData(imageFile, exclusionZone)
    console.log('QR scan result:', scanResult)
    scanDebugInfo.value = scanResult.debug
    
    if (scanResult.found && scanResult.attestationData) {
      // Successfully found attestation data in the image
      decodedData.value = {
        attestationData: scanResult.attestationData,
        isValid: true
      }
      qrScanResult.value = t('verification.qr.foundMessage')
      console.log('QR code successfully decoded, attestation data available')
      console.log('Decoded attestation data from QR:', scanResult.attestationData)
    } else {
      qrScanResult.value = scanResult.error || t('verification.qr.notFound')
      console.log('QR scan failed:', qrScanResult.value)
    }
  } catch (error) {
    console.error('QR scan error:', error)
    qrScanResult.value = t('verification.qr.error') + ': ' + (error instanceof Error ? error.message : 'Unknown error')
  } finally {
    isScanning.value = false
  }
}

const verifyDocument = async () => {
  if (!uploadedDocument.value || !decodedData.value?.attestationData) {
    console.log('Cannot verify: missing document or attestation data')
    return
  }
  
  console.log('Starting document verification...')
  console.log('Attestation data for verification:', decodedData.value.attestationData)
  isVerifying.value = true
  try {
    verificationResult.value = await verificationService.verifyDocumentIntegrity(
      uploadedDocument.value,
      decodedData.value.attestationData
    )
    console.log('Verification complete:', verificationResult.value)
  } catch (error) {
    console.error('Verification error:', error)
    verificationResult.value = {
      isValid: false,
      status: 'error',
      message: 'An error occurred during verification',
      details: {
        cryptographicMatch: false,
        perceptualMatch: false,
        documentType: uploadedDocument.value?.type || 'unknown'
      }
    }
  } finally {
    isVerifying.value = false
  }
}

const resetVerification = () => {
  if (documentPreviewUrl.value) {
    URL.revokeObjectURL(documentPreviewUrl.value)
  }
  uploadedDocument.value = null
  documentPreviewUrl.value = ''
  verificationResult.value = null
  qrScanResult.value = ''
  scanDebugInfo.value = null
}

const scanSelectedArea = async (selection: { x: number; y: number; width: number; height: number }) => {
  if (!uploadedDocument.value) return
  
  isScanning.value = true
  qrScanResult.value = t('verification.qr.scanningSelected')
  
  try {
    console.log('🎯 Scanning selected area:', selection)
    
    // Scan the selected area
    const result = await qrReaderService.scanForAttestationData(uploadedDocument.value, selection)
    
    if (result.found && result.attestationData) {
      qrScanResult.value = t('verification.qr.foundMessage')
      decodedData.value = {
        attestationData: result.attestationData,
        isValid: true
      }
      
      // Proceed with verification
      await verifyDocument()
    } else {
      qrScanResult.value = result.error || t('verification.qr.notFoundSelected')
    }
  } catch (error) {
    console.error('Error scanning selected area:', error)
    qrScanResult.value = t('verification.qr.error') + ': ' + (error instanceof Error ? error.message : 'Unknown error')
  } finally {
    isScanning.value = false
  }
}

// Lifecycle
onMounted(() => {
  if (hasEncodedData.value) {
    decodeQRData()
  }
  isLoading.value = false
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <VerificationHeader />

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>

      <!-- Main Content Grid -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Main Content -->
        <div class="lg:col-span-2">
          <!-- No document uploaded yet -->
          <VerificationUploadPrompt
            v-if="!uploadedDocument"
            :has-encoded-data="hasEncodedData"
            :decoded-data="decodedData"
            @file-loaded="handleDocumentUpload"
          />

          <!-- Document uploaded - show verification interface -->
          <VerificationContent
            v-else
            :uploaded-document="uploadedDocument"
            :document-preview-url="documentPreviewUrl"
            :decoded-data="decodedData"
            :verification-result="verificationResult"
            :is-scanning="isScanning"
            :is-verifying="isVerifying"
            :qr-scan-result="qrScanResult"
            @verify-document="verifyDocument"
            @reset-verification="resetVerification"
            @scan-selected-area="scanSelectedArea"
          />
        </div>
        
        <!-- Sidebar - Always visible -->
        <div class="lg:col-span-1">
          <VerificationSidebar />
        </div>
      </div>
    </div>
  </div>
</template>