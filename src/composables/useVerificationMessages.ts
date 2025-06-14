/**
 * Composable for handling enhanced verification error messages
 * Provides user-friendly interpretations of verification failures
 */

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SignatureVerificationResult } from '@/services/signature-verification-service'

export interface VerificationMessage {
  title: string
  subtitle: string
  description: string
  recommendation: string
  severity: 'success' | 'warning' | 'error' | 'info'
  documentIntegrityStatus: 'verified' | 'unverified' | 'unknown'
  identityStatus: 'verified' | 'suspicious' | 'unverified' | 'unknown'
}

export function useVerificationMessages() {
  const { t } = useI18n()

  /**
   * Get enhanced verification message based on verification result
   */
  const getVerificationMessage = (result: SignatureVerificationResult): VerificationMessage => {
    // Success case
    if (result.isValid) {
      return {
        title: t('verification.results.verified'),
        subtitle: t('verification.details.authentic'),
        description: t('verification.details.integrity'),
        recommendation: '',
        severity: 'success',
        documentIntegrityStatus: 'verified',
        identityStatus: 'verified',
      }
    }

    // Enhanced error handling based on error type
    switch (result.errorType) {
      case 'signature_mismatch':
        return {
          title: t('verification.errors.signatureMismatch.title'),
          subtitle: t('verification.errors.signatureMismatch.subtitle'),
          description: t('verification.errors.signatureMismatch.description'),
          recommendation: t('verification.errors.signatureMismatch.recommendation'),
          severity: 'warning',
          documentIntegrityStatus: result.documentIntegrityVerified ? 'verified' : 'unknown',
          identityStatus: 'suspicious',
        }

      case 'server_error':
        return {
          title: t('verification.errors.serverError.title'),
          subtitle: t('verification.errors.serverError.subtitle'),
          description: t('verification.errors.serverError.description'),
          recommendation: t('verification.errors.serverError.recommendation'),
          severity: 'info',
          documentIntegrityStatus: result.documentIntegrityVerified ? 'verified' : 'unknown',
          identityStatus: 'unverified',
        }

      case 'network_error':
        return {
          title: t('verification.errors.networkError.title'),
          subtitle: t('verification.errors.networkError.subtitle'),
          description: t('verification.errors.networkError.description'),
          recommendation: t('verification.errors.networkError.recommendation'),
          severity: 'error',
          documentIntegrityStatus: 'unknown',
          identityStatus: 'unknown',
        }

      case 'missing_data':
        return {
          title: t('verification.errors.missingData.title'),
          subtitle: t('verification.errors.missingData.subtitle'),
          description: t('verification.errors.missingData.description'),
          recommendation: t('verification.errors.missingData.recommendation'),
          severity: 'error',
          documentIntegrityStatus: 'unknown',
          identityStatus: 'unknown',
        }

      default:
        // Fallback for unknown error types
        return {
          title: t('verification.results.error'),
          subtitle: t('verification.results.failed'),
          description: result.error || t('errors.unknown_error'),
          recommendation: t('verification.errors.networkError.recommendation'),
          severity: 'error',
          documentIntegrityStatus: 'unknown',
          identityStatus: 'unknown',
        }
    }
  }

  /**
   * Get status icon based on verification message
   */
  const getStatusIcon = computed(() => (message: VerificationMessage) => {
    switch (message.severity) {
      case 'success':
        return '✅'
      case 'warning':
        return '⚠️'
      case 'error':
        return '❌'
      case 'info':
        return 'ℹ️'
      default:
        return '❓'
    }
  })

  /**
   * Get status color class based on verification message
   */
  const getStatusColorClass = computed(() => (message: VerificationMessage) => {
    switch (message.severity) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'warning':
        return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  })

  /**
   * Get document integrity status message
   */
  const getDocumentIntegrityMessage = computed(() => (status: VerificationMessage['documentIntegrityStatus']) => {
    switch (status) {
      case 'verified':
        return {
          text: t('verification.details.integrity'),
          icon: '✅',
          class: 'text-green-600'
        }
      case 'unverified':
        return {
          text: t('verification.errors.documentModified'),
          icon: '❌',
          class: 'text-red-600'
        }
      case 'unknown':
        return {
          text: t('verification.errors.networkError'),
          icon: '❓',
          class: 'text-gray-600'
        }
    }
  })

  /**
   * Get identity verification status message
   */
  const getIdentityStatusMessage = computed(() => (status: VerificationMessage['identityStatus']) => {
    switch (status) {
      case 'verified':
        return {
          text: t('verification.details.authentic'),
          icon: '✅',
          class: 'text-green-600'
        }
      case 'suspicious':
        return {
          text: t('verification.errors.signatureMismatch.title'),
          icon: '⚠️',
          class: 'text-amber-600'
        }
      case 'unverified':
        return {
          text: t('verification.errors.serverError.subtitle'),
          icon: '❓',
          class: 'text-blue-600'
        }
      case 'unknown':
        return {
          text: t('verification.errors.networkError.subtitle'),
          icon: '❓',
          class: 'text-gray-600'
        }
    }
  })

  return {
    getVerificationMessage,
    getStatusIcon,
    getStatusColorClass,
    getDocumentIntegrityMessage,
    getIdentityStatusMessage,
  }
}
