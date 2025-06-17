/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Test setup file for Vitest
 * Configures global test environment and mocks
 */

import { vi } from 'vitest'

// Mock Supabase client to prevent initialization issues in tests
vi.mock('./src/services/supabase-client', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    })),
  },
}))

// Mock auth service to prevent Supabase initialization in tests
vi.mock('./src/services/auth-service', () => ({
  authService: {
    isAuthenticated: false,
    currentUser: null,
    signInWithProvider: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
}))

// Mock browser APIs that aren't available in Node.js test environment
global.HTMLCanvasElement = class HTMLCanvasElement {
  width = 200
  height = 200
  
  getContext() {
    return {
      fillRect: vi.fn(),
      drawImage: vi.fn((_image, ..._args) => {
        // Accept any image-like object
        return true
      }),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    }
  }
  
  toDataURL() {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  }
} as never

// Mock Image constructor to work with jsdom
Object.defineProperty(global, 'Image', {
  value: class MockImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    width = 200
    height = 200
    naturalWidth = 200
    naturalHeight = 200
    complete = false
    crossOrigin: string | null = null
    currentSrc = ''
    
    constructor() {
      // Return a proper HTMLImageElement-like object
      return this
    }
    
    set src(value: string) {
      this._src = value
      this.currentSrc = value
      // Simulate successful image load
      setTimeout(() => {
        this.complete = true
        if (this.onload) {
          this.onload()
        }
      }, 0)
    }
    
    get src() {
      return this._src || ''
    }
    
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return true 
    }
    
    private _src = ''
  },
  writable: true,
  configurable: true,
})

// Mock File API
global.File = class File {
  public size: number
  public type: string
  public lastModified: number
  
  constructor(
    public chunks: BlobPart[],
    public name: string,
    public options?: FilePropertyBag,
  ) {
    this.size = options?.size || 0
    this.type = options?.type || 'application/octet-stream'
    this.lastModified = options?.lastModified || Date.now()
  }
  
  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(0))
  }
  
  text() {
    return Promise.resolve('')
  }
} as never

// Mock crypto API if not available
if (!global.crypto) {
  const { webcrypto } = require('node:crypto')
  global.crypto = webcrypto as Crypto
}

// Mock URL API
global.URL = class URL {
  constructor(public href: string, base?: string) {
    if (base) {
      this.href = new (require('url').URL)(href, base).href
    }
  }
  
  static createObjectURL = vi.fn(() => 'blob:mock-url')
  static revokeObjectURL = vi.fn()
  
  toString() {
    return this.href
  }
} as never
