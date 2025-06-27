/**
 * Global test setup for Playwright tests
 * 
 * This file sets up the test environment before tests run
 */
/**
 * Global setup function that runs before all tests
 * This is called once per test worker
 */
async function globalSetup() {
  console.log('Setting up global test environment')
  
  // Any global setup that needs to happen before all tests
  // This is not the right place to inject scripts into pages
  // That should be done in the test file or fixtures
}

export default globalSetup

// Add TypeScript declaration for our global mock flag
declare global {
  interface Window {
    __MOCK_SUPABASE__: boolean;
  }
}
