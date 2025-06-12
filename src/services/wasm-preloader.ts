/**
 * WASM Preloader Service
 * Handles early loading of rxing-wasm at application startup
 */

// Global WASM state shared across the application
let rxingWasm: any = null
let rxingWasmLoading = false
let wasmLoadStartTime: number | null = null
let wasmLoadPromise: Promise<any> | null = null

/**
 * WASM Preloader Service
 * Manages early loading of rxing-wasm for optimal performance
 */
export class WasmPreloader {
  /**
   * Start preloading WASM immediately when the service is created
   */
  constructor() {
    this.startPreloading()
  }

  /**
   * Start preloading WASM in the background
   */
  private startPreloading(): void {
    if (this.shouldSkipWasmLoading()) {
      console.log('🧪 Skipping WASM preload (test environment or already loading)')
      return
    }

    if (rxingWasm || rxingWasmLoading) {
      return // Already loaded or loading
    }

    console.log('🚀 Starting early WASM preload at app startup...')
    this.preloadRxingWasm()
  }

  /**
   * Check if WASM loading should be skipped
   */
  private shouldSkipWasmLoading(): boolean {
    return (
      typeof process !== 'undefined' && 
      (process.env.NODE_ENV === 'test' || 
       process.env.VITEST === 'true' ||
       typeof (globalThis as any).describe !== 'undefined')
    )
  }

  /**
   * Preload rxing-wasm module
   */
  private async preloadRxingWasm(): Promise<void> {
    if (rxingWasm || rxingWasmLoading) return

    rxingWasmLoading = true
    wasmLoadStartTime = Date.now()

    // Create a promise that can be awaited by multiple consumers
    wasmLoadPromise = this.loadWasmModule()

    try {
      rxingWasm = await wasmLoadPromise
      const loadTime = Date.now() - (wasmLoadStartTime || 0)
      console.log(`✅ Early WASM preload completed successfully in ${loadTime}ms`)
    } catch (error) {
      console.warn('⚠️ Early WASM preload failed, will use jsQR fallback:', error)
      rxingWasm = null
    } finally {
      rxingWasmLoading = false
    }
  }

  /**
   * Load the WASM module
   */
  private async loadWasmModule(): Promise<any> {
    return await import('rxing-wasm')
  }

  /**
   * Get the current WASM state
   */
  getWasmState(): {
    isLoaded: boolean
    isLoading: boolean
    loadTime?: number
    module?: any
  } {
    return {
      isLoaded: !!rxingWasm,
      isLoading: rxingWasmLoading,
      loadTime: wasmLoadStartTime ? Date.now() - wasmLoadStartTime : undefined,
      module: rxingWasm,
    }
  }

  /**
   * Wait for WASM to finish loading (if it's currently loading)
   * Returns immediately if already loaded or not loading
   * 
   * @param timeoutMs - Maximum time to wait in milliseconds (default: 5000)
   */
  async waitForWasm(timeoutMs: number = 5000): Promise<any> {
    if (rxingWasm) {
      return rxingWasm // Already loaded
    }

    if (wasmLoadPromise) {
      try {
        // Race between WASM loading and timeout
        const result = await Promise.race([
          wasmLoadPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('WASM loading timeout')), timeoutMs)
          )
        ])
        return result
      } catch (error) {
        if (error instanceof Error && error.message === 'WASM loading timeout') {
          console.warn(`⏰ WASM loading timed out after ${timeoutMs}ms, falling back to jsQR`)
        } else {
          console.warn('WASM loading failed:', error)
        }
        return null
      }
    }

    return null // Not loading and not loaded
  }

  /**
   * Force reload WASM (useful for testing or error recovery)
   */
  async forceReload(): Promise<boolean> {
    console.log('🔄 Force reloading WASM...')
    
    // Reset state
    rxingWasm = null
    rxingWasmLoading = false
    wasmLoadPromise = null
    
    // Start loading again
    await this.preloadRxingWasm()
    
    return !!rxingWasm
  }

  /**
   * Get performance metrics
   */
  getMetrics(): {
    loadTime?: number
    isReady: boolean
    recommendedEngine: 'jsqr' | 'rxing-wasm'
    startupLoadingEnabled: boolean
  } {
    return {
      loadTime: wasmLoadStartTime ? Date.now() - wasmLoadStartTime : undefined,
      isReady: !!rxingWasm,
      recommendedEngine: rxingWasm ? 'rxing-wasm' : 'jsqr',
      startupLoadingEnabled: !this.shouldSkipWasmLoading(),
    }
  }
}

/**
 * Global WASM access functions for hybrid services
 */
export const wasmGlobals = {
  /**
   * Get the loaded WASM module (null if not loaded)
   */
  getRxingWasm(): any {
    return rxingWasm
  },

  /**
   * Check if WASM is currently loading
   */
  isWasmLoading(): boolean {
    return rxingWasmLoading
  },

  /**
   * Wait for WASM to load if it's currently loading
   * 
   * @param timeoutMs - Maximum time to wait in milliseconds (default: 5000)
   */
  async waitForWasm(timeoutMs: number = 5000): Promise<any> {
    if (rxingWasm) return rxingWasm
    if (wasmLoadPromise) {
      try {
        const result = await Promise.race([
          wasmLoadPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('WASM loading timeout')), timeoutMs)
          )
        ])
        return result
      } catch (error) {
        if (error instanceof Error && error.message === 'WASM loading timeout') {
          console.warn(`⏰ WASM loading timed out after ${timeoutMs}ms, falling back to jsQR`)
        }
        return null
      }
    }
    return null
  },

  /**
   * Get load time information
   */
  getLoadTime(): number | undefined {
    return wasmLoadStartTime ? Date.now() - wasmLoadStartTime : undefined
  },

  /**
   * Set WASM module (used by hybrid services for compatibility)
   */
  setRxingWasm(module: any): void {
    rxingWasm = module
  },

  /**
   * Set loading state (used by hybrid services for compatibility)
   */
  setWasmLoading(loading: boolean): void {
    rxingWasmLoading = loading
  }
}

/**
 * Global WASM preloader instance
 * This will start preloading as soon as this module is imported
 */
export const wasmPreloader = new WasmPreloader()
