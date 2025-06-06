<script setup lang="ts">
// No props or state needed for this basic footer
</script>

<template>
  <footer class="bg-gray-100 border-t border-gray-200 mt-auto">
    <div class="container mx-auto px-4 py-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
        <!-- seal.codes Column (Left aligned) -->
        <div class="text-left">
          <div class="flex items-center">
            <span class="text-xl font-bold text-primary-600">seal.codes</span>
          </div>
          <p class="text-sm text-gray-600 mt-1">
            Secure document sealing for everyone
          </p>
        </div>
        
        <!-- Features Column (Center aligned) -->
        <div class="text-center">
          <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Features</h3>
          <ul class="space-y-3">
            <li>
              <a href="#" class="text-sm text-gray-600 hover:text-primary-600 transition-colors duration-200">
                Document Sealing
              </a>
            </li>
            <li>
              <a href="#" class="text-sm text-gray-600 hover:text-primary-600 transition-colors duration-200">
                QR Code Verification
              </a>
            </li>
            <li>
              <a href="#" class="text-sm text-gray-600 hover:text-primary-600 transition-colors duration-200">
                Privacy Focus
              </a>
            </li>
          </ul>
        </div>
        
        <!-- Resources Column (Right aligned) -->
        <div class="text-right">
          <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Resources</h3>
          <ul class="space-y-3">
            <li>
              <a href="#" class="text-sm text-gray-600 hover:text-primary-600 transition-colors duration-200">
                Documentation
              </a>
            </li>
            <li>
              <a href="#" class="text-sm text-gray-600 hover:text-primary-600 transition-colors duration-200">
                FAQ
              </a>
            </li>
            <li>
              <a href="#" class="text-sm text-gray-600 hover:text-primary-600 transition-colors duration-200">
                Support
              </a>
            </li>
          </ul>
        </div>
      </div>
      
      <!-- Copyright -->
      <div class="mt-8 border-t border-gray-200 pt-4">
        <p class="text-sm text-gray-500 text-center">
          &copy; {{ new Date().getFullYear() }} seal.codes — All rights reserved.
        </p>
        <p class="text-xs text-gray-400 text-center mt-1">
          All document processing happens client-side. Your files never leave your device.
        </p>
      </div>
    </div>
  </footer>
</template>