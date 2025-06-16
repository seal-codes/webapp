/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Test setup file for Vitest
 * Configures global test environment and mocks
 */

import { vi } from 'vitest'

// Mock browser APIs that aren't available in Node.js test environment
global.HTMLCanvasElement = class HTMLCanvasElement {
  getContext() {
    return {
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    }
  }
  toDataURL() {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  }
  width = 200
  height = 200
} as never

global.Image = class Image {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  width = 200
  height = 200
  naturalWidth = 200
  naturalHeight = 200
  
  set src(value: string) {
    // Simulate successful image load
    setTimeout(() => {
      if (this.onload) {
        this.onload()
      }
    }, 0)
  }
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
