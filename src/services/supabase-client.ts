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
 * Configured Supabase client instance
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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