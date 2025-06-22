<template>
  <div class="pdf-page-selector">
    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-gray-600">{{ $t('pdf.loading_pages') }}</span>
    </div>
    
    <!-- Error state -->
    <div v-else-if="error" class="p-4 bg-red-50 border border-red-200 rounded-lg">
      <p class="text-red-700">{{ error }}</p>
    </div>
    
    <!-- Page selection (only show if multi-page) -->
    <div v-else-if="showPageSelection && renderedPages.length > 1" class="mb-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">
        {{ $t('pdf.select_page') }}
      </h3>
      
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <div 
          v-for="page in renderedPages" 
          :key="page.pageNumber"
          @click="selectPage(page.pageNumber)"
          :class="[
            'page-thumbnail cursor-pointer border-2 rounded-lg p-2 transition-all',
            selectedPage === page.pageNumber 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300'
          ]"
        >
          <div class="aspect-[3/4] bg-white rounded shadow-sm overflow-hidden">
            <canvas 
              :id="`page-canvas-${page.pageNumber}`"
              :width="page.canvas.width"
              :height="page.canvas.height"
              class="w-full h-full object-contain"
            />
          </div>
          <p class="text-center text-sm text-gray-600 mt-2">
            {{ $t('pdf.page_number', { number: page.pageNumber }) }}
          </p>
        </div>
      </div>
    </div>
    
    <!-- Selected page preview -->
    <div v-if="selectedPageCanvas" class="page-preview">
      <h3 v-if="showPageSelection" class="text-lg font-medium text-gray-900 mb-4">
        {{ $t('pdf.position_qr_code') }}
      </h3>
      
      <PDFPagePreview 
        :page-canvas="selectedPageCanvas"
        :qr-position="qrPosition"
        :qr-size="qrSize"
        @position-change="updateQRPosition"
        @size-change="updateQRSize"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { PDFRenderingService } from '@/services/pdf-rendering-service'
import type { PDFPageRenderResult } from '@/types/pdf'
import type { QRCodeUIPosition } from '@/types/qrcode'
import PDFPagePreview from './PDFPagePreview.vue'

interface Props {
  pdfFile: File
  selectedPage: number
  qrPosition: QRCodeUIPosition
  qrSize: number
}

interface Emits {
  pageSelected: [pageNumber: number]
  positionChanged: [position: QRCodeUIPosition]
  sizeChanged: [size: number]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

const pdfRenderingService = new PDFRenderingService()
const renderedPages = ref<PDFPageRenderResult[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)
const showPageSelection = ref(false)

const selectedPageCanvas = computed(() => {
  const page = renderedPages.value.find(p => p.pageNumber === props.selectedPage)
  console.log('🎯 selectedPageCanvas computed:', {
    selectedPage: props.selectedPage,
    renderedPagesCount: renderedPages.value.length,
    foundPage: !!page,
    hasCanvas: !!page?.canvas
  })
  return page?.canvas || null
})

onMounted(async () => {
  await renderPDFPages()
})

// Watch for file changes
watch(() => props.pdfFile, async () => {
  await renderPDFPages()
})

const renderPDFPages = async () => {
  try {
    isLoading.value = true
    error.value = null
    renderedPages.value = []
    
    console.log('🔄 Starting PDF rendering process...')
    
    const pdf = await pdfRenderingService.loadPDF(props.pdfFile)
    console.log('✅ PDF loaded successfully:', pdf)
    
    const pageCount = await pdfRenderingService.getPageCount(pdf)
    console.log('📄 PDF page count:', pageCount)
    
    // Always render first page at full scale for preview
    console.log('🎨 Rendering first page at full scale...')
    const firstPage = await pdfRenderingService.renderPage(pdf, 1, 1.0)
    console.log('✅ First page rendered:', firstPage)
    renderedPages.value = [firstPage]
    
    // If multi-page, show page selection and render thumbnails
    if (pageCount > 1) {
      showPageSelection.value = true
      console.log('📚 Multi-page PDF detected, rendering thumbnails...')
      
      // Render thumbnails for all pages
      const thumbnailPages = await pdfRenderingService.renderPages(
        pdf, 
        Array.from({ length: pageCount }, (_, i) => i + 1),
        0.2 // Small scale for thumbnails
      )
      console.log('🖼️ Thumbnails rendered:', thumbnailPages.length)
      
      renderedPages.value = thumbnailPages
      
      // Re-render first page at full scale for preview
      const fullScaleFirstPage = await pdfRenderingService.renderPage(pdf, 1, 1.0)
      renderedPages.value[0] = fullScaleFirstPage
    }
    
    // Ensure selected page is valid
    if (props.selectedPage > pageCount) {
      selectPage(1)
    }
    
    console.log('🎯 Final rendered pages:', renderedPages.value.length)
    
    await nextTick()
    await updateCanvasElements()
    console.log('✅ Canvas elements updated')
  } catch (err) {
    console.error('❌ Failed to render PDF pages:', err)
    error.value = err instanceof Error ? err.message : t('pdf.render_error')
  } finally {
    isLoading.value = false
  }
}

const selectPage = async (pageNumber: number) => {
  if (pageNumber === props.selectedPage) return
  
  try {
    // Render selected page at full scale for preview
    const pdf = await pdfRenderingService.loadPDF(props.pdfFile)
    const fullScalePage = await pdfRenderingService.renderPage(pdf, pageNumber, 1.0)
    
    // Update the full-scale version in our array
    const existingIndex = renderedPages.value.findIndex(p => p.pageNumber === pageNumber)
    if (existingIndex >= 0) {
      renderedPages.value[existingIndex] = fullScalePage
    } else {
      renderedPages.value.push(fullScalePage)
    }
    
    emit('pageSelected', pageNumber)
    
    await nextTick()
    await updateCanvasElements()
  } catch (err) {
    console.error('Failed to render selected page:', err)
  }
}

const updateCanvasElements = async () => {
  console.log('🎨 Updating canvas elements for', renderedPages.value.length, 'pages')
  
  // Only update thumbnail canvas elements if we have page selection (multi-page PDF)
  if (!showPageSelection.value) {
    console.log('📄 Single-page PDF - skipping thumbnail canvas updates')
    return
  }
  
  // Update canvas elements in the DOM
  for (const page of renderedPages.value) {
    const canvasId = `page-canvas-${page.pageNumber}`
    const canvasElement = document.getElementById(canvasId) as HTMLCanvasElement
    
    console.log(`🔍 Looking for canvas element: ${canvasId}`, canvasElement ? 'found' : 'not found')
    
    if (canvasElement && page.canvas) {
      const ctx = canvasElement.getContext('2d')
      if (ctx) {
        console.log(`✅ Drawing page ${page.pageNumber} to canvas`)
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height)
        ctx.drawImage(page.canvas, 0, 0)
      } else {
        console.error(`❌ Could not get 2D context for canvas ${canvasId}`)
      }
    } else {
      console.warn(`⚠️ Canvas element ${canvasId} not found or page canvas missing`)
    }
  }
}

const updateQRPosition = (position: QRCodeUIPosition) => {
  emit('positionChanged', position)
}

const updateQRSize = (size: number) => {
  emit('sizeChanged', size)
}
</script>

<style scoped>
.page-thumbnail {
  transition: all 0.2s ease-in-out;
}

.page-thumbnail:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.page-preview {
  max-width: 100%;
  overflow: hidden;
}
</style>
