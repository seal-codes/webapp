/**
 * Type definitions for Vue I18n integration
 */

import { DefineLocaleMessage, DefineDateTimeFormat, DefineNumberFormat } from 'vue-i18n'

declare module 'vue-i18n' {
  // Define the locale messages schema
  export interface DefineLocaleMessage {
    common: {
      loading: string
      error: string
      success: string
      cancel: string
      confirm: string
      close: string
      save: string
      delete: string
      edit: string
      back: string
      next: string
      previous: string
      retry: string
    }
    navigation: {
      home: string
      sealDocument: string
      howItWorks: string
      about: string
    }
    home: {
      hero: {
        title: string
        subtitle: string
        cta: string
      }
      steps: {
        loadDocument: {
          title: string
          description: string
        }
        positionSeal: {
          title: string
          description: string
        }
        sealIt: {
          title: string
          description: string
        }
      }
    }
    document: {
      title: string
      dropzone: {
        title: string
        subtitle: string
        supportedFormats: string
        maxSize: string
        dragActive: string
        processing: string
        error: string
        selectFile: string
      }
      preview: {
        title: string
        qrPosition: string
        qrSize: string
        corners: {
          topLeft: string
          topRight: string
          bottomLeft: string
          bottomRight: string
        }
      }
      controls: {
        chooseAnother: string
        authenticateWith: string
      }
      howItWorks: {
        title: string
        steps: {
          upload: {
            title: string
            description: string
          }
          position: {
            title: string
            description: string
          }
          authenticate: {
            title: string
            description: string
          }
          download: {
            title: string
            description: string
          }
        }
      }
    }
    auth: {
      socialProviders: {
        title: string
        subtitle: string
        github: string
        google: string
        twitter: string
        linkedin: string
      }
      processing: string
      error: string
      success: string
    }
    sealed: {
      title: string
      subtitle: string
      download: string
      verify: string
      share: string
      details: {
        title: string
        sealedBy: string
        sealedAt: string
        provider: string
        documentHash: string
        verificationUrl: string
      }
      actions: {
        sealAnother: string
        viewOriginal: string
      }
    }
    verification: {
      title: string
      scanning: string
      verified: string
      invalid: string
      details: {
        authentic: string
        sealedBy: string
        sealedAt: string
        provider: string
        integrity: string
      }
      errors: {
        invalidQr: string
        networkError: string
        documentModified: string
        sealExpired: string
      }
    }
    errors: {
      fileTooBig: string
      unsupportedFormat: string
      uploadFailed: string
      processingFailed: string
      authenticationFailed: string
      sealingFailed: string
      networkError: string
      unexpectedError: string
    }
    footer: {
      copyright: string
      privacy: string
      terms: string
      contact: string
    }
    notFound: {
      title: string
      subtitle: string
      backHome: string
    }
  }

  // Define date time formats schema
  export interface DefineDateTimeFormat {}

  // Define number formats schema  
  export interface DefineNumberFormat {}
}
