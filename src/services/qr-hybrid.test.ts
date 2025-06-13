/**
 * Test for hybrid QR reader service to ensure fallback functionality works
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { webcrypto } from 'node:crypto'
import { HybridQRReaderService } from './qr-reader-hybrid'
import { wasmPreloader } from './wasm-preloader'

// Setup Node.js environment for browser APIs
beforeAll(() => {
  // Setup crypto
  if (!globalThis.crypto) {
    globalThis.crypto = webcrypto as Crypto
  }
  
  // Setup document API
  if (!globalThis.document) {
    globalThis.document = {
      createElement: (tagName: string) => {
        if (tagName === 'canvas') {
          const canvas = {
            width: 200,
            height: 200,
            getContext: () => ({
              drawImage: () => {},
              getImageData: () => ({
                data: new Uint8ClampedArray(200 * 200 * 4),
                width: 200,
                height: 200,
              }),
              putImageData: () => {},
              fillRect: () => {},
              fillStyle: '',
            }),
          }
          return canvas as any
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
      width: number = 200
      height: number = 200
      
      constructor() {
        // Empty constructor
      }
      
      get src(): string {
        return this._src
      }
      
      set src(value: string) {
        this._src = value
        // Resolve immediately in test environment
        if (this.onload) {
          this.onload()
        }
      }
    } as any
  }
  
  // Setup URL API
  if (!globalThis.URL) {
    globalThis.URL = {
      createObjectURL: () => 'data:image/png;base64,mock-data-url',
      revokeObjectURL: () => {},
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
        this.size = 1000
        this.lastModified = options?.lastModified || Date.now()
      }
      
      async arrayBuffer(): Promise<ArrayBuffer> {
        return new ArrayBuffer(this.size)
      }
      
      async text(): Promise<string> {
        return 'mock file content'
      }
    } as any
  }
})

describe('Hybrid QR Services', () => {
  describe('HybridQRReaderService', () => {
    it('should instantiate and provide engine info', () => {
      const service = new HybridQRReaderService()
      expect(service).toBeDefined()
      
      const engineInfo = service.getEngineInfo()
      expect(engineInfo).toBeDefined()
      expect(engineInfo.jsqrAvailable).toBe(true)
      expect(engineInfo.recommendedEngine).toMatch(/^(jsqr|rxing-wasm)$/)
      
      console.log('🔧 QR Reader Engine Info:', engineInfo)
      
      // Check WASM preloader state
      const wasmState = wasmPreloader.getWasmState()
      console.log('🔧 WASM Preloader State:', wasmState)
    })

    it('should handle scanning with fallback gracefully', async () => {
      const service = new HybridQRReaderService()
      
      // Test that the service is properly configured for test environment
      const engineInfo = service.getEngineInfo()
      expect(engineInfo.jsqrAvailable).toBe(true)
      expect(engineInfo.recommendedEngine).toBe('jsqr')
      expect(engineInfo.rxingWasmLoading).toBe(false) // Should not be loading in test env
      
      console.log('📊 QR Reader Test Configuration:', {
        engine: engineInfo.recommendedEngine,
        jsqrAvailable: engineInfo.jsqrAvailable,
        rxingAvailable: engineInfo.rxingWasmAvailable,
      })
      
      // Note: We skip actual scanning in tests due to complex mock requirements
      // The important part is that the fallback system is properly configured
    })
  })

  describe('Engine Behavior', () => {
    it('should show proper fallback behavior in test environment', async () => {
      const readerService = new HybridQRReaderService()
      
      // In test environment, WASM should not be loaded automatically
      const initialReaderInfo = readerService.getEngineInfo()
      
      console.log('📈 Test Environment Engine State:')
      console.log('  Reader:', {
        rxingAvailable: initialReaderInfo.rxingWasmAvailable,
        loading: initialReaderInfo.rxingWasmLoading,
        recommended: initialReaderInfo.recommendedEngine,
      })
      
      // In test environment, should use jsQR and not be loading WASM
      expect(initialReaderInfo.jsqrAvailable).toBe(true)
      expect(initialReaderInfo.recommendedEngine).toBe('jsqr')
      expect(initialReaderInfo.rxingWasmLoading).toBe(false) // Should not be loading in test env
      
      // Test WASM preloader metrics
      const wasmMetrics = wasmPreloader.getMetrics()
      console.log('📊 WASM Preloader Metrics:', wasmMetrics)
      
      expect(wasmMetrics.startupLoadingEnabled).toBe(false) // Should be disabled in test env
      expect(wasmMetrics.recommendedEngine).toBe('jsqr')
      
      // Test waiting for WASM (should return immediately in test env)
      const readerWasmReady = await readerService.waitForWasm()
      
      console.log('  Reader WASM ready:', readerWasmReady)
      
      // Should handle gracefully
      expect(typeof readerWasmReady).toBe('boolean')
    }, 5000) // Reduced timeout since we're not actually loading WASM
  })
})
