/**
 * GitHub API utilities for Playwright tests
 * Uses the proven PAT-based approach for reliable repository access
 */

import { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export interface GitHubAPIResponse<T = any> {
  success: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

export interface GitHubRepository {
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  owner: {
    login: string;
    id: number;
  };
}

export interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  content: string; // base64 encoded
  encoding: string;
}

/**
 * GitHub API helper class for Playwright tests
 */
export class GitHubAPIHelper {
  private pat: string;

  constructor(pat?: string) {
    this.pat = pat || process.env.GITHUB_TEST_PAT || '';
    if (!this.pat) {
      throw new Error('GitHub PAT not found. Set GITHUB_TEST_PAT environment variable.');
    }
  }

  /**
   * Load authentication state from setup
   */
  static loadAuthState(): any {
    const authStatePath = path.join(process.cwd(), 'playwright/.auth/github-pat-auth.json');
    if (fs.existsSync(authStatePath)) {
      return JSON.parse(fs.readFileSync(authStatePath, 'utf-8'));
    }
    return null;
  }

  /**
   * Make a GitHub API call within browser context
   */
  async callAPI<T = any>(page: Page, endpoint: string, options: any = {}): Promise<GitHubAPIResponse<T>> {
    return await page.evaluate(async ({ token, endpoint, options }) => {
      try {
        const response = await fetch(`https://api.github.com${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-e2e-test',
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
    }, { token: this.pat, endpoint, options });
  }

  /**
   * Get repository information
   */
  async getRepository(page: Page, owner: string, repo: string): Promise<GitHubAPIResponse<GitHubRepository>> {
    return this.callAPI<GitHubRepository>(page, `/repos/${owner}/${repo}`);
  }

  /**
   * List repository contents
   */
  async getRepositoryContents(page: Page, owner: string, repo: string, path: string = ''): Promise<GitHubAPIResponse<any[]>> {
    const endpoint = `/repos/${owner}/${repo}/contents${path ? `/${path}` : ''}`;
    return this.callAPI<any[]>(page, endpoint);
  }

  /**
   * Get file content from repository
   */
  async getFileContent(page: Page, owner: string, repo: string, filePath: string): Promise<GitHubAPIResponse<GitHubFileContent>> {
    const result = await this.callAPI<GitHubFileContent>(page, `/repos/${owner}/${repo}/contents/${filePath}`);
    
    // Decode base64 content if successful
    if (result.success && result.data) {
      const decodedContent = await page.evaluate((base64Content) => {
        return atob(base64Content);
      }, result.data.content);
      
      return {
        ...result,
        data: {
          ...result.data,
          decodedContent
        }
      };
    }
    
    return result;
  }

  /**
   * Check if repository exists and is accessible
   */
  async repositoryExists(page: Page, owner: string, repo: string): Promise<boolean> {
    const result = await this.getRepository(page, owner, repo);
    return result.success;
  }

  /**
   * Get user information
   */
  async getUserInfo(page: Page): Promise<GitHubAPIResponse<any>> {
    return this.callAPI(page, '/user');
  }

  /**
   * List user repositories
   */
  async getUserRepositories(page: Page, options: { per_page?: number; sort?: string } = {}): Promise<GitHubAPIResponse<GitHubRepository[]>> {
    const params = new URLSearchParams();
    if (options.per_page) params.set('per_page', options.per_page.toString());
    if (options.sort) params.set('sort', options.sort);
    
    const endpoint = `/user/repos${params.toString() ? `?${params.toString()}` : ''}`;
    return this.callAPI<GitHubRepository[]>(page, endpoint);
  }

  /**
   * Get organization information
   */
  async getOrganization(page: Page, org: string): Promise<GitHubAPIResponse<any>> {
    return this.callAPI(page, `/orgs/${org}`);
  }

  /**
   * List organization repositories
   */
  async getOrganizationRepositories(page: Page, org: string): Promise<GitHubAPIResponse<GitHubRepository[]>> {
    return this.callAPI<GitHubRepository[]>(page, `/orgs/${org}/repos`);
  }

  /**
   * Verify README.md exists and get its content
   */
  async getReadmeContent(page: Page, owner: string, repo: string): Promise<{ exists: boolean; content?: string; error?: string }> {
    const result = await this.getFileContent(page, owner, repo, 'README.md');
    
    if (result.success && result.data) {
      return {
        exists: true,
        content: (result.data as any).decodedContent
      };
    }
    
    return {
      exists: false,
      error: result.error || 'README.md not found'
    };
  }
}

/**
 * Create a GitHub API helper instance for tests
 */
export function createGitHubHelper(pat?: string): GitHubAPIHelper {
  return new GitHubAPIHelper(pat);
}

/**
 * Utility function to wait for repository to be accessible
 */
export async function waitForRepositoryAccess(
  page: Page, 
  owner: string, 
  repo: string, 
  timeoutMs: number = 30000
): Promise<boolean> {
  const helper = createGitHubHelper();
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (await helper.repositoryExists(page, owner, repo)) {
      return true;
    }
    await page.waitForTimeout(1000);
  }
  
  return false;
}
