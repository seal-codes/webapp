/**
 * Supabase authentication utilities for Playwright tests
 * Works with real JWT tokens obtained through GitHub OAuth
 */

import { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export interface SupabaseAuthState {
  github: {
    pat: string;
    user: any;
  };
  supabase: {
    url: string;
    anonKey: string;
    jwt: string;
    refreshToken: string;
    user: any;
    expiresAt: number;
  };
  timestamp: number;
}

export interface SupabaseAPIResponse<T = any> {
  success: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

/**
 * Supabase API helper class for Playwright tests
 */
export class SupabaseAPIHelper {
  private authState: SupabaseAuthState | null = null;

  constructor() {
    this.loadAuthState();
  }

  /**
   * Load authentication state from setup
   */
  private loadAuthState(): void {
    const authStatePath = path.join(process.cwd(), 'playwright/.auth/github-supabase-auth.json');
    if (fs.existsSync(authStatePath)) {
      this.authState = JSON.parse(fs.readFileSync(authStatePath, 'utf-8'));
    }
  }

  /**
   * Get the current auth state
   */
  getAuthState(): SupabaseAuthState | null {
    return this.authState;
  }

  /**
   * Check if we have a valid JWT
   */
  hasValidJWT(): boolean {
    if (!this.authState?.supabase?.jwt) return false;
    
    // Check if token is expired (with 5 minute buffer)
    const now = Date.now() / 1000;
    const expiresAt = this.authState.supabase.expiresAt;
    return expiresAt > (now + 300); // 5 minute buffer
  }

  /**
   * Make a Supabase API call with the real JWT
   */
  async callSupabaseAPI<T = any>(
    page: Page, 
    endpoint: string, 
    options: any = {}
  ): Promise<SupabaseAPIResponse<T>> {
    if (!this.authState) {
      throw new Error('No Supabase auth state found. Run authentication setup first.');
    }

    return await page.evaluate(async ({ supabaseUrl, jwt, anonKey, endpoint, options }) => {
      try {
        const response = await fetch(`${supabaseUrl}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'apikey': anonKey,
            'Content-Type': 'application/json',
            ...options.headers
          },
          ...options
        });
        
        const data = await response.json();
        return {
          success: response.ok,
          status: response.status,
          data: response.ok ? data : null,
          error: response.ok ? null : data.message || data.error_description
        };
      } catch (error) {
        return {
          success: false,
          status: 0,
          data: null,
          error: error.message
        };
      }
    }, {
      supabaseUrl: this.authState.supabase.url,
      jwt: this.authState.supabase.jwt,
      anonKey: this.authState.supabase.anonKey,
      endpoint,
      options
    });
  }

  /**
   * Get current user info from Supabase
   */
  async getCurrentUser(page: Page): Promise<SupabaseAPIResponse<any>> {
    return this.callSupabaseAPI(page, '/auth/v1/user');
  }

  /**
   * Verify JWT is still valid
   */
  async verifyJWT(page: Page): Promise<boolean> {
    const result = await this.getCurrentUser(page);
    return result.success;
  }

  /**
   * Get user profile data
   */
  async getUserProfile(page: Page): Promise<SupabaseAPIResponse<any>> {
    // This would depend on your database schema
    // Example: return this.callSupabaseAPI(page, '/rest/v1/profiles?select=*');
    return this.getCurrentUser(page); // Fallback to auth user
  }

  /**
   * Make a request to your custom API endpoints
   */
  async callCustomAPI<T = any>(
    page: Page, 
    endpoint: string, 
    options: any = {}
  ): Promise<SupabaseAPIResponse<T>> {
    // For custom API endpoints in your application
    return this.callSupabaseAPI<T>(page, `/rest/v1${endpoint}`, options);
  }

  /**
   * Test database connectivity
   */
  async testDatabaseConnection(page: Page): Promise<boolean> {
    try {
      // Try to access a simple endpoint
      const result = await this.callSupabaseAPI(page, '/rest/v1/', {
        method: 'GET'
      });
      return result.success;
    } catch {
      return false;
    }
  }
}

/**
 * Combined GitHub + Supabase helper for full integration
 */
export class IntegratedAuthHelper {
  private supabaseHelper: SupabaseAPIHelper;
  private githubPAT: string;

  constructor() {
    this.supabaseHelper = new SupabaseAPIHelper();
    const authState = this.supabaseHelper.getAuthState();
    this.githubPAT = authState?.github?.pat || process.env.GITHUB_TEST_PAT || '';
  }

  /**
   * Get GitHub API helper with PAT
   */
  async callGitHubAPI<T = any>(page: Page, endpoint: string, options: any = {}): Promise<SupabaseAPIResponse<T>> {
    return await page.evaluate(async ({ token, endpoint, options }) => {
      try {
        const response = await fetch(`https://api.github.com${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-integrated-test',
            ...options.headers
          },
          ...options
        });
        
        const data = await response.json();
        return {
          success: response.ok,
          status: response.status,
          data: response.ok ? data : null,
          error: response.ok ? null : data.message
        };
      } catch (error) {
        return {
          success: false,
          status: 0,
          data: null,
          error: error.message
        };
      }
    }, { token: this.githubPAT, endpoint, options });
  }

  /**
   * Get Supabase helper
   */
  getSupabaseHelper(): SupabaseAPIHelper {
    return this.supabaseHelper;
  }

  /**
   * Verify both GitHub and Supabase authentication work
   */
  async verifyFullAuthentication(page: Page): Promise<{
    github: boolean;
    supabase: boolean;
    user: any;
  }> {
    const githubResult = await this.callGitHubAPI(page, '/user');
    const supabaseResult = await this.supabaseHelper.getCurrentUser(page);

    return {
      github: githubResult.success,
      supabase: supabaseResult.success,
      user: {
        github: githubResult.data,
        supabase: supabaseResult.data
      }
    };
  }
}

/**
 * Create integrated auth helper for tests
 */
export function createIntegratedAuthHelper(): IntegratedAuthHelper {
  return new IntegratedAuthHelper();
}

/**
 * Create Supabase helper for tests
 */
export function createSupabaseHelper(): SupabaseAPIHelper {
  return new SupabaseAPIHelper();
}
