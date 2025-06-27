/**
 * Supabase client configuration for seal.codes
 * Provides configured Supabase client instance for authentication and API calls
 */

import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

/**
 * Check if we're in a test environment and should use mock client
 */
function shouldUseMockClient(): boolean {
  // Check for test environment indicators
  return (
    typeof window !== 'undefined' && 
    (window as any).__MOCK_SUPABASE_SESSION__ !== undefined
  ) || (
    typeof process !== 'undefined' && 
    process.env.NODE_ENV === 'test'
  )
}

/**
 * Create mock Supabase client for testing
 */
function createMockClient() {
  console.log('[MOCK] Creating mock Supabase client')
  
  const getMockSession = () => {
    if (typeof window !== 'undefined' && (window as any).__MOCK_SUPABASE_SESSION__) {
      return (window as any).__MOCK_SUPABASE_SESSION__
    }
    return null
  }

  const mockAuth = {
    getSession: async () => {
      const session = getMockSession()
      console.log('[MOCK] getSession called - returning:', session ? 'mock session' : 'no session')
      return { 
        data: { session }, 
        error: null, 
      }
    },
    getUser: async () => {
      const session = getMockSession()
      const user = session?.user || null
      console.log('[MOCK] getUser called - returning:', user ? 'mock user' : 'no user')
      return { 
        data: { user }, 
        error: null, 
      }
    },
    signInWithOAuth: async (options: any) => {
      console.log('[MOCK] signInWithOAuth called with:', options)
      return { 
        data: { url: 'https://mock-oauth.com' }, 
        error: null, 
      }
    },
    signOut: async () => {
      console.log('[MOCK] signOut called')
      if (typeof window !== 'undefined') {
        delete (window as any).__MOCK_SUPABASE_SESSION__
      }
      return { error: null }
    },
    onAuthStateChange: (callback: any) => {
      console.log('[MOCK] onAuthStateChange listener registered')
      
      // Immediately call with current session if available
      const session = getMockSession()
      if (session) {
        setTimeout(() => {
          console.log('[MOCK] Triggering auth state change with session')
          callback('SIGNED_IN', session)
        }, 100)
      }
      
      return {
        data: {
          subscription: {
            unsubscribe: () => console.log('[MOCK] Auth listener unsubscribed'),
          },
        },
      }
    },
  }

  return {
    auth: mockAuth,
  }
}

/**
 * Configured Supabase client instance
 */
export const supabase = shouldUseMockClient() 
  ? createMockClient()
  : createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Configure auth settings
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })

/**
 * Database types for type-safe queries
 */
export interface Database {
  public: {
    Tables: {
      auth_providers: {
        Row: {
          id: string
          name: string
          enabled: boolean
          icon_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          enabled?: boolean
          icon_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          enabled?: boolean
          icon_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

/**
 * Typed Supabase client
 */
export type SupabaseClient = typeof supabase