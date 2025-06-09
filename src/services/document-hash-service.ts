/**
 * Document hashing service with QR code exclusion zone support
 * Handles cryptographic and perceptual hashing while excluding QR code areas
 */

import { PDFDocument } from 'pdf-lib'
import type { QRCodeExclusionZone } from '@/types/qrcode'

/**
 * Document hash calculation result
 */
export interface DocumentHashes {
  /** SHA-256 cryptographic hash */
  cryptographic: string;
  /** Perceptual hash (pHash) */
  pHash: string;
  /** Difference hash (dHash) */
  dHash: string;
}

/**
 * Service for calculating document hashes with QR code exclusion
 */
export class DocumentHashService {
  /**
   * Calculate hashes for a document with QR code exclusion zone
   * 
   * @param document - The document file
   * @param exclusionZone - Area to exclude from hash calculation (optional for initial hashing)
   * @returns Promise resolving to calculated hashes
   */
  async calculateDocumentHashes(
    document: File,
    exclusionZone?: QRCodeExclusionZone
  ): Promise<DocumentHashes> {
    if (document.type.startsWith('image/')) {
      return this.calculateImageHashes(document, exclusionZone)
    } else if (document.type === 'application/pdf') {
      return this.calculatePdfHashes(document, exclusionZone)
    } else {
      throw new Error('Unsupported document type')
    }
  }

  /**
   * Calculate hashes for image documents
   * 
   * @param imageFile - The image file
   * @param exclusionZone - Area to exclude from hash calculation
   * @returns Promise resolving to calculated hashes
   */
  private async calculateImageHashes(
    imageFile: File,
    exclusionZone?: QRCodeExclusionZone
  ): Promise<DocumentHashes> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }
      
      img.onload = async () => {
        try {
          // Set canvas dimensions to match image
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          
          // Draw the original image
          ctx.drawImage(img, 0, 0)
          
          // Apply exclusion zone if provided
          if (exclusionZone) {
            this.applyExclusionZone(ctx, exclusionZone)
          }
          
          // Get image data for hash calculation
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          
          // Calculate hashes (pass exclusion zone for perceptual hash awareness)
          const hashes = await this.calculateHashesFromImageData(imageData, exclusionZone)
          resolve(hashes)
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(imageFile)
    })
  }

  /**
   * Calculate hashes for PDF documents
   * 
   * @param pdfFile - The PDF file
   * @param exclusionZone - Area to exclude from hash calculation
   * @returns Promise resolving to calculated hashes
   */
  private async calculatePdfHashes(
    pdfFile: File,
    exclusionZone?: QRCodeExclusionZone
  ): Promise<DocumentHashes> {
    // Read the PDF file
    const fileBuffer = await pdfFile.arrayBuffer()
    
    // Calculate cryptographic hash of the raw PDF data
    const cryptoHash = await this.calculateSHA256(fileBuffer)
    
    // TODO: Implement proper PDF perceptual hashing
    // This will require:
    // 1. Rendering the PDF to an image (using PDF.js or similar)
    // 2. Applying the exclusion zone
    // 3. Calculating perceptual hashes from the rendered image
    // For now, return placeholder values for perceptual hashes
    
    return {
      cryptographic: cryptoHash,
      pHash: 'pdf-phash-not-implemented',
      dHash: 'pdf-dhash-not-implemented'
    }
  }

  /**
   * Apply exclusion zone to canvas context
   * Fills the exclusion area with the specified color
   * 
   * @param ctx - Canvas 2D context
   * @param exclusionZone - Zone to exclude
   */
  private applyExclusionZone(
    ctx: CanvasRenderingContext2D,
    exclusionZone: QRCodeExclusionZone
  ): void {
    ctx.fillStyle = exclusionZone.fillColor
    ctx.fillRect(
      exclusionZone.x,
      exclusionZone.y,
      exclusionZone.width,
      exclusionZone.height
    )
  }

  /**
   * Calculate hashes from image data
   * 
   * @param imageData - Canvas image data
   * @param exclusionZone - Area to exclude from perceptual hash calculation
   * @returns Promise resolving to calculated hashes
   */
  private async calculateHashesFromImageData(
    imageData: ImageData, 
    exclusionZone?: QRCodeExclusionZone
  ): Promise<DocumentHashes> {
    // Convert ImageData to a format suitable for hashing
    const buffer = await this.imageDataToBuffer(imageData)
    
    // Calculate cryptographic hash (SHA-256)
    const cryptoHash = await this.calculateSHA256(buffer)
    
    // Calculate perceptual hashes with exclusion zone awareness
    const { pHash, dHash } = await this.calculatePerceptualHashes(imageData, exclusionZone)
    
    return {
      cryptographic: cryptoHash,
      pHash,
      dHash
    }
  }

  /**
   * Convert ImageData to ArrayBuffer for hashing
   */
  private async imageDataToBuffer(imageData: ImageData): Promise<ArrayBuffer> {
    // Create a buffer from the RGBA values
    const buffer = new ArrayBuffer(imageData.data.length)
    const view = new Uint8Array(buffer)
    view.set(imageData.data)
    return buffer
  }

  /**
   * Calculate SHA-256 hash of data
   */
  private async calculateSHA256(data: ArrayBuffer): Promise<string> {
    // Use the Web Crypto API to calculate SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  }

  /**
   * Calculate perceptual hashes (pHash and dHash)
   * Takes into account the exclusion zone to avoid QR code area affecting the hash
   */
  private async calculatePerceptualHashes(
    imageData: ImageData,
    exclusionZone?: QRCodeExclusionZone
  ): Promise<{ pHash: string; dHash: string }> {
    // Create a temporary canvas for image processing
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Could not get canvas context')
    }

    // For pHash:
    // 1. Resize to 32x32 (reduces high frequency variations)
    canvas.width = 32
    canvas.height = 32
    
    // Calculate scale factors for exclusion zone
    const scaleX = 32 / imageData.width
    const scaleY = 32 / imageData.height
    
    // Draw scaled image
    ctx.scale(scaleX, scaleY)
    ctx.putImageData(imageData, 0, 0)
    ctx.setTransform(1, 0, 0, 1, 0, 0) // Reset transform
    
    // 2. Calculate pixel weights based on exclusion zone
    const weights = new Array(1024).fill(1.0) // Default weight is 1.0
    if (exclusionZone) {
      const scaledZone = {
        x: Math.floor(exclusionZone.x * scaleX),
        y: Math.floor(exclusionZone.y * scaleY),
        width: Math.ceil(exclusionZone.width * scaleX),
        height: Math.ceil(exclusionZone.height * scaleY)
      }
      
      // Set weights to 0 for pixels in exclusion zone
      for (let y = scaledZone.y; y < scaledZone.y + scaledZone.height; y++) {
        for (let x = scaledZone.x; x < scaledZone.x + scaledZone.width; x++) {
          if (x >= 0 && x < 32 && y >= 0 && y < 32) {
            weights[y * 32 + x] = 0
          }
        }
      }
    }
    
    // 3. Convert to grayscale and calculate weighted average
    const grayValues = new Array(1024) // 32x32
    let totalWeight = 0
    let weightedSum = 0
    
    const imgData = ctx.getImageData(0, 0, 32, 32)
    for (let i = 0; i < imgData.data.length; i += 4) {
      const pixelIndex = i / 4
      const weight = weights[pixelIndex]
      
      // Convert to grayscale using luminosity method
      const gray = Math.round(
        0.299 * imgData.data[i] + 
        0.587 * imgData.data[i + 1] + 
        0.114 * imgData.data[i + 2]
      )
      grayValues[pixelIndex] = gray
      
      if (weight > 0) {
        weightedSum += gray * weight
        totalWeight += weight
      }
    }
    const averageValue = totalWeight > 0 ? weightedSum / totalWeight : 128

    // 4. Compare each pixel to average to generate hash, skipping excluded pixels
    let pHashValue = ''
    for (let i = 0; i < 1024; i++) {
      if (weights[i] > 0) {
        pHashValue += grayValues[i] > averageValue ? '1' : '0'
      } else {
        // For excluded pixels, use a consistent value
        pHashValue += '0'
      }
    }

    // For dHash:
    // 1. Resize to 9x8 (we'll compare adjacent pixels)
    canvas.width = 9
    canvas.height = 8
    
    // Draw scaled image
    ctx.scale(9 / imageData.width, 8 / imageData.height)
    ctx.putImageData(imageData, 0, 0)
    ctx.setTransform(1, 0, 0, 1, 0, 0) // Reset transform
    
    // 2. Calculate weights for 9x8 grid
    const dHashWeights = new Array(72).fill(1.0)
    if (exclusionZone) {
      const dScaleX = 9 / imageData.width
      const dScaleY = 8 / imageData.height
      const scaledZone = {
        x: Math.floor(exclusionZone.x * dScaleX),
        y: Math.floor(exclusionZone.y * dScaleY),
        width: Math.ceil(exclusionZone.width * dScaleX),
        height: Math.ceil(exclusionZone.height * dScaleY)
      }
      
      for (let y = scaledZone.y; y < scaledZone.y + scaledZone.height; y++) {
        for (let x = scaledZone.x; x < scaledZone.x + scaledZone.width; x++) {
          if (x >= 0 && x < 9 && y >= 0 && y < 8) {
            dHashWeights[y * 9 + x] = 0
          }
        }
      }
    }
    
    // 3. Calculate differences between adjacent pixels, skipping excluded areas
    const dHashData = ctx.getImageData(0, 0, 9, 8)
    let dHashValue = ''
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const leftIndex = y * 9 + x
        const rightIndex = y * 9 + x + 1
        
        // Skip if either pixel is in exclusion zone
        if (dHashWeights[leftIndex] === 0 || dHashWeights[rightIndex] === 0) {
          dHashValue += '0' // Use consistent value for excluded areas
        } else {
          const left = dHashData.data[leftIndex * 4] // Red channel is enough for grayscale
          const right = dHashData.data[rightIndex * 4]
          dHashValue += left > right ? '1' : '0'
        }
      }
    }

    return {
      pHash: pHashValue,
      dHash: dHashValue
    }
  }

  /**
   * Create exclusion zone from QR code positioning data
   * 
   * @param position - QR code position in pixels
   * @param sealDimensions - Complete seal dimensions
   * @param fillColor - Color to fill exclusion zone
   * @returns Exclusion zone configuration
   */
  createExclusionZone(
    position: { x: number; y: number },
    sealDimensions: { width: number; height: number },
    fillColor: string = '#FFFFFF'
  ): QRCodeExclusionZone {
    return {
      x: position.x,
      y: position.y,
      width: sealDimensions.width,
      height: sealDimensions.height,
      fillColor
    }
  }
}

/**
 * Default document hash service instance
 */
export const documentHashService = new DocumentHashService()