/**
 * Mock Supabase client for testing
 * 
 * This module provides a mock implementation of the Supabase client
 * that can be used in Playwright tests to simulate authentication
 * and other Supabase operations without making real API calls.
 */

export interface MockUser {
  id: string;
  email: string;
  app_metadata: {
    provider: string;
    providers: string[];
  };
  user_metadata: {
    avatar_url?: string;
    full_name?: string;
    user_name?: string;
  };
}

export interface MockSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  user: MockUser;
}

export interface MockAuthState {
  session: MockSession | null;
  user: MockUser | null;
}

/**
 * Mock session data for testing
 */
export const mockSession: MockSession = {
  access_token: 'mock-access-token-12345',
  refresh_token: 'mock-refresh-token-12345',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: {
    id: 'test-user-id-12345',
    email: 'test@example.com',
    app_metadata: {
      provider: 'google',
      providers: ['google']
    },
    user_metadata: {
      avatar_url: 'https://example.com/avatar.png',
      full_name: 'Test User',
      user_name: 'testuser'
    }
  }
};

/**
 * Mock Supabase client class
 */
class MockSupabaseClient {
  private authState: MockAuthState = {
    session: null,
    user: null
  };
  
  private authListeners: Array<(event: string, session: MockSession | null) => void> = [];

  /**
   * Mock auth object
   */
  auth = {
    getSession: async () => {
      return {
        data: { session: this.authState.session },
        error: null
      };
    },
    
    getUser: async () => {
      return {
        data: { user: this.authState.user },
        error: null
      };
    },
    
    signInWithOAuth: async (options: { provider: string }) => {
      // Simulate OAuth sign-in
      console.log(`[MOCK] Signing in with ${options.provider}`);
      return {
        data: { url: `https://mock-oauth-url.com/${options.provider}` },
        error: null
      };
    },
    
    signOut: async () => {
      console.log('[MOCK] Signing out');
      this.setAuthState(null);
      return { error: null };
    },
    
    onAuthStateChange: (callback: (event: string, session: MockSession | null) => void) => {
      console.log('[MOCK] Auth state change listener added');
      this.authListeners.push(callback);
      
      // Return unsubscribe function
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const index = this.authListeners.indexOf(callback);
              if (index > -1) {
                this.authListeners.splice(index, 1);
              }
            }
          }
        }
      };
    }
  };

  /**
   * Set the authentication state (for testing)
   */
  setAuthState(session: MockSession | null) {
    console.log('[MOCK] Setting auth state:', session ? 'authenticated' : 'unauthenticated');
    this.authState.session = session;
    this.authState.user = session?.user || null;
    
    // Notify listeners
    this.authListeners.forEach(listener => {
      listener(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
    });
  }

  /**
   * Get current authentication state
   */
  getAuthState(): MockAuthState {
    return { ...this.authState };
  }
}

/**
 * Global mock Supabase client instance
 */
export const mockSupabase = new MockSupabaseClient();

/**
 * Mock createClient function that returns our mock client
 */
export function createClient(url: string, key: string) {
  console.log('[MOCK] Creating Supabase client with mock implementation');
  return mockSupabase;
}

/**
 * Default export for compatibility
 */
export default mockSupabase;
