<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useDocumentStore } from '@/stores/documentStore'
import TheNavbar from './components/layout/TheNavbar.vue'
import TheFooter from './components/layout/TheFooter.vue'
import ToastContainer from './components/common/ToastContainer.vue'
import HackathonBadge from './components/common/HackathonBadge.vue'

const route = useRoute()
const authStore = useAuthStore()
const documentStore = useDocumentStore()

// Only show badge on home page
const showBadge = computed(() => route.name === 'home' || route.path === '/')

onMounted(async () => {
  // Initialize authentication state first (check for existing session)
  await authStore.initializeAuth()
  
  // Then initialize document store (which can now check auth state)
  await documentStore.initialize()
})
</script>

<template>
  <div class="min-h-screen flex flex-col overflow-x-hidden">
    <TheNavbar />
    
    <main class="flex-grow">
      <!-- Router views with transitions -->
      <router-view v-slot="{ Component }">
        <transition
          name="fade"
          mode="out-in"
        >
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    
    <TheFooter />
    
    <!-- Global Toast Container -->
    <ToastContainer />
    
    <!-- Hackathon Badge - Only on home page -->
    <HackathonBadge 
      v-if="showBadge"
      position="top-right"
    />
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Ensure no horizontal overflow on mobile */
html, body {
  overflow-x: hidden;
  width: 100%;
  position: relative;
}
</style>