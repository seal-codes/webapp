<template>
  <section class="hackathon-hero">
    <div class="hero-content">
      <!-- Title -->
      <div class="hero-title">
        <h1>
          <span class="gradient-text">Hackathon Showcase</span>
        </h1>
        <p class="subtitle">
          How <strong>bolt.new</strong> took seal.codes from zero to production-ready
        </p>
      </div>

      <!-- Key Metrics -->
      <div class="metrics-grid" v-if="dnaData">
        <!-- Secondary Metric - Sessions -->
        <div class="metric-card accent">
          <div class="metric-value">
            <AnimatedCounter :target="dnaData.bolt_sessions.length" />
          </div>
          <div class="metric-label">
            Focused Sessions
          </div>
          <div class="metric-description">
            From scaffolding to production-ready
          </div>
        </div>

        <!-- Primary Metric - Foundation (Large, Centered) -->
        <div class="metric-card primary large" :title="`Based on ${dnaData.coverage.line_coverage_percent}% codebase coverage analysis`">
          <div class="metric-value">
            <AnimatedCounter :target="dnaData.impact.bolt_percentage" suffix="%" />
          </div>
          <div class="metric-label">
            Bolt.new Foundation
          </div>
          <div class="metric-description">
            Core architecture created by bolt.new sessions
          </div>
          <div class="coverage-info">
            <span class="coverage-badge">{{ dnaData.coverage.line_coverage_percent }}% coverage</span>
          </div>
        </div>

        <!-- Secondary Metric - Manual -->
        <div class="metric-card secondary" :title="`Based on ${dnaData.coverage.line_coverage_percent}% codebase coverage analysis`">
          <div class="metric-value">
            <AnimatedCounter :target="dnaData.impact.manual_percentage" suffix="%" />
          </div>
          <div class="metric-label">
            Manual Enhancements
          </div>
          <div class="metric-description">
            User experience polish and refinements
          </div>
          <div class="coverage-info">
            <span class="coverage-badge">{{ dnaData.coverage.line_coverage_percent }}% coverage</span>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="metrics-loading" v-else-if="loading">
        <div class="loading-spinner">Loading analysis data...</div>
      </div>

      <!-- Error State -->
      <div class="metrics-error" v-else-if="error">
        <div class="error-message">{{ error }}</div>
      </div>

      <!-- Call to Action -->
      <div class="hero-cta" v-if="dnaData">
        <p class="cta-text">
          Explore the interactive analysis below to see how bolt.new helped found this project and
          enabled rapid development across {{ dnaData.bolt_sessions.length }} focused sessions with consistent code quality.
        </p>
        <div class="scroll-indicator">
          <span>Scroll to explore</span>
          <div class="scroll-arrow">↓</div>
        </div>
      </div>
    </div>

    <!-- Key Insights -->
    <div class="insights-section">
      <div class="insights-container">
        <h3 class="insights-title">Key Insights</h3>
        <div class="insights-grid">
          <div class="insight-item">
            <div class="insight-icon">⚡</div>
            <div class="insight-content">
              <div class="insight-label">Rapid Concept Validation</div>
              <div class="insight-text">Enhance prompt, scaffold immediately, iterate on abstract concepts in real-time</div>
            </div>
          </div>
          
          <div class="insight-item">
            <div class="insight-icon">🧠</div>
            <div class="insight-content">
              <div class="insight-label">Concept to Implementation</div>
              <div class="insight-text">Makes technically challenging ideas feasible—bridges "I know what I want" to "I know how to build it"</div>
            </div>
          </div>
          
          <div class="insight-item">
            <div class="insight-icon">🔄</div>
            <div class="insight-content">
              <div class="insight-label">Strategic Development Pauses</div>
              <div class="insight-text">Deliberate refactoring breaks prevent technical debt and maintain architectural clarity</div>
            </div>
          </div>
          
          <div class="insight-item">
            <div class="insight-icon">✨</div>
            <div class="insight-content">
              <div class="insight-label">Visual Development Workflow</div>
              <div class="insight-text">Click any element in preview for immediate adjustments—fluid design-to-implementation process</div>
            </div>
          </div>
          
          <div class="insight-item">
            <div class="insight-icon">🌐</div>
            <div class="insight-content">
              <div class="insight-label">Full-Stack Coherence</div>
              <div class="insight-text">Seamless backend integration—understands how database, auth, and API pieces connect</div>
            </div>
          </div>
          
          <div class="insight-item">
            <div class="insight-icon">🌟</div>
            <div class="insight-content">
              <div class="insight-label">Compressed Development Cycles</div>
              <div class="insight-text">Timeline compression from months to weeks—fundamentally changes what's possible for solo developers</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Background Effects -->
    <div class="hero-background">
      <div class="grid-pattern"></div>
      <div class="glow-effects"></div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { hackathonAnalysisService, type ArchitecturalDNAData } from '../../services/hackathon-analysis-service'
import AnimatedCounter from '../common/AnimatedCounter.vue'

const dnaData = ref<ArchitecturalDNAData | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    dnaData.value = await hackathonAnalysisService.getArchitecturalDNA()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load data'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.hackathon-hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0d1117 0%, #161b22 50%, #21262d 100%);
  overflow: hidden;
}

.hero-content {
  position: relative;
  z-index: 2;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.hero-title h1 {
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 700;
  margin-bottom: 1rem;
  line-height: 1.1;
}

.gradient-text {
  background: linear-gradient(135deg, #00ff88 0%, #00d4ff 50%, #ff0080 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 3s ease-in-out infinite alternate;
}

@keyframes gradient-shift {
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(30deg); }
}

.subtitle {
  font-size: clamp(1.1rem, 2.5vw, 1.5rem);
  color: #8b949e;
  margin-bottom: 3rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  grid-template-areas: "accent primary secondary";
  gap: 2rem;
  margin-bottom: 4rem;
  align-items: center;
}

.metric-card {
  background: rgba(33, 38, 45, 0.8);
  border: 1px solid rgba(48, 54, 61, 0.8);
  border-radius: 12px;
  padding: 2rem;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.metric-card.large {
  grid-area: primary;
  padding: 3rem;
  transform: scale(1.1);
  z-index: 2;
}

.metric-card.secondary {
  grid-area: secondary;
}

.metric-card.accent {
  grid-area: accent;
}

.metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 2px solid var(--accent-color);
  border-radius: 12px;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.metric-card::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, var(--accent-color), transparent, var(--accent-color), transparent, var(--accent-color));
  background-size: 400%;
  border-radius: 14px;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: -1;
  /* Create border effect by masking */
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: xor;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  padding: 2px;
}

.metric-card::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, var(--accent-color), transparent, var(--accent-color), transparent, var(--accent-color));
  background-size: 400%;
  border-radius: 14px;
  opacity: 0;
  filter: blur(8px);
  transition: opacity 0.3s ease;
  z-index: -2;
  /* Create border effect by masking */
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: xor;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  padding: 2px;
}

.metric-card:hover::before,
.metric-card:hover::after {
  opacity: 1;
  animation: borderFlow 30s linear infinite;
}

@keyframes borderFlow {
  0% {
    background-position: 0% 0%;
  }
  50% {
    background-position: 400% 0%;
  }
  100% {
    background-position: 0% 0%;
  }
}

.metric-card:hover {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.metric-card.primary {
  --accent-color: #00ff88;
  /* Remove permanent border */
}

.metric-card.secondary {
  --accent-color: #ff6b6b;
}

.metric-card.accent {
  --accent-color: #4ecdc4;
}

.metric-card.coverage {
  --accent-color: #ffd93d;
}

.metric-value {
  font-size: 3rem;
  font-weight: 700;
  color: var(--accent-color);
  margin-bottom: 0.5rem;
  font-family: 'Fira Code', monospace;
}

.metric-card.large .metric-value {
  font-size: 4.5rem;
  margin-bottom: 1rem;
}

.metric-label {
  font-size: 1.1rem;
  font-weight: 600;
  color: #f0f6fc;
  margin-bottom: 0.5rem;
}

.metric-card.large .metric-label {
  font-size: 1.3rem;
  margin-bottom: 1rem;
}

.metric-description {
  font-size: 0.9rem;
  color: #8b949e;
  line-height: 1.4;
}

.metric-card.large .metric-description {
  font-size: 1rem;
  margin-bottom: 1rem;
}

.coverage-info {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.metric-card:hover .coverage-info {
  opacity: 1;
}

.coverage-badge {
  background: rgba(139, 148, 158, 0.8);
  color: #f0f6fc;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
  backdrop-filter: blur(5px);
}

.metrics-loading,
.metrics-error {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  margin-bottom: 4rem;
}

.loading-spinner {
  color: #8b949e;
  font-size: 1.1rem;
  animation: pulse 1.5s infinite;
}

.error-message {
  color: #ff6b6b;
  font-size: 1.1rem;
  text-align: center;
  background: rgba(255, 107, 107, 0.1);
  padding: 1rem 2rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 107, 107, 0.3);
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.hero-cta {
  max-width: 600px;
  margin: 0 auto;
}

.cta-text {
  font-size: 1.1rem;
  color: #c9d1d9;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.scroll-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #8b949e;
  font-size: 0.9rem;
}

.scroll-arrow {
  font-size: 1.5rem;
  animation: bounce 2s infinite;
  color: #8b949e;
}

.insights-section {
  margin-top: 4rem;
  padding: 3rem 0;
  border-top: 1px solid rgba(48, 54, 61, 0.6);
}

.insights-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.insights-title {
  text-align: center;
  font-size: 2rem;
  font-weight: 700;
  color: #f0f6fc;
  margin-bottom: 2rem;
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
}

.insight-item {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: rgba(33, 38, 45, 0.6);
  border: 1px solid rgba(48, 54, 61, 0.8);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.insight-item:hover {
  border-color: rgba(0, 255, 136, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.insight-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 255, 136, 0.1);
  border-radius: 50%;
  border: 1px solid rgba(0, 255, 136, 0.3);
}

.insight-content {
  flex: 1;
}

.insight-label {
  font-weight: 600;
  color: #f0f6fc;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}

.insight-text {
  color: #8b949e;
  font-size: 0.85rem;
  line-height: 1.4;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
}

.grid-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    linear-gradient(rgba(139, 148, 158, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(139, 148, 158, 0.1) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: grid-move 20s linear infinite;
}

@keyframes grid-move {
  0% { transform: translate(0, 0); }
  100% { transform: translate(50px, 50px); }
}

.glow-effects {
  position: absolute;
  top: 20%;
  left: 10%;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(0, 255, 136, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  animation: glow-pulse 4s ease-in-out infinite alternate;
}

.glow-effects::after {
  content: '';
  position: absolute;
  top: 60%;
  right: -20%;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(0, 212, 255, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  animation: glow-pulse 3s ease-in-out infinite alternate-reverse;
}

@keyframes glow-pulse {
  0% { transform: scale(1) rotate(0deg); opacity: 0.5; }
  100% { transform: scale(1.2) rotate(180deg); opacity: 0.8; }
}

@media (max-width: 768px) {
  .hero-content {
    padding: 1rem;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
    grid-template-areas: 
      "primary"
      "secondary" 
      "accent";
    gap: 1.5rem;
  }
  
  .metric-card {
    padding: 1.5rem;
  }
  
  .metric-card.large {
    transform: none;
    padding: 2rem;
  }
  
  .metric-value {
    font-size: 2.5rem;
  }
  
  .metric-card.large .metric-value {
    font-size: 3.5rem;
  }

  .insights-grid {
    grid-template-columns: 1fr;
  }
  
  .insight-item {
    padding: 1rem;
  }
  
  .insights-title {
    font-size: 1.5rem;
  }
}
</style>
