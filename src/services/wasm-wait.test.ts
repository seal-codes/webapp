/**
 * Test for WASM waiting functionality
 */

import { describe, it, expect, vi } from 'vitest'
import { webcrypto } from 'node:crypto'

// Mock crypto for Node.js environment
Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
})

// Mock browser APIs for Node.js environment
Object.defineProperty(globalThis, 'Image', {
  value: class MockImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    src: string = ''
    width: number = 100
    height: number = 100
    
    constructor() {
      // Simulate async image loading
      setTimeout(() => {
        if (this.onload) {
          this.onload()
        }
      }, 10)
    }
  },
})

Object.defineProperty(globalThis, 'HTMLCanvasElement', {
  value: class MockCanvas {
    width: number = 100
    height: number = 100
    
    getContext() {
      return {
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({
          data: new Uint8ClampedArray(100 * 100 * 4),
          width: 100,
          height: 100,
        })),
        putImageData: vi.fn(),
        fillRect: vi.fn(),
        fillStyle: '#000000',
      }
    }
  },
})

Object.defineProperty(globalThis, 'document', {
  value: {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        return new (globalThis as any).HTMLCanvasElement()
      }
      return {}
    },
  },
})

describe('WASM Waiting Functionality', () => {
  it('should demonstrate WASM waiting behavior', async () => {
    // Import the WASM preloader
    const { wasmPreloader, wasmGlobals } = await import('./wasm-preloader')
    
    console.log('🧪 Testing WASM waiting functionality...')
    
    // Check initial state
    const initialState = wasmPreloader.getWasmState()
    console.log('Initial WASM state:', {
      isLoaded: initialState.isLoaded,
      isLoading: initialState.isLoading,
      startupEnabled: wasmPreloader.getMetrics().startupLoadingEnabled,
    })
    
    // In test environment, WASM loading should be disabled
    expect(initialState.isLoading).toBe(false)
    expect(wasmPreloader.getMetrics().startupLoadingEnabled).toBe(false)
    
    // Test waiting for WASM when it's not loading (should return immediately)
    const waitStart = Date.now()
    const result = await wasmGlobals.waitForWasm(1000) // 1 second timeout
    const waitTime = Date.now() - waitStart
    
    console.log(`Waited ${waitTime}ms for WASM (should be immediate)`)
    console.log('Wait result:', result)
    
    // Should return immediately since WASM is not loading
    expect(waitTime).toBeLessThan(100) // Should be very fast
    expect(result).toBeNull() // No WASM module in test environment
    
    console.log('✅ WASM waiting test completed')
  })

  it('should demonstrate timeout behavior', async () => {
    const { wasmGlobals } = await import('./wasm-preloader')
    
    console.log('🧪 Testing WASM timeout behavior...')
    
    // Test with very short timeout
    const waitStart = Date.now()
    const result = await wasmGlobals.waitForWasm(50) // 50ms timeout
    const waitTime = Date.now() - waitStart
    
    console.log(`Waited ${waitTime}ms with 50ms timeout`)
    console.log('Timeout result:', result)
    
    // Should handle timeout gracefully
    expect(waitTime).toBeLessThan(100) // Should be fast since not loading
    expect(result).toBeNull()
    
    console.log('✅ WASM timeout test completed')
  })

  it('should show configuration options work', async () => {
    // Import QR reader service
    const { HybridQRReaderService } = await import('./qr-reader-hybrid')
    
    console.log('🧪 Testing QR reader configuration options...')
    
    const service = new HybridQRReaderService()
    
    // Create a mock image file
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    
    // Test with waitForWasm disabled (should be fast)
    const fastStart = Date.now()
    const fastResult = await service.scanImageForQR(mockFile, undefined, { 
      waitForWasm: false, 
    })
    const fastTime = Date.now() - fastStart
    
    console.log(`Fast scan (no WASM wait): ${fastTime}ms`)
    console.log('Fast scan result:', {
      found: fastResult.found,
      engine: fastResult.debugInfo?.usedEngine,
      wasmWaitTime: fastResult.debugInfo?.wasmWaitTime,
    })
    
    // Test with waitForWasm enabled but short timeout
    const waitStart = Date.now()
    const waitResult = await service.scanImageForQR(mockFile, undefined, { 
      waitForWasm: true,
      wasmTimeout: 100,
    })
    const waitTime = Date.now() - waitStart
    
    console.log(`Wait scan (100ms timeout): ${waitTime}ms`)
    console.log('Wait scan result:', {
      found: waitResult.found,
      engine: waitResult.debugInfo?.usedEngine,
      wasmWaitTime: waitResult.debugInfo?.wasmWaitTime,
    })
    
    // Both should work but with different timing characteristics
    expect(fastResult.found).toBe(false) // No QR in mock file
    expect(waitResult.found).toBe(false) // No QR in mock file
    expect(fastResult.debugInfo?.usedEngine).toBe('jsqr')
    expect(waitResult.debugInfo?.usedEngine).toBe('jsqr')
    
    // Fast scan should have no wait time
    expect(fastResult.debugInfo?.wasmWaitTime).toBe(0)
    
    // Wait scan should have minimal wait time (since WASM not loading)
    expect(waitResult.debugInfo?.wasmWaitTime).toBeGreaterThanOrEqual(0)
    
    console.log('✅ Configuration options test completed')
  }, 10000)
})
