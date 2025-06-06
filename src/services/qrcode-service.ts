/**
 * QR Code generation service for seal.codes
 * Handles compact attestation data encoding and pixel-perfect generation
 */

import QRCode from 'qrcode';
import type {
  AttestationData,
  QRCodeGenerationOptions,
  QRCodeResult,
  QRCodeEmbeddingOptions
} from '@/types/qrcode';

/**
 * Core QR code generation service
 * Handles encoding of compact attestation data into QR codes
 */
export class QRCodeService {
  /**
   * Generate a QR code from attestation data
   * 
   * @param options - QR code generation options
   * @returns Promise resolving to QR code result
   */
  async generateQRCode(options: QRCodeGenerationOptions): Promise<QRCodeResult> {
    const {
      data,
      sizeInPixels,
      errorCorrectionLevel = 'H',
      margin = 1,
      colors = { dark: '#000000', light: '#FFFFFF' }
    } = options;

    try {
      // Serialize attestation data to compact JSON
      const serializedData = JSON.stringify(data);
      
      // Generate QR code with exact pixel dimensions
      const dataUrl = await QRCode.toDataURL(serializedData, {
        width: sizeInPixels,
        margin,
        errorCorrectionLevel,
        color: colors
      });

      return {
        dataUrl,
        dimensions: {
          width: sizeInPixels,
          height: sizeInPixels
        },
        attestationData: data
      };
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      throw new Error('QR code generation failed');
    }
  }

  /**
   * Generate QR code specifically for document embedding
   * Convenience method that wraps generateQRCode
   * 
   * @param options - Embedding options with pixel-perfect positioning
   * @returns Promise resolving to QR code result
   */
  async generateForEmbedding(options: QRCodeEmbeddingOptions): Promise<QRCodeResult> {
    return this.generateQRCode({
      data: options.attestationData,
      sizeInPixels: options.sizeInPixels,
      errorCorrectionLevel: 'H', // High error correction for document embedding
      margin: 1
    });
  }

  /**
   * Estimate QR code data capacity for given size
   * Helps determine if attestation data will fit
   * 
   * @param sizeInPixels - Target QR code size
   * @param errorCorrectionLevel - Error correction level
   * @returns Estimated data capacity in bytes
   */
  estimateDataCapacity(
    sizeInPixels: number, 
    errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'H'
  ): number {
    // Rough estimation based on QR code version and error correction
    // This is a simplified calculation - actual capacity depends on data type
    const capacityMap = {
      'L': 0.95, // Low error correction
      'M': 0.85, // Medium error correction  
      'Q': 0.75, // Quartile error correction
      'H': 0.65  // High error correction
    };
    
    // Estimate based on pixel size (very rough approximation)
    const baseCapacity = Math.floor(sizeInPixels / 4); // Simplified calculation
    return Math.floor(baseCapacity * capacityMap[errorCorrectionLevel]);
  }

  /**
   * Validate that attestation data will fit in QR code
   * 
   * @param data - Attestation data to validate
   * @param sizeInPixels - Target QR code size
   * @returns True if data should fit, false otherwise
   */
  validateDataSize(data: AttestationData, sizeInPixels: number): boolean {
    const serializedSize = JSON.stringify(data).length;
    const estimatedCapacity = this.estimateDataCapacity(sizeInPixels, 'H');
    
    return serializedSize <= estimatedCapacity;
  }
}

/**
 * Default QR code service instance
 */
export const qrCodeService = new QRCodeService();
