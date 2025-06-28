<template>
  <section class="hackathon-hero">
    <div class="hero-content">
      <!-- Title -->
      <div class="hero-title">
        <h1>
          <gradient-text>seal.codes</gradient-text> 
          <gradient-text>@ World's Largest Hackathon</gradient-text> 
        </h1>
        <p class="subtitle">
          Where ideas begin – How <strong>bolt.new</strong> took seal.codes from zero to production-ready
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

<!-- Key Insights -->
        <div class="insights-section">
          <h3 class="insights-title">Key Insights</h3>
          <div class="insights-grid">
            <div class="insight-card" @mouseenter="hoveredInsight = 1" @mouseleave="hoveredInsight = null">
              <div class="insight-front" :class="{ blurred: hoveredInsight === 1 }">
                <Zap class="insight-icon" :class="{ faded: hoveredInsight === 1 }" />
                <div class="insight-title">Rapid Concept Validation</div>
              </div>
              <div class="insight-back" :class="{ visible: hoveredInsight === 1 }">
                <div class="insight-text">Enhance prompt, scaffold immediately, iterate on abstract concepts in real-time</div>
              </div>
            </div>
            
            <div class="insight-card" @mouseenter="hoveredInsight = 2" @mouseleave="hoveredInsight = null">
              <div class="insight-front" :class="{ blurred: hoveredInsight === 2 }">
                <Brain class="insight-icon" :class="{ faded: hoveredInsight === 2 }" />
                <div class="insight-title">Concept to Implementation</div>
              </div>
              <div class="insight-back" :class="{ visible: hoveredInsight === 2 }">
                <div class="insight-text">Makes technically challenging ideas feasible—bridges "I know what I want" to "I know how to build it"</div>
              </div>
            </div>
            
            <div class="insight-card" @mouseenter="hoveredInsight = 3" @mouseleave="hoveredInsight = null">
              <div class="insight-front" :class="{ blurred: hoveredInsight === 3 }">
                <RotateCcw class="insight-icon" :class="{ faded: hoveredInsight === 3 }" />
                <div class="insight-title">Strategic Development Pauses</div>
              </div>
              <div class="insight-back" :class="{ visible: hoveredInsight === 3 }">
                <div class="insight-text">Deliberate refactoring breaks prevent technical debt and maintain architectural clarity</div>
              </div>
            </div>
            
            <div class="insight-card" @mouseenter="hoveredInsight = 4" @mouseleave="hoveredInsight = null">
              <div class="insight-front" :class="{ blurred: hoveredInsight === 4 }">
                <Sparkles class="insight-icon" :class="{ faded: hoveredInsight === 4 }" />
                <div class="insight-title">Visual Development Workflow</div>
              </div>
              <div class="insight-back" :class="{ visible: hoveredInsight === 4 }">
                <div class="insight-text">Click any element in preview for immediate adjustments—fluid design-to-implementation process</div>
              </div>
            </div>
            
            <div class="insight-card" @mouseenter="hoveredInsight = 5" @mouseleave="hoveredInsight = null">
              <div class="insight-front" :class="{ blurred: hoveredInsight === 5 }">
                <Globe class="insight-icon" :class="{ faded: hoveredInsight === 5 }" />
                <div class="insight-title">Full-Stack Coherence</div>
              </div>
              <div class="insight-back" :class="{ visible: hoveredInsight === 5 }">
                <div class="insight-text">Seamless backend integration—understands how database, auth, and API pieces connect</div>
              </div>
            </div>
            
            <div class="insight-card" @mouseenter="hoveredInsight = 6" @mouseleave="hoveredInsight = null">
              <div class="insight-front" :class="{ blurred: hoveredInsight === 6 }">
                <TrendingUp class="insight-icon" :class="{ faded: hoveredInsight === 6 }" />
                <div class="insight-title">Compressed Development Cycles</div>
              </div>
              <div class="insight-back" :class="{ visible: hoveredInsight === 6 }">
                <div class="insight-text">Timeline compression from months to weeks—fundamentally changes what's possible for solo developers</div>
              </div>
            </div>
          </div>
        </div>

        <div class="scroll-indicator">
          <span>Scroll to explore</span>
          <div class="scroll-arrow">↓</div>
        </div>

      <!-- Call to Action -->
      <div class="hero-cta" v-if="dnaData" />
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
import { Zap, Brain, RotateCcw, Sparkles, Globe, TrendingUp } from 'lucide-vue-next'
import GradientText from '../common/GradientText.vue'

const dnaData = ref<ArchitecturalDNAData | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const hoveredInsight = ref<number | null>(null)

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

.scroll-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #8b949e;
  font-size: 0.9rem;
  margin-top: 5rem;
}

.scroll-arrow {
  font-size: 1.5rem;
  animation: bounce 2s infinite;
  color: #8b949e;
}

.insights-section {
  margin-top: 4rem;
}

.insights-title {
  text-align: center;
  font-size: 1.75rem;
  font-weight: 600;
  color: #f0f6fc;
  margin-bottom: 2.5rem;
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.insight-card {
  position: relative;
  height: 180px;
  cursor: pointer;
}

.insight-front,
.insight-back {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 2rem;
  background: rgba(33, 38, 45, 0.6);
  border: 1px solid rgba(48, 54, 61, 0.8);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  transition: all 0.3s ease;
}

.insight-front {
  z-index: 2;
}

.insight-front.blurred {
  filter: blur(4px);
  opacity: 0.3;
}

.insight-back {
  z-index: 1;
  opacity: 0;
  border-color: rgba(0, 255, 136, 0.6);
  background: rgba(0, 255, 136, 0.05);
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.2);
}

.insight-back.visible {
  opacity: 1;
  z-index: 3;
}

.insight-icon {
  width: 3rem;
  height: 3rem;
  margin-bottom: 1rem;
  color: #00ff88;
  transition: opacity 0.3s ease;
}

.insight-icon.faded {
  opacity: 0;
}

.insight-title {
  font-weight: 600;
  color: #f0f6fc;
  font-size: 1.1rem;
  line-height: 1.3;
}

.insight-text {
  color: #f0f6fc;
  font-size: 1rem;
  line-height: 1.5;
  padding: 0 0.5rem;
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
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
  
  .insight-card {
    height: 150px;
  }
  
  .insight-front,
  .insight-back {
    padding: 1.5rem;
  }
  
  .insight-icon {
    width: 2.5rem;
    height: 2.5rem;
    margin-bottom: 0.75rem;
  }
  
  .insight-title {
    font-size: 1rem;
  }
  
  .insight-text {
    font-size: 0.9rem;
    padding: 0 0.25rem;
  }
  
  .insights-title {
    font-size: 1.5rem;
  }
}
</style>
