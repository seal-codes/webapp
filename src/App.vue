<script setup lang="ts">
import { onMounted } from 'vue'
import TheNavbar from './components/layout/TheNavbar.vue'
import TheFooter from './components/layout/TheFooter.vue'

onMounted(() => {
  // Initialize any global app logic here
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
  </div>
</template>