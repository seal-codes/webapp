import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { PDFDocument } from 'pdf-lib'
import { qrCodeUICalculator } from '@/services/qrcode-ui-calculator'
import { attestationBuilder } from '@/services/attestation-builder'
import { qrSealRenderer } from '@/services/qr-seal-renderer'
import { documentHashService } from '@/services/document-hash-service'
import { formatConversionService, type FormatConversionResult } from '@/services/format-conversion-service'
import { signingService } from '@/services/signing-service'
import { CodedError } from '@/types/errors'
import type { QRCodeUIPosition, AttestationData } from '@/types/qrcode'
import { useAuthStore } from './authStore'

// Interface for serialized file data
interface SerializedFile {
  name: string
  type: string
  lastModified: number
  data: string
}

// Unique ID generation for documents
const generateUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

// Helper function to convert File to serializable format
const serializeFile = async (file: File): Promise<SerializedFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const result = reader.result as string
        
        // Validate that we got a data URL
        if (!result || !result.startsWith('data:')) {
          throw new Error('Invalid data URL from FileReader')
        }
        
        // Split the data URL to get just the base64 part
        const parts = result.split(',')
        if (parts.length !== 2) {
          throw new Error('Invalid data URL format')
        }
        
        const base64Data = parts[1]
        
        // Validate base64 data
        if (!base64Data || base64Data.length === 0) {
          throw new Error('Empty base64 data')
        }
        
        resolve({
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
          data: base64Data,
          timestamp: Date.now(),
        })
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('FileReader error'))
    reader.readAsDataURL(file)
  })
}

// Helper function to deserialize File from localStorage
const deserializeFile = (serializedFile: unknown): File => {
  try {
    // Validate serialized file structure
    if (!serializedFile || typeof serializedFile !== 'object') {
      throw new Error('Invalid serialized file structure')
    }
    
    const { name, type, lastModified, data } = serializedFile
    
    if (!name || !type || !data) {
      throw new Error('Missing required file properties')
    }
    
    // Validate base64 data before attempting to decode
    if (typeof data !== 'string' || data.length === 0) {
      throw new Error('Invalid base64 data')
    }
    
    // Test if the base64 string is valid by attempting to decode a small part
    try {
      atob(data.substring(0, Math.min(100, data.length)))
    } catch {
      throw new Error('Invalid base64 encoding')
    }
    
    // Convert base64 back to binary data
    const binaryString = atob(data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    return new File([bytes], name, {
      type,
      lastModified: lastModified || Date.now(),
    })
  } catch (error) {
    console.error('Error deserializing file:', error)
    throw new Error(`Failed to deserialize file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Document processing steps
type DocumentStep = 
  | 'idle'                    // No document loaded
  | 'document-loaded'         // Document loaded, ready for auth
  | 'authenticating'          // User is being redirected to OAuth
  | 'auth-completed'          // Auth completed, ready to seal
  | 'sealing'                 // Document is being sealed
  | 'sealed'                  // Document has been sealed
  | 'error'                   // An error occurred

export const useDocumentStore = defineStore('document', () => {
  // Get auth store for authentication state
  const authStore = useAuthStore()
  
  // Step state management (persistent)
  const currentStep = ref<DocumentStep>('idle')
  const stepError = ref<string | null>(null)
  
  // Persistent state using manual localStorage management
  const persistedDocumentData = ref<SerializedFile | null>(null)
  const persistedQRPosition = ref<QRCodeUIPosition>({ x: 85, y: 15 })
  const persistedQRSize = ref<number>(20)
  const persistedOAuthState = ref<Record<string, unknown> | null>(null)
  const persistedStep = ref<DocumentStep>('idle')
  
  // Sync step with localStorage
  watch(currentStep, (newStep) => {
    persistedStep.value = newStep
    try {
      localStorage.setItem('seal-codes-step', JSON.stringify(newStep))
      console.log('📊 Step updated:', newStep)
    } catch (error) {
      console.error('Failed to save step to localStorage:', error)
    }
  })
  
  watch(persistedStep, (newStep) => {
    try {
      localStorage.setItem('seal-codes-step', JSON.stringify(newStep))
    } catch (error) {
      console.error('Failed to save persisted step to localStorage:', error)
    }
  })
  
  // Load initial values from localStorage
  const loadFromLocalStorage = () => {
    cleanupCorruptedData()
    loadDocumentData()
    loadQRPosition()
    loadQRSize()
    loadOAuthState()
    loadCurrentStep()
  }

  /**
   * Clean up any corrupted localStorage data
   */
  const cleanupCorruptedData = () => {
    const docData = localStorage.getItem('seal-codes-document')
    if (docData === '[object Object]') {
      console.log('🧹 Cleaning up corrupted document data')
      localStorage.removeItem('seal-codes-document')
    }
    
    const oauthData = localStorage.getItem('seal-codes-oauth-state')
    if (oauthData === '[object Object]') {
      console.log('🧹 Cleaning up corrupted OAuth state data')
      localStorage.removeItem('seal-codes-oauth-state')
    }
  }

  /**
   * Load document data from localStorage
   */
  const loadDocumentData = () => {
    try {
      const cleanDocData = localStorage.getItem('seal-codes-document')
      if (cleanDocData && cleanDocData !== 'null') {
        persistedDocumentData.value = JSON.parse(cleanDocData)
        console.log('📥 Loaded document data from localStorage')
      }
    } catch (error) {
      console.warn('Failed to load document data from localStorage:', error)
      localStorage.removeItem('seal-codes-document')
    }
  }

  /**
   * Load QR position from localStorage
   */
  const loadQRPosition = () => {
    try {
      const qrPos = localStorage.getItem('seal-codes-qr-position')
      if (qrPos && qrPos !== 'null') {
        persistedQRPosition.value = JSON.parse(qrPos)
      }
    } catch (error) {
      console.warn('Failed to load QR position from localStorage:', error)
    }
  }

  /**
   * Load QR size from localStorage
   */
  const loadQRSize = () => {
    try {
      const qrSize = localStorage.getItem('seal-codes-qr-size')
      if (qrSize && qrSize !== 'null') {
        persistedQRSize.value = JSON.parse(qrSize)
      }
    } catch (error) {
      console.warn('Failed to load QR size from localStorage:', error)
    }
  }

  /**
   * Load OAuth state from localStorage
   */
  const loadOAuthState = () => {
    try {
      const cleanOAuthData = localStorage.getItem('seal-codes-oauth-state')
      if (cleanOAuthData && cleanOAuthData !== 'null') {
        persistedOAuthState.value = JSON.parse(cleanOAuthData)
        console.log('📥 Loaded OAuth state from localStorage')
      }
    } catch (error) {
      console.warn('Failed to load OAuth state from localStorage:', error)
      localStorage.removeItem('seal-codes-oauth-state')
    }
  }

  /**
   * Load current step from localStorage
   */
  const loadCurrentStep = () => {
    try {
      const step = localStorage.getItem('seal-codes-step')
      if (step && step !== 'null') {
        currentStep.value = JSON.parse(step)
        console.log('📥 Loaded step from localStorage:', currentStep.value)
      }
    } catch (error) {
      console.warn('Failed to load step from localStorage:', error)
    }
  }
  
  // Save to localStorage when values change
  watch(persistedDocumentData, (newValue) => {
    try {
      if (newValue === null) {
        localStorage.removeItem('seal-codes-document')
      } else {
        localStorage.setItem('seal-codes-document', JSON.stringify(newValue))
      }
    } catch (error) {
      console.error('Failed to save document data to localStorage:', error)
    }
  })
  
  watch(persistedQRPosition, (newValue) => {
    try {
      localStorage.setItem('seal-codes-qr-position', JSON.stringify(newValue))
    } catch (error) {
      console.error('Failed to save QR position to localStorage:', error)
    }
  })
  
  watch(persistedQRSize, (newValue) => {
    try {
      localStorage.setItem('seal-codes-qr-size', JSON.stringify(newValue))
    } catch (error) {
      console.error('Failed to save QR size to localStorage:', error)
    }
  })
  
  watch(persistedOAuthState, (newValue) => {
    try {
      if (newValue === null) {
        localStorage.removeItem('seal-codes-oauth-state')
      } else {
        localStorage.setItem('seal-codes-oauth-state', JSON.stringify(newValue))
      }
    } catch (error) {
      console.error('Failed to save OAuth state to localStorage:', error)
    }
  })
  
  // Reactive state
  const uploadedDocument = ref<File | null>(null)
  const documentType = ref<'pdf' | 'image' | null>(null)
  const documentId = ref<string>('')
  const documentPreviewUrl = ref<string>('')
  const sealedDocumentUrl = ref<string>('')
  const sealedDocumentBlob = ref<Blob | null>(null)
  
  // QR positioning state (synced with localStorage)
  const qrPosition = computed({
    get: () => persistedQRPosition.value,
    set: (value: QRCodeUIPosition) => {
      persistedQRPosition.value = value
      console.log('📍 QR position updated:', value)
    },
  })
  
  const qrSizePercent = computed({
    get: () => persistedQRSize.value,
    set: (value: number) => {
      persistedQRSize.value = value
      console.log('📏 QR size updated:', value)
    },
  })
  
  // Processing state
  const needsDocumentReupload = ref(false)
  
  // Format conversion state
  const formatConversionResult = ref<FormatConversionResult | null>(null)
  const showFormatConversionNotification = ref(false)
  
  // Getters
  const hasDocument = computed(() => uploadedDocument.value !== null)
  const fileName = computed(() => uploadedDocument.value?.name || '')
  
  const currentAttestationData = computed((): AttestationData | undefined => {
    if (!authStore.isAuthenticated || !authStore.authProvider || !authStore.userEmail) {
      return undefined
    }
    
    try {
      return buildAttestationData()
    } catch (error) {
      console.warn('Could not build attestation data:', error)
      return undefined
    }
  })
  
  // Watch for document changes and persist to localStorage
  watch(uploadedDocument, async (newDoc, oldDoc) => {
    console.log('👀 Document watcher triggered:', {
      newDoc: newDoc ? `${newDoc.name} (${newDoc.size} bytes)` : 'null',
      oldDoc: oldDoc ? `${oldDoc.name} (${oldDoc.size} bytes)` : 'null',
    })
    
    if (newDoc) {
      try {
        console.log('💾 Watcher: Persisting document to localStorage...', newDoc.name, newDoc.size)
        
        // Check file size before serialization (localStorage has ~5-10MB limit)
        const maxStorageSize = 5 * 1024 * 1024 // 5MB limit for localStorage
        if (newDoc.size > maxStorageSize) {
          console.warn('⚠️ Watcher: Document too large for localStorage, skipping persistence')
          return
        }
        
        const serialized = await serializeFile(newDoc)
        persistedDocumentData.value = serialized
        console.log('✅ Watcher: Document persisted successfully')
        
        // Verify it was actually stored
        const stored = localStorage.getItem('seal-codes-document')
        console.log('🔍 Watcher verification - localStorage contains document data:', !!stored)
      } catch (error) {
        console.error('❌ Watcher: Failed to persist document:', error)
        // Don't throw error, just log it - persistence is optional
      }
    } else {
      console.log('🗑️ Watcher: Clearing persisted document data')
      persistedDocumentData.value = null
    }
  }, { immediate: false })
  
  // Restore document from localStorage on store initialization
  const restoreDocumentFromStorage = async () => {
    if (persistedDocumentData.value && !uploadedDocument.value) {
      try {
        console.log('📥 Restoring document from localStorage...')
        
        // Check if data is not too old (24 hours max)
        const maxAge = 24 * 60 * 60 * 1000 // 24 hours
        const age = Date.now() - (persistedDocumentData.value.timestamp || 0)
        
        if (age > maxAge) {
          console.log('📅 Stored document data is too old, removing...')
          persistedDocumentData.value = null
          return
        }
        
        console.log('🔄 Deserializing document from localStorage...')
        const restoredFile = deserializeFile(persistedDocumentData.value)
        
        // Set document without triggering persistence again
        uploadedDocument.value = restoredFile
        
        // Determine document type
        if (restoredFile.type === 'application/pdf') {
          documentType.value = 'pdf'
        } else if (restoredFile.type.startsWith('image/')) {
          documentType.value = 'image'
        }
        
        // Create a new preview URL
        documentPreviewUrl.value = URL.createObjectURL(restoredFile)
        
        console.log('✅ Document restored successfully:', {
          name: restoredFile.name,
          type: documentType.value,
          size: restoredFile.size,
        })
      } catch (error) {
        console.error('❌ Failed to restore document from storage:', error)
        
        // Clear corrupted data
        persistedDocumentData.value = null
        
        // Don't throw error, just log it - restoration is optional
        console.log('🧹 Cleared corrupted document data from localStorage')
      }
    }
  }
  
  // Actions
  const setDocument = async (file: File) => {
    console.log('📄 Setting document in store:', file.name, file.type)
    
    try {
      // Clear any previous errors
      stepError.value = null
      
      // Determine document type
      if (file.type === 'application/pdf') {
        documentType.value = 'pdf'
      } else if (file.type.startsWith('image/')) {
        documentType.value = 'image'
      } else {
        throw new CodedError('unsupported_format', 'Unsupported file type')
      }
      
      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        throw new CodedError('file_too_large', 'File is too large')
      }
      
      // Set the document (this will trigger localStorage persistence via watcher)
      uploadedDocument.value = file
      
      // Create a preview URL
      documentPreviewUrl.value = URL.createObjectURL(file)
      
      // Update step to document-loaded
      currentStep.value = 'document-loaded'
      
      console.log('✅ Document set successfully:', {
        name: file.name,
        type: documentType.value,
        size: file.size,
        step: currentStep.value,
      })
    } catch (error) {
      currentStep.value = 'error'
      stepError.value = error instanceof Error ? error.message : 'Failed to load document'
      
      if (error instanceof CodedError) {
        throw error
      }
      throw new CodedError('document_load_failed', 'Failed to load document')
    }
  }
  
  const updateQRPosition = (position: QRCodeUIPosition) => {
    qrPosition.value = position
  }
  
  const updateQRSize = (size: number) => {
    qrSizePercent.value = size
  }
  
  /**
   * Save OAuth state before authentication
   */
  const saveOAuthState = () => {
    if (hasDocument.value && uploadedDocument.value) {
      const state = {
        shouldSeal: true,
        timestamp: Date.now(),
        documentName: uploadedDocument.value.name,
        documentSize: uploadedDocument.value.size,
        documentType: documentType.value,
      }
      persistedOAuthState.value = state
      console.log('💾 Saved OAuth state:', state)
    }
  }
  
  /**
   * Authenticate with provider and redirect
   */
  const authenticateWith = async (provider: string) => {
    if (!hasDocument.value || !uploadedDocument.value) {
      throw new CodedError('document_required', 'Please load a document first')
    }
    
    if (currentStep.value !== 'document-loaded') {
      throw new CodedError('invalid_step', 'Document must be loaded before authentication')
    }
    
    console.log('🔐 Starting authentication with provider:', provider)
    
    try {
      // Update step to authenticating
      currentStep.value = 'authenticating'
      stepError.value = null
      
      // Save OAuth state before redirect
      saveOAuthState()
      
      // Authenticate with provider (this will redirect)
      await authStore.authenticateWithProvider(provider)
      
    } catch (error) {
      console.error('❌ Authentication failed:', error)
      currentStep.value = 'error'
      stepError.value = error instanceof Error ? error.message : 'Authentication failed'
      
      // Clear OAuth state on error
      persistedOAuthState.value = null
      throw error
    }
  }
  
  /**
   * Handle post-authentication flow
   */
  const handlePostAuthFlow = async (): Promise<string | null> => {
    console.log('🎉 Handling post-authentication flow...', 'Current step:', currentStep.value)
    console.log('🔍 OAuth state:', persistedOAuthState.value)
    
    try {
      // Check if we have saved OAuth state
      const oauthState = persistedOAuthState.value
      
      if (oauthState && oauthState.shouldSeal) {
        console.log('🔒 Post-OAuth document sealing required')
        
        // Restore document if not already loaded
        if (!hasDocument.value) {
          console.log('📄 Restoring document from localStorage...')
          await restoreDocumentFromStorage()
        }
        
        // Check if we have the document
        if (!hasDocument.value) {
          console.log('⚠️ Document lost during OAuth flow - localStorage persistence may have failed')
          currentStep.value = 'error'
          stepError.value = 'Document was lost during authentication. Please re-upload your document.'
          needsDocumentReupload.value = true
          
          // Clear OAuth state
          persistedOAuthState.value = null
          return null
        }
        
        // Verify document matches what we expected (if we have the metadata)
        if (oauthState.documentName && oauthState.documentSize) {
          if (uploadedDocument.value?.name !== oauthState.documentName || 
              uploadedDocument.value?.size !== oauthState.documentSize) {
            console.log('❌ Document mismatch after OAuth flow')
            currentStep.value = 'error'
            stepError.value = 'Document changed during authentication'
            throw new CodedError('document_mismatch', 'Document changed during authentication')
          }
        }
        
        console.log('✅ Document verified, setting step to auth-completed...')
        
        // Clear OAuth state BEFORE setting step to auth-completed
        persistedOAuthState.value = null
        
        // Update step to auth-completed - this should trigger auto-sealing
        currentStep.value = 'auth-completed'
        
        console.log('🎯 Step set to auth-completed, auto-sealing should be triggered by watcher')
        
        // Return null here - the actual sealing will be handled by the step watcher
        return null
      } else {
        console.log('ℹ️ No pending seal operation found')
        // If user is authenticated but no pending operation, set step accordingly
        if (authStore.isAuthenticated && hasDocument.value) {
          currentStep.value = 'document-loaded' // Ready for manual sealing
        }
      }
      
    } catch (error) {
      console.error('❌ Error handling post-auth flow:', error)
      currentStep.value = 'error'
      stepError.value = error instanceof Error ? error.message : 'Post-authentication flow failed'
      persistedOAuthState.value = null
      throw error
    }
    
    return null
  }
  
  const sealDocument = async () => {
    if (!uploadedDocument.value || !authStore.isAuthenticated || !authStore.currentUser) {
      throw new CodedError('document_seal_failed', 'Document or authentication missing')
    }

    console.log('🔒 Starting document sealing process...', 'Current step:', currentStep.value)
    
    // Update step to sealing
    currentStep.value = 'sealing'
    stepError.value = null

    try {
      // Get document dimensions for pixel calculation
      const documentDimensions = await getDocumentDimensions()
      console.log('📐 Document dimensions:', documentDimensions)
      
      // Calculate exact pixel positioning using our UI calculator
      const pixelCalculation = qrCodeUICalculator.calculateEmbeddingPixels(
        qrPosition.value,
        qrSizePercent.value,
        documentDimensions,
        documentType.value as 'pdf' | 'image',
      )
      console.log('📍 Pixel calculation result:', pixelCalculation)

      // Calculate document hashes with exclusion zone
      const documentHashes = await documentHashService.calculateDocumentHashes(
        uploadedDocument.value,
        pixelCalculation.exclusionZone,
      )
      console.log('🔢 Document hashes calculated:', documentHashes)

      // Build attestation package for server signing
      const attestationPackage = attestationBuilder.buildAttestationPackage({
        documentHashes,
        identity: {
          provider: authStore.currentUser.provider,
          identifier: authStore.currentUser.email,
        },
        exclusionZone: pixelCalculation.exclusionZone,
      })
      console.log('📋 Attestation package built for signing:', attestationPackage)

      // Send to server for signing
      const signingResponse = await signingService.signAttestation(attestationPackage)
      console.log('✅ Server signing completed:', signingResponse)

      // Combine client package with server signature to create final attestation data
      const finalAttestationData = attestationBuilder.combineWithServerSignature(
        attestationPackage,
        signingResponse,
      )
      console.log('🔗 Final attestation data created:', finalAttestationData)

      // Generate complete QR seal
      const sealResult = await qrSealRenderer.generateSeal({
        attestationData: finalAttestationData,
        qrSizeInPixels: pixelCalculation.sizeInPixels,
        providerId: authStore.currentUser.provider,
        userIdentifier: authStore.currentUser.displayName,
        baseUrl: window.location.origin,
      })
      console.log('🎨 QR seal generated:', sealResult.dimensions)

      // Generate a unique document ID
      documentId.value = generateUniqueId()

      // Embed the complete seal
      if (documentType.value === 'pdf') {
        await sealPdfDocument(
          sealResult.dataUrl, 
          pixelCalculation.position, 
          sealResult.dimensions.width,
          sealResult.dimensions.height,
        )
      } else if (documentType.value === 'image') {
        await sealImageDocument(
          sealResult.dataUrl, 
          pixelCalculation.position, 
          sealResult.dimensions.width,
          sealResult.dimensions.height,
        )
      }

      // Update step to sealed
      currentStep.value = 'sealed'
      
      console.log('✅ Document sealing completed successfully')
      return documentId.value
    } catch (error) {
      console.error('❌ Error sealing document:', error)
      
      currentStep.value = 'error'
      stepError.value = error instanceof Error ? error.message : 'Failed to seal document'
      
      if (error instanceof CodedError) {
        throw error
      }
      
      throw new CodedError('document_seal_failed', 'Failed to seal document')
    }
  }
  
  // Helper function to get document dimensions
  const getDocumentDimensions = async (): Promise<{ width: number; height: number }> => {
    if (!uploadedDocument.value) {
      throw new CodedError('document_processing_failed', 'No document available')
    }

    if (documentType.value === 'image') {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
        img.onerror = () => reject(new CodedError('document_processing_failed', 'Failed to load image dimensions'))
        img.src = documentPreviewUrl.value
      })
    } else if (documentType.value === 'pdf') {
      // For PDFs, we need to get the page dimensions
      const fileArrayBuffer = await uploadedDocument.value.arrayBuffer()
      const pdfDoc = await PDFDocument.load(fileArrayBuffer)
      const firstPage = pdfDoc.getPages()[0]
      const { width, height } = firstPage.getSize()
      return { width, height }
    }

    throw new CodedError('unsupported_format', 'Unsupported document type')
  }

  // Helper function to build attestation data
  const buildAttestationData = (): AttestationData => {
    if (!authStore.authProvider || !authStore.userEmail) {
      throw new Error('Authentication data missing')
    }

    // TODO: Use actual document hashes and exclusion zone
    // For now, using placeholder values
    const placeholderExclusionZone = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      fillColor: '#FFFFFF',
    }

    return attestationBuilder.buildCompactAttestation({
      documentHashes: {
        cryptographic: 'placeholder-crypto-hash',
        pHash: 'placeholder-phash',
        dHash: 'placeholder-dhash',
      },
      identity: {
        provider: authStore.authProvider,
        identifier: authStore.userEmail,
      },
      serviceInfo: {
        publicKeyId: 'placeholder-key-id',
      },
      exclusionZone: placeholderExclusionZone,
    })
  }
  
  const sealPdfDocument = async (
    sealDataUrl: string, 
    position: { x: number; y: number }, 
    width: number,
    height: number,
  ) => {
    if (!uploadedDocument.value) {
      return
    }
    
    console.log('📄 Sealing PDF document...')
    
    // Read the PDF file
    const fileArrayBuffer = await uploadedDocument.value.arrayBuffer()
    const pdfDoc = await PDFDocument.load(fileArrayBuffer)
    
    // Convert seal image to PNG for embedding
    const sealImage = await pdfDoc.embedPng(sealDataUrl)
    
    // Add seal to the first page of the PDF
    const pages = pdfDoc.getPages()
    const firstPage = pages[0]
    
    // Use the exact position and dimensions of the complete seal
    firstPage.drawImage(sealImage, {
      x: position.x,
      y: position.y,
      width: width,
      height: height,
    })
    
    // Save the PDF
    const sealedPdfBytes = await pdfDoc.save()
    const sealedPdfBlob = new Blob([sealedPdfBytes], { type: 'application/pdf' })
    
    sealedDocumentBlob.value = sealedPdfBlob
    sealedDocumentUrl.value = URL.createObjectURL(sealedPdfBlob)
    
    console.log('✅ PDF sealing completed')
  }
  
  const sealImageDocument = async (
    sealDataUrl: string, 
    position: { x: number; y: number }, 
    width: number,
    height: number,
  ) => {
    if (!uploadedDocument.value) {
      return
    }
    
    console.log('🖼️ Sealing image document...')
    
    // Step 1: Convert to optimal format if needed
    console.log('🔄 Checking format conversion requirements...')
    const conversionResult = await formatConversionService.convertToOptimalFormat(uploadedDocument.value, false) // Default to WebP
    
    // Store conversion result for UI notification
    formatConversionResult.value = conversionResult
    if (conversionResult.wasConverted) {
      showFormatConversionNotification.value = true
      console.log('✅ Format converted:', {
        from: conversionResult.originalFormat,
        to: conversionResult.finalFormat,
        reason: conversionResult.conversionReason,
      })
    }
    
    // Use the converted file for sealing
    const fileToSeal = conversionResult.file
    
    return new Promise<void>((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new CodedError('document_processing_failed', 'Could not get canvas context'))
        return
      }
      
      img.onload = () => {
        // Set canvas dimensions to match the image
        canvas.width = img.width
        canvas.height = img.height
        
        // Draw the original image
        ctx.drawImage(img, 0, 0)
        
        // Load complete seal image
        const sealImg = new Image()
        sealImg.onload = () => {
          // Use the exact position and dimensions of the complete seal
          ctx.drawImage(sealImg, position.x, position.y, width, height)
          
          // Convert canvas to blob with optimal format
          const outputFormat = conversionResult.finalFormat
          const quality = outputFormat === 'image/webp' ? 1.0 : undefined // Lossless for WebP
          
          canvas.toBlob((blob) => {
            if (blob) {
              sealedDocumentBlob.value = blob
              sealedDocumentUrl.value = URL.createObjectURL(blob)
              console.log('✅ Image sealing completed')
              console.log('📊 Final sealed document:', {
                format: outputFormat,
                size: blob.size,
                dimensions: `${canvas.width}x${canvas.height}`,
              })
              resolve()
            } else {
              reject(new CodedError('document_processing_failed', 'Failed to create image blob'))
            }
          }, outputFormat, quality)
        }
        
        sealImg.onerror = () => reject(new CodedError('document_processing_failed', 'Failed to load seal image'))
        sealImg.src = sealDataUrl
      }
      
      img.onerror = () => reject(new CodedError('document_processing_failed', 'Failed to load original image'))
      img.src = URL.createObjectURL(fileToSeal)
    })
  }
  
  const downloadSealedDocument = () => {
    if (!sealedDocumentUrl.value || !uploadedDocument.value) {
      return
    }
    
    const a = document.createElement('a')
    a.href = sealedDocumentUrl.value
    
    // Get the filename from the conversion result if available, otherwise use original
    let baseFileName: string
    let fileExtension: string
    
    if (formatConversionResult.value?.wasConverted) {
      // Use the converted file's name and extension
      const convertedName = formatConversionResult.value.file.name
      const dotIndex = convertedName.lastIndexOf('.')
      if (dotIndex !== -1) {
        baseFileName = convertedName.substring(0, dotIndex)
        fileExtension = convertedName.substring(dotIndex)
      } else {
        baseFileName = convertedName
        fileExtension = ''
      }
    } else {
      // Use original file name
      const originalName = uploadedDocument.value.name
      const dotIndex = originalName.lastIndexOf('.')
      if (dotIndex !== -1) {
        baseFileName = originalName.substring(0, dotIndex)
        fileExtension = originalName.substring(dotIndex)
      } else {
        baseFileName = originalName
        fileExtension = ''
      }
    }
    
    // Add 'sealed' suffix before extension
    const downloadName = `${baseFileName}-sealed${fileExtension}`
    
    a.download = downloadName
    a.click()
  }
  
  const reset = (preserveSealed = false) => {
    console.log('🔄 Resetting document store...', preserveSealed ? '(preserving sealed document)' : '')
    
    // Keep sealed document data if requested
    let sealedUrl = ''
    let sealedBlob: Blob | null = null
    let docId = ''
    
    if (preserveSealed) {
      sealedUrl = sealedDocumentUrl.value
      sealedBlob = sealedDocumentBlob.value
      docId = documentId.value
    }
    
    // Clean up object URLs to prevent memory leaks
    if (documentPreviewUrl.value) {
      URL.revokeObjectURL(documentPreviewUrl.value)
    }
    if (!preserveSealed && sealedDocumentUrl.value) {
      URL.revokeObjectURL(sealedDocumentUrl.value)
    }
    
    // Reset state (but keep authentication in auth store)
    uploadedDocument.value = null
    documentType.value = null
    documentId.value = ''
    documentPreviewUrl.value = ''
    sealedDocumentUrl.value = ''
    sealedDocumentBlob.value = null
    formatConversionResult.value = null
    showFormatConversionNotification.value = false
    needsDocumentReupload.value = false
    
    // Reset step state
    currentStep.value = 'idle'
    stepError.value = null
    
    // Reset QR positioning to defaults
    persistedQRPosition.value = { x: 85, y: 15 }
    persistedQRSize.value = 20
    
    // Clear persisted data
    persistedDocumentData.value = null
    persistedOAuthState.value = null
    
    // Restore sealed document data if preserving
    if (preserveSealed) {
      sealedDocumentUrl.value = sealedUrl
      sealedDocumentBlob.value = sealedBlob
      documentId.value = docId
      currentStep.value = 'sealed'
    }
    
    console.log('✅ Document store reset completed')
  }
  
  /**
   * Reset the document store after successful sealing
   * This ensures users start fresh when they want to seal another document
   */
  const resetAfterSealing = () => {
    reset(true) // Reset but preserve sealed document data
  }
  
  // Initialize store
  const initialize = async () => {
    console.log('🚀 Initializing document store...')
    
    // Load initial values from localStorage
    loadFromLocalStorage()
    
    // Debug: Check what's currently in localStorage
    console.log('🔍 Current localStorage state:')
    console.log('  - seal-codes-document:', !!localStorage.getItem('seal-codes-document'))
    console.log('  - seal-codes-qr-position:', localStorage.getItem('seal-codes-qr-position'))
    console.log('  - seal-codes-qr-size:', localStorage.getItem('seal-codes-qr-size'))
    console.log('  - seal-codes-oauth-state:', !!localStorage.getItem('seal-codes-oauth-state'))
    console.log('  - seal-codes-step:', localStorage.getItem('seal-codes-step'))
    console.log('🔍 Current step after loading:', currentStep.value)
    console.log('🔍 Has OAuth state:', !!persistedOAuthState.value)
    console.log('🔍 Auth store authenticated:', authStore.isAuthenticated)
    
    try {
      // Try to restore document from localStorage on startup
      await restoreDocumentFromStorage()
      
      // If we have a document and it was restored, update step accordingly
      if (hasDocument.value && currentStep.value === 'idle') {
        currentStep.value = 'document-loaded'
        console.log('📄 Document restored, step updated to document-loaded')
      }
      
      // Check if we're in authenticating state and user is now authenticated
      // This handles the case where user returns from OAuth redirect
      if (currentStep.value === 'authenticating' && authStore.isAuthenticated) {
        console.log('🎉 User is authenticated and we were in authenticating state - triggering post-auth flow')
        await handlePostAuthFlow()
      }
      
    } catch (error) {
      console.error('❌ Error during document store initialization:', error)
      
      // Clear all persisted data if there's an initialization error
      console.log('🧹 Clearing all persisted data due to initialization error')
      persistedDocumentData.value = null
      persistedOAuthState.value = null
      currentStep.value = 'error'
      stepError.value = 'Initialization failed'
    }
    
    console.log('✅ Document store initialized with step:', currentStep.value)
  }
  
  return { 
    // State
    uploadedDocument, 
    documentType,
    documentId,
    documentPreviewUrl,
    sealedDocumentUrl,
    formatConversionResult,
    showFormatConversionNotification,
    qrPosition,
    qrSizePercent,
    needsDocumentReupload,
    
    // Step state
    currentStep,
    stepError,
    
    // Getters
    hasDocument,
    fileName,
    currentAttestationData,
    
    // Actions
    setDocument,
    updateQRPosition,
    updateQRSize,
    authenticateWith,
    handlePostAuthFlow,
    sealDocument,
    downloadSealedDocument,
    acknowledgeFormatConversion: () => {
      showFormatConversionNotification.value = false
    },
    reset,
    resetAfterSealing,
    initialize,
  }
})
