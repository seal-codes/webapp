/**
 * QR Seal Renderer Service
 * Generates complete visual QR seals including borders, identity sections, etc.
 * This ensures the embedded seal matches exactly what users see in the preview.
 */

import { qrCodeService } from './qrcode-service'
import { providers } from '@/types/auth'
import type { AttestationData } from '@/types/qrcode'
import type { Provider } from '@/types/auth'

export interface QRSealOptions {
  /** The attestation data to encode */
  attestationData: AttestationData;
  /** Size of the QR code portion in pixels */
  qrSizeInPixels: number;
  /** Provider ID for identity display */
  providerId: string;
  /** User identifier for identity display */
  userIdentifier: string;
  /** Base URL for verification links */
  baseUrl?: string;
}

export interface QRSealResult {
  /** Data URL of the complete seal image */
  dataUrl: string;
  /** Total dimensions of the seal including borders and identity */
  dimensions: {
    width: number;
    height: number;
  };
}

/**
 * Service for rendering complete QR seals with visual styling
 */
export class QRSealRenderer {
  /**
   * Generate a complete QR seal image including borders, QR code, and identity section
   * 
   * @param options - Seal generation options
   * @returns Promise resolving to complete seal image
   */
  async generateSeal(options: QRSealOptions): Promise<QRSealResult> {
    const { attestationData, qrSizeInPixels, providerId, userIdentifier, baseUrl } = options
    
    // Generate the QR code with verification URL
    const qrResult = await qrCodeService.generateQRCode({
      data: attestationData,
      sizeInPixels: qrSizeInPixels,
      errorCorrectionLevel: 'H',
      margin: 0, // No margin in QR itself, we'll add padding in the seal
      baseUrl: baseUrl || window.location.origin,
    })

    // Get provider info
    const provider = providers.find((p: Provider) => p.id === providerId)
    const providerName = provider?.name || providerId

    // Calculate seal dimensions
    const padding = Math.max(8, qrSizeInPixels / 15) // Scale padding relative to QR size (minimum 8px)
    const identityHeight = Math.max(40, qrSizeInPixels / 4) // Scale identity section relative to QR size (minimum 40px)
    const borderRadius = Math.max(6, qrSizeInPixels / 15) // Scale radius relative to QR size (minimum 6px)
    
    const sealWidth = qrSizeInPixels + (padding * 2)
    const sealHeight = qrSizeInPixels + (padding * 2) + identityHeight

    // Create canvas for rendering
    const canvas = document.createElement('canvas')
    canvas.width = sealWidth
    canvas.height = sealHeight
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      throw new Error('Could not get canvas context')
    }

    // Draw the seal background
    await this.drawSealBackground(ctx, sealWidth, sealHeight, borderRadius)
    
    // Draw the QR code
    await this.drawQRCode(ctx, qrResult.dataUrl, padding, padding, qrSizeInPixels)
    
    // Draw the identity section
    await this.drawIdentitySection(
      ctx, 
      0, 
      qrSizeInPixels + padding, 
      sealWidth, 
      identityHeight,
      providerName,
      userIdentifier,
      qrSizeInPixels, // Pass QR size for font scaling
    )

    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/png')
    
    return {
      dataUrl,
      dimensions: {
        width: sealWidth,
        height: sealHeight,
      },
    }
  }

  /**
   * Draw the seal background with rounded corners and shadow effect
   */
  private async drawSealBackground(
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    borderRadius: number,
  ): Promise<void> {
    // Draw shadow (offset background)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
    this.drawRoundedRect(ctx, 2, 2, width, height, borderRadius)
    ctx.fill()

    // Draw main background
    ctx.fillStyle = '#ffffff'
    this.drawRoundedRect(ctx, 0, 0, width, height, borderRadius)
    ctx.fill()

    // Draw border
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    this.drawRoundedRect(ctx, 0.5, 0.5, width - 1, height - 1, borderRadius)
    ctx.stroke()
  }

  /**
   * Draw the QR code image onto the canvas
   */
   
  private async drawQRCode(
    ctx: CanvasRenderingContext2D,
    qrDataUrl: string,
    x: number,
    y: number,
    size: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, x, y, size, size)
        resolve()
      }
      img.onerror = () => reject(new Error('Failed to load QR code image'))
      img.src = qrDataUrl
    })
  }

  /**
   * Draw the identity section with provider and user info
   */
  // eslint-disable-next-line max-params
  private async drawIdentitySection(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    providerName: string,
    userIdentifier: string,
    qrSizeInPixels: number, // Add QR size parameter for font scaling
  ): Promise<void> {
    // Draw separator line
    ctx.strokeStyle = '#f3f4f6'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + 8, y)
    ctx.lineTo(x + width - 8, y)
    ctx.stroke()

    // Draw provider indicator (blue dot)
    // Calculate dynamic font sizes based on QR code dimensions (1/12 of height)
    const baseFontSize = Math.max(9, qrSizeInPixels / 12) // Minimum 9px
    const providerFontSize = Math.max(11, baseFontSize * 1.2) // Minimum 11px, slightly larger
    
    // Calculate vertical positioning - center the text block with small bottom padding
    const bottomPadding = Math.max(6, qrSizeInPixels / 20) // Small bottom padding
    const textBlockHeight = providerFontSize + baseFontSize + 8 // Height of both lines plus spacing
    const textStartY = y + (height - textBlockHeight - bottomPadding) / 2
    
    // Draw provider name (centered)
    ctx.fillStyle = '#374151'
    ctx.font = `bold ${Math.round(providerFontSize)}px system-ui, -apple-system, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(providerName, x + width / 2, textStartY + providerFontSize)

    // Draw user identifier (centered, truncated if too long)
    ctx.fillStyle = '#6b7280'
    ctx.font = `${Math.round(baseFontSize)}px system-ui, -apple-system, sans-serif`
    ctx.textAlign = 'center'
    
    const maxWidth = width - 16
    let displayText = userIdentifier
    
    // Truncate if too long
    while (ctx.measureText(displayText).width > maxWidth && displayText.length > 10) {
      displayText = displayText.substring(0, displayText.length - 4) + '...'
    }
    
    ctx.fillText(displayText, x + width / 2, textStartY + providerFontSize + 8 + baseFontSize)
  }

  /**
   * Helper function to draw rounded rectangles
   */
  // eslint-disable-next-line max-params
  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }
}

/**
 * Default QR seal renderer instance
 */
export const qrSealRenderer = new QRSealRenderer()