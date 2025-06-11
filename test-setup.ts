import { vi } from 'vitest'
import { createCanvas } from 'canvas'
import { webcrypto } from 'crypto'

// Mock crypto.subtle for testing environment
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: webcrypto.subtle,
    getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
  },
})

// Mock HTMLCanvasElement for testing
global.HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextType) => {
  if (contextType === '2d') {
    const canvas = createCanvas(1, 1)
    const ctx = canvas.getContext('2d')
    
    // Override drawImage to handle our mocked Image objects
    const originalDrawImage = ctx.drawImage.bind(ctx)
    ctx.drawImage = vi.fn().mockImplementation((image, ...args) => {
      try {
        // If it's our mocked image with a _canvas property, use that
        if (image && image._canvas) {
          return originalDrawImage(image._canvas, ...args)
        }
        
        // If it's a canvas element, handle it directly
        if (image && typeof image === 'object') {
          // Check if it looks like a canvas (has getContext method or is from node-canvas)
          if (image.getContext || image.constructor?.name === 'Canvas' || image.width !== undefined) {
            return originalDrawImage(image, ...args)
          }
        }
        
        // Fallback: try the original method
        return originalDrawImage(image, ...args)
      } catch (error) {
        // If all else fails, create a simple mock behavior
        console.warn('drawImage mock fallback:', error.message)
        // For testing purposes, just fill with a pattern
        const [sx = 0, sy = 0, sw = ctx.canvas.width, sh = ctx.canvas.height] = args
        ctx.fillStyle = '#808080' // Gray color for mock
        ctx.fillRect(sx, sy, sw, sh)
      }
    })
    
    // Override getImageData to ensure it returns proper ImageData
    const originalGetImageData = ctx.getImageData.bind(ctx)
    ctx.getImageData = vi.fn().mockImplementation((x, y, width, height) => {
      const imageData = originalGetImageData(x, y, width, height)
      
      // Ensure the data property is a proper Uint8ClampedArray
      if (!(imageData.data instanceof Uint8ClampedArray)) {
        const properData = new Uint8ClampedArray(width * height * 4)
        // Fill with some test data (blue-ish color)
        for (let i = 0; i < properData.length; i += 4) {
          properData[i] = 0     // R
          properData[i + 1] = 100 // G
          properData[i + 2] = 200 // B
          properData[i + 3] = 255 // A
        }
        
        return {
          data: properData,
          width: width,
          height: height,
          colorSpace: 'srgb',
        }
      }
      
      return imageData
    })
    
    // Override putImageData to handle resizing properly
    ctx.putImageData = vi.fn().mockImplementation((imageData, dx, dy) => {
      // For testing purposes, we'll simulate putting the image data
      // by filling the canvas with a pattern based on the source data
      if (imageData && imageData.data && imageData.width && imageData.height) {
        // Fill the canvas with a representative color from the source
        const samplePixel = {
          r: imageData.data[0] || 0,
          g: imageData.data[1] || 100,
          b: imageData.data[2] || 200,
          a: (imageData.data[3] || 255) / 255,
        }
        ctx.fillStyle = `rgba(${samplePixel.r}, ${samplePixel.g}, ${samplePixel.b}, ${samplePixel.a})`
        ctx.fillRect(dx, dy, Math.min(imageData.width, canvas.width - dx), Math.min(imageData.height, canvas.height - dy))
      }
      // Don't call the original method - just return undefined like the real putImageData
    })
    
    return ctx
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
global.URL.createObjectURL = vi.fn().mockImplementation(() => {
  return 'mock://test-url'
})

// Mock URL.revokeObjectURL
global.URL.revokeObjectURL = vi.fn()

// Mock Image loading
const originalImage = global.Image
global.Image = class extends originalImage {
  constructor() {
    super()
    
    // Create a canvas to serve as the image data
    const canvas = createCanvas(100, 100)
    const ctx = canvas.getContext('2d')
    
    // Fill with a simple pattern so it's not empty
    ctx.fillStyle = '#0066CC'
    ctx.fillRect(0, 0, 100, 100)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(10, 10, 80, 80)
    
    // Set properties that make this work with canvas.drawImage
    Object.defineProperty(this, 'naturalWidth', { value: 100, writable: true })
    Object.defineProperty(this, 'naturalHeight', { value: 100, writable: true })
    Object.defineProperty(this, 'width', { value: 100, writable: true })
    Object.defineProperty(this, 'height', { value: 100, writable: true })
    
    // Make this object drawable by canvas
    Object.defineProperty(this, '_canvas', { value: canvas })
  }
}
