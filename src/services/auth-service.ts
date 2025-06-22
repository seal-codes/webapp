/**
 * Authentication service for seal.codes
 * Handles OAuth authentication using Supabase
 */

import { supabase } from './supabase-client'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import type { Provider } from '@supabase/supabase-js'
import { OAuthProviderError } from '@/types/errors'

export interface AuthUser {
  id: string
  email: string
  provider: string
  displayName: string
  avatarUrl?: string
}

export interface AuthSession {
  user: AuthUser
  accessToken: string
  expiresAt: number
}

/**
 * Authentication service class
 */
export class AuthService {
  /**
   * Sign in with OAuth provider using page redirect
   * 
   * @param provider - OAuth provider (google, github, etc.)
   * @returns Promise that resolves when sign-in is initiated or throws CodedError
   */
  async signInWithProvider(provider: string): Promise<void> {
    try {
      await this.initiateOAuthSignIn(provider)
    } catch (error) {
      this.handleSignInError(error, provider)
    }
  }

  /**
   * Initiate OAuth sign-in with Supabase
   */
  private async initiateOAuthSignIn(provider: string): Promise<void> {
    console.log(`🔐 Initiating OAuth sign-in with ${provider}`)
    
    const redirectTo = `${window.location.origin}/document`
    console.log(`🔗 OAuth redirect URL: ${redirectTo}`)
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as Provider,
      options: {
        redirectTo,
        queryParams: {
          flow: 'seal-document',
        },
      },
    })

    if (error) {
      this.handleOAuthError(error, provider)
    }

    console.log(`✅ OAuth sign-in initiated for ${provider}, redirecting to ${redirectTo}`)
  }

  /**
   * Handle OAuth-specific errors
   */
  private handleOAuthError(error: AuthError, provider: string): never {
    console.error('OAuth sign-in error:', error)
    
    if (this.isProviderConfigurationError(error)) {
      throw new OAuthProviderError(provider, true)
    }
    
    if (this.isNetworkError(error)) {
      throw new Error('network_error')
    }
    
    throw new Error('authentication_failed')
  }

  /**
   * Handle general sign-in errors
   */
  private handleSignInError(error: unknown, provider: string): never {
    console.error('Unexpected error during OAuth sign-in:', error)
    
    if (error instanceof OAuthProviderError) {
      throw error
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (this.isProviderConfigurationMessage(errorMessage)) {
      throw new OAuthProviderError(provider, true)
    }
    
    if (this.isKnownErrorCode(errorMessage)) {
      throw new Error(errorMessage)
    }
    
    throw new Error('unknown_error')
  }

  /**
   * Check if error indicates provider configuration issue
   */
  private isProviderConfigurationError(error: AuthError): boolean {
    return error.message?.includes('provider is not enabled') || 
           error.message?.includes('Unsupported provider') || false
  }

  /**
   * Check if error indicates network issue
   */
  private isNetworkError(error: AuthError): boolean {
    return error.message?.includes('network') || 
           error.message?.includes('fetch') || false
  }

  /**
   * Check if error message indicates provider configuration issue
   */
  private isProviderConfigurationMessage(message: string): boolean {
    return message.includes('provider') || message.includes('not enabled')
  }

  /**
   * Check if error message is a known error code
   */
  private isKnownErrorCode(message: string): boolean {
    return message === 'network_error' || 
           message === 'authentication_failed' || 
           message === 'unknown_error'
  }

  /**
   * Get current session
   * 
   * @returns Current session or null if not authenticated
   */
  async getSession(): Promise<AuthSession | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
        return null
      }

      if (!session) {
        return null
      }

      return this.transformSession(session)
    } catch (error) {
      console.error('Unexpected error getting session:', error)
      return null
    }
  }

  /**
   * Get current user
   * 
   * @returns Current user or null if not authenticated
   */
  async getUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.error('Error getting user:', error)
        return null
      }

      if (!user) {
        return null
      }

      return this.transformUser(user)
    } catch (error) {
      console.error('Unexpected error getting user:', error)
      return null
    }
  }

  /**
   * Sign out current user
   * 
   * @returns Promise that resolves when sign-out is complete
   */
  async signOut(): Promise<{ error?: AuthError }> {
    try {
      console.log('🔐 Signing out user')
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Sign-out error:', error)
        return { error }
      }

      console.log('✅ User signed out successfully')
      return {}
    } catch (error) {
      console.error('Unexpected error during sign-out:', error)
      return { 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          name: 'UnknownError',
          status: 500,
        } as AuthError, 
      }
    }
  }

  /**
   * Listen for authentication state changes
   * 
   * @param callback - Callback function to handle auth state changes
   * @returns Unsubscribe function
   */
  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`🔐 Auth state changed: ${event}`)
        
        if (session) {
          const transformedSession = this.transformSession(session)
          callback(transformedSession)
        } else {
          callback(null)
        }
      },
    )

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe()
    }
  }

  /**
   * Get access token for API calls
   * 
   * @returns Access token or null if not authenticated
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token || null
    } catch (error) {
      console.error('Error getting access token:', error)
      return null
    }
  }

  /**
   * Transform Supabase user to our AuthUser format
   */
  private transformUser(user: User): AuthUser {
    const provider = this.extractProvider(user)
    const displayName = this.extractDisplayName(user)

    return {
      id: user.id,
      email: user.email || '',
      provider,
      displayName,
      avatarUrl: user.user_metadata?.avatar_url,
    }
  }

  /**
   * Extract provider from user metadata
   */
  private extractProvider(user: User): string {
    return user.app_metadata?.provider || 'unknown'
  }

  /**
   * Extract display name from user metadata with fallbacks
   */
  private extractDisplayName(user: User): string {
    return user.user_metadata?.full_name || 
           user.user_metadata?.name || 
           user.email?.split('@')[0] || 
           'User'
  }

  /**
   * Transform Supabase session to our AuthSession format
   */
  private transformSession(session: Session): AuthSession {
    return {
      user: this.transformUser(session.user),
      accessToken: session.access_token,
      expiresAt: session.expires_at || 0,
    }
  }
}

/**
 * Default auth service instance
 */
export const authService = new AuthService()

// Export the error classes for use in components
export { OAuthProviderError }