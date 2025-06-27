/**
 * Home Page Object
 * Represents the main landing page of the application
 */
import { Page, Locator } from '@playwright/test'
import { BasePage } from './base-page'

export class HomePage extends BasePage {
  // Locators
  readonly startButton: Locator
  readonly headerTitle: Locator
  
  constructor(page: Page) {
    super(page)
    
    // Initialize locators using data-testid where available
    this.startButton = page.getByRole('link', { name: /get started|start sealing/i })
    this.headerTitle = page.getByRole('heading', { level: 1 })
  }
  
  /**
   * Navigate to the home page
   */
  async goto() {
    await super.goto('/')
  }
  
  /**
   * Click the start button to begin document upload process
   */
  async startDocumentProcess() {
    await this.startButton.click()
    await this.waitForNavigation()
  }
}
