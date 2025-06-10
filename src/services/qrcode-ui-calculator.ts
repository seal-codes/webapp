/**
 * QR Code UI calculation service
 * Converts UI percentage values to absolute pixels for document embedding
 */

import type {
  QRCodeUIPosition,
  DocumentDimensions,
  PixelCalculationResult,
  QRCodeExclusionZone,
} from '@/types/qrcode'

/**
 * Service for converting UI positioning to pixel-perfect embedding coordinates
 */
export class QRCodeUICalculator {
  /**
   * Convert UI percentage values to absolute pixels for embedding
   * 
   * @param uiPosition - Position as percentages (0-100)
   * @param uiSizePercent - Size as percentage (10-30)
   * @param documentDimensions - Document dimensions in pixels
   * @param documentType - Type of document for type-specific calculations
   * @returns Absolute pixel coordinates and size with exclusion zone
   */
  calculateEmbeddingPixels(
    uiPosition: QRCodeUIPosition,
    uiSizePercent: number,
    documentDimensions: DocumentDimensions,
    documentType: 'pdf' | 'image',
  ): PixelCalculationResult {
    // Calculate size based on document type with minimum size enforcement
    const sizeInPixels = this.calculateSizeInPixels(
      uiSizePercent,
      documentDimensions,
      documentType,
    )

    // Calculate complete seal dimensions
    const completeSealDimensions = this.calculateCompleteSealDimensions(sizeInPixels)

    // Calculate position using TOP-LEFT based positioning (not center-based)
    // This ensures consistent positioning
    const position = {
      x: Math.round((documentDimensions.width * uiPosition.x / 100) - (completeSealDimensions.width / 2)),
      y: Math.round((documentDimensions.height * uiPosition.y / 100) - (completeSealDimensions.height / 2)),
    }

    // Ensure QR code stays within document bounds
    const boundedPosition = this.ensureBounds(
      position,
      completeSealDimensions,
      documentDimensions,
    )

    // Create exclusion zone with exact pixel coordinates
    const exclusionZone: QRCodeExclusionZone = {
      x: boundedPosition.x,
      y: boundedPosition.y,
      width: completeSealDimensions.width,
      height: completeSealDimensions.height,
      fillColor: '#FFFFFF' // White background for exclusion
    }

    return {
      position: boundedPosition,
      sizeInPixels,
      completeSealDimensions,
      exclusionZone,
    }
  }

  /**
   * Calculate QR code size in pixels based on document type
   * Note: This is the QR code portion size, the complete seal will be larger
   * 
   * @param sizePercent - Size as percentage
   * @param documentDimensions - Document dimensions
   * @param documentType - Document type
   * @returns Size in pixels for the QR code portion
   */
  private calculateSizeInPixels(
    sizePercent: number,
    documentDimensions: DocumentDimensions,
    documentType: 'pdf' | 'image',
  ): number {
    let calculatedSize: number

    if (documentType === 'image') {
      // For images: use percentage of smallest dimension for pixel-perfect scaling
      const minDimension = Math.min(documentDimensions.width, documentDimensions.height)
      calculatedSize = Math.round(minDimension * sizePercent / 100)
    } else {
      // For PDFs: use percentage of width (PDFs are typically portrait)
      calculatedSize = Math.round(documentDimensions.width * sizePercent / 100)
    }

    // Enforce minimum size for scannability
    const MINIMUM_QR_SIZE = 120 // pixels - minimum for reliable scanning
    return Math.max(calculatedSize, MINIMUM_QR_SIZE)
  }

  /**
   * Calculate the complete seal dimensions (QR code + borders + identity section)
   * 
   * @param qrSizeInPixels - Size of just the QR code portion
   * @returns Complete seal dimensions
   */
  calculateCompleteSealDimensions(qrSizeInPixels: number): { width: number; height: number } {
    const padding = 12 // Padding around QR code
    const identityHeight = 50 // Height of identity section
    
    return {
      width: qrSizeInPixels + (padding * 2),
      height: qrSizeInPixels + (padding * 2) + identityHeight,
    }
  }

  /**
   * Ensure QR code position stays within document bounds
   * Updated to account for complete seal dimensions
   * 
   * @param position - Calculated position
   * @param sealDimensions - Complete seal dimensions
   * @param documentDimensions - Document dimensions
   * @returns Bounded position
   */
  private ensureBounds(
    position: { x: number; y: number },
    sealDimensions: { width: number; height: number },
    documentDimensions: DocumentDimensions,
  ): { x: number; y: number } {
    return {
      x: Math.max(0, Math.min(documentDimensions.width - sealDimensions.width, position.x)),
      y: Math.max(0, Math.min(documentDimensions.height - sealDimensions.height, position.y)),
    }
  }

  /**
   * Calculate safe margins for QR code placement
   * Ensures QR code doesn't get too close to document edges
   * Accounts for the complete seal dimensions including identity section
   * 
   * @param qrSizePercent - QR code size as percentage
   * @param documentDimensions - Document dimensions
   * @returns Safe margin percentages
   */
  calculateSafeMargins(
    qrSizePercent: number,
    documentDimensions: DocumentDimensions,
  ): {
    horizontal: number; // percentage
    vertical: number;   // percentage
  } {
    // Fallback to reasonable defaults if dimensions are invalid
    if (!documentDimensions.width || !documentDimensions.height || 
        documentDimensions.width < 10 || documentDimensions.height < 10) {
      return {
        horizontal: Math.max(qrSizePercent / 2 + 5, 12),
        vertical: Math.max(qrSizePercent / 2 + 8, 15), // Extra vertical margin for identity section
      }
    }
    
    // Calculate the QR code size in pixels based on the smaller dimension
    const minDimension = Math.min(documentDimensions.width, documentDimensions.height)
    const qrSizeInPixels = Math.round(minDimension * qrSizePercent / 100)
    
    // Get complete seal dimensions
    const sealDimensions = this.calculateCompleteSealDimensions(qrSizeInPixels)
    
    // Convert seal dimensions to percentages of the document
    const sealWidthPercent = (sealDimensions.width / documentDimensions.width) * 100
    const sealHeightPercent = (sealDimensions.height / documentDimensions.height) * 100
    
    // Calculate margins as half the seal size (since position is center-based)
    // Add a small buffer to ensure the seal never touches the edges
    const horizontalMargin = Math.max(sealWidthPercent / 2 + 2, 8) // At least 8%
    const verticalMargin = Math.max(sealHeightPercent / 2 + 2, 8) // At least 8%
    
    // Ensure margins don't exceed reasonable limits (max 25% to keep usable area)
    return {
      horizontal: Math.min(horizontalMargin, 25),
      vertical: Math.min(verticalMargin, 25),
    }
  }

  /**
   * Get corner positions with safe margins
   * 
   * @param qrSizePercent - QR code size as percentage
   * @returns Corner positions as percentages
   */
  getCornerPositions(
    qrSizePercent: number,
  ): Record<string, QRCodeUIPosition> {
    // Use a standard document dimension for margin calculation
    // This ensures consistent positioning across different document sizes
    const standardDimensions = { width: 800, height: 600 }
    const margins = this.calculateSafeMargins(qrSizePercent, standardDimensions)
    
    return {
      topLeft: { x: margins.horizontal, y: margins.vertical },
      topRight: { x: 100 - margins.horizontal, y: margins.vertical },
      bottomLeft: { x: margins.horizontal, y: 100 - margins.vertical },
      bottomRight: { x: 100 - margins.horizontal, y: 100 - margins.vertical },
    }
  }
}

/**
 * Default QR code UI calculator instance
 */
export const qrCodeUICalculator = new QRCodeUICalculator()