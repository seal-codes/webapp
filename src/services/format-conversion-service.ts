/**
 * Service for converting images to optimal lossless formats for sealing
 */

export interface FormatConversionResult {
  /** The converted file (or original if no conversion needed) */
  file: File
  /** Whether format conversion occurred */
  wasConverted: boolean
  /** Original format */
  originalFormat: string
  /** Final format after conversion */
  finalFormat: string
  /** Reason for conversion */
  conversionReason?: string
  /** File size comparison */
  sizeComparison?: {
    originalSize: number
    finalSize: number
    percentageChange: number
  }
}

/**
 * Service for handling format conversion to optimal sealing formats
 */
export class FormatConversionService {
  
  /**
   * Convert image to optimal lossless format for sealing
   * 
   * @param file - Original image file
   * @param preferPng - Whether to prefer PNG over WebP (default: false, prefers WebP)
   * @returns Promise resolving to conversion result
   */
  async convertToOptimalFormat(file: File, preferPng: boolean = false): Promise<FormatConversionResult> {
    const originalFormat = file.type
    const originalSize = file.size
    
    // Check if already in optimal format
    if (this.isOptimalFormat(originalFormat)) {
      return {
        file,
        wasConverted: false,
        originalFormat,
        finalFormat: originalFormat,
      }
    }
    
    // Determine target format
    const targetFormat = this.selectTargetFormat(file, preferPng)
    
    // Convert the image
    const convertedFile = await this.convertImage(file, targetFormat)
    
    // Calculate size comparison
    const sizeComparison = {
      originalSize,
      finalSize: convertedFile.size,
      percentageChange: Math.round(((convertedFile.size - originalSize) / originalSize) * 100),
    }
    
    return {
      file: convertedFile,
      wasConverted: true,
      originalFormat,
      finalFormat: targetFormat,
      conversionReason: this.getConversionReason(originalFormat, targetFormat),
      sizeComparison,
    }
  }
  
  /**
   * Check if format is already optimal for sealing
   */
  private isOptimalFormat(mimeType: string): boolean {
    return mimeType === 'image/png' || mimeType === 'image/webp'
  }
  
  /**
   * Select the best target format based on file characteristics
   */
  private selectTargetFormat(file: File, preferPng: boolean): string {
    // If user prefers PNG, always use PNG
    if (preferPng) {
      return 'image/png'
    }
    
    // Default to WebP lossless for all cases (better compression)
    return 'image/webp'
  }
  
  /**
   * Convert image to target format
   */
  private async convertImage(file: File, targetFormat: string): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'))
            return
          }
          
          // Set canvas dimensions to match image
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          
          // Draw image to canvas
          ctx.drawImage(img, 0, 0)
          
          // Convert to target format
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to convert image'))
              return
            }
            
            // Create new file with appropriate extension
            const newFileName = this.updateFileName(file.name, targetFormat)
            const convertedFile = new File([blob], newFileName, { type: targetFormat })
            
            resolve(convertedFile)
          }, targetFormat, targetFormat === 'image/webp' ? 1.0 : undefined) // 1.0 = lossless for WebP
          
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = () => reject(new Error('Failed to load image for conversion'))
      img.src = URL.createObjectURL(file)
    })
  }
  
  /**
   * Update filename extension based on target format
   */
  private updateFileName(originalName: string, targetFormat: string): string {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '')
    
    switch (targetFormat) {
      case 'image/png':
        return `${nameWithoutExt}.png`
      case 'image/webp':
        return `${nameWithoutExt}.webp`
      default:
        return originalName
    }
  }
  
  /**
   * Get technical reason for conversion
   */
  private getConversionReason(originalFormat: string, targetFormat: string): string {
    const formatNames: Record<string, string> = {
      'image/jpeg': 'JPEG',
      'image/jpg': 'JPEG',
      'image/png': 'PNG',
      'image/webp': 'WebP',
      'image/gif': 'GIF',
      'image/bmp': 'BMP',
      'image/tiff': 'TIFF',
    }
    
    const original = formatNames[originalFormat] || originalFormat
    const target = formatNames[targetFormat] || targetFormat
    
    return `Converted from ${original} to ${target} for optimal sealing verification`
  }
  
  /**
   * Get format display name for UI
   */
  getFormatDisplayName(mimeType: string): string {
    const formatNames: Record<string, string> = {
      'image/jpeg': 'JPEG',
      'image/jpg': 'JPEG',
      'image/png': 'PNG', 
      'image/webp': 'WebP',
      'image/gif': 'GIF',
      'image/bmp': 'BMP',
      'image/tiff': 'TIFF',
    }
    
    return formatNames[mimeType] || mimeType
  }
}

// Export default instance
export const formatConversionService = new FormatConversionService()
