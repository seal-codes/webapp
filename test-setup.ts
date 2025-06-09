import { vi } from 'vitest'
import { createCanvas } from 'canvas'

// Mock HTMLCanvasElement for testing
global.HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextType) => {
  if (contextType === '2d') {
    const canvas = createCanvas(1, 1)
    return canvas.getContext('2d')
  }
  return null
})

global.HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation(function(callback) {
  // Create a simple blob for testing
  const blob = new Blob(['fake-image-data'], { type: 'image/png' })
  callback(blob)
})

// Mock File.arrayBuffer for testing
global.File.prototype.arrayBuffer = vi.fn().mockImplementation(function() {
  // Return the actual file content as ArrayBuffer
  const content = this.slice().stream().getReader().read().then(result => {
    if (result.value) {
      return result.value.buffer
    }
    return new ArrayBuffer(0)
  })
  return content
})

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn().mockImplementation((blob) => {
  return 'mock://test-url'
})

// Mock URL.revokeObjectURL
global.URL.revokeObjectURL = vi.fn()

// Mock Image loading
const originalImage = global.Image
global.Image = class extends originalImage {
  constructor() {
    super()
    setTimeout(() => {
      if (this.onload) {
        // Set some dimensions before calling onload
        Object.defineProperty(this, 'naturalWidth', { value: 100 })
        Object.defineProperty(this, 'naturalHeight', { value: 100 })
        this.onload()
      }
    }, 0)
  }
}
