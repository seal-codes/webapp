/**
 * Authentication setup for Playwright tests
 * Based on the Playwright Authentication documentation and Supabase auth mocking approach
 */

import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Ensure auth directory exists
const authDir = path.join(process.cwd(), 'playwright/.auth');
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

// Setup authenticated state for Google
setup('authenticate as Google user', async ({ page }) => {
  // Inject comprehensive Supabase mock before navigating to the app
  await page.addInitScript(() => {
    console.log('[MOCK] Setting up Google authentication mock');
    
    // Create mock session data
    const mockSession = {
      access_token: 'mock-access-token-google',
      refresh_token: 'mock-refresh-token-google',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: 'test-google-user-id',
        email: 'test-google@example.com',
        app_metadata: {
          provider: 'google',
          providers: ['google']
        },
        user_metadata: {
          avatar_url: 'https://example.com/avatar.png',
          full_name: 'Test User Google',
          user_name: 'testusergoogle'
        }
      }
    };
    
    // Mock the Supabase client methods that the auth service uses
    const mockSupabaseAuth = {
      getSession: async () => {
        console.log('[MOCK] getSession called - returning mock session');
        return {
          data: { session: mockSession },
          error: null
        };
      },
      getUser: async () => {
        console.log('[MOCK] getUser called - returning mock user');
        return {
          data: { user: mockSession.user },
          error: null
        };
      },
      signInWithOAuth: async (options) => {
        console.log('[MOCK] signInWithOAuth called with:', options);
        return {
          data: { url: 'https://mock-oauth-url.com/' + options.provider },
          error: null
        };
      },
      signOut: async () => {
        console.log('[MOCK] signOut called');
        return { error: null };
      },
      onAuthStateChange: (callback) => {
        console.log('[MOCK] onAuthStateChange listener registered');
        // Immediately call the callback with signed in state
        setTimeout(() => {
          callback('SIGNED_IN', mockSession);
        }, 100);
        
        return {
          data: {
            subscription: {
              unsubscribe: () => console.log('[MOCK] Auth listener unsubscribed')
            }
          }
        };
      }
    };
    
    // Store the mock globally so it can be accessed by the Supabase client
    window.__MOCK_SUPABASE_AUTH__ = mockSupabaseAuth;
    window.__MOCK_SUPABASE_SESSION__ = mockSession;
    
    // Override the createClient function if it gets called
    const originalCreateClient = window.createClient;
    window.createClient = function(url, key, options) {
      console.log('[MOCK] createClient intercepted');
      return {
        auth: mockSupabaseAuth
      };
    };
  });
  
  // Go to the app
  await page.goto('http://localhost:5173/');
  
  // Wait for the app to initialize and auth to be set up
  await page.waitForTimeout(2000);
  
  // Save the state to be used in tests
  await page.context().storageState({ path: path.join(authDir, 'google-user.json') });
});

// Setup authenticated state for GitHub
setup('authenticate as GitHub user', async ({ page }) => {
  // Inject comprehensive Supabase mock before navigating to the app
  await page.addInitScript(() => {
    console.log('[MOCK] Setting up GitHub authentication mock');
    
    // Create mock session data
    const mockSession = {
      access_token: 'mock-access-token-github',
      refresh_token: 'mock-refresh-token-github',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: 'test-github-user-id',
        email: 'test-github@example.com',
        app_metadata: {
          provider: 'github',
          providers: ['github']
        },
        user_metadata: {
          avatar_url: 'https://example.com/avatar.png',
          full_name: 'Test User GitHub',
          user_name: 'testusergithub'
        }
      }
    };
    
    // Mock the Supabase client methods that the auth service uses
    const mockSupabaseAuth = {
      getSession: async () => {
        console.log('[MOCK] getSession called - returning mock session');
        return {
          data: { session: mockSession },
          error: null
        };
      },
      getUser: async () => {
        console.log('[MOCK] getUser called - returning mock user');
        return {
          data: { user: mockSession.user },
          error: null
        };
      },
      signInWithOAuth: async (options) => {
        console.log('[MOCK] signInWithOAuth called with:', options);
        return {
          data: { url: 'https://mock-oauth-url.com/' + options.provider },
          error: null
        };
      },
      signOut: async () => {
        console.log('[MOCK] signOut called');
        return { error: null };
      },
      onAuthStateChange: (callback) => {
        console.log('[MOCK] onAuthStateChange listener registered');
        // Immediately call the callback with signed in state
        setTimeout(() => {
          callback('SIGNED_IN', mockSession);
        }, 100);
        
        return {
          data: {
            subscription: {
              unsubscribe: () => console.log('[MOCK] Auth listener unsubscribed')
            }
          }
        };
      }
    };
    
    // Store the mock globally so it can be accessed by the Supabase client
    window.__MOCK_SUPABASE_AUTH__ = mockSupabaseAuth;
    window.__MOCK_SUPABASE_SESSION__ = mockSession;
    
    // Override the createClient function if it gets called
    const originalCreateClient = window.createClient;
    window.createClient = function(url, key, options) {
      console.log('[MOCK] createClient intercepted');
      return {
        auth: mockSupabaseAuth
      };
    };
  });
  
  // Go to the app
  await page.goto('http://localhost:5173/');
  
  // Wait for the app to initialize and auth to be set up
  await page.waitForTimeout(2000);
  
  // Save the state to be used in tests
  await page.context().storageState({ path: path.join(authDir, 'github-user.json') });
});
