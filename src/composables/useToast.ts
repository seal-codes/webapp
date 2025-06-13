import { ref, readonly } from 'vue'
import type { Component } from 'vue'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
  persistent?: boolean
  component?: Component
  props?: Record<string, unknown>
}

interface ToastOptions {
  title?: string
  duration?: number
  persistent?: boolean
}

// Global toast state
const toasts = ref<Toast[]>([])
let toastIdCounter = 0

// Generate unique toast ID
function generateToastId(): string {
  return `toast-${++toastIdCounter}-${Date.now()}`
}

// Add a toast
function addToast(toast: Omit<Toast, 'id'>): string {
  const id = generateToastId()
  const newToast: Toast = {
    id,
    duration: 5000, // Default 5 seconds
    ...toast,
  }
  
  toasts.value.push(newToast)
  
  // Auto-remove after duration (unless persistent)
  if (!newToast.persistent && newToast.duration && newToast.duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, newToast.duration)
  }
  
  // Limit to 5 toasts maximum
  if (toasts.value.length > 5) {
    toasts.value.shift()
  }
  
  return id
}

// Remove a toast
function removeToast(id: string): void {
  const index = toasts.value.findIndex(toast => toast.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

// Clear all toasts
function clearToasts(): void {
  toasts.value = []
}

// Convenience methods for different toast types
function success(message: string, options: ToastOptions = {}): string {
  return addToast({
    type: 'success',
    message,
    ...options,
  })
}

function error(message: string, options: ToastOptions = {}): string {
  return addToast({
    type: 'error',
    message,
    ...options,
  })
}

function warning(message: string, options: ToastOptions = {}): string {
  return addToast({
    type: 'warning',
    message,
    ...options,
  })
}

function info(message: string, options: ToastOptions = {}): string {
  return addToast({
    type: 'info',
    message,
    ...options,
  })
}

export function useToast() {
  return {
    // State
    toasts: readonly(toasts),
    
    // Methods
    addToast,
    removeToast,
    clearToasts,
    
    // Convenience methods
    success,
    error,
    warning,
    info,
  }
}