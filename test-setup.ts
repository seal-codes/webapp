/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Test setup file for Vitest
 * Configures global test environment and mocks
 */

import { vi } from 'vitest'

// Mock environment variables for Supabase
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

// Mock browser APIs that aren't available in Node.js test environment
global.HTMLCanvasElement = class HTMLCanvasElement {
  width = 200
  height = 200
  
  getContext() {
    return {
      fillRect: vi.fn(),
      drawImage: vi.fn((image, ...args) => {
        // Accept any image-like object
        if (image && (image.width !== undefined || image.naturalWidth !== undefined)) {
          return true
        }
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

global.Image = class Image extends EventTarget {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  width = 200
  height = 200
  naturalWidth = 200
  naturalHeight = 200
  complete = false
  
  constructor() {
    super()
  }
  
  set src(value: string) {
    // Simulate successful image load
    setTimeout(() => {
      this.complete = true
      if (this.onload) {
        this.onload()
      }
      this.dispatchEvent(new Event('load'))
    }, 0)
  }
  
  get src() {
    return this._src || ''
  }
  
  private _src = ''
} as never

// Mock File API
global.File = class File {
  constructor(
    public chunks: BlobPart[],
    public name: string,
    public options?: FilePropertyBag,
  ) {}
  
  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(0))
  }
  
  text() {
    return Promise.resolve('')
  }
  
  size = 0
  type = 'application/octet-stream'
  lastModified = Date.now()
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
