import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DecodedVerificationData, VerificationResult } from '@/services/verification-service'
import { verificationService } from '@/services/verification-service'

export const useVerificationStore = defineStore('verification', () => {
  // State
  const uploadedDocument = ref<File | null>(null)
  const documentPreviewUrl = ref<string | null>(null)
  const decodedData = ref<DecodedVerificationData | null>(null)
  const verificationResult = ref<VerificationResult | null>(null)
  const isScanning = ref(false)
  const isVerifying = ref(false)
  const scanDebugInfo = ref<any>(null)
  const hasEncodedData = ref(false)
  const scanAttempted = ref(false)

  // Computed
  const hasValidData = computed(() => decodedData.value?.isValid === true)
  const scanFailed = computed(() => scanAttempted.value && !hasValidData.value && uploadedDocument.value?.type.startsWith('image/'))

  // Actions
  const reset = () => {
    uploadedDocument.value = null
    if (documentPreviewUrl.value) {
      URL.revokeObjectURL(documentPreviewUrl.value)
    }
    documentPreviewUrl.value = null
    decodedData.value = null
    verificationResult.value = null
    isScanning.value = false
    isVerifying.value = false
    scanDebugInfo.value = null
    hasEncodedData.value = false
    scanAttempted.value = false
  }

  const resetVerification = () => {
    decodedData.value = null
    verificationResult.value = null
    scanDebugInfo.value = null
    scanAttempted.value = false
  }

  const setUploadedDocument = async (file: File) => {
    // Reset previous state
    resetVerification()
    
    // Update document
    uploadedDocument.value = file
    
    // Create preview URL
    if (documentPreviewUrl.value) {
      URL.revokeObjectURL(documentPreviewUrl.value)
    }
    documentPreviewUrl.value = URL.createObjectURL(file)
    
    // If we don't have attestation data yet, try to scan the image for QR code
    if (!hasValidData.value && file.type.startsWith('image/')) {
      console.log('No attestation data yet, scanning image for QR code...')
      await scanImageForQR(file)
    }
    
    // If we have attestation data, proceed with verification
    if (hasValidData.value) {
      console.log('Have attestation data, proceeding with verification...')
      await verifyDocument()
    }
  }

  const scanImageForQR = async (imageFile: File) => {
    console.log('Starting QR scan for:', imageFile.name)
    isScanning.value = true
    scanDebugInfo.value = null
    scanAttempted.value = true
    
    try {
      // First, try to get exclusion zone if we have attestation data
      const exclusionZone = decodedData.value?.attestationData?.e
        ? {
            x: decodedData.value.attestationData.e.x,
            y: decodedData.value.attestationData.e.y,
            width: decodedData.value.attestationData.e.w,
            height: decodedData.value.attestationData.e.h
          }
        : undefined
      console.log('Exclusion zone:', exclusionZone)
      
      const scanResult = await verificationService.scanImageForQR(imageFile, exclusionZone)
      console.log('Scan result:', scanResult)
      
      if (scanResult.found && scanResult.attestationData) {
        decodedData.value = {
          attestationData: scanResult.attestationData,
          isValid: true
        }
        console.log('QR code successfully decoded, attestation data available')
        console.log('Decoded attestation data from QR:', scanResult.attestationData)
        
        // Store debug info
        scanDebugInfo.value = scanResult.debugInfo
      } else {
        console.log('No QR code found in automatic scan')
      }
    } catch (error) {
      console.error('QR scan error:', error)
    } finally {
      isScanning.value = false
    }
  }

  const scanSelectedArea = async (selection: { x: number; y: number; width: number; height: number }) => {
    if (!uploadedDocument.value) return
    
    isScanning.value = true
    scanAttempted.value = true
    
    try {
      const result = await verificationService.scanImageForQR(uploadedDocument.value, selection)
      console.log('Manual scan result:', result)
      
      if (result.found && result.attestationData) {
        decodedData.value = {
          attestationData: result.attestationData,
          isValid: true
        }
        
        // Store debug info
        scanDebugInfo.value = result.debugInfo
        
        // Proceed with verification
        await verifyDocument()
      }
    } catch (error) {
      console.error('Error scanning selected area:', error)
    } finally {
      isScanning.value = false
    }
  }

  const verifyDocument = async () => {
    if (!uploadedDocument.value || !decodedData.value?.attestationData) return
    
    isVerifying.value = true
    
    try {
      const result = await verificationService.verifyDocument(
        uploadedDocument.value,
        decodedData.value.attestationData
      )
      verificationResult.value = result
    } catch (error) {
      console.error('Verification error:', error)
      verificationResult.value = {
        isValid: false,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: {
          cryptographicMatch: false,
          perceptualMatch: false,
          documentType: uploadedDocument.value.type
        }
      }
    } finally {
      isVerifying.value = false
    }
  }

  const setEncodedData = (encodedData: string) => {
    hasEncodedData.value = true
    const result = verificationService.decodeFromQR(encodedData)
    console.log('Decoded attestation data from URL:', result)
    decodedData.value = result
  }

  return {
    // State
    uploadedDocument,
    documentPreviewUrl,
    decodedData,
    verificationResult,
    isScanning,
    isVerifying,
    scanDebugInfo,
    hasEncodedData,
    scanAttempted,

    // Computed
    hasValidData,
    scanFailed,

    // Actions
    reset,
    resetVerification,
    setUploadedDocument,
    scanImageForQR,
    scanSelectedArea,
    verifyDocument,
    setEncodedData
  }
})
