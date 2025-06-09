<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { verificationService } from '@/services/verification-service'
import { qrReaderService } from '@/services/qr-reader-service'
import { attestationBuilder } from '@/services/attestation-builder'
import { providers } from '@/types/auth'
import type { DecodedVerificationData, VerificationResult } from '@/services/verification-service'
import type { Provider } from '@/types/auth'
import BaseButton from '@/components/common/BaseButton.vue'
import LabeledText from '@/components/common/LabeledText.vue'
import DocumentDropzone from '@/components/document/DocumentDropzone.vue'
import { CheckCircle, XCircle, AlertCircle, FileText, Calendar, User, Shield, QrCode, Upload } from 'lucide-vue-next'

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

// QR Selection state
const isSelecting = ref(false)
const selectionStart = ref<{ x: number; y: number } | null>(null)
const selectionEnd = ref<{ x: number; y: number } | null>(null)
const imageElement = ref<HTMLImageElement | null>(null)

// Computed properties
const encodedData = computed(() => route.params.encodedData as string)
const hasEncodedData = computed(() => !!encodedData.value)

const providerInfo = computed(() => {
  if (!decodedData.value?.attestationData?.i?.p) {
    return null
  }
  
  const provider = providers.find((p: Provider) => p.compactId === decodedData.value!.attestationData.i.p)
  return provider || { name: 'Unknown Provider', id: 'unknown' }
})

const attestationDate = computed(() => {
  if (!decodedData.value?.attestationData?.t) {
    return null
  }
  
  try {
    return new Date(decodedData.value.attestationData.t).toLocaleString()
  } catch {
    return 'Invalid date'
  }
})

const verificationIcon = computed(() => {
  if (!verificationResult.value) {
    return null
  }
  
  switch (verificationResult.value.status) {
    case 'verified':
      return CheckCircle
    case 'modified':
    case 'hash_mismatch':
      return XCircle
    case 'error':
      return AlertCircle
    default:
      return AlertCircle
  }
})

const verificationColor = computed(() => {
  if (!verificationResult.value) {
    return 'text-gray-500'
  }
  
  switch (verificationResult.value.status) {
    case 'verified':
      return 'text-green-600'
    case 'modified':
    case 'hash_mismatch':
      return 'text-red-600'
    case 'error':
      return 'text-yellow-600'
    default:
      return 'text-gray-500'
  }
})

const selectionBox = computed(() => {
  if (!selectionStart.value || !selectionEnd.value) return null
  
  const start = selectionStart.value
  const end = selectionEnd.value
  
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y)
  }
})

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
  resetSelection()
  
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
      qrScanResult.value = 'QR code found and decoded successfully!'
      console.log('QR code successfully decoded, attestation data available')
      console.log('Decoded attestation data from QR:', scanResult.attestationData)
    } else {
      qrScanResult.value = scanResult.error || 'No seal.codes QR code found in the image'
      console.log('QR scan failed:', qrScanResult.value)
    }
  } catch (error) {
    console.error('QR scan error:', error)
    qrScanResult.value = 'Error scanning for QR code: ' + (error instanceof Error ? error.message : 'Unknown error')
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
  resetSelection()
}

// QR Selection methods
const handleMouseDown = (event: MouseEvent) => {
  if (!imageElement.value || !uploadedDocument.value?.type.startsWith('image/')) return
  
  event.preventDefault()
  
  const rect = imageElement.value.getBoundingClientRect()
  
  // Calculate position relative to the image
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  selectionStart.value = { x, y }
  selectionEnd.value = { x, y }
  isSelecting.value = true
  
  // Add mouse move and up listeners
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const handleMouseMove = (event: MouseEvent) => {
  if (!isSelecting.value || !selectionStart.value || !imageElement.value) return
  
  const rect = imageElement.value.getBoundingClientRect()
  
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  selectionEnd.value = { x, y }
}

const handleMouseUp = () => {
  if (!isSelecting.value) return
  
  // Remove event listeners
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  
  // If we have a valid selection, scan it
  if (selectionBox.value && selectionBox.value.width > 20 && selectionBox.value.height > 20) {
    scanSelectedArea()
  }
  
  isSelecting.value = false
}

const scanSelectedArea = async () => {
  if (!selectionBox.value || !imageElement.value || !uploadedDocument.value) return
  
  isScanning.value = true
  qrScanResult.value = 'Scanning selected area...'
  
  try {
    // Calculate the selection in image coordinates
    const imageRect = imageElement.value.getBoundingClientRect()
    const naturalWidth = imageElement.value.naturalWidth
    const naturalHeight = imageElement.value.naturalHeight
    
    // Scale selection from display coordinates to natural image coordinates
    const scaleX = naturalWidth / imageRect.width
    const scaleY = naturalHeight / imageRect.height
    
    const imageSelection = {
      x: Math.round(selectionBox.value.x * scaleX),
      y: Math.round(selectionBox.value.y * scaleY),
      width: Math.round(selectionBox.value.width * scaleX),
      height: Math.round(selectionBox.value.height * scaleY)
    }
    
    console.log('🎯 Scanning selected area:', imageSelection)
    
    // Scan the selected area
    const result = await qrReaderService.scanForAttestationData(uploadedDocument.value, imageSelection)
    
    if (result.found && result.attestationData) {
      qrScanResult.value = 'QR code found and decoded successfully!'
      decodedData.value = {
        attestationData: result.attestationData,
        isValid: true
      }
      
      // Proceed with verification
      await verifyDocument()
    } else {
      qrScanResult.value = result.error || 'No QR code found in selected area'
    }
  } catch (error) {
    console.error('Error scanning selected area:', error)
    qrScanResult.value = 'Error scanning selected area: ' + (error instanceof Error ? error.message : 'Unknown error')
  } finally {
    isScanning.value = false
  }
}

const resetSelection = () => {
  selectionStart.value = null
  selectionEnd.value = null
  isSelecting.value = false
  
  // Clean up event listeners
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
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
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-2">
          {{ t('verification.title') }}
        </h1>
        <p class="text-gray-600">
          Verify the authenticity and integrity of a sealed document
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>

      <!-- No document uploaded yet -->
      <div v-else-if="!uploadedDocument" class="max-w-4xl mx-auto">
        <div class="bg-white rounded-xl shadow-sm p-8 text-center">
          <QrCode class="w-16 h-16 text-primary-500 mx-auto mb-6" />
          <h2 class="text-2xl font-bold mb-4">
            Upload a Sealed Document
          </h2>
          <p class="text-gray-600 mb-6 max-w-2xl mx-auto">
            Upload a document that contains an embedded QR code seal. We'll automatically scan the document, 
            extract the attestation data, and allow you to verify the document's integrity.
          </p>
          
          <div class="max-w-lg mx-auto">
            <DocumentDropzone @file-loaded="handleDocumentUpload" />
          </div>
          
          <!-- Show error for invalid URL parameter -->
          <div v-if="hasEncodedData && !decodedData?.isValid" class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg max-w-2xl mx-auto">
            <div class="flex items-start gap-3">
              <XCircle class="w-5 h-5 text-red-500 mt-0.5" />
              <div class="text-left">
                <p class="text-sm text-red-800">
                  <strong>Invalid verification link:</strong> {{ decodedData?.error || 'The verification data in the URL is invalid.' }}
                </p>
                <p class="text-xs text-red-700 mt-1">
                  You can still upload a sealed document above to scan for QR codes automatically.
                </p>
              </div>
            </div>
          </div>
          
          <div class="mt-6 p-4 bg-blue-50 rounded-lg max-w-2xl mx-auto">
            <div class="flex items-start gap-3">
              <QrCode class="w-5 h-5 text-blue-500 mt-0.5" />
              <div class="text-left">
                <p class="text-sm text-blue-800">
                  <strong>How it works:</strong> When you upload an image with an embedded QR code seal, 
                  we automatically scan and extract the verification data. You can then verify that the 
                  document hasn't been modified since it was sealed.
                </p>
                <p class="text-xs text-blue-700 mt-2">
                  All processing happens in your browser - your documents are never uploaded to our servers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Document uploaded - show main interface -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Certificate Information (if we have valid attestation data) -->
          <div v-if="decodedData?.isValid" class="bg-white rounded-xl shadow-sm p-6">
            <div class="flex items-center gap-3 mb-6">
              <Shield class="w-8 h-8 text-primary-500" />
              <div>
                <h2 class="text-xl font-bold text-gray-900">
                  Digital Seal Information
                </h2>
                <p class="text-sm text-gray-600 mt-1">
                  The QR code contains the following information about when and by whom this document was sealed.
                </p>
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <!-- Document Information -->
              <div class="space-y-6">
                <LabeledText
                  :icon="FileText"
                  label="Document Hash"
                  :value="decodedData.attestationData.h.c"
                  :monospace="true"
                />
                
                <LabeledText
                  :icon="Calendar"
                  label="Sealed On"
                  :value="attestationDate || 'Unknown'"
                />
              </div>
              
              <!-- Identity Information -->
              <div class="space-y-6">
                <LabeledText
                  :icon="User"
                  label="Sealed By"
                  :value="decodedData.attestationData.i.id"
                />
                
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <div class="w-4 h-4">
                      <img 
                        v-if="providerInfo" 
                        :src="providerInfo.icon" 
                        :alt="providerInfo.name"
                        class="w-4 h-4 object-contain"
                      />
                    </div>
                    <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Authentication Provider
                    </span>
                  </div>
                  <p class="text-gray-900">
                    {{ providerInfo?.name || 'Unknown' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Document Preview and Status -->
          <div class="bg-white rounded-xl shadow-sm p-6">
            <h2 class="text-xl font-bold mb-6 flex items-center gap-2">
              <FileText class="w-6 h-6 text-primary-500" />
              Document Verification
            </h2>
            
            <!-- Document Preview with Selection -->
            <div class="mb-6">
              <div class="bg-gray-100 rounded-lg p-4">
                <div class="flex items-center gap-3 mb-4">
                  <FileText class="w-5 h-5 text-gray-500" />
                  <div>
                    <p class="font-medium">{{ uploadedDocument.name }}</p>
                    <p class="text-sm text-gray-600">{{ uploadedDocument.type }}</p>
                  </div>
                </div>
                
                <!-- Image Preview with QR Selection -->
                <div v-if="uploadedDocument.type.startsWith('image/') && documentPreviewUrl" class="mt-4">
                  <div class="relative inline-block">
                    <img 
                      ref="imageElement"
                      :src="documentPreviewUrl" 
                      :alt="uploadedDocument.name"
                      class="max-w-full max-h-96 rounded border object-contain cursor-crosshair"
                      @mousedown="handleMouseDown"
                      draggable="false"
                    />
                    
                    <!-- Selection Box -->
                    <div 
                      v-if="selectionBox"
                      class="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20 pointer-events-none"
                      :style="{
                        left: selectionBox.x + 'px',
                        top: selectionBox.y + 'px',
                        width: selectionBox.width + 'px',
                        height: selectionBox.height + 'px'
                      }"
                    />
                    
                    <!-- Instructions Overlay -->
                    <div 
                      v-if="!decodedData?.isValid && !isScanning"
                      class="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center pointer-events-none rounded"
                    >
                      <div class="text-white text-center bg-black bg-opacity-50 p-4 rounded">
                        <p class="text-sm font-medium">Click and drag to select QR code area</p>
                        <p class="text-xs mt-1">Or wait for automatic scanning to complete</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- PDF Preview -->
                <div v-else-if="uploadedDocument.type === 'application/pdf' && documentPreviewUrl" class="mt-4">
                  <iframe 
                    :src="documentPreviewUrl" 
                    class="w-full h-96 rounded border"
                    title="PDF preview"
                  />
                </div>
              </div>
            </div>
            
            <!-- QR Scanning Status -->
            <div v-if="isScanning" class="mb-6">
              <div class="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <div class="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500" />
                <span class="text-blue-800">{{ qrScanResult || 'Scanning for QR code...' }}</span>
              </div>
            </div>
            
            <!-- QR Scan Result -->
            <div v-else-if="qrScanResult" class="mb-6">
              <div 
                class="p-4 rounded-lg"
                :class="{
                  'bg-green-50 border border-green-200': qrScanResult.includes('successfully'),
                  'bg-red-50 border border-red-200': !qrScanResult.includes('successfully')
                }"
              >
                <div class="flex items-start gap-3">
                  <component 
                    :is="qrScanResult.includes('successfully') ? CheckCircle : XCircle"
                    class="w-5 h-5 mt-0.5"
                    :class="qrScanResult.includes('successfully') ? 'text-green-600' : 'text-red-600'"
                  />
                  <div class="flex-1">
                    <p 
                      class="text-sm font-medium"
                      :class="qrScanResult.includes('successfully') ? 'text-green-800' : 'text-red-800'"
                    >
                      {{ qrScanResult.includes('successfully') ? 'QR Code Found' : 'QR Scan Failed' }}
                    </p>
                    <p 
                      class="text-sm mt-1"
                      :class="qrScanResult.includes('successfully') ? 'text-green-700' : 'text-red-700'"
                    >
                      {{ qrScanResult }}
                    </p>
                    
                    <!-- Manual selection hint -->
                    <div v-if="!qrScanResult.includes('successfully') && uploadedDocument.type.startsWith('image/')" class="mt-2">
                      <p class="text-xs text-red-600">
                        💡 Try clicking and dragging on the image above to manually select the QR code area.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="flex gap-3 mb-6">
              <!-- Verify Document -->
              <BaseButton 
                v-if="decodedData?.isValid && !verificationResult && !isVerifying"
                variant="primary"
                @click="verifyDocument"
              >
                <Shield class="w-4 h-4 mr-2" />
                Verify Document Integrity
              </BaseButton>
              
              <!-- Upload Different Document -->
              <BaseButton 
                variant="outline"
                @click="resetVerification"
              >
                <Upload class="w-4 h-4 mr-2" />
                Upload Different Document
              </BaseButton>
            </div>
            
            <!-- Verification Results -->
            <div v-if="verificationResult" class="space-y-6">
              <!-- Result Summary -->
              <div 
                class="flex items-center gap-4 p-4 rounded-lg"
                :class="{
                  'bg-green-50 border border-green-200': verificationResult.isValid,
                  'bg-red-50 border border-red-200': !verificationResult.isValid && verificationResult.status !== 'error',
                  'bg-yellow-50 border border-yellow-200': verificationResult.status === 'error'
                }"
              >
                <component 
                  :is="verificationIcon" 
                  class="w-8 h-8"
                  :class="verificationColor"
                />
                <div>
                  <h3 class="font-medium" :class="verificationColor">
                    {{ verificationResult.isValid ? 'Document Verified' : 'Verification Failed' }}
                  </h3>
                  <p class="text-sm" :class="verificationColor.replace('600', '700')">
                    {{ verificationResult.message }}
                  </p>
                </div>
              </div>
              
              <!-- Detailed Results -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-gray-50 p-4 rounded-lg">
                  <h4 class="font-medium mb-2">Cryptographic Hash</h4>
                  <div class="flex items-center gap-2">
                    <component 
                      :is="verificationResult.details.cryptographicMatch ? CheckCircle : XCircle"
                      class="w-5 h-5"
                      :class="verificationResult.details.cryptographicMatch ? 'text-green-600' : 'text-red-600'"
                    />
                    <span class="text-sm">
                      {{ verificationResult.details.cryptographicMatch ? 'Exact match' : 'No match' }}
                    </span>
                  </div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                  <h4 class="font-medium mb-2">Perceptual Hash</h4>
                  <div class="flex items-center gap-2">
                    <component 
                      :is="verificationResult.details.perceptualMatch ? CheckCircle : XCircle"
                      class="w-5 h-5"
                      :class="verificationResult.details.perceptualMatch ? 'text-green-600' : 'text-red-600'"
                    />
                    <span class="text-sm">
                      {{ verificationResult.details.perceptualMatch ? 'Visual match' : 'No match' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Verifying State -->
            <div v-else-if="isVerifying" class="flex justify-center items-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500" />
              <span class="ml-3">{{ t('verification.scanning') }}</span>
            </div>
          </div>
        </div>
        
        <!-- Sidebar -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-xl shadow-sm p-6">
            <h3 class="text-lg font-bold mb-4">
              How Verification Works
            </h3>
            
            <div class="space-y-4">
              <div class="flex items-start gap-3">
                <div class="numbered-circle">1</div>
                <div>
                  <h4 class="font-medium mb-1">Upload Document</h4>
                  <p class="text-sm text-gray-600">
                    Upload the sealed document. We'll automatically scan for QR codes.
                  </p>
                </div>
              </div>
              
              <div class="flex items-start gap-3">
                <div class="numbered-circle">2</div>
                <div>
                  <h4 class="font-medium mb-1">QR Code Detection</h4>
                  <p class="text-sm text-gray-600">
                    If automatic detection fails, click and drag on the image to manually select the QR code area.
                  </p>
                </div>
              </div>
              
              <div class="flex items-start gap-3">
                <div class="numbered-circle">3</div>
                <div>
                  <h4 class="font-medium mb-1">Hash Comparison</h4>
                  <p class="text-sm text-gray-600">
                    We calculate the document's fingerprint (excluding the QR area) and compare it with the sealed version.
                  </p>
                </div>
              </div>
              
              <div class="flex items-start gap-3">
                <div class="numbered-circle">4</div>
                <div>
                  <h4 class="font-medium mb-1">Result</h4>
                  <p class="text-sm text-gray-600">
                    Get confirmation whether the document matches the original sealed version.
                  </p>
                </div>
              </div>
            </div>
            
            <div class="mt-6 p-4 bg-blue-50 rounded-lg">
              <p class="text-sm text-blue-700">
                <strong>Privacy:</strong> Document verification happens entirely in your browser. 
                Your files are never uploaded to our servers.
              </p>
            </div>
            
            <!-- Manual Selection Info -->
            <div class="mt-4 p-4 bg-amber-50 rounded-lg">
              <div class="flex items-start gap-2">
                <QrCode class="w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <p class="text-sm text-amber-800">
                    <strong>Manual Selection:</strong> Click and drag on the image to select the QR code area if automatic detection fails.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>