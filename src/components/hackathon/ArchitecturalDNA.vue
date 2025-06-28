<template>
  <div class="architectural-dna">
    <div class="section-header">
      <h2><Dna class="section-icon" />Architectural DNA</h2>
      <p class="section-subtitle">
        Software Bill of Materials showing bolt.new's foundational contributions
      </p>
    </div>

    <div class="terminal-container">
      <TerminalWindow 
        :dna-data="dnaData"
        :loading="loading"
        :error="error"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { hackathonAnalysisService, type ArchitecturalDNAData } from '../../services/hackathon-analysis-service'
import TerminalWindow from './TerminalWindow.vue'
import { Dna } from 'lucide-vue-next'

const dnaData = ref<ArchitecturalDNAData | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    dnaData.value = await hackathonAnalysisService.getArchitecturalDNA()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load DNA data'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.architectural-dna {
  margin-bottom: 4rem;
}

.section-header {
  text-align: center;
  margin-bottom: 3rem;
}

.section-header h2 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #f0f6fc;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: center;
}

.section-icon {
  width: 2.5rem;
  height: 2.5rem;
  color: #00ff88;
}

.section-subtitle {
  font-size: 1.1rem;
  color: #8b949e;
  max-width: 600px;
  margin: 0 auto;
}

.terminal-container {
  margin-bottom: 3rem;
}

@media (max-width: 768px) {
  .section-header h2 {
    font-size: 2rem;
    gap: 0.75rem;
  }
  
  .section-icon {
    width: 2rem;
    height: 2rem;
  }
}
</style>
