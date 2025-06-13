import { decode_barcode_with_hints, convert_imagedata_to_luma, DecodeHintDictionary, DecodeHintTypes } from 'rxing-wasm'
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
      
      // Scan for QR code using rxing-wasm
      const luma8Data = convert_imagedata_to_luma(imageData)
      
      // Create hints for better QR detection
      const hints = new DecodeHintDictionary()
      hints.set_hint(DecodeHintTypes.TryHarder, 'true')
      hints.set_hint(DecodeHintTypes.PossibleFormats, 'qrcode')
      hints.set_hint(DecodeHintTypes.AlsoInverted, 'true')
      
      let code = null
      try {
        const result = decode_barcode_with_hints(luma8Data, imageData.width, imageData.height, hints)
        if (result) {
          code = {
            data: result.text(), // Call the text() function
            location: {
              x: 0, // rxing-wasm doesn't provide exact location info like jsQR
              y: 0,
              width: imageData.width,
              height: imageData.height,
            },
          }
        }
      } catch (error) {
        console.log('No QR code found with rxing-wasm:', error)
      }
      
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
        processingSteps: ['QR code found', 'URL extracted', 'Data decoded'],
        scannedRegions: 1,
        totalRegions: 1,
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
        processingSteps: ['QR code found', 'Direct data decoded'],
        scannedRegions: 1,
        totalRegions: 1,
      },
    }
  }
}

export const qrScanService = new QRScanService()
