<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'fileLoaded', file: File): void;
}>();

const isDragging = ref(false);
const errorMessage = ref('');

const allowedTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
];

// Handle file selection
const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    validateAndEmitFile(input.files[0]);
  }
};

// Handle drag events
const handleDragEnter = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = true;
};

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = true;
};

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = false;
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = false;
  
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    validateAndEmitFile(e.dataTransfer.files[0]);
  }
};

// Validate and emit the file if valid
const validateAndEmitFile = (file: File) => {
  // Reset error message
  errorMessage.value = '';
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errorMessage.value = 'Unsupported file type. Please use PDF, JPEG, or PNG.';
    return;
  }
  
  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    errorMessage.value = 'File too large. Maximum size is 10MB.';
    return;
  }
  
  // Emit the file loaded event
  emit('fileLoaded', file);
};
</script>

<template>
  <div 
    class="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors duration-200"
    :class="[
      isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50',
      errorMessage ? 'border-error-500 bg-error-50' : ''
    ]"
    @dragenter="handleDragEnter"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @click="$refs.fileInput.click()"
  >
    <input 
      type="file"
      ref="fileInput"
      class="hidden"
      accept=".pdf,.jpg,.jpeg,.png"
      @change="handleFileSelect"
    />
    
    <div class="flex flex-col items-center">
      <div class="text-gray-400 mb-4">
        <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>
      
      <h3 class="text-xl font-medium mb-2">
        Drag & Drop Document
      </h3>
      
      <p v-if="errorMessage" class="text-error-600 mb-2">
        {{ errorMessage }}
      </p>
      
      <p class="text-gray-500 mb-4">
        Upload a PDF, PNG, or JPG file
      </p>
      
      <button class="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition-colors">
        Select File
      </button>
    </div>
  </div>
</template>