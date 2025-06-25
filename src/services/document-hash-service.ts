/**
 * Document hashing service with QR code exclusion zone support
 * Handles cryptographic and perceptual hashing while excluding QR code areas
 */

import type { QRCodeExclusionZone } from "@/types/qrcode";

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
    if (document.type.startsWith("image/")) {
      return this.calculateImageHashes(document, exclusionZone);
    } else {
      throw new Error("Unsupported document type");
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
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Apply an exlusion zone if provided. (required when hashing images)
      if (exclusionZone) {
        img.onload = async () => {
          try {
            // Set canvas dimensions to match image
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            // Draw the original image
            ctx.drawImage(img, 0, 0);

            canvas.toBlob((blob) => {
              const reader = new FileReader();
              reader.onload = async () => {
                if (reader.result instanceof ArrayBuffer) {
                  const arrayBuffer = reader.result;
                  const uint8Array = new Uint8Array(arrayBuffer);
                  // Calculate hashes (pass exclusion zone for perceptual hash awareness)
                  const hashes = await this.calculateHashesFromImageData(
                    uint8Array,
                    exclusionZone
                  );
                  resolve(hashes);
                }
              };
              reader.readAsArrayBuffer(blob!);
            });
          } catch (error) {
            reject(error);
          }
        };

        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = URL.createObjectURL(imageFile);
      }
    });
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
    ctx.fillStyle = exclusionZone.fillColor;
    ctx.fillRect(
      exclusionZone.x,
      exclusionZone.y,
      exclusionZone.width,
      exclusionZone.height
    );
  }

  /**
   * Calculate hashes from image data
   *
   * @param imageData - Canvas image data
   * @param exclusionZone - Area to exclude from perceptual hash calculation
   * @returns Promise resolving to calculated hashes
   */
  protected async calculateHashesFromImageData(
    imageArrayBuffer: Uint8Array<ArrayBuffer>,
    exclusionZone: QRCodeExclusionZone
  ): Promise<DocumentHashes> {
    // Calculate hashes
    const { pHash, dHash, sha256Hash } =
      await window.GetHashOfImageWithExclusionZone({
        img: imageArrayBuffer,
        exclusionZone: {
          x: exclusionZone.x,
          y: exclusionZone.y,
          width: exclusionZone.width,
          height: exclusionZone.height,
        },
      });
    return {
      cryptographic: sha256Hash,
      pHash,
      dHash,
    };
  }

  /**
   * Convert ImageData to ArrayBuffer for hashing
   */
  private async imageDataToBuffer(imageData: ImageData): Promise<ArrayBuffer> {
    // Handle both browser and Node.js environments
    if (imageData.data.buffer) {
      // Node.js canvas or browser with proper TypedArray
      return imageData.data.buffer.slice(
        imageData.data.byteOffset || 0,
        (imageData.data.byteOffset || 0) + imageData.data.byteLength
      );
    } else {
      // Fallback: create a new buffer and copy data
      const buffer = new ArrayBuffer(imageData.data.length);
      const view = new Uint8Array(buffer);
      view.set(imageData.data);
      return buffer;
    }
  }

  /**
   * Calculate SHA-256 hash of data
   */
  protected async calculateSHA256(
    data: Uint8Array<ArrayBuffer>
  ): Promise<string> {
    // Use the Web Crypto API to calculate SHA-256
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);

    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex;
  }

  /**
   * Calculate perceptual hashes (pHash and dHash) - optimized for QR code size
   * Uses smaller hash sizes to fit in QR codes while maintaining reasonable accuracy
   */
  protected async calculatePerceptualHashes(
    imageData: ImageData
  ): Promise<{ pHash: string; dHash: string }> {
    // Create source canvas from the full ImageData
    const sourceCanvas = document.createElement("canvas");
    const sourceCtx = sourceCanvas.getContext("2d");
    if (!sourceCtx) {
      throw new Error("Could not get source canvas context");
    }

    sourceCanvas.width = imageData.width;
    sourceCanvas.height = imageData.height;
    sourceCtx.putImageData(imageData, 0, 0);

    // For pHash: Resize to 16x16 and calculate hash
    const pHashCanvas = document.createElement("canvas");
    const pHashCtx = pHashCanvas.getContext("2d");
    if (!pHashCtx) {
      throw new Error("Could not get pHash canvas context");
    }

    pHashCanvas.width = 16;
    pHashCanvas.height = 16;

    // Properly resize the entire image to 16x16
    pHashCtx.drawImage(sourceCanvas, 0, 0, 16, 16);

    // Convert to grayscale and calculate average
    const pHashData = pHashCtx.getImageData(0, 0, 16, 16);
    const grayValues = new Array(256); // 16x16
    let averageValue = 0;

    for (let i = 0; i < pHashData.data.length; i += 4) {
      // Convert to grayscale using luminosity method
      const gray = Math.round(
        0.299 * pHashData.data[i] +
          0.587 * pHashData.data[i + 1] +
          0.114 * pHashData.data[i + 2]
      );
      grayValues[i / 4] = gray;
      averageValue += gray;
    }
    averageValue /= 256;

    // Compare each pixel to average to generate pHash
    let pHashValue = "";
    for (let i = 0; i < 256; i++) {
      pHashValue += grayValues[i] > averageValue ? "1" : "0";
    }

    // For dHash: Resize to 7x6 and calculate difference hash
    const dHashCanvas = document.createElement("canvas");
    const dHashCtx = dHashCanvas.getContext("2d");
    if (!dHashCtx) {
      throw new Error("Could not get dHash canvas context");
    }

    dHashCanvas.width = 7;
    dHashCanvas.height = 6;

    // Properly resize the entire image to 7x6
    dHashCtx.drawImage(sourceCanvas, 0, 0, 7, 6);

    // Calculate differences between adjacent pixels
    const dHashData = dHashCtx.getImageData(0, 0, 7, 6);
    let dHashValue = "";

    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) {
        const leftIndex = (y * 7 + x) * 4;
        const rightIndex = (y * 7 + x + 1) * 4;

        // Use red channel for comparison (could also use grayscale)
        const left = dHashData.data[leftIndex];
        const right = dHashData.data[rightIndex];
        dHashValue += left > right ? "1" : "0";
      }
    }
    return {
      pHash: pHashValue,
      dHash: dHashValue,
    };
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
    fillColor: string = "#FFFFFF"
  ): QRCodeExclusionZone {
    return {
      x: position.x,
      y: position.y,
      width: sealDimensions.width,
      height: sealDimensions.height,
      fillColor,
    };
  }
}

/**
 * Default document hash service instance
 */
export const documentHashService = new DocumentHashService();
