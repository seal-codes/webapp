/**
 * Integration tests for seal.codes workflow
 * Tests the complete seal → verify cycle without WASM dependencies
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { webcrypto } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Canvas, createCanvas, loadImage } from 'canvas'
import { encode, decode } from 'cbor-x'
import { DocumentHashService } from './document-hash-service'
import { AttestationBuilder } from './attestation-builder'

// Setup Node.js environment for browser APIs
beforeAll(() => {
  // Setup crypto
  if (!globalThis.crypto) {
    globalThis.crypto = webcrypto as Crypto
  }
  
  // Setup Canvas API
  if (!globalThis.HTMLCanvasElement) {
    globalThis.HTMLCanvasElement = Canvas as any
  }
  
  // Setup document API
  if (!globalThis.document) {
    globalThis.document = {
      createElement: (tagName: string) => {
        if (tagName === 'canvas') {
          return createCanvas(200, 200) as any
        }
        return {} as any
      },
    } as any
  }
  
  // Setup Image API
  if (!globalThis.Image) {
    globalThis.Image = class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      private _src: string = ''
      width: number = 0
      height: number = 0
      naturalWidth: number = 200
      naturalHeight: number = 200
      
      constructor() {
        // Empty constructor
      }
      
      get src(): string {
        return this._src
      }
      
      set src(value: string) {
        this._src = value
        // Simulate async image loading
        setTimeout(() => {
          if (this.onload) {
            this.width = 200
            this.height = 200
            this.naturalWidth = 200
            this.naturalHeight = 200
            this.onload()
          }
        }, 0)
      }
    } as any
  }
  
  
  // Setup File API
  if (!globalThis.File) {
    globalThis.File = class {
      name: string
      type: string
      size: number
      lastModified: number
      
      constructor(bits: BlobPart[], filename: string, options?: FilePropertyBag) {
        this.name = filename
        this.type = options?.type || ''
        this.size = bits.reduce((acc, bit) => {
          if (typeof bit === 'string') {
            return acc + bit.length
          } else if (bit instanceof ArrayBuffer) {
            return acc + bit.byteLength
          } else if ('byteLength' in bit) {
            return acc + bit.byteLength
          } else {
            return acc + 0
          }
        }, 0)
        this.lastModified = options?.lastModified || Date.now()
      }
      
      async arrayBuffer(): Promise<ArrayBuffer> {
        // Simple mock implementation
        return new ArrayBuffer(this.size)
      }
      
      async text(): Promise<string> {
        return 'mock file content'
      }
    } as any
  }
  
  // Setup URL API
  if (!globalThis.URL) {
    globalThis.URL = {
      createObjectURL: () => {
        // Return a mock data URL
        return 'data:image/png;base64,mock-data-url'
      },
      revokeObjectURL: () => {
        // Mock implementation
      },
    } as any
  }
})

describe('Integration Tests', () => {

  describe('Service Integration', () => {
    it('should be able to instantiate core services', () => {
      const hashService = new DocumentHashService()
      const attestationBuilder = new AttestationBuilder()
      
      expect(hashService).toBeDefined()
      expect(attestationBuilder).toBeDefined()
    })
  })

  describe('Document Hash Calculation', () => {
    it('should calculate hashes for a real image file using actual DocumentHashService logic', async () => {
      console.log('Testing real image hash calculation using DocumentHashService...')
      
      // Load the test image from filesystem
      const imagePath = join(process.cwd(), 'src/test-artifacts/sample-picture.jpeg')
      const imageBuffer = readFileSync(imagePath)
      
      console.log('Loaded image:', imagePath, 'Size:', imageBuffer.length, 'bytes')
      
      // Load image using Node.js canvas library
      const image = await loadImage(imageBuffer)
      console.log('Image loaded with dimensions:', image.width, 'x', image.height)
      
      // Create canvas and draw image (same as DocumentHashService does)
      const canvas = createCanvas(image.width, image.height)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, 0, 0)
      
      // Define exclusion zone for QR code placement
      const exclusionZone = {
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        fillColor: '#FFFFFF',
      }
      
      // Apply exclusion zone (same logic as DocumentHashService.applyExclusionZone)
      ctx.fillStyle = exclusionZone.fillColor
      ctx.fillRect(exclusionZone.x, exclusionZone.y, exclusionZone.width, exclusionZone.height)
      console.log('Applied exclusion zone:', exclusionZone)
      
      // Get image data (same as DocumentHashService does)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      console.log('Image data extracted:', imageData.width, 'x', imageData.height, 'pixels')
      
      // Now use the actual DocumentHashService to calculate hashes from this ImageData
      const hashService = new DocumentHashService()
      
      // Access the private methods through type assertion for testing
      type DocumentHashServiceWithPrivates = DocumentHashService & {
        calculateHashesFromImageData(imageData: ImageData): Promise<{
          cryptographic: string;
          pHash: string;
          dHash: string;
        }>
      }
      
      try {
        // Use the actual service method that the app uses
        const documentHashes = await (hashService as DocumentHashServiceWithPrivates)
          .calculateHashesFromImageData(imageData as ImageData)
        
        console.log('Document hashes calculated using actual service:')
        console.log('- Cryptographic:', documentHashes.cryptographic)
        console.log('- pHash:', documentHashes.pHash.substring(0, 20) + '...')
        console.log('- dHash:', documentHashes.dHash.substring(0, 20) + '...')
        
        // Validate hash formats (same as the app expects)
        expect(documentHashes.cryptographic).toBeDefined()
        expect(documentHashes.cryptographic).toHaveLength(64) // SHA-256 hex
        expect(documentHashes.cryptographic).toMatch(/^[a-f0-9]{64}$/)
        
        expect(documentHashes.pHash).toBeDefined()
        expect(documentHashes.pHash).toHaveLength(256) // 16x16 = 256 bits
        expect(documentHashes.pHash).toMatch(/^[01]{256}$/)
        
        expect(documentHashes.dHash).toBeDefined()
        expect(documentHashes.dHash).toHaveLength(36) // 6x6 = 36 bits
        expect(documentHashes.dHash).toMatch(/^[01]{36}$/)
        
        console.log('Real image hash calculation test using actual service completed successfully!')
        
      } catch (error) {
        console.error('Error calculating hashes using actual service:', error)
        throw error
      }
    }, 15000) // 15 second timeout for image processing
  })

  describe('Complete Roundtrip: Seal and Verify Workflow', () => {
    it('should seal a document and then successfully verify the sealed document', async () => {
      console.log('Starting complete roundtrip test: seal → verify...')
      
      // Step 1: Load original image
      const imagePath = join(process.cwd(), 'src/test-artifacts/sample-picture.jpeg')
      const originalImageBuffer = readFileSync(imagePath)
      const originalImageFile = new File([originalImageBuffer], 'sample-picture.jpeg', { type: 'image/jpeg' })
      
      console.log('Loaded original image:', originalImageFile.name, 'Size:', originalImageFile.size, 'bytes')
      
      // Step 2: Define sealing parameters
      const exclusionZone = {
        x: 100,
        y: 100,
        width: 150,
        height: 150,
        fillColor: '#FFFFFF',
      }
      
      const userIdentity = {
        provider: 'google',
        identifier: 'test@example.com',
      }
      
      const serviceInfo = {
        publicKeyId: 'test-key-roundtrip',
      }
      
      const userUrl = 'https://example.com/roundtrip-test'
      
      console.log('Sealing parameters defined:', { exclusionZone, userIdentity, serviceInfo, userUrl })
      
      // Step 3: SEAL THE DOCUMENT
      console.log('--- SEALING PHASE ---')
      
      // 3a: Calculate document hashes with exclusion zone (using Node.js approach)
      const originalImage = await loadImage(originalImageBuffer)
      const originalCanvas = createCanvas(originalImage.width, originalImage.height)
      const originalCtx = originalCanvas.getContext('2d')
      originalCtx.drawImage(originalImage, 0, 0)
      
      // Apply exclusion zone for hash calculation
      originalCtx.fillStyle = exclusionZone.fillColor
      originalCtx.fillRect(exclusionZone.x, exclusionZone.y, exclusionZone.width, exclusionZone.height)
      
      // Get image data and calculate hashes using actual service
      const originalImageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height)
      const hashService = new DocumentHashService()
      
      type DocumentHashServiceWithPrivates = DocumentHashService & {
        calculateHashesFromImageData(imageData: ImageData): Promise<{
          cryptographic: string;
          pHash: string;
          dHash: string;
        }>
      }
      
      const originalHashes = await (hashService as DocumentHashServiceWithPrivates)
        .calculateHashesFromImageData(originalImageData as ImageData)
      
      console.log('Original document hashes calculated:', {
        cryptographic: originalHashes.cryptographic,
        pHashLength: originalHashes.pHash.length,
        dHashLength: originalHashes.dHash.length,
      })
      
      // 3b: Build attestation data
      const attestationBuilder = new AttestationBuilder()
      const attestationData = attestationBuilder.buildCompactAttestation({
        documentHashes: originalHashes,
        identity: userIdentity,
        serviceInfo,
        exclusionZone,
        userUrl,
      })
      console.log('Attestation data created for sealing')
      
      // 3c: Create sealed document (simulate embedding QR code)
      // Load original image again for sealing, apply exclusion zone, and place QR code
      const sealingImage = await loadImage(originalImageBuffer)
      const sealedCanvas = createCanvas(sealingImage.width, sealingImage.height)
      const sealedCtx = sealedCanvas.getContext('2d')
      
      // Draw original image
      sealedCtx.drawImage(sealingImage, 0, 0)
      
      // Apply exclusion zone (fill with white)
      sealedCtx.fillStyle = exclusionZone.fillColor
      sealedCtx.fillRect(exclusionZone.x, exclusionZone.y, exclusionZone.width, exclusionZone.height)
      
      // Simulate QR code placement (for now, just keep the white rectangle)
      // In real implementation, the QR code image would be drawn here
      console.log('Sealed document created with exclusion zone applied')
      
      // Convert sealed canvas to file
      const sealedImageBuffer = sealedCanvas.toBuffer('image/png')
      const sealedImageFile = new File([sealedImageBuffer], 'sealed-sample.png', { type: 'image/png' })
      console.log('Sealed document file created:', sealedImageFile.name, 'Size:', sealedImageFile.size, 'bytes')
      
      // Step 4: VERIFY THE SEALED DOCUMENT
      console.log('--- VERIFICATION PHASE ---')
      
      // 4a: Calculate hashes of the sealed document (using Node.js approach)
      const sealedImage = await loadImage(sealedImageBuffer)
      const verificationCanvas = createCanvas(sealedImage.width, sealedImage.height)
      const verificationCtx = verificationCanvas.getContext('2d')
      verificationCtx.drawImage(sealedImage, 0, 0)
      
      // Apply same exclusion zone for verification
      verificationCtx.fillStyle = exclusionZone.fillColor
      verificationCtx.fillRect(exclusionZone.x, exclusionZone.y, exclusionZone.width, exclusionZone.height)
      
      // Get image data and calculate verification hashes
      const verificationImageData = verificationCtx.getImageData(0, 0, verificationCanvas.width, verificationCanvas.height)
      const verificationHashes = await (hashService as DocumentHashServiceWithPrivates)
        .calculateHashesFromImageData(verificationImageData as ImageData)
      
      console.log('Verification hashes calculated:', {
        cryptographic: verificationHashes.cryptographic,
        pHashLength: verificationHashes.pHash.length,
        dHashLength: verificationHashes.dHash.length,
      })
      
      // 4b: Simulate verification result (since we can't use the full VerificationService.verifyDocument)
      // The verification should pass because we applied the same exclusion zone
      const cryptographicMatch = verificationHashes.cryptographic === originalHashes.cryptographic
      const perceptualMatch = verificationHashes.pHash === originalHashes.pHash && 
                             verificationHashes.dHash === originalHashes.dHash
      
      const verificationResult = {
        isValid: cryptographicMatch && perceptualMatch,
        status: cryptographicMatch ? 'verified_exact' : 'modified',
        details: {
          cryptographicMatch,
          perceptualMatch,
          documentType: 'image',
        },
      }
      
      console.log('Verification result:', verificationResult)
      
      // Step 5: VALIDATE ROUNDTRIP SUCCESS
      console.log('--- ROUNDTRIP VALIDATION ---')
      
      // The hashes should match because we applied the same exclusion zone
      expect(verificationResult.isValid).toBe(true)
      expect(verificationResult.status).toBe('verified_exact')
      expect(verificationResult.details.cryptographicMatch).toBe(true)
      expect(verificationResult.details.perceptualMatch).toBe(true)
      
      // Verify that the hashes match
      expect(verificationHashes.cryptographic).toBe(originalHashes.cryptographic)
      expect(verificationHashes.pHash).toBe(originalHashes.pHash)
      expect(verificationHashes.dHash).toBe(originalHashes.dHash)
      
      console.log('✅ ROUNDTRIP TEST SUCCESSFUL!')
      console.log('- Original document sealed with attestation data')
      console.log('- Sealed document verified successfully')
      console.log('- Hash integrity maintained through seal → verify cycle')
      console.log('- Cryptographic verification: PASSED')
      console.log('- Perceptual verification: PASSED')
      
    }, 20000) // 20 second timeout for complete workflow
  })

  describe('End-to-End Seal and Verify Workflow', () => {
    it('should create and verify attestation data without full document processing', async () => {
      console.log('Starting simplified integration test...')
      
      // Step 1: Create mock document hashes (bypass complex image processing)
      const mockDocumentHashes = {
        cryptographic: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
        pHash: '1010101010101010101010101010101010101010101010101010101010101010',
        dHash: '110011001100110011001100110011001100',
      }
      console.log('Mock document hashes created:', mockDocumentHashes)
      
      // Step 2: Build attestation data
      console.log('Step 2: Building attestation data...')
      const attestationBuilder = new AttestationBuilder()
      const exclusionZone = {
        x: 10,
        y: 10,
        width: 80,
        height: 80,
        fillColor: '#FFFFFF',
      }
      
      const attestationData = attestationBuilder.buildCompactAttestation({
        documentHashes: mockDocumentHashes,
        identity: {
          provider: 'google',
          identifier: 'test@example.com',
        },
        serviceInfo: {
          publicKeyId: 'test-key-id',
        },
        exclusionZone,
        userUrl: 'https://example.com/profile',
      })
      console.log('Attestation data built:', attestationData)
      
      expect(attestationData).toBeDefined()
      expect(attestationData.h.c).toBe(mockDocumentHashes.cryptographic)
      expect(attestationData.i.p).toBe('g') // Google's compact ID
      expect(attestationData.i.id).toBe('test@example.com')
      expect(attestationData.e.x).toBe(10)
      expect(attestationData.e.y).toBe(10)
      expect(attestationData.e.w).toBe(80)
      expect(attestationData.e.h).toBe(80)
      expect(attestationData.e.f).toBe('FFFFFF') // Without #
      
      // Step 3: Test CBOR encoding/decoding (core of verification)
      console.log('Step 3: Testing CBOR encoding/decoding...')
      
      // Encode the attestation data using cbor-x directly
      const encodedBuffer = encode(attestationData)
      const encodedData = Buffer.from(encodedBuffer).toString('base64url')
      console.log('Encoded data length:', encodedData.length, 'characters')
      expect(encodedData).toBeDefined()
      expect(encodedData.length).toBeGreaterThan(0)
      
      // Decode the attestation data using cbor-x directly
      const decodedBuffer = Buffer.from(encodedData, 'base64url')
      const decodedAttestationData = decode(decodedBuffer)
      console.log('Decoded result:', decodedAttestationData)
      
      expect(decodedAttestationData).toBeDefined()
      
      // All data should be preserved exactly - no truncation allowed
      expect(decodedAttestationData.h.c).toBe(attestationData.h.c)
      expect(decodedAttestationData.h.p.p).toBe(attestationData.h.p.p)
      expect(decodedAttestationData.h.p.d).toBe(attestationData.h.p.d)
      expect(decodedAttestationData.i.p).toBe(attestationData.i.p)
      expect(decodedAttestationData.i.id).toBe(attestationData.i.id) // Full email preserved
      expect(decodedAttestationData.s.k).toBe(attestationData.s.k) // Full key ID preserved
      expect(decodedAttestationData.u).toBe(attestationData.u) // Full URL preserved
      expect(decodedAttestationData.e.x).toBe(attestationData.e.x)
      expect(decodedAttestationData.e.y).toBe(attestationData.e.y)
      expect(decodedAttestationData.e.w).toBe(attestationData.e.w)
      expect(decodedAttestationData.e.h).toBe(attestationData.e.h)
      expect(decodedAttestationData.e.f).toBe(attestationData.e.f)
      
      // Timestamp should be preserved with only precision loss (seconds vs milliseconds)
      const originalTime = new Date(attestationData.t).getTime()
      const decodedTime = new Date(decodedAttestationData.t).getTime()
      const timeDifference = Math.abs(originalTime - decodedTime)
      expect(timeDifference).toBeLessThan(1000) // Less than 1 second difference due to precision loss
      
      console.log('Simplified integration test completed successfully!')
    }, 10000) // 10 second timeout
  })
})
