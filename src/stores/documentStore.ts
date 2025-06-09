import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { PDFDocument } from 'pdf-lib'
import { qrCodeUICalculator } from '@/services/qrcode-ui-calculator'
import { attestationBuilder } from '@/services/attestation-builder'
import { qrSealRenderer } from '@/services/qr-seal-renderer'
import { documentHashService } from '@/services/document-hash-service'
import type { QRCodeUIPosition, AttestationData } from '@/types/qrcode'

// Unique ID generation for documents
const generateUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

export const useDocumentStore = defineStore('document', () => {
  // State
  const uploadedDocument = ref<File | null>(null)
  const documentType = ref<'pdf' | 'image' | null>(null)
  const documentId = ref<string>('')
  const documentPreviewUrl = ref<string>('')
  const sealedDocumentUrl = ref<string>('')
  const sealedDocumentBlob = ref<Blob | null>(null)
  const isAuthenticated = ref(false)
  const authProvider = ref<string | null>(null)
  const userName = ref<string | null>(null)
  
  // Getters
  const hasDocument = computed(() => uploadedDocument.value !== null)
  const fileName = computed(() => uploadedDocument.value?.name || '')
  const currentAttestationData = computed((): AttestationData | undefined => {
    if (!isAuthenticated.value || !authProvider.value || !userName.value) {
      return undefined
    }
    
    try {
      return buildAttestationData()
    } catch (error) {
      console.warn('Could not build attestation data:', error)
      return undefined
    }
  })
  
  // Actions
  const setDocument = async (file: File) => {
    console.log('📄 Setting document in store:', file.name, file.type)
    
    uploadedDocument.value = file
    
    // Determine document type
    if (file.type === 'application/pdf') {
      documentType.value = 'pdf'
    } else if (file.type.startsWith('image/')) {
      documentType.value = 'image'
    } else {
      throw new Error('Unsupported file type')
    }
    
    // Create a preview URL
    documentPreviewUrl.value = URL.createObjectURL(file)
    
    console.log('✅ Document set successfully:', {
      name: file.name,
      type: documentType.value,
      size: file.size,
      previewUrl: documentPreviewUrl.value
    })
  }
  
  const authenticateWith = async (provider: string) => {
    console.log('🔐 Authenticating with provider:', provider)
    
    // Simulate authentication with a 1 second delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    isAuthenticated.value = true
    authProvider.value = provider
    userName.value = `User (${provider})`
    
    // Generate a unique document ID
    documentId.value = generateUniqueId()
    
    console.log('✅ Authentication successful:', {
      provider: authProvider.value,
      userName: userName.value,
      documentId: documentId.value
    })
  }
  
  const sealDocument = async (position: QRCodeUIPosition, sizePercent: number = 20) => {
    if (!uploadedDocument.value || !isAuthenticated.value) {
      throw new Error('Document or authentication missing')
    }

    console.log('🔒 Starting document sealing process...')

    try {
      // Get document dimensions for pixel calculation
      const documentDimensions = await getDocumentDimensions()
      console.log('📐 Document dimensions:', documentDimensions)
      
      // Calculate exact pixel positioning using our UI calculator
      const pixelCalculation = qrCodeUICalculator.calculateEmbeddingPixels(
        position,
        sizePercent,
        documentDimensions,
        documentType.value as 'pdf' | 'image',
      )
      console.log('📍 Pixel calculation result:', pixelCalculation)

      // Calculate document hashes with exclusion zone
      const documentHashes = await documentHashService.calculateDocumentHashes(
        uploadedDocument.value,
        pixelCalculation.exclusionZone
      )
      console.log('🔢 Document hashes calculated:', documentHashes)

      // Build compact attestation data with exclusion zone
      const attestationData = attestationBuilder.buildCompactAttestation({
        documentHashes,
        identity: {
          provider: authProvider.value!,
          identifier: userName.value!,
        },
        serviceInfo: {
          publicKeyId: 'placeholder-key-id',
        },
        exclusionZone: pixelCalculation.exclusionZone,
      })
      console.log('📋 Attestation data built:', attestationData)

      // Generate complete QR seal (including borders, identity, etc.)
      // Pass the base URL for verification links
      const sealResult = await qrSealRenderer.generateSeal({
        attestationData,
        qrSizeInPixels: pixelCalculation.sizeInPixels,
        providerId: authProvider.value!,
        userIdentifier: userName.value!,
        baseUrl: window.location.origin
      })
      console.log('🎨 QR seal generated:', sealResult.dimensions)

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

      console.log('✅ Document sealing completed successfully')
      return documentId.value
    } catch (error) {
      console.error('❌ Error sealing document:', error)
      throw new Error('Failed to seal document')
    }
  }
  
  // Helper function to get document dimensions
  const getDocumentDimensions = async (): Promise<{ width: number; height: number }> => {
    if (!uploadedDocument.value) {
      throw new Error('No document available')
    }

    if (documentType.value === 'image') {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
        img.onerror = () => reject(new Error('Failed to load image dimensions'))
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

    throw new Error('Unsupported document type')
  }

  // Helper function to build attestation data
  const buildAttestationData = (): AttestationData => {
    if (!authProvider.value || !userName.value) {
      throw new Error('Authentication data missing')
    }

    // TODO: Use actual document hashes and exclusion zone
    // For now, using placeholder values
    const placeholderExclusionZone = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      fillColor: '#FFFFFF'
    }

    return attestationBuilder.buildCompactAttestation({
      documentHashes: {
        cryptographic: 'placeholder-crypto-hash',
        pHash: 'placeholder-phash',
        dHash: 'placeholder-dhash',
      },
      identity: {
        provider: authProvider.value,
        identifier: userName.value,
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
    
    return new Promise<void>((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
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
          
          // Convert canvas to blob
          canvas.toBlob((blob) => {
            if (blob) {
              sealedDocumentBlob.value = blob
              sealedDocumentUrl.value = URL.createObjectURL(blob)
              console.log('✅ Image sealing completed')
              resolve()
            } else {
              reject(new Error('Failed to create image blob'))
            }
          }, uploadedDocument.value?.type)
        }
        
        sealImg.onerror = () => reject(new Error('Failed to load seal image'))
        sealImg.src = sealDataUrl
      }
      
      img.onerror = () => reject(new Error('Failed to load original image'))
      img.src = documentPreviewUrl.value
    })
  }
  
  const downloadSealedDocument = () => {
    if (!sealedDocumentUrl.value || !uploadedDocument.value) {
      return
    }
    
    const a = document.createElement('a')
    a.href = sealedDocumentUrl.value
    
    // Get original filename and add a suffix
    const originalName = uploadedDocument.value.name
    const dotIndex = originalName.lastIndexOf('.')
    
    let downloadName
    if (dotIndex !== -1) {
      // Add 'sealed' before the extension
      downloadName = `${originalName.substring(0, dotIndex)}-sealed${originalName.substring(dotIndex)}`
    } else {
      downloadName = `${originalName}-sealed`
    }
    
    a.download = downloadName
    a.click()
  }
  
  const reset = () => {
    console.log('🔄 Resetting document store...')
    
    // Clean up object URLs to prevent memory leaks
    if (documentPreviewUrl.value) {
      URL.revokeObjectURL(documentPreviewUrl.value)
    }
    if (sealedDocumentUrl.value) {
      URL.revokeObjectURL(sealedDocumentUrl.value)
    }
    
    // Reset state
    uploadedDocument.value = null
    documentType.value = null
    documentId.value = ''
    documentPreviewUrl.value = ''
    sealedDocumentUrl.value = ''
    sealedDocumentBlob.value = null
    isAuthenticated.value = false
    authProvider.value = null
    userName.value = null
    
    console.log('✅ Document store reset completed')
  }
  
  return { 
    // State
    uploadedDocument, 
    documentType,
    documentId,
    documentPreviewUrl,
    sealedDocumentUrl,
    isAuthenticated,
    authProvider,
    userName,
    
    // Getters
    hasDocument,
    fileName,
    currentAttestationData,
    
    // Actions
    setDocument,
    authenticateWith,
    sealDocument,
    downloadSealedDocument,
    reset,
  }
})