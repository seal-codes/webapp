<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useDocumentStore } from '@/stores/documentStore'
import TheNavbar from './components/layout/TheNavbar.vue'
import TheFooter from './components/layout/TheFooter.vue'
import ToastContainer from './components/common/ToastContainer.vue'

const authStore = useAuthStore()
const documentStore = useDocumentStore()

onMounted(async () => {
  // Initialize authentication state first (check for existing session)
  await authStore.initializeAuth()
  
  // Then initialize document store (which can now check auth state)
  await documentStore.initialize()
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
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
  </div>
</template>