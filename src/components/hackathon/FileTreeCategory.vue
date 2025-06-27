<template>
  <div class="file-tree-category" v-show="visible">
    <div class="category-header" @click="toggleExpanded" :data-tooltip="getTooltipText()">
      <span class="tree-connector">├──</span>
      <span class="category-icon">{{ icon }}</span>
      <span class="category-title" :style="{ color: getCategoryColor(color) }">{{ title }}</span>
      <span class="category-summary">({{ totalLines.toLocaleString() }} LOC)</span>
      <span class="expand-indicator" :class="{ expanded }">{{ expanded ? '▼' : '▶' }}</span>
    </div>
    
    <div class="category-files" v-show="expanded">
      <div 
        v-for="(lines, filePath) in files" 
        :key="filePath"
        class="file-entry"
        :style="{ animationDelay: `${getFileDelay(filePath)}ms` }"
        @mouseenter="highlightFile(filePath)"
        @mouseleave="unhighlightFile"
      >
        <span class="file-connector">│   ├──</span>
        <span class="file-icon">📄</span>
        <span class="file-path">{{ getFileName(filePath) }}</span>
        <span class="file-lines" :style="{ color: getCategoryColor(color) }">{{ lines }} LOC</span>
      </div>
      
      <div class="category-total">
        <span class="file-connector">│   └──</span>
        <span class="total-text" :style="{ color: getCategoryColor(color) }">
          Total: {{ Object.keys(files).length }} files, {{ totalLines.toLocaleString() }} lines
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getCategoryColor } from '../../constants/session-colors'

interface Props {
  title: string
  files: Record<string, number>
  totalLines: number
  color: string
  icon: string
  delay?: number
  sessionData?: {
    summary: string
    key_achievements: string[]
    impact: string
    date: string
    hash: string
  }
}

const props = withDefaults(defineProps<Props>(), {
  delay: 0
})

const visible = ref(false)
const expanded = ref(false)
const highlightedFile = ref<string | null>(null)

const getFileName = (filePath: string): string => {
  return filePath.split('/').pop() || filePath
}

const getFileDelay = (filePath: string): number => {
  const index = Object.keys(props.files).indexOf(filePath)
  return index * 100 // Stagger file appearance
}

const toggleExpanded = () => {
  expanded.value = !expanded.value
}

const highlightFile = (filePath: string) => {
  highlightedFile.value = filePath
  // Could emit event for cross-component highlighting in future
}

const unhighlightFile = () => {
  highlightedFile.value = null
}

const getTooltipText = (): string => {
  if (!props.sessionData) return ''
  
  const achievements = props.sessionData.key_achievements.join('\n• ')
  return `${props.sessionData.summary}\n\nKey Achievements:\n• ${achievements}\n\nImpact: ${props.sessionData.impact}\n\nCommit: ${props.sessionData.hash} (${props.sessionData.date})`
}

onMounted(() => {
  // Show category after delay
  setTimeout(() => {
    visible.value = true
    // Auto-expand after a short delay
    setTimeout(() => {
      expanded.value = true
    }, 500)
  }, props.delay)
})
</script>

<style scoped>
.file-tree-category {
  margin-bottom: 1rem;
  animation: slideIn 0.5s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.category-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 4px;
  position: relative;
}

.category-header:hover {
  background: rgba(48, 54, 61, 0.3);
}

.category-header[data-tooltip]:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  top: 100%;
  left: 0;
  background: rgba(13, 17, 23, 0.95);
  color: #f0f6fc;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  line-height: 1.4;
  white-space: pre-line;
  z-index: 1000;
  max-width: 400px;
  border: 1px solid #30363d;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  animation: tooltipFadeIn 0.2s ease-out;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tree-connector,
.file-connector {
  color: #30363d;
  font-weight: bold;
}

.category-icon {
  font-size: 1rem;
}

.category-title {
  font-weight: bold;
  flex: 1;
}

.category-summary {
  color: #8b949e;
  font-size: 0.9rem;
}

.expand-indicator {
  color: #8b949e;
  font-size: 0.8rem;
  transition: transform 0.2s ease;
}

.expand-indicator.expanded {
  transform: rotate(0deg);
}

.category-files {
  margin-left: 1rem;
  border-left: 1px solid #30363d;
  padding-left: 1rem;
}

.file-entry {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  animation: fadeInUp 0.3s ease-out;
  border-radius: 4px;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.file-icon {
  font-size: 0.8rem;
}

.file-path {
  color: #c9d1d9;
  flex: 1;
  font-family: 'Fira Code', monospace;
}

.file-lines {
  font-size: 0.8rem;
  font-weight: bold;
  min-width: 60px;
  text-align: right;
}

.category-total {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  margin-top: 0.5rem;
  border-top: 1px solid #30363d;
}

.total-text {
  font-weight: bold;
  font-size: 0.9rem;
}

/* Color classes for different sessions */
.color-foundation {
  color: #ffd93d;
}

.color-verification {
  color: #00ffff;
}

.color-authentication {
  color: #ff00ff;
}

.color-signature {
  color: #ff6b6b;
}

.color-ui {
  color: #4ecdc4;
}

.color-manual {
  color: #ffffff;
}

@media (max-width: 768px) {
  .category-header {
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  
  .category-summary {
    order: 3;
    width: 100%;
    margin-left: 2rem;
    font-size: 0.8rem;
  }
  
  .file-entry {
    flex-wrap: wrap;
  }
  
  .file-lines {
    order: 3;
    width: 100%;
    margin-left: 2rem;
    text-align: left;
    font-size: 0.7rem;
  }
}
</style>
