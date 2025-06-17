/**
 * Authentication setup for Playwright tests
 * Based on the Playwright Authentication documentation and Supabase auth mocking approach
 */

import { test as setup, expect } from '@playwright/test';
import { createSupabaseCookie } from '../utils/supabase-auth';
import fs from 'fs';
import path from 'path';

// Ensure auth directory exists
const authDir = path.join(process.cwd(), 'playwright/.auth');
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

// Setup authenticated state for Google
setup('authenticate as Google user', async ({ page }) => {
  // Go to the app
  await page.goto('http://localhost:5173/');
  
  // Create mock session data
  const userId = 'test-google-user-id';
  const userEmail = 'test-google@example.com';
  const provider = 'google';
  
  // Set up localStorage with the mock session and trigger auth state change event
  await page.evaluate(({ sessionData, provider, userId, userEmail }) => {
    // Set the session in localStorage
    localStorage.setItem('supabase.auth.token', sessionData);
    
    // Create a mock session object to dispatch with the event
    const mockSession = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: userId,
        email: userEmail,
        app_metadata: {
          provider: provider
        },
        user_metadata: {
          avatar_url: 'https://example.com/avatar.png',
          full_name: 'Test User',
          user_name: 'testuser'
        }
      }
    };
    
    // Dispatch the auth state change event that the application is listening for
    const event = new CustomEvent('supabase.auth.state-changed', {
      detail: { event: 'SIGNED_IN', session: mockSession }
    });
    window.dispatchEvent(event);
    
    console.log('Auth state change event dispatched for provider:', provider);
  }, { 
    sessionData: createSupabaseCookie(userEmail, userId, provider), 
    provider, 
    userId, 
    userEmail 
  });
  
  // Save the state to be used in tests
  await page.context().storageState({ path: path.join(authDir, 'google-user.json') });
});

// Setup authenticated state for GitHub
setup('authenticate as GitHub user', async ({ page }) => {
  // Go to the app
  await page.goto('http://localhost:5173/');
  
  // Create mock session data
  const userId = 'test-github-user-id';
  const userEmail = 'test-github@example.com';
  const provider = 'github';
  
  // Set up localStorage with the mock session and trigger auth state change event
  await page.evaluate(({ sessionData, provider, userId, userEmail }) => {
    // Set the session in localStorage
    localStorage.setItem('supabase.auth.token', sessionData);
    
    // Create a mock session object to dispatch with the event
    const mockSession = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: userId,
        email: userEmail,
        app_metadata: {
          provider: provider
        },
        user_metadata: {
          avatar_url: 'https://example.com/avatar.png',
          full_name: 'Test User',
          user_name: 'testuser'
        }
      }
    };
    
    // Dispatch the auth state change event that the application is listening for
    const event = new CustomEvent('supabase.auth.state-changed', {
      detail: { event: 'SIGNED_IN', session: mockSession }
    });
    window.dispatchEvent(event);
    
    console.log('Auth state change event dispatched for provider:', provider);
  }, { 
    sessionData: createSupabaseCookie(userEmail, userId, provider), 
    provider, 
    userId, 
    userEmail 
  });
  
  // Save the state to be used in tests
  await page.context().storageState({ path: path.join(authDir, 'github-user.json') });
});
