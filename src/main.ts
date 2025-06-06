import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import App from './App.vue'
import routes from './router'

// Create the router instance
const router = createRouter({
  history: createWebHistory(),
  routes
})

// Create the Pinia store
const pinia = createPinia()

// Create and mount the app
const app = createApp(App)

app.use(router)
app.use(pinia)
app.mount('#app')