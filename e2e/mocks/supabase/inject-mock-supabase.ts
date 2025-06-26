/**
 * Script injection for mocking Supabase in browser context
 * 
 * This module provides functions to inject mock Supabase client
 * into the browser context for Playwright tests.
 */

/**
 * Generate the script that will be injected into the browser
 * to mock the Supabase client
 */
export function injectMockSupabaseScript(): string {
  return `
    // Mock Supabase client injection script
    console.log('[MOCK] Injecting mock Supabase client');
    
    // Set global flag to indicate we're in mock mode
    window.__MOCK_SUPABASE__ = true;
    
    // Mock user and session data
    const mockUser = {
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
    };
    
    const mockSession = {
      access_token: 'mock-access-token-12345',
      refresh_token: 'mock-refresh-token-12345',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: mockUser
    };
    
    // Mock auth state
    let currentAuthState = {
      session: null,
      user: null
    };
    
    let authListeners = [];
    
    // Mock Supabase client
    const mockSupabaseClient = {
      auth: {
        getSession: async () => {
          console.log('[MOCK] getSession called');
          return {
            data: { session: currentAuthState.session },
            error: null
          };
        },
        
        getUser: async () => {
          console.log('[MOCK] getUser called');
          return {
            data: { user: currentAuthState.user },
            error: null
          };
        },
        
        signInWithOAuth: async (options) => {
          console.log('[MOCK] signInWithOAuth called with provider:', options.provider);
          
          // Simulate successful OAuth sign-in
          currentAuthState.session = mockSession;
          currentAuthState.user = mockUser;
          
          // Notify listeners
          authListeners.forEach(listener => {
            listener('SIGNED_IN', mockSession);
          });
          
          return {
            data: { url: 'https://mock-oauth-url.com/' + options.provider },
            error: null
          };
        },
        
        signOut: async () => {
          console.log('[MOCK] signOut called');
          currentAuthState.session = null;
          currentAuthState.user = null;
          
          // Notify listeners
          authListeners.forEach(listener => {
            listener('SIGNED_OUT', null);
          });
          
          return { error: null };
        },
        
        onAuthStateChange: (callback) => {
          console.log('[MOCK] onAuthStateChange listener added');
          authListeners.push(callback);
          
          // Return unsubscribe function
          return {
            data: {
              subscription: {
                unsubscribe: () => {
                  const index = authListeners.indexOf(callback);
                  if (index > -1) {
                    authListeners.splice(index, 1);
                  }
                }
              }
            }
          };
        }
      }
    };
    
    // Helper function to set auth state (for testing)
    window.__setMockAuthState__ = (session) => {
      console.log('[MOCK] Setting auth state:', session ? 'authenticated' : 'unauthenticated');
      currentAuthState.session = session;
      currentAuthState.user = session?.user || null;
      
      // Notify listeners
      authListeners.forEach(listener => {
        listener(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
      });
    };
    
    // Helper function to get current auth state
    window.__getMockAuthState__ = () => {
      return { ...currentAuthState };
    };
    
    // Mock the createClient function
    window.__mockCreateClient__ = (url, key) => {
      console.log('[MOCK] createClient called with URL:', url);
      return mockSupabaseClient;
    };
    
    // Override the module loading for Supabase
    // This is a bit tricky since we need to intercept the import
    // We'll store the mock client globally and let the app use it
    window.__SUPABASE_CLIENT__ = mockSupabaseClient;
    
    console.log('[MOCK] Mock Supabase client injection complete');
  `;
}

/**
 * Inject authenticated session into the browser
 */
export function injectAuthenticatedSession(provider = 'google'): string {
  return `
    // Inject authenticated session
    console.log('[MOCK] Injecting authenticated session for provider:', '${provider}');
    
    const mockUser = {
      id: 'test-user-id-12345',
      email: 'test@example.com',
      app_metadata: {
        provider: '${provider}',
        providers: ['${provider}']
      },
      user_metadata: {
        avatar_url: 'https://example.com/avatar.png',
        full_name: 'Test User',
        user_name: 'testuser'
      }
    };
    
    const mockSession = {
      access_token: 'mock-access-token-12345',
      refresh_token: 'mock-refresh-token-12345',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: mockUser
    };
    
    // Set the authenticated state
    if (window.__setMockAuthState__) {
      window.__setMockAuthState__(mockSession);
    }
    
    // Also set in localStorage for persistence
    localStorage.setItem('supabase.auth.token', JSON.stringify({
      currentSession: mockSession,
      expiresAt: mockSession.expires_at
    }));
    
    console.log('[MOCK] Authenticated session injected');
  `;
}

/**
 * Clear authentication state
 */
export function clearAuthenticationState(): string {
  return `
    // Clear authentication state
    console.log('[MOCK] Clearing authentication state');
    
    if (window.__setMockAuthState__) {
      window.__setMockAuthState__(null);
    }
    
    // Clear localStorage
    localStorage.removeItem('supabase.auth.token');
    
    console.log('[MOCK] Authentication state cleared');
  `;
}
