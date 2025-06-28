<template>
  <div class="terminal-window">
    <!-- Terminal Header -->
    <div class="terminal-header">
      <div class="terminal-controls">
        <span class="control close"></span>
        <span class="control minimize"></span>
        <span class="control maximize"></span>
      </div>
      <div class="terminal-title">
        seal.codes — Architectural DNA Analysis
      </div>
    </div>

    <!-- Terminal Content -->
    <div class="terminal-content shadow-white-900/50" ref="terminalContent" @click="handleTerminalClick" :class="{ typing: isTyping }">
      <div v-if="loading" class="terminal-loading">
        <div class="loading-line">
          <span class="prompt">$</span>
          <span class="command">./hackathon-analysis/architectural-dna.sh</span>
        </div>
        <div class="loading-spinner">Analyzing codebase...</div>
      </div>

      <div v-else-if="error" class="terminal-error">
        <div class="error-line">
          <span class="prompt">$</span>
          <span class="command">./hackathon-analysis/architectural-dna.sh</span>
        </div>
        <div class="error-message">Error: {{ error }}</div>
      </div>

      <div v-else-if="dnaData" class="terminal-output">
        <!-- Command Line with Typing Animation -->
        <div class="command-line">
          <span class="prompt">$</span>
          <span class="command">{{ typedCommand }}</span>
          <span class="cursor" :class="{ blink: showCursor }">_</span>
        </div>

        <!-- File Tree -->
        <div class="file-tree" v-show="showTree">
          <div class="tree-header">
            <span class="tree-title">src/</span>
            <span class="coverage-badge">{{ dnaData.coverage.line_coverage_percent }}% coverage</span>
          </div>

          <!-- Foundation Files -->
          <FileTreeCategory
            title="[SESSION-1] Foundation Architecture"
            :files="dnaData.categories.foundation.files"
            :total-lines="dnaData.categories.foundation.total_lines"
            color="foundation"
            icon="🏗️"
            :delay="500"
            :session-data="dnaData.bolt_sessions[0]"
          />

          <!-- Verification Files -->
          <FileTreeCategory
            title="[SESSION-2] Verification System"
            :files="dnaData.categories.verification.files"
            :total-lines="dnaData.categories.verification.total_lines"
            color="verification"
            icon="🔍"
            :delay="1200"
            :session-data="dnaData.bolt_sessions[1]"
          />

          <!-- Authentication Files -->
          <FileTreeCategory
            title="[SESSION-3] Authentication & Backend"
            :files="dnaData.categories.authentication.files"
            :total-lines="dnaData.categories.authentication.total_lines"
            color="authentication"
            icon="🔐"
            :delay="1900"
            :session-data="dnaData.bolt_sessions[2]"
          />

          <!-- Signature Files -->
          <FileTreeCategory
            title="[SESSION-4] Signature Verification"
            :files="dnaData.categories.signature.files"
            :total-lines="dnaData.categories.signature.total_lines"
            color="signature"
            icon="🔏"
            :delay="2400"
            :session-data="dnaData.bolt_sessions[3]"
          />

          <!-- UI Files -->
          <FileTreeCategory
            title="[SESSION-5] UI Polishing"
            :files="dnaData.categories.ui.files"
            :total-lines="dnaData.categories.ui.total_lines"
            color="ui"
            icon="🎨"
            :delay="2900"
            :session-data="dnaData.bolt_sessions[4]"
          />

          <!-- Manual Files -->
          <FileTreeCategory
            title="[MANUAL] Enhancements"
            :files="dnaData.categories.manual.files"
            :total-lines="dnaData.categories.manual.total_lines"
            color="manual"
            icon="🔧"
            :delay="3400"
          />

          <!-- Summary -->
          <div class="tree-summary" v-show="showSummary">
            <div class="summary-line bolt">
              [BOLT.NEW] Core Systems: {{ dnaData.totals.bolt_lines.toLocaleString() }} LOC
            </div>
            <div class="summary-line manual">
              [MANUAL] Enhancements: {{ dnaData.totals.manual_lines.toLocaleString() }} LOC
            </div>
            <div class="summary-line total">
              Total Analyzed: {{ dnaData.totals.analyzed_lines.toLocaleString() }} LOC
            </div>
            <div class="impact-line">
              Impact: {{ dnaData.impact.bolt_percentage }}% bolt.new foundation, {{ dnaData.impact.manual_percentage }}% manual polish
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import type { ArchitecturalDNAData } from '../../services/hackathon-analysis-service'
import FileTreeCategory from './FileTreeCategory.vue'

interface Props {
  dnaData: ArchitecturalDNAData | null
  loading: boolean
  error: string | null
}

const props = defineProps<Props>()

const terminalContent = ref<HTMLElement>()
const showCursor = ref(true)
const showTree = ref(false)
const showSummary = ref(false)
const isTyping = ref(false)
const typedCommand = ref('')

const fullCommand = 'tree src --show-sessions --analysis-mode'

// Simulate terminal typing effect
const startTypingAnimation = () => {
  if (isTyping.value) return // Prevent multiple animations
  
  console.log('🎬 Starting terminal typing animation')
  isTyping.value = true
  let currentIndex = 0
  
  const typeNextChar = () => {
    if (currentIndex < fullCommand.length) {
      typedCommand.value = fullCommand.substring(0, currentIndex + 1)
      currentIndex++
      setTimeout(typeNextChar, 50 + Math.random() * 50) // Vary typing speed
    } else {
      // Typing complete, show tree after a pause
      console.log('✅ Typing complete, showing tree')
      setTimeout(() => {
        showTree.value = true
        // Show summary after all categories are revealed
        setTimeout(() => {
          showSummary.value = true
        }, 5000)
      }, 500)
    }
  }
  
  typeNextChar()
}

// Handle manual click to start animation
const handleTerminalClick = () => {
  if (!isTyping.value && props.dnaData && !props.loading && !props.error) {
    console.log('🖱️ Terminal clicked, starting animation')
    startTypingAnimation()
  }
}

// Intersection Observer to trigger animation when in viewport
onMounted(async () => {
  console.log('🚀 TerminalWindow mounted')
  
  // Cursor blinking
  setInterval(() => {
    showCursor.value = !showCursor.value
  }, 500)

  // Wait for next tick to ensure DOM is ready
  await nextTick()
  
  // Set up intersection observer
  if (terminalContent.value) {
    console.log('👀 Setting up intersection observer')
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          console.log('📊 Intersection observed:', {
            isIntersecting: entry.isIntersecting,
            intersectionRatio: entry.intersectionRatio,
            hasData: !!props.dnaData,
            isLoading: props.loading,
            hasError: !!props.error,
            isTyping: isTyping.value
          })
          
          if (entry.isIntersecting && !isTyping.value && props.dnaData && !props.loading && !props.error) {
            console.log('✨ Triggering animation from intersection observer')
            startTypingAnimation()
            observer.disconnect() // Only trigger once
          }
        })
      },
      { 
        threshold: 0.3,
        rootMargin: '0px 0px -100px 0px' // Trigger a bit earlier
      }
    )
    
    observer.observe(terminalContent.value)
    
    // Fallback: If data is already loaded and element is visible, start immediately
    setTimeout(() => {
      if (!isTyping.value && props.dnaData && !props.loading && !props.error) {
        const rect = terminalContent.value?.getBoundingClientRect()
        if (rect && rect.top < window.innerHeight && rect.bottom > 0) {
          console.log('🔄 Fallback: Starting animation immediately')
          startTypingAnimation()
          observer.disconnect()
        }
      }
    }, 1000)
  } else {
    console.warn('⚠️ Terminal content ref not found')
  }
})
</script>

<style scoped>
.terminal-window {
  background: #0d1117;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.4;
  max-width: 1000px;
  margin: 0 auto;
}

.terminal-header {
  background: #21262d;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #30363d;
}

.terminal-controls {
  display: flex;
  gap: 0.5rem;
  margin-right: 1rem;
}

.control {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.control.close {
  background: #ff5f56;
}

.control.minimize {
  background: #ffbd2e;
}

.control.maximize {
  background: #27ca3f;
}

.terminal-title {
  color: #8b949e;
  font-size: 0.9rem;
  font-weight: 500;
}

.terminal-content {
  padding: 1.5rem;
  background: #0d1117;
  color: #00ff00;
  min-height: 400px;
  max-height: 600px;
  overflow-y: auto;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.terminal-content:hover {
  background: #0f1419;
}

.terminal-content:hover::before {
  content: 'Click to start analysis';
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(0, 255, 0, 0.1);
  color: #00ff00;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  opacity: 0.7;
  pointer-events: none;
}

.terminal-content.typing:hover::before {
  display: none;
}

.command-line {
  margin-bottom: 1rem;
}

.prompt {
  color: #00ff00;
  margin-right: 0.5rem;
}

.command {
  color: #ffffff;
}

.cursor {
  color: #00ff00;
  margin-left: 0.25rem;
}

.cursor.blink {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #30363d;
}

.tree-title {
  color: #ffffff;
  font-weight: bold;
  font-size: 1.1rem;
}

.coverage-badge {
  background: #238636;
  color: #ffffff;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
}

.tree-summary {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #30363d;
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.summary-line {
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.summary-line.bolt {
  color: #00ff88;
}

.summary-line.manual {
  color: #ff6b6b;
}

.summary-line.total {
  color: #ffffff;
}

.impact-line {
  margin-top: 1rem;
  color: #ffd93d;
  font-weight: bold;
  font-size: 1.1rem;
}

.terminal-loading,
.terminal-error {
  color: #8b949e;
}

.loading-spinner {
  margin-top: 1rem;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.error-message {
  color: #ff6b6b;
  margin-top: 1rem;
}

/* Scrollbar styling */
.terminal-content::-webkit-scrollbar {
  width: 8px;
}

.terminal-content::-webkit-scrollbar-track {
  background: #161b22;
}

.terminal-content::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 4px;
}

.terminal-content::-webkit-scrollbar-thumb:hover {
  background: #484f58;
}

@media (max-width: 768px) {
  .terminal-window {
    font-size: 12px;
  }
  
  .terminal-content {
    padding: 1rem;
    min-height: 300px;
  }
  
  .tree-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>
