/**
 * Document hashing service with QR code exclusion zone support
 * Handles cryptographic and perceptual hashing while excluding QR code areas
 */

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
          
          // Calculate hashes
          const hashes = await this.calculateHashesFromImageData(imageData)
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
    
    // For perceptual hashes, we need to render the first page
    const pdfDoc = await PDFDocument.load(fileBuffer)
    const firstPage = pdfDoc.getPages()[0]
    
    // Create a temporary canvas for rendering
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Could not get canvas context')
    }
    
    // Set canvas size to match PDF page
    const { width, height } = firstPage.getSize()
    canvas.width = width
    canvas.height = height
    
    // TODO: Implement PDF rendering to canvas
    // For now, we'll use placeholder perceptual hashes since PDF.js or similar
    // would be needed for proper rendering
    
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
   * @returns Promise resolving to calculated hashes
   */
  private async calculateHashesFromImageData(imageData: ImageData): Promise<DocumentHashes> {
    // Convert ImageData to a format suitable for hashing
    const buffer = await this.imageDataToBuffer(imageData)
    
    // Calculate cryptographic hash (SHA-256)
    const cryptoHash = await this.calculateSHA256(buffer)
    
    // Calculate perceptual hashes
    const { pHash, dHash } = await this.calculatePerceptualHashes(imageData)
    
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
   */
  private async calculatePerceptualHashes(imageData: ImageData): Promise<{ pHash: string; dHash: string }> {
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
    ctx.putImageData(imageData, 0, 0)
    
    // 2. Convert to grayscale and calculate average
    const grayValues = new Array(1024) // 32x32
    let averageValue = 0
    
    const imgData = ctx.getImageData(0, 0, 32, 32)
    for (let i = 0; i < imgData.data.length; i += 4) {
      // Convert to grayscale using luminosity method
      const gray = Math.round(
        0.299 * imgData.data[i] + 
        0.587 * imgData.data[i + 1] + 
        0.114 * imgData.data[i + 2]
      )
      grayValues[i / 4] = gray
      averageValue += gray
    }
    averageValue /= 1024

    // 3. Compare each pixel to average to generate hash
    let pHashValue = ''
    for (let i = 0; i < 1024; i++) {
      pHashValue += grayValues[i] > averageValue ? '1' : '0'
    }

    // For dHash:
    // 1. Resize to 9x8 (we'll compare adjacent pixels)
    canvas.width = 9
    canvas.height = 8
    ctx.putImageData(imageData, 0, 0)
    
    // 2. Calculate differences between adjacent pixels
    const dHashData = ctx.getImageData(0, 0, 9, 8)
    let dHashValue = ''
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const left = dHashData.data[(y * 9 + x) * 4]
        const right = dHashData.data[(y * 9 + x + 1) * 4]
        dHashValue += left > right ? '1' : '0'
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