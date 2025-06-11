import jsQR from 'jsqr'
import type { AttestationData } from '@/types/qrcode'
import { verificationService } from './verification-service'

interface QRScanResult {
  found: boolean
  attestationData?: AttestationData
  debugInfo?: {
    processingSteps: string[]
    scannedRegions: number
    totalRegions: number
  }
}

export class QRScanService {
  /**
   * Scan an image file for QR codes
   * 
   * @param imageFile - The image file to scan
   * @param exclusionZone - Optional exclusion zone to focus scanning
   * @returns Promise resolving to scan result
   */
  async scanImageForQR(imageFile: File, exclusionZone?: { x: number; y: number; width: number; height: number }): Promise<QRScanResult> {
    try {
      // Create an image element
      const img = await this.loadImage(imageFile)
      
      // Create a canvas to draw the image
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Could not get canvas context')
      }
      
      // Set canvas size to match image
      canvas.width = img.width
      canvas.height = img.height
      
      // Draw the image
      ctx.drawImage(img, 0, 0)
      
      // Get image data
      let imageData: ImageData
      if (exclusionZone) {
        // Get data only from the specified area
        imageData = ctx.getImageData(
          exclusionZone.x,
          exclusionZone.y,
          exclusionZone.width,
          exclusionZone.height,
        )
      } else {
        // Get data from the entire image
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      }
      
      // Scan for QR code
      const code = jsQR(
        imageData.data,
        imageData.width,
        imageData.height,
      )
      
      if (!code) {
        return { found: false }
      }
      
      console.log('QR code found with data:', code.data)
      
      // Check if this is a verification URL
      if (code.data.includes('/v/')) {
        return this.processVerificationURL(code)
      }
      
      // Try to decode directly (in case it's just the encoded data)
      return this.processDirectData(code)
      
      return { found: false }
    } catch (error) {
      console.error('Error scanning image for QR code:', error)
      throw error
    }
  }
  
  /**
   * Load an image file and return an HTMLImageElement
   * 
   * @param file - Image file to load
   * @returns Promise resolving to loaded image
   */
  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  private processVerificationURL(code: { data: string; location: { x: number; y: number; width: number; height: number } }): QRScanResult {
    // Extract the encoded part from the URL
    const urlParts = code.data.split('/v/')
    if (urlParts.length <= 1) {
      return { found: false }
    }
    
    const encodedData = urlParts[1]
    console.log('Extracted encoded data:', encodedData)
    
    // Try to decode the QR code data
    const decodedData = verificationService.decodeFromQR(encodedData)
    
    if (!decodedData.isValid) {
      return { found: false }
    }
    
    return {
      found: true,
      attestationData: decodedData.attestationData,
      debugInfo: {
        qrLocation: code.location,
        rawData: code.data,
        encodedData: encodedData,
      },
    }
  }

  private processDirectData(code: { data: string; location: { x: number; y: number; width: number; height: number } }): QRScanResult {
    // Try to decode directly (in case it's just the encoded data)
    const decodedData = verificationService.decodeFromQR(code.data)
    
    if (!decodedData.isValid) {
      return { found: false }
    }
    
    return {
      found: true,
      attestationData: decodedData.attestationData,
      debugInfo: {
        qrLocation: code.location,
        rawData: code.data,
      },
    }
  }
}

export const qrScanService = new QRScanService()
