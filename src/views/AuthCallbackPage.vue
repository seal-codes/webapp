<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/services/supabase-client'

const route = useRoute()

onMounted(async () => {
  console.log('🔐 Auth callback page loaded')
  
  try {
    // Check if this is a popup callback
    const isPopup = route.query.popup === 'true'
    const state = route.query.state as string
    
    if (isPopup && window.opener) {
      console.log('📱 Handling popup OAuth callback')
      
      // Handle the OAuth callback
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ OAuth callback error:', error)
        // Send error message to parent window
        window.opener.postMessage({
          type: 'OAUTH_ERROR',
          error: error.message,
          state,
        }, window.location.origin)
      } else if (data.session) {
        console.log('✅ OAuth callback successful')
        // Send success message to parent window
        window.opener.postMessage({
          type: 'OAUTH_SUCCESS',
          state,
        }, window.location.origin)
      } else {
        console.error('❌ No session found in OAuth callback')
        window.opener.postMessage({
          type: 'OAUTH_ERROR',
          error: 'No session found',
          state,
        }, window.location.origin)
      }
      
      // Close the popup
      window.close()
    } else {
      // Regular redirect flow (fallback)
      console.log('🔄 Handling regular OAuth redirect')
      // Redirect to document page
      window.location.href = '/document'
    }
  } catch (error) {
    console.error('❌ Error in auth callback:', error)
    
    if (window.opener) {
      window.opener.postMessage({
        type: 'OAUTH_ERROR',
        error: 'Callback processing failed',
        state: route.query.state,
      }, window.location.origin)
      window.close()
    } else {
      // Fallback redirect
      window.location.href = '/document'
    }
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4" />
      <p class="text-gray-600">
        Completing authentication...
      </p>
    </div>
  </div>
</template>
