/**
 * Test fixtures for Playwright tests
 * 
 * This file contains paths to test files and helper functions for tests
 */
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { test as base } from '@playwright/test'
import { HomePage } from '../pages/home-page'
import { DocumentPage } from '../pages/document-page'
import { SealedDocumentPage } from '../pages/sealed-document-page'
import { VerificationPage } from '../pages/verification-page'

// Get current file path in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Path to test fixtures
const FIXTURES_DIR = path.join(__dirname, 'images')

// Project root path
const PROJECT_ROOT = path.resolve(__dirname, '../..')

// Path to real project images
const REAL_LOGO_PATH = path.join(PROJECT_ROOT, 'media/logo.png')

// Create fixtures directory if it doesn't exist
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true })
}

// Define test image file paths
const validImagePath = path.join(FIXTURES_DIR, 'valid-image.png')
const largeImagePath = path.join(FIXTURES_DIR, 'large-image.png')
const invalidFilePath = path.join(FIXTURES_DIR, 'invalid-file.txt')

// Copy the real logo image as our valid test image if it doesn't exist
if (!fs.existsSync(validImagePath)) {
  if (fs.existsSync(REAL_LOGO_PATH)) {
    fs.copyFileSync(REAL_LOGO_PATH, validImagePath)
    console.log(`Copied real logo from ${REAL_LOGO_PATH} to test fixtures`)
  } else {
    // Fallback to creating a small valid image if the logo doesn't exist
    console.log(`Logo file not found at ${REAL_LOGO_PATH}, creating a simple test image`)
    fs.writeFileSync(validImagePath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'))
  }
}

// Create a large image file if it doesn't exist (just over 10MB)
if (!fs.existsSync(largeImagePath)) {
  // Create a file just over 10MB
  const largeBuffer = Buffer.alloc(10 * 1024 * 1024 + 1, 'x')
  fs.writeFileSync(largeImagePath, largeBuffer)
}

// Create an invalid file if it doesn't exist
if (!fs.existsSync(invalidFilePath)) {
  fs.writeFileSync(invalidFilePath, 'This is not an image file')
}

// Test image paths
export const TEST_FIXTURES = {
  VALID_IMAGE_PATH: validImagePath,
  LARGE_IMAGE_PATH: largeImagePath,
  INVALID_FILE_PATH: invalidFilePath,
}

// Extend Playwright test with our page objects
export const test = base.extend({
  // Page objects
  homePage: async ({ page }, use) => {
    await use(new HomePage(page))
  },
  documentPage: async ({ page }, use) => {
    await use(new DocumentPage(page))
  },
  sealedDocumentPage: async ({ page }, use) => {
    await use(new SealedDocumentPage(page))
  },
  verificationPage: async ({ page }, use) => {
    await use(new VerificationPage(page))
  },
})

export { expect } from '@playwright/test'
