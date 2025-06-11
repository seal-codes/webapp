/**
 * Integration tests for seal.codes workflow
 * Tests the complete seal → verify cycle
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { webcrypto } from 'node:crypto'
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
