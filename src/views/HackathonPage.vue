<template>
  <div class="hackathon-page">
    <!-- Hero Section -->
    <HackathonHero />
    
    <!-- Main Content -->
    <div class="hackathon-content">
      <!-- Architectural DNA (SBOM) -->
      <section class="dna-section">
        <ArchitecturalDNA />
      </section>
      
      <!-- Development Timeline -->
      <section class="timeline-section">
        <DevelopmentTimeline />
      </section>
      <!-- Verification Dashboard -->
      <section class="verification-section">
        <VerificationDashboard />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import HackathonHero from '../components/hackathon/HackathonHero.vue'
import ArchitecturalDNA from '../components/hackathon/ArchitecturalDNA.vue'
import DevelopmentTimeline from '../components/hackathon/DevelopmentTimeline.vue'
</script>

<style scoped>
.hackathon-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
  color: #f0f6fc;
}

.hackathon-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.dna-section,
.timeline-section,
.verification-section {
  margin-bottom: 4rem;
}

@media (max-width: 768px) {
  .hackathon-content {
    padding: 1rem;
  }
  
  .dna-section,
  .timeline-section,
  .verification-section {
    margin-bottom: 2rem;
  }
}
</style>
