/**
 * Integration tests for seal.codes workflow
 * Tests the complete seal → verify cycle
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { webcrypto } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Canvas, createCanvas, loadImage } from 'canvas'
import { DocumentHashService } from './document-hash-service'
import { AttestationBuilder } from './attestation-builder'
import { QRCodeService } from './qrcode-service'
import { VerificationService } from './verification-service'

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
      }
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
        this.size = bits.reduce((acc, bit) => acc + (typeof bit === 'string' ? bit.length : bit.byteLength || 0), 0)
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
      createObjectURL: (file: File) => {
        // Return a mock data URL
        return 'data:image/png;base64,mock-data-url'
      },
      revokeObjectURL: () => {
        // Mock implementation
      }
    } as any
  }
})

describe('Integration Tests', () => {

  describe('Service Integration', () => {
    it('should be able to instantiate core services', () => {
      const hashService = new DocumentHashService()
      const attestationBuilder = new AttestationBuilder()
      const qrService = new QRCodeService()
      const verificationService = new VerificationService()
      
      expect(hashService).toBeDefined()
      expect(attestationBuilder).toBeDefined()
      expect(qrService).toBeDefined()
      expect(verificationService).toBeDefined()
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
        fillColor: '#FFFFFF'
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
          .calculateHashesFromImageData(imageData)
        
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

  describe('End-to-End Seal and Verify Workflow', () => {
    it('should create and verify attestation data without full document processing', async () => {
      console.log('Starting simplified integration test...')
      
      // Step 1: Create mock document hashes (bypass complex image processing)
      const mockDocumentHashes = {
        cryptographic: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
        pHash: '1010101010101010101010101010101010101010101010101010101010101010',
        dHash: '110011001100110011001100110011001100'
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
        fillColor: '#FFFFFF'
      }
      
      const attestationData = attestationBuilder.buildCompactAttestation({
        documentHashes: mockDocumentHashes,
        identity: {
          provider: 'google',
          identifier: 'test@example.com'
        },
        serviceInfo: {
          publicKeyId: 'test-key-id'
        },
        exclusionZone,
        userUrl: 'https://example.com/profile'
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
      const verificationService = new VerificationService()
      
      // Encode the attestation data
      const encodedData = verificationService.encodeForQR(attestationData)
      console.log('Encoded data length:', encodedData.length, 'characters')
      expect(encodedData).toBeDefined()
      expect(encodedData.length).toBeGreaterThan(0)
      
      // Decode the attestation data
      const decodedResult = verificationService.decodeFromQR(encodedData)
      console.log('Decoded result:', decodedResult)
      
      expect(decodedResult.isValid).toBe(true)
      
      // All data should be preserved exactly - no truncation allowed
      expect(decodedResult.attestationData.h.c).toBe(attestationData.h.c)
      expect(decodedResult.attestationData.h.p.p).toBe(attestationData.h.p.p)
      expect(decodedResult.attestationData.h.p.d).toBe(attestationData.h.p.d)
      expect(decodedResult.attestationData.i.p).toBe(attestationData.i.p)
      expect(decodedResult.attestationData.i.id).toBe(attestationData.i.id) // Full email preserved
      expect(decodedResult.attestationData.s.k).toBe(attestationData.s.k) // Full key ID preserved
      expect(decodedResult.attestationData.u).toBe(attestationData.u) // Full URL preserved
      expect(decodedResult.attestationData.e.x).toBe(attestationData.e.x)
      expect(decodedResult.attestationData.e.y).toBe(attestationData.e.y)
      expect(decodedResult.attestationData.e.w).toBe(attestationData.e.w)
      expect(decodedResult.attestationData.e.h).toBe(attestationData.e.h)
      expect(decodedResult.attestationData.e.f).toBe(attestationData.e.f)
      
      // Timestamp should be preserved with only precision loss (seconds vs milliseconds)
      const originalTime = new Date(attestationData.t).getTime()
      const decodedTime = new Date(decodedResult.attestationData.t).getTime()
      const timeDifference = Math.abs(originalTime - decodedTime)
      expect(timeDifference).toBeLessThan(1000) // Less than 1 second difference due to precision loss
      
      console.log('Simplified integration test completed successfully!')
    }, 10000) // 10 second timeout
  })
})
