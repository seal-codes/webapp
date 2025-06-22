import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DecodedVerificationData, VerificationResult } from '@/services/verification-service'
import { verificationService } from '@/services/verification-service'

// Verification states for better state management
export type ScanState = 'idle' | 'scanning' | 'success' | 'failed' | 'error'
export type VerificationState = 'idle' | 'verifying' | 'success' | 'failed' | 'error'

export const useVerificationStore = defineStore('verification', () => {
  // State
  const uploadedDocument = ref<File | null>(null)
  const documentPreviewUrl = ref<string | null>(null)
  const decodedData = ref<DecodedVerificationData | null>(null)
  const verificationResult = ref<VerificationResult | null>(null)
  const scanState = ref<ScanState>('idle')
  const verificationState = ref<VerificationState>('idle')
  const scanDebugInfo = ref<{
    processingSteps: string[]
    scannedRegions: number
    totalRegions: number
  } | null>(null)
  const hasEncodedData = ref(false)
  const scanError = ref<string | null>(null)
  const verificationError = ref<string | null>(null)

  // Computed
  const hasValidData = computed(() => decodedData.value?.isValid === true)
  const isScanning = computed(() => scanState.value === 'scanning')
  const isVerifying = computed(() => verificationState.value === 'verifying')
  const scanFailed = computed(() => scanState.value === 'failed' || scanState.value === 'error')
  const canManuallySelect = computed(() => 
    !!uploadedDocument.value?.type.startsWith('image/') && 
    !hasValidData.value && 
    !isScanning.value,
  )

  // Actions
  const reset = () => {
    uploadedDocument.value = null
    if (documentPreviewUrl.value) {
      URL.revokeObjectURL(documentPreviewUrl.value)
    }
    documentPreviewUrl.value = null
    decodedData.value = null
    verificationResult.value = null
    scanState.value = 'idle'
    verificationState.value = 'idle'
    scanDebugInfo.value = null
    hasEncodedData.value = false
    scanError.value = null
    verificationError.value = null
  }

  const resetVerification = () => {
    decodedData.value = null
    verificationResult.value = null
    scanState.value = 'idle'
    verificationState.value = 'idle'
    scanDebugInfo.value = null
    scanError.value = null
    verificationError.value = null
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
    
    // If we don't have attestation data yet, try to scan the document for QR code
    if (!hasValidData.value) {
      if (file.type.startsWith('image/')) {
        console.log('No attestation data yet, scanning image for QR code...')
        await scanImageForQR(file)
      } else if (file.type === 'application/pdf') {
        console.log('No attestation data yet, scanning PDF for QR code...')
        await scanPDFForQR(file)
      }
    }
    
    // If we have attestation data, proceed with verification
    if (hasValidData.value) {
      console.log('Have attestation data, proceeding with verification...')
      await verifyDocument()
    }
  }

  const scanImageForQR = async (imageFile: File) => {
    console.log('Starting QR scan for:', imageFile.name)
    scanState.value = 'scanning'
    scanError.value = null
    scanDebugInfo.value = null
    
    try {
      // When scanning for QR codes, we scan the ENTIRE image to find the QR code
      // No exclusion zones - we want to FIND the QR code, not avoid it!
      console.log('Scanning entire image for QR codes...')
      
      const scanResult = await verificationService.scanImageForQR(imageFile)
      console.log('Scan result:', scanResult)
      
      if (scanResult.found && scanResult.attestationData) {
        decodedData.value = {
          attestationData: scanResult.attestationData,
          isValid: true,
        }
        scanState.value = 'success'
        console.log('QR code successfully decoded, attestation data available')
        console.log('Decoded attestation data from QR:', scanResult.attestationData)
        
        // Store debug info
        scanDebugInfo.value = scanResult.debugInfo || null
      } else {
        console.log('No QR code found in automatic scan')
        scanState.value = 'failed'
      }
    } catch (error) {
      console.error('QR scan error:', error)
      scanState.value = 'error'
      scanError.value = error instanceof Error ? error.message : 'Unknown error'
    }
  }

  const scanPDFForQR = async (pdfFile: File) => {
    console.log('Starting QR scan for PDF:', pdfFile.name)
    scanState.value = 'scanning'
    scanError.value = null
    scanDebugInfo.value = null
    
    try {
      // Scan PDF for embedded QR codes
      console.log('Scanning PDF for embedded QR codes...')
      
      const scanResult = await verificationService.scanPDFForQR(pdfFile)
      console.log('PDF scan result:', scanResult)
      
      if (scanResult.found && scanResult.attestationData) {
        decodedData.value = {
          attestationData: scanResult.attestationData,
          isValid: true,
        }
        scanState.value = 'success'
        console.log('QR code successfully decoded from PDF, attestation data available')
        console.log('Decoded attestation data from PDF QR:', scanResult.attestationData)
        
        // Store debug info
        scanDebugInfo.value = scanResult.debugInfo || null
      } else {
        console.log('No QR code found in PDF automatic scan')
        scanState.value = 'failed'
      }
    } catch (error) {
      console.error('PDF QR scan error:', error)
      scanState.value = 'error'
      scanError.value = error instanceof Error ? error.message : 'Unknown error'
    }
  }

  const scanSelectedArea = async (selection: { x: number; y: number; width: number; height: number }) => {
    if (!uploadedDocument.value) {
      return
    }
    
    scanState.value = 'scanning'
    scanError.value = null
    
    try {
      // When manually selecting an area, use it as a focus zone (crop to selected area)
      // This improves scanning performance and accuracy by focusing on the selected region
      const result = await verificationService.scanImageForQR(uploadedDocument.value, selection)
      console.log('Manual scan result:', result)
      
      if (result.found && result.attestationData) {
        decodedData.value = {
          attestationData: result.attestationData,
          isValid: true,
        }
        scanState.value = 'success'
        
        // Store debug info
        scanDebugInfo.value = result.debugInfo || null
        
        // Proceed with verification
        await verifyDocument()
      } else {
        scanState.value = 'failed'
      }
    } catch (error) {
      console.error('Error scanning selected area:', error)
      scanState.value = 'error'
      scanError.value = error instanceof Error ? error.message : 'Unknown error'
    }
  }

  const verifyDocument = async () => {
    if (!uploadedDocument.value || !decodedData.value?.attestationData) {
      return
    }
    
    verificationState.value = 'verifying'
    verificationError.value = null
    
    try {
      const result = await verificationService.verifyDocument(
        uploadedDocument.value,
        decodedData.value.attestationData,
      )
      verificationResult.value = result
      verificationState.value = result.isValid ? 'success' : 'failed'
    } catch (error) {
      console.error('Verification error:', error)
      verificationState.value = 'error'
      verificationError.value = error instanceof Error ? error.message : 'Unknown error'
      // Note: We don't create a fake VerificationResult here anymore
      // The components will handle the error state appropriately
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
    scanState,
    verificationState,
    scanDebugInfo,
    hasEncodedData,
    scanError,
    verificationError,

    // Computed
    hasValidData,
    isScanning,
    isVerifying,
    scanFailed,
    canManuallySelect,

    // Actions
    reset,
    resetVerification,
    setUploadedDocument,
    scanImageForQR,
    scanPDFForQR,
    scanSelectedArea,
    verifyDocument,
    setEncodedData,
  }
})
