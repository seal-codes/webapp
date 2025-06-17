/**
 * Utility functions for mocking Supabase authentication in tests
 * Based on the article "Generating Supabase JWT/access token manually" by Joonas Mertanan
 */

import { createHmac } from 'crypto';
import { encode as base64encode } from 'base64-arraybuffer';

/**
 * Create a Supabase JWT token for testing purposes
 * 
 * @param userEmail - Email of the user to impersonate
 * @param userId - User ID to impersonate
 * @param provider - Auth provider (google, github, etc.)
 * @returns JWT token string
 */
export function createSupabaseToken(userEmail: string, userId: string, provider = 'google') {
  // For local development, Supabase uses a fixed JWT secret
  const JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
  
  // Create JWT header
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  // Create JWT payload
  const ONE_HOUR = 60 * 60;
  const exp = Math.round(Date.now() / 1000) + ONE_HOUR;
  
  const payload = {
    aud: 'authenticated',
    exp,
    sub: userId,
    email: userEmail,
    app_metadata: {
      provider,
      providers: [provider]
    },
    user_metadata: {
      avatar_url: 'https://example.com/avatar.png',
      full_name: 'Test User',
      user_name: 'testuser'
    },
    role: 'authenticated'
  };
  
  // Encode header and payload
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  // Create signature
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac('sha256', JWT_SECRET)
    .update(signatureInput)
    .digest();
  
  const encodedSignature = base64encode(signature)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  // Combine to create JWT token
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Create a Supabase session object for testing purposes
 * 
 * @param userEmail - Email of the user to impersonate
 * @param userId - User ID to impersonate
 * @param provider - Auth provider (google, github, etc.)
 * @returns Supabase session object
 */
export function createSupabaseSession(userEmail: string, userId: string, provider = 'google') {
  const accessToken = createSupabaseToken(userEmail, userId, provider);
  const refreshToken = 'mock-refresh-token-' + Date.now();
  
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: userId,
      email: userEmail,
      app_metadata: {
        provider: provider,
        providers: [provider]
      },
      user_metadata: {
        avatar_url: 'https://example.com/avatar.png',
        full_name: 'Test User',
        user_name: 'testuser'
      }
    }
  };
}

/**
 * Create a Supabase cookie for testing purposes
 * 
 * @param userEmail - Email of the user to impersonate
 * @param userId - User ID to impersonate
 * @param provider - Auth provider (google, github, etc.)
 * @returns Cookie string to set in localStorage
 */
export function createSupabaseCookie(userEmail: string, userId: string, provider = 'google') {
  const session = createSupabaseSession(userEmail, userId, provider);
  
  return JSON.stringify({
    currentSession: session,
    expiresAt: session.expires_at
  });
}
