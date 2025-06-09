/**
 * QR Code generation and embedding types for seal.codes
 * Handles compact attestation data and pixel-perfect positioning
 */

/**
 * QR code exclusion zone information for hash calculation
 */
export interface QRCodeExclusionZone {
  /** X position in pixels */
  x: number;
  /** Y position in pixels */
  y: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Fill color used in exclusion zone (hex format) */
  fillColor: string;
}

/**
 * Compact attestation data structure for QR code embedding
 * All property names are shortened to minimize QR code size
 */
export interface AttestationData {
  /** Document hash information - compact format */
  h: {
    /** Cryptographic hash (SHA-256) */
    c: string;
    /** Perceptual hashes */
    p: {
      /** pHash */
      p: string;
      /** dHash */
      d: string;
    };
  };
  /** Timestamp of attestation */
  t: string;
  /** User identity information - minimal */
  i: {
    /** Provider (using provider.compactId) */
    p: string;
    /** Identifier (email/username) */
    id: string;
  };
  /** Service information */
  s: {
    /** Service name (shortened) */
    n: string;
    /** Public key ID */
    k: string;
  };
  /** QR code exclusion zone for verification */
  e: {
    /** X position */
    x: number;
    /** Y position */
    y: number;
    /** Width */
    w: number;
    /** Height */
    h: number;
    /** Fill color (hex without #) */
    f: string;
  };
  /** Optional user-provided URL */
  u?: string;
}

/**
 * QR code generation options
 */
export interface QRCodeGenerationOptions {
  /** The attestation data to encode */
  data: AttestationData;
  /** Exact size in pixels for the QR code */
  sizeInPixels: number;
  /** Error correction level */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  /** Margin around QR code (in modules) */
  margin?: number;
  /** Colors for the QR code */
  colors?: {
    dark: string;
    light: string;
  };
  /** Base URL for verification links */
  baseUrl?: string;
}

/**
 * Result of QR code generation
 */
export interface QRCodeResult {
  /** Data URL of the generated QR code */
  dataUrl: string;
  /** Actual pixel dimensions of the generated QR code */
  dimensions: {
    width: number;
    height: number;
  };
  /** The compact attestation data that was encoded */
  attestationData: AttestationData;
  /** The verification URL that was encoded in the QR code */
  verificationUrl?: string;
}

/**
 * Options for embedding QR code in documents
 * All parameters are in absolute pixels
 */
export interface QRCodeEmbeddingOptions {
  /** Exact position in pixels */
  position: {
    x: number;
    y: number;
  };
  /** Exact size in pixels */
  sizeInPixels: number;
  /** The compact attestation data to encode */
  attestationData: AttestationData;
  /** Base URL for verification links */
  baseUrl?: string;
}

/**
 * UI position as percentages (for preview components)
 */
export interface QRCodeUIPosition {
  /** X position as percentage of container width */
  x: number;
  /** Y position as percentage of container height */
  y: number;
}

/**
 * Document dimensions for calculations
 */
export interface DocumentDimensions {
  width: number;
  height: number;
}

/**
 * Pixel calculation result
 */
export interface PixelCalculationResult {
  /** Absolute position in pixels */
  position: {
    x: number;
    y: number;
  };
  /** Size in pixels */
  sizeInPixels: number;
  /** Complete seal dimensions including borders */
  completeSealDimensions: {
    width: number;
    height: number;
  };
  /** Exclusion zone for hash calculation */
  exclusionZone: QRCodeExclusionZone;
}