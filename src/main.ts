import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import "./style.css";
import "./wasm_exec.js";
import App from "./App.vue";
import routes from "./router";
import { i18n } from "./i18n";

// Start WASM preloading immediately at app startup
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { wasmPreloader } from "./services/wasm-preloader";
console.log("🚀 App startup: WASM preloader initialized");

function loadWasm() {
  if (!WebAssembly) {
    throw new Error("WebAssembly is not supported in your browser");
  }
  const go = new window.Go();
  const webAssemblyInstantiatedSrc = await WebAssembly.instantiateStreaming(
    fetch("main.wasm"),
    go.importObject
  );
  go.run(webAssemblyInstantiatedSrc.instance);
}

// Create the router instance
const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Create the Pinia store
const pinia = createPinia();

// Create and mount the app
const app = createApp(App);

app.use(router);
app.use(pinia);
app.use(i18n);
app.mount("#app");
await loadWasm();
