/**
 * Authentication providers service
 * Fetches available OAuth providers from Supabase
 */

import { supabase } from './supabase-client'
import type { Database } from './supabase-client'

export type AuthProvider = Database['public']['Tables']['auth_providers']['Row']

/**
 * Service for managing authentication providers
 */
export class AuthProvidersService {
  /**
   * Get all enabled authentication providers
   * 
   * @returns Promise resolving to array of enabled providers
   */
  async getEnabledProviders(): Promise<AuthProvider[]> {
    try {
      console.log('📡 Fetching enabled authentication providers...')
      
      const { data, error } = await supabase
        .from('auth_providers')
        .select('*')
        .eq('enabled', true)
        .order('name')

      if (error) {
        console.error('Error fetching auth providers:', error)
        throw new Error(`Failed to fetch authentication providers: ${error.message}`)
      }

      console.log(`✅ Fetched ${data.length} enabled providers`)
      return data
    } catch (error) {
      console.error('Unexpected error fetching auth providers:', error)
      throw error
    }
  }

  /**
   * Get all authentication providers (enabled and disabled)
   * 
   * @returns Promise resolving to array of all providers
   */
  async getAllProviders(): Promise<AuthProvider[]> {
    try {
      console.log('📡 Fetching all authentication providers...')
      
      const { data, error } = await supabase
        .from('auth_providers')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching auth providers:', error)
        throw new Error(`Failed to fetch authentication providers: ${error.message}`)
      }

      console.log(`✅ Fetched ${data.length} total providers`)
      return data
    } catch (error) {
      console.error('Unexpected error fetching auth providers:', error)
      throw error
    }
  }

  /**
   * Get a specific authentication provider by ID
   * 
   * @param providerId - The provider ID to fetch
   * @returns Promise resolving to provider or null if not found
   */
  async getProvider(providerId: string): Promise<AuthProvider | null> {
    try {
      console.log(`📡 Fetching provider: ${providerId}`)
      
      const { data, error } = await supabase
        .from('auth_providers')
        .select('*')
        .eq('id', providerId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          console.log(`Provider ${providerId} not found`)
          return null
        }
        console.error('Error fetching auth provider:', error)
        throw new Error(`Failed to fetch authentication provider: ${error.message}`)
      }

      console.log(`✅ Fetched provider: ${data.name}`)
      return data
    } catch (error) {
      console.error('Unexpected error fetching auth provider:', error)
      throw error
    }
  }
}

/**
 * Default auth providers service instance
 */
export const authProvidersService = new AuthProvidersService()