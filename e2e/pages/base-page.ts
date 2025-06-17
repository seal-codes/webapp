/**
 * Base Page Object for all pages
 * Contains common methods and properties used across all pages
 */
import { Page } from '@playwright/test';

// Base URL for tests - this should match the URL where the app is running during tests
const BASE_URL = 'http://localhost:5173';

export class BasePage {
  readonly page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }
  
  /**
   * Navigate to a specific URL
   */
  async goto(path: string) {
    // Ensure path starts with a slash
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    await this.page.goto(`${BASE_URL}${normalizedPath}`);
  }
  
  /**
   * Wait for navigation to complete
   */
  async waitForNavigation() {
    await this.page.waitForLoadState('networkidle');
  }
  
  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }
}
