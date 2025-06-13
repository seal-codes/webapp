/**
 * Error codes for i18n support
 */

export type AuthErrorCode = 
  | 'provider_not_configured'
  | 'authentication_failed'
  | 'network_error'
  | 'unknown_error'

export type DocumentErrorCode =
  | 'document_load_failed'
  | 'document_seal_failed'
  | 'document_processing_failed'
  | 'unsupported_format'
  | 'file_too_large'
  | 'document_required'
  | 'invalid_step'
  | 'document_mismatch'

export type ErrorCode = AuthErrorCode | DocumentErrorCode

/**
 * Error result with code for i18n mapping
 */
export interface ErrorResult {
  code: ErrorCode
  provider?: string
  details?: string
}

/**
 * Custom error class that includes error codes for i18n
 */
export class CodedError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public provider?: string,
    public details?: string,
  ) {
    super(message)
    this.name = 'CodedError'
  }
}

/**
 * OAuth provider configuration error
 */
export class OAuthProviderError extends CodedError {
  constructor(
    provider: string,
    public isConfigurationError: boolean = false,
  ) {
    super(
      'provider_not_configured',
      `Provider ${provider} is not configured`,
      provider,
    )
    this.name = 'OAuthProviderError'
  }
}