/**
 * PDF-specific types for seal.codes
 * Handles PDF document processing, sealing, and verification
 */

import type { AttestationData } from './qrcode'

/**
 * PDF hash calculation result
 */
export interface PDFHashes {
  /** SHA-256 cryptographic hash of original PDF bytes */
  cryptographic: string;
  /** 64-bit composite perceptual hash (text + images) */
  compositePerceptual: string;
}

/**
 * PDF page render result for UI
 */
export interface PDFPageRenderResult {
  canvas: HTMLCanvasElement;
  pageNumber: number;
  dimensions: { width: number; height: number };
}

/**
 * PDF sealing options
 */
export interface PDFSealingOptions {
  originalFile: File;
  qrCodeDataUrl: string;
  position: { x: number; y: number };
  sizeInPixels: number;
  pageNumber: number;
  attestationData: AttestationData;
}

/**
 * PDF seal metadata stored in document
 */
export interface PDFSealMetadata {
  sealCodesVersion: string;
  qrLocation: {
    pageNumber: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  originalHashInfo: {
    algorithm: string;
    timestamp: string;
  };
}

/**
 * PDF verification result
 */
export interface PDFVerificationResult {
  isValid: boolean;
  hashMatch?: boolean;
  signatureValid?: boolean;
  attestationData?: AttestationData;
  metadata?: PDFSealMetadata;
  error?: string;
  errorCode?: string;
}

/**
 * PDF image data for processing
 */
export interface PDFImageData {
  width: number;
  height: number;
  data: Uint8Array;
  format: 'jpeg' | 'png' | 'other';
}

/**
 * PDF text extraction result
 */
export interface PDFTextContent {
  text: string;
  pageNumber: number;
}
