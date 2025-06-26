/// <reference types="vite/client" />

// Declare module for Vue components
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
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