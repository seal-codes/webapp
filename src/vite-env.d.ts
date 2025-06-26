/// <reference types="vite/client" />

// Declare module for Vue components
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Ensure Vue module is properly typed
declare module 'vue' {
  export * from '@vue'
}

// Declare global properties for TypeScript
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $mq: {
      sm: boolean
      md: boolean
      lg: boolean
      xl: boolean
      '2xl': boolean
    }
  }
}