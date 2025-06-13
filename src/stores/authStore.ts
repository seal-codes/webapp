import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService, type AuthUser, OAuthProviderError } from '@/services/auth-service'
import { CodedError } from '@/types/errors'

/**
 * Authentication store for seal.codes
 * 
 * This store handles popup-based OAuth authentication for document signing.
 * Unlike traditional apps, we only need authentication at the moment of signing,
 * not for persistent user sessions.
 */
export const useAuthStore = defineStore('auth', () => {
  // State
  const currentUser = ref<AuthUser | null>(null)
  const isAuthenticating = ref(false)
  const authError = ref<string | null>(null)
  
  // Getters
  const isAuthenticated = computed(() => currentUser.value !== null)
  const authProvider = computed(() => currentUser.value?.provider || null)
  const userName = computed(() => currentUser.value?.displayName || currentUser.value?.email || null)
  const userEmail = computed(() => currentUser.value?.email || null)
  
  // Actions
  
  /**
   * Authenticate with OAuth provider using page redirect
   * 
   * @param provider - OAuth provider ID (google, github, etc.)
   * @returns Promise that resolves when authentication is initiated
   */
  const authenticateWithProvider = async (provider: string): Promise<void> => {
    console.log('🔐 Starting page-based authentication with provider:', provider)
    
    isAuthenticating.value = true
    authError.value = null
    
    try {
      // Initiate OAuth sign-in - this will redirect the user
      await authService.signInWithProvider(provider)
      
      console.log('✅ OAuth sign-in initiated successfully')
      
    } catch (error) {
      console.error('❌ Authentication failed:', error)
      
      // Clean up state on error
      currentUser.value = null
      
      // Re-throw coded errors for the component to handle
      if (error instanceof OAuthProviderError || error instanceof CodedError) {
        throw error
      }
      
      // Handle Error objects with specific messages
      if (error instanceof Error) {
        const message = error.message
        if (message === 'network_error' || message === 'authentication_failed' || message === 'unknown_error') {
          throw new CodedError(message as 'network_error' | 'authentication_failed' | 'unknown_error', message)
        }
      }
      
      // Default error
      authError.value = error instanceof Error ? error.message : 'Authentication failed'
      throw new CodedError('authentication_failed', 'Authentication failed')
    } finally {
      isAuthenticating.value = false
    }
  }
  
  /**
   * Sign out current user
   * In our use case, this just clears the current session
   */
  const signOut = async () => {
    console.log('🔐 Signing out user...')
    
    try {
      await authService.signOut()
      currentUser.value = null
      authError.value = null
      console.log('✅ User signed out successfully')
    } catch (error) {
      console.error('❌ Error signing out:', error)
      // Even if sign out fails, clear local state
      currentUser.value = null
      authError.value = null
    }
  }
  
  /**
   * Check for existing session on app startup
   * This handles cases where user might already be authenticated
   */
  const initializeAuth = async () => {
    console.log('🔐 Checking for existing authentication session...')
    
    try {
      const session = await authService.getSession()
      if (session) {
        currentUser.value = session.user
        console.log('✅ Found existing session:', session.user.email)
      } else {
        console.log('ℹ️ No existing session found')
      }
    } catch (error) {
      console.error('❌ Error checking existing session:', error)
      // Don't throw error on initialization failure
      currentUser.value = null
    }
  }
  
  /**
   * Clear any authentication errors
   */
  const clearError = () => {
    authError.value = null
  }
  
  /**
   * Reset authentication state
   * Used when starting fresh or handling errors
   */
  const reset = () => {
    console.log('🔄 Resetting authentication state...')
    currentUser.value = null
    isAuthenticating.value = false
    authError.value = null
    console.log('✅ Authentication state reset completed')
  }
  
  return {
    // State
    currentUser,
    isAuthenticating,
    authError,
    
    // Getters
    isAuthenticated,
    authProvider,
    userName,
    userEmail,
    
    // Actions
    authenticateWithProvider,
    signOut,
    initializeAuth,
    clearError,
    reset,
  }
})
