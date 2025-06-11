 
/**
 * QR Code generation service for seal.codes
 * Handles compact attestation data encoding and pixel-perfect generation with dynamic version selection
 */

import QRCode from 'qrcode'
import { verificationService } from './verification-service'
import type {
  AttestationData,
  QRCodeGenerationOptions,
  QRCodeResult,
  QRCodeEmbeddingOptions,
} from '@/types/qrcode'

/**
 * QR Code capacity data for different versions and error correction levels
 * Based on official QR code specifications for alphanumeric data
 */
const QR_CAPACITIES = {
  'L': [25, 47, 77, 114, 154, 195, 224, 279, 335, 395, 468, 535, 619, 667, 758, 854, 938, 1046, 1153, 1249, 1352, 1460, 1588, 1704, 1853, 1990, 2132, 2223, 2369, 2520, 2677, 2840, 3009, 3183, 3351, 3537, 3729, 3927, 4087, 4296],
  'M': [20, 38, 61, 90, 122, 154, 178, 221, 262, 311, 366, 419, 483, 528, 600, 656, 734, 816, 909, 970, 1035, 1134, 1248, 1326, 1451, 1542, 1637, 1732, 1839, 1994, 2113, 2238, 2369, 2506, 2632, 2780, 2894, 3054, 3220, 3391],
  'Q': [16, 29, 47, 67, 87, 108, 125, 157, 189, 221, 259, 296, 352, 376, 426, 470, 531, 574, 644, 702, 742, 823, 890, 963, 1041, 1094, 1172, 1263, 1322, 1429, 1499, 1618, 1700, 1787, 1867, 1966, 2071, 2181, 2298, 2420],
  'H': [10, 20, 35, 50, 64, 84, 93, 122, 143, 174, 200, 227, 259, 283, 321, 365, 408, 452, 493, 557, 587, 640, 672, 744, 779, 864, 910, 958, 1016, 1080, 1150, 1226, 1307, 1394, 1431, 1530, 1591, 1658, 1774, 1852],
}

/**
 * Core QR code generation service
 * Handles encoding of compact attestation data into QR codes with optimal version selection
 */
export class QRCodeService {
  /**
   * Generate a QR code from attestation data with dynamic version selection
   * 
   * @param options - QR code generation options
   * @returns Promise resolving to QR code result
   */
  async generateQRCode(options: QRCodeGenerationOptions): Promise<QRCodeResult> {
    const {
      data,
      sizeInPixels,
      margin = 1,
      colors = { dark: '#000000', light: '#FFFFFF' },
      baseUrl = window.location.origin,
    } = options

    try {
      // Generate verification URL
      const verificationUrl = verificationService.generateVerificationUrl(data, baseUrl)
      
      console.log('🔗 Generated verification URL:', verificationUrl)
      console.log('📏 URL length:', verificationUrl.length, 'characters')
      
      // Determine optimal error correction level and validate capacity
      const optimalSettings = this.determineOptimalSettings(verificationUrl)
      console.log('⚙️ Optimal settings:', optimalSettings)
      
      // Generate QR code with optimal settings
      // Let the library automatically determine the version instead of forcing it
      const dataUrl = await QRCode.toDataURL(verificationUrl, {
        width: sizeInPixels,
        margin,
        errorCorrectionLevel: optimalSettings.errorCorrection,
        color: colors,
        // Removed version specification to allow automatic version selection
      })

      return {
        dataUrl,
        dimensions: {
          width: sizeInPixels,
          height: sizeInPixels,
        },
        attestationData: data,
        verificationUrl,
      }
    } catch (error) {
      console.error('Failed to generate QR code:', error)
      throw new Error('QR code generation failed')
    }
  }

  /**
   * Determine optimal QR code settings based on data length
   * 
   * @param data - The data to encode (URL string)
   * @returns Optimal error correction level and version
   */
  private determineOptimalSettings(data: string): {
    errorCorrection: 'L' | 'M' | 'Q' | 'H';
    version: number;
    capacity: number;
  } {
    const dataLength = data.length
    
    // Try error correction levels in order of preference (M, Q, L, H)
    // M provides good balance, Q provides better error correction, L maximizes capacity, H is most robust
    const preferredLevels: Array<'L' | 'M' | 'Q' | 'H'> = ['M', 'Q', 'L', 'H']
    
    for (const level of preferredLevels) {
      const version = this.findMinimumVersion(dataLength, level)
      if (version <= 40) { // Valid QR version found
        const capacity = QR_CAPACITIES[level][version - 1]
        console.log(`✅ Found suitable settings: Level ${level}, Version ${version}, Capacity ${capacity}`)
        return {
          errorCorrection: level,
          version,
          capacity,
        }
      }
    }
    
    // Fallback to lowest error correction if nothing else works
    console.warn('⚠️ Using fallback settings - data might be too long')
    return {
      errorCorrection: 'L',
      version: 40,
      capacity: QR_CAPACITIES.L[39],
    }
  }

  /**
   * Find minimum QR version needed for given data length and error correction level
   * 
   * @param dataLength - Length of data to encode
   * @param errorCorrection - Error correction level
   * @returns Minimum QR version (1-40, or 41 if impossible)
   */
  private findMinimumVersion(dataLength: number, errorCorrection: 'L' | 'M' | 'Q' | 'H'): number {
    const capacities = QR_CAPACITIES[errorCorrection]
    
    for (let i = 0; i < capacities.length; i++) {
      if (dataLength <= capacities[i]) {
        return i + 1 // QR versions are 1-indexed
      }
    }
    
    return 41 // Indicates impossible to encode
  }

  /**
   * Get QR code version information for given settings
   * 
   * @param dataLength - Length of data to encode
   * @param errorCorrection - Error correction level
   * @returns Version information
   */
  getVersionInfo(dataLength: number, errorCorrection: 'L' | 'M' | 'Q' | 'H' = 'M'): {
    version: number;
    capacity: number;
    efficiency: number; // Percentage of capacity used
    recommendation: string;
  } {
    const version = this.findMinimumVersion(dataLength, errorCorrection)
    
    if (version > 40) {
      return {
        version: 40,
        capacity: QR_CAPACITIES[errorCorrection][39],
        efficiency: (dataLength / QR_CAPACITIES[errorCorrection][39]) * 100,
        recommendation: 'Data too long - consider reducing content',
      }
    }
    
    const capacity = QR_CAPACITIES[errorCorrection][version - 1]
    const efficiency = (dataLength / capacity) * 100
    
    let recommendation = 'Optimal'
    if (efficiency > 90) {
      recommendation = 'Near capacity - consider shorter data'
    } else if (efficiency < 50) {
      recommendation = 'Could use higher error correction'
    }
    
    return {
      version,
      capacity,
      efficiency,
      recommendation,
    }
  }

  /**
   * Generate QR code specifically for document embedding
   * Uses optimal settings for readability and error correction
   * 
   * @param options - Embedding options with pixel-perfect positioning
   * @returns Promise resolving to QR code result
   */
  async generateForEmbedding(options: QRCodeEmbeddingOptions): Promise<QRCodeResult> {
    return this.generateQRCode({
      data: options.attestationData,
      sizeInPixels: options.sizeInPixels,
      margin: 1,
      baseUrl: options.baseUrl,
    })
  }

  /**
   * Estimate QR code data capacity for given size and error correction
   * 
   * @param sizeInPixels - Target QR code size
   * @param errorCorrectionLevel - Error correction level
   * @returns Estimated data capacity in characters
   */
  estimateDataCapacity(
    sizeInPixels: number, 
    errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'M',
  ): number {
    // Estimate QR version based on pixel size
    // This is a rough approximation - actual capacity depends on many factors
    const estimatedVersion = Math.min(40, Math.max(1, Math.floor(sizeInPixels / 25)))
    const capacity = QR_CAPACITIES[errorCorrectionLevel][estimatedVersion - 1]
    
    console.log(`📊 Estimated capacity for ${sizeInPixels}px: Version ${estimatedVersion}, ${capacity} chars`)
    
    return capacity
  }

  /**
   * Validate that attestation data will fit in QR code with optimal settings
   * 
   * @param data - Attestation data to validate
   * @param sizeInPixels - Target QR code size
   * @param baseUrl - Base URL for verification
   * @returns True if data should fit, false otherwise
   */
  validateDataSize(data: AttestationData, sizeInPixels: number, baseUrl: string = window.location.origin): boolean {
    const verificationUrl = verificationService.generateVerificationUrl(data, baseUrl)
    const urlLength = verificationUrl.length
    
    // Try to find suitable settings
    const settings = this.determineOptimalSettings(verificationUrl)
    const canFit = settings.version <= 40
    
    console.log('📏 Data validation:', {
      urlLength,
      version: settings.version,
      errorCorrection: settings.errorCorrection,
      capacity: settings.capacity,
      canFit,
    })
    
    return canFit
  }

  /**
   * Get recommendations for optimizing QR code generation
   * 
   * @param data - Attestation data
   * @param baseUrl - Base URL for verification
   * @returns Optimization recommendations
   */
  getOptimizationRecommendations(data: AttestationData, baseUrl: string = window.location.origin): {
    currentSize: number;
    recommendations: string[];
    estimatedSavings: number;
  } {
    const verificationUrl = verificationService.generateVerificationUrl(data, baseUrl)
    const currentSize = verificationUrl.length
    const recommendations: string[] = []
    let estimatedSavings = 0
    
    // Analyze URL components for optimization opportunities
    if (baseUrl.length > 20) {
      recommendations.push('Use shorter domain name for verification URLs')
      estimatedSavings += Math.max(0, baseUrl.length - 20)
    }
    
    // Check if attestation data can be further compressed
    const attestationJson = JSON.stringify(data)
    if (attestationJson.length > 200) {
      recommendations.push('Consider further compressing attestation data')
      estimatedSavings += Math.floor(attestationJson.length * 0.1) // Estimate 10% savings
    }
    
    // Check for optional fields
    if (data.u) {
      recommendations.push('Optional user URL adds to QR size - consider removing if not essential')
      estimatedSavings += data.u.length + 10 // URL plus encoding overhead
    }
    
    if (recommendations.length === 0) {
      recommendations.push('QR code is already well optimized')
    }
    
    return {
      currentSize,
      recommendations,
      estimatedSavings,
    }
  }

  /**
   * Generate multiple QR code versions for comparison
   * Useful for testing and optimization
   * 
   * @param data - Attestation data
   * @param sizeInPixels - Target size
   * @param baseUrl - Base URL
   * @returns Array of QR codes with different settings
   */
  async generateComparisonVersions(
    data: AttestationData, 
    sizeInPixels: number, 
    baseUrl: string = window.location.origin,
  ): Promise<Array<{
    errorCorrection: 'L' | 'M' | 'Q' | 'H';
    version: number;
    dataUrl: string;
    efficiency: number;
  }>> {
    const verificationUrl = verificationService.generateVerificationUrl(data, baseUrl)
    const results = []
    
    for (const level of ['L', 'M', 'Q', 'H'] as const) {
      try {
        const version = this.findMinimumVersion(verificationUrl.length, level)
        if (version <= 40) {
          const dataUrl = await QRCode.toDataURL(verificationUrl, {
            width: sizeInPixels,
            margin: 1,
            errorCorrectionLevel: level,
            // Let library determine version automatically
          })
          
          const capacity = QR_CAPACITIES[level][version - 1]
          const efficiency = (verificationUrl.length / capacity) * 100
          
          results.push({
            errorCorrection: level,
            version,
            dataUrl,
            efficiency,
          })
        }
      } catch (error) {
        console.warn(`Failed to generate QR with level ${level}:`, error)
      }
    }
    
    return results
  }
}

/**
 * Default QR code service instance
 */
export const qrCodeService = new QRCodeService()