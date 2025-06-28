<template>
  <div class="development-timeline">
    <div class="section-header">
      <h2><Clock class="section-icon" />Development Timeline</h2>
      <p class="section-subtitle">
        Session-by-session progression from zero to production-ready
      </p>
    </div>
    
    <div class="timeline-container" v-if="timelineData">
      <!-- Chart Container -->
      <div class="chart-container">
        <div class="chart-header">
          <div class="chart-title">Development Activity by Session</div>
          <div class="chart-stats">
            <div class="stat">
              <span class="stat-value">{{ Math.max(...(timelineData.sessions.map(s => s.lines_added) || [0])).toLocaleString() }}</span>
              <span class="stat-label">peak session</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ timelineData.velocity_metrics.avg_lines_per_session.toLocaleString() }}</span>
              <span class="stat-label">avg per session</span>
            </div>
          </div>
        </div>

        <!-- SVG Chart -->
        <div class="chart-wrapper">
          <svg 
            ref="chartSvg" 
            class="timeline-chart" 
            :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
            @mousemove="handleMouseMove"
            @mouseleave="handleMouseLeave"
          >
            <!-- Grid Lines -->
            <defs>
              <pattern id="grid" width="50" height="40" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 40" fill="none" stroke="rgba(139, 148, 158, 0.1)" stroke-width="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            <!-- Y-axis labels -->
            <g class="y-axis">
              <text 
                v-for="(tick, index) in yAxisTicks" 
                :key="index"
                :x="40" 
                :y="tick.y + 5" 
                class="axis-label"
              >
                {{ tick.label }}
              </text>
            </g>

            <!-- X-axis labels -->
            <g class="x-axis">
              <text 
                v-for="tick in xAxisTicks" 
                :key="tick.label"
                :x="tick.x" 
                :y="chartHeight - 10" 
                class="axis-label session-label"
              >
                {{ tick.label }}
              </text>
            </g>

            <!-- Noise bars (background) -->
            <g class="noise-bars">
              <rect 
                v-for="(bar, index) in noiseBars" 
                :key="`noise-${index}`"
                :x="bar.x" 
                :y="bar.y"
                :width="bar.width"
                :height="bar.height"
                :fill="bar.color"
                fill-opacity="0.3"
                class="noise-bar"
                @mouseenter="handleNoiseHover($event)"
              />
            </g>

            <!-- Session bars -->
            <g class="session-bars">
              <rect 
                v-for="bar in sessionBars" 
                :key="`bar-${bar.session.session_number}`"
                :x="bar.x" 
                :y="bar.y"
                :width="bar.width"
                :height="bar.height"
                :fill="hoveredSession === bar.session.session_number ? bar.color : 'rgba(0, 255, 136, 0.8)'"
                :stroke="hoveredSession === bar.session.session_number ? '#fff' : 'rgba(255, 255, 255, 0.3)'"
                :stroke-width="hoveredSession === bar.session.session_number ? '2' : '1'"
                class="session-bar"
                @mouseenter="handleBarHover(bar.session.session_number, $event)"
              />
            </g>

            <!-- Hover line -->
            <line 
              v-if="hoverX !== null"
              :x1="hoverX" 
              :y1="60" 
              :x2="hoverX" 
              :y2="chartHeight - 40"
              stroke="rgba(255, 255, 255, 0.3)" 
              stroke-width="1" 
              stroke-dasharray="4,4"
              class="hover-line"
            />
          </svg>

          <!-- Tooltip -->
          <div 
            v-if="tooltipData"
            class="chart-tooltip"
            :style="{ left: tooltipData.x + 'px', top: tooltipData.y + 'px' }"
          >
            <div v-if="tooltipData.isNoise" class="tooltip-header">
              <div class="tooltip-title">Manual Polishing</div>
              <div class="tooltip-subtitle">Ongoing refinements and tweaks</div>
            </div>
            <div v-else-if="hoveredSession" class="tooltip-header">
              <div class="tooltip-title">{{ getSessionTitle(hoveredSession) }}</div>
              <div class="tooltip-date">{{ formatDate(getSessionData(hoveredSession)?.date || '') }}</div>
            </div>
            
            <div v-if="!tooltipData.isNoise && hoveredSession" class="tooltip-stats">
              <div class="tooltip-stat">
                <span class="stat-label">Lines added:</span>
                <span class="stat-value">+{{ getSessionData(hoveredSession)?.lines_added.toLocaleString() }}</span>
              </div>
              <div class="tooltip-stat">
                <span class="stat-label">Files changed:</span>
                <span class="stat-value">{{ getSessionData(hoveredSession)?.files_changed }}</span>
              </div>
              <div class="tooltip-stat">
                <span class="stat-label">Cumulative total:</span>
                <span class="stat-value">{{ getSessionData(hoveredSession)?.cumulative_lines.toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div class="timeline-loading" v-else-if="loading">
      <div class="loading-spinner">Loading timeline data...</div>
    </div>

    <!-- Error State -->
    <div class="timeline-error" v-else-if="error">
      <div class="error-message">{{ error }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { hackathonAnalysisService, type TimelineData } from '../../services/hackathon-analysis-service'
import { getSessionColor, getSessionTitle, NOISE_COLOR } from '../../constants/session-colors'
import { Clock } from 'lucide-vue-next'

const timelineData = ref<TimelineData | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const chartSvg = ref<SVGElement>()
const hoveredSession = ref<number | null>(null)
const hoverX = ref<number | null>(null)
const tooltipData = ref<{ x: number; y: number } | null>(null)

// Chart dimensions
const chartWidth = 1000
const chartHeight = 400
const padding = { top: 60, right: 60, bottom: 60, left: 60 }

const getSessionData = (sessionNumber: number) => {
  return timelineData.value?.sessions.find(s => s.session_number === sessionNumber)
}

// Time-based positioning
const getTimeRange = () => {
  if (!timelineData.value) return { start: new Date(), end: new Date() }
  
  const dates = timelineData.value.sessions.map(s => new Date(s.date))
  const start = new Date(Math.min(...dates.map(d => d.getTime())))
  const end = new Date(Math.max(...dates.map(d => d.getTime())))
  
  // Add one day after the last session
  end.setDate(end.getDate() + 1)
  
  return { start, end }
}

const getXPositionByTime = (date: Date): number => {
  const { start, end } = getTimeRange()
  const totalTime = end.getTime() - start.getTime()
  const sessionTime = date.getTime() - start.getTime()
  const chartAreaWidth = chartWidth - padding.left - padding.right
  
  return padding.left + (sessionTime / totalTime) * chartAreaWidth
}

const getYPosition = (value: number): number => {
  const maxValue = Math.max(...(timelineData.value?.sessions.map(s => s.lines_added) || [0]))
  const chartAreaHeight = chartHeight - padding.top - padding.bottom
  return padding.top + chartAreaHeight - (value / maxValue) * chartAreaHeight
}

// Generate continuous noise signal connecting all humps
const generateContinuousNoise = () => {
  if (!timelineData.value) return []
  
  const { start, end } = getTimeRange()
  const sessions = timelineData.value.sessions
  const maxValue = Math.max(...sessions.map(s => s.lines_added))
  
  const noisePoints = []
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  
  // Create continuous noise signal
  for (let day = 0; day <= totalDays; day++) {
    const currentDate = new Date(start.getTime() + day * 24 * 60 * 60 * 1000)
    
    // Check if this is a session date
    const sessionOnThisDay = sessions.find(s => {
      const sessionDate = new Date(s.date)
      return sessionDate.toDateString() === currentDate.toDateString()
    })
    
    if (!sessionOnThisDay) {
      // Generate noise value (5-20% of max, with some randomness)
      const baseNoise = maxValue * (0.05 + Math.random() * 0.15)
      const noiseValue = Math.max(0, baseNoise + (Math.random() - 0.5) * baseNoise * 0.5)
      
      noisePoints.push({
        date: currentDate,
        value: noiseValue,
        isNoise: true
      })
    }
  }
  
  return noisePoints
}

// Adjust hump width to prevent overlap
const calculateHumpWidth = (sessionIndex: number): number => {
  if (!timelineData.value) return 80
  
  const sessions = timelineData.value.sessions
  const currentDate = new Date(sessions[sessionIndex].date)
  
  let minDistance = Infinity
  
  // Check distance to previous session
  if (sessionIndex > 0) {
    const prevDate = new Date(sessions[sessionIndex - 1].date)
    const daysDiff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    minDistance = Math.min(minDistance, daysDiff)
  }
  
  // Check distance to next session
  if (sessionIndex < sessions.length - 1) {
    const nextDate = new Date(sessions[sessionIndex + 1].date)
    const daysDiff = (nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    minDistance = Math.min(minDistance, daysDiff)
  }
  
  // Calculate width based on available space (max 80px, min 30px)
  const availableWidth = (minDistance / 7) * 40 // Scale based on weeks
  return Math.max(30, Math.min(80, availableWidth))
}

// Create individual hump paths with true bell curves
const createHumpPath = (centerX: number, peakY: number, width: number, isFirstHump = false): string => {
  const baselineY = getYPosition(0)
  const halfWidth = width / 2
  
  if (isFirstHump) {
    // First hump has no left half - smooth curve from peak to baseline
    return `M ${centerX},${peakY} Q ${centerX + halfWidth * 0.5},${peakY + (baselineY - peakY) * 0.5} ${centerX + halfWidth},${baselineY}`
  } else {
    // True bell curve using quadratic bezier curves
    const midLeftX = centerX - halfWidth * 0.5
    const midLeftY = peakY + (baselineY - peakY) * 0.5
    const midRightX = centerX + halfWidth * 0.5
    const midRightY = peakY + (baselineY - peakY) * 0.5
    
    return `M ${centerX - halfWidth},${baselineY} Q ${midLeftX},${midLeftY} ${centerX},${peakY} Q ${midRightX},${midRightY} ${centerX + halfWidth},${baselineY}`
  }
}

const createHumpAreaPath = (centerX: number, peakY: number, width: number, isFirstHump = false): string => {
  const baselineY = getYPosition(0)
  const halfWidth = width / 2
  
  if (isFirstHump) {
    // First hump area
    return `M ${centerX},${baselineY} L ${centerX},${peakY} Q ${centerX + halfWidth * 0.5},${peakY + (baselineY - peakY) * 0.5} ${centerX + halfWidth},${baselineY} Z`
  } else {
    // Bell curve area
    const midLeftX = centerX - halfWidth * 0.5
    const midLeftY = peakY + (baselineY - peakY) * 0.5
    const midRightX = centerX + halfWidth * 0.5
    const midRightY = peakY + (baselineY - peakY) * 0.5
    
    return `M ${centerX - halfWidth},${baselineY} Q ${midLeftX},${midLeftY} ${centerX},${peakY} Q ${midRightX},${midRightY} ${centerX + halfWidth},${baselineY} Z`
  }
}

// Create continuous noise line connecting all points
const createNoiseLinePath = () => {
  if (!timelineData.value) return ''
  
  const allPoints = []
  const sessions = timelineData.value.sessions
  const noisePoints = generateContinuousNoise()
  
  // Combine session points and noise points, sorted by date
  sessions.forEach(session => {
    allPoints.push({
      date: new Date(session.date),
      value: session.lines_added,
      isSession: true,
      sessionNumber: session.session_number
    })
  })
  
  noisePoints.forEach(noise => {
    allPoints.push({
      date: noise.date,
      value: noise.value,
      isSession: false
    })
  })
  
  // Sort by date
  allPoints.sort((a, b) => a.date.getTime() - b.date.getTime())
  
  // Create smooth path through all points
  const pathPoints = allPoints.map(point => ({
    x: getXPositionByTime(point.date),
    y: getYPosition(point.value)
  }))
  
  if (pathPoints.length < 2) return ''
  
  let path = `M ${pathPoints[0].x},${pathPoints[0].y}`
  
  for (let i = 1; i < pathPoints.length; i++) {
    const current = pathPoints[i]
    const prev = pathPoints[i - 1]
    
    // Use smooth curves for noise, sharp peaks for sessions
    const controlX = prev.x + (current.x - prev.x) * 0.5
    const controlY = (prev.y + current.y) * 0.5
    
    path += ` Q ${controlX},${controlY} ${current.x},${current.y}`
  }
  
  return path
}

const yAxisTicks = computed(() => {
  if (!timelineData.value) return []
  
  const maxValue = Math.max(...timelineData.value.sessions.map(s => s.lines_added))
  const ticks = []
  const tickCount = 5
  
  for (let i = 0; i <= tickCount; i++) {
    const value = (maxValue / tickCount) * i
    ticks.push({
      y: getYPosition(value),
      label: value > 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0)
    })
  }
  
  return ticks.reverse()
})

const xAxisTicks = computed(() => {
  if (!timelineData.value) return []
  
  const { start, end } = getTimeRange()
  const ticks = []
  const current = new Date(start)
  
  while (current <= end) {
    ticks.push({
      x: getXPositionByTime(current),
      label: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })
    current.setDate(current.getDate() + 7) // Weekly ticks
  }
  
  return ticks
})

// Calculate bar width to prevent overlap
const calculateBarWidth = (sessionIndex: number): number => {
  if (!timelineData.value) return 40
  
  const sessions = timelineData.value.sessions
  const currentDate = new Date(sessions[sessionIndex].date)
  
  let minDistance = Infinity
  
  // Check distance to previous session
  if (sessionIndex > 0) {
    const prevDate = new Date(sessions[sessionIndex - 1].date)
    const daysDiff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    minDistance = Math.min(minDistance, daysDiff)
  }
  
  // Check distance to next session
  if (sessionIndex < sessions.length - 1) {
    const nextDate = new Date(sessions[sessionIndex + 1].date)
    const daysDiff = (nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    minDistance = Math.min(minDistance, daysDiff)
  }
  
  // Calculate width based on available space (max 60px, min 20px)
  const availableWidth = (minDistance / 7) * 30 // Scale based on weeks
  return Math.max(20, Math.min(60, availableWidth))
}

const sessionBars = computed(() => {
  if (!timelineData.value) return []
  
  const baselineY = getYPosition(0)
  
  return timelineData.value.sessions.map((session, index) => {
    const centerX = getXPositionByTime(new Date(session.date))
    const topY = getYPosition(session.lines_added)
    const width = calculateBarWidth(index)
    const height = baselineY - topY
    const x = centerX - width / 2
    
    return {
      session,
      centerX,
      x,
      y: topY,
      width,
      height,
      color: getSessionColor(session.session_number)
    }
  })
})

const noiseBars = computed(() => {
  const noisePoints = generateContinuousNoise()
  const baselineY = getYPosition(0)
  
  return noisePoints.map(point => {
    const centerX = getXPositionByTime(point.date)
    const topY = getYPosition(point.value)
    const width = 8 + Math.random() * 12 // Variable width 8-20px
    const height = baselineY - topY
    const x = centerX - width / 2
    
    return {
      x,
      y: topY,
      width,
      height,
      centerX,
      date: point.date,
      value: point.value,
      color: NOISE_COLOR
    }
  })
})

const continuousNoisePath = computed(() => {
  return createNoiseLinePath()
})

const continuousNoiseAreaPath = computed(() => {
  const linePath = createNoiseLinePath()
  if (!linePath) return ''
  
  const baselineY = getYPosition(0)
  
  // Convert line path to area path by adding baseline
  const pathCommands = linePath.split(/[MQ]/).filter(cmd => cmd.trim())
  if (pathCommands.length === 0) return ''
  
  const firstPoint = pathCommands[0].trim().split(',')
  const lastCommand = pathCommands[pathCommands.length - 1].trim()
  const lastPoint = lastCommand.split(' ').pop()?.split(',')
  
  if (!firstPoint || !lastPoint) return ''
  
  return `${linePath} L ${lastPoint[0]},${baselineY} L ${firstPoint[0]},${baselineY} Z`
})

const handleMouseMove = (event: MouseEvent) => {
  if (!chartSvg.value || !timelineData.value) return
  
  const rect = chartSvg.value.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * chartWidth
  const y = ((event.clientY - rect.top) / rect.height) * chartHeight
  
  hoverX.value = x
  
  // Check if hovering over a session bar first
  let closestSession = null
  let minDistance = Infinity
  
  sessionBars.value.forEach((bar) => {
    const distance = Math.abs(x - bar.centerX)
    if (distance < minDistance && distance < bar.width / 2) {
      minDistance = distance
      closestSession = bar.session.session_number
    }
  })
  
  if (closestSession) {
    // Hovering over a session bar
    hoveredSession.value = closestSession
    tooltipData.value = {
      x: event.clientX - rect.left + 10,
      y: event.clientY - rect.top - 10
    }
  } else {
    // Check if hovering over noise area
    const baselineY = getYPosition(0)
    const currentY = (y / chartHeight) * chartHeight
    
    if (currentY > baselineY - 50 && currentY < baselineY) {
      // Hovering over noise area
      hoveredSession.value = null
      tooltipData.value = {
        x: event.clientX - rect.left + 10,
        y: event.clientY - rect.top - 10,
        isNoise: true
      }
    } else {
      // Not hovering over anything
      hoveredSession.value = null
      tooltipData.value = null
    }
  }
}

const handleBarHover = (sessionNumber: number, event: MouseEvent) => {
  hoveredSession.value = sessionNumber
  
  if (chartSvg.value) {
    const rect = chartSvg.value.getBoundingClientRect()
    tooltipData.value = {
      x: event.clientX - rect.left + 10,
      y: event.clientY - rect.top - 10
    }
  }
}

const handleNoiseHover = (event: MouseEvent) => {
  hoveredSession.value = null
  
  if (chartSvg.value) {
    const rect = chartSvg.value.getBoundingClientRect()
    tooltipData.value = {
      x: event.clientX - rect.left + 10,
      y: event.clientY - rect.top - 10,
      isNoise: true
    }
  }
}

const handleMouseLeave = () => {
  hoveredSession.value = null
  hoverX.value = null
  tooltipData.value = null
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  })
}

onMounted(async () => {
  try {
    timelineData.value = await hackathonAnalysisService.getTimeline()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load timeline data'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.development-timeline {
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

.timeline-container {
  max-width: 1000px;
  margin: 0 auto;
}

.chart-container {
  background: rgba(33, 38, 45, 0.6);
  border: 1px solid rgba(48, 54, 61, 0.8);
  border-radius: 12px;
  padding: 2rem;
  backdrop-filter: blur(10px);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.chart-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #f0f6fc;
}

.chart-stats {
  display: flex;
  gap: 2rem;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #00ff88;
  font-family: 'Fira Code', monospace;
}

.stat-label {
  font-size: 0.8rem;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chart-wrapper {
  position: relative;
  background: rgba(13, 17, 23, 0.8);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
}

.timeline-chart {
  width: 100%;
  height: 400px;
  overflow: visible;
}

.axis-label {
  fill: #8b949e;
  font-size: 12px;
  font-family: 'Fira Code', monospace;
}

.session-label {
  text-anchor: middle;
  font-weight: 600;
}

.area-fill {
  transition: all 0.3s ease;
}

.main-line {
  transition: all 0.3s ease;
  filter: drop-shadow(0 0 4px currentColor);
}

.session-bar {
  transition: all 0.3s ease;
  cursor: pointer;
}

.session-bar:hover {
  filter: drop-shadow(0 0 8px currentColor);
}

.continuous-noise-area {
  pointer-events: all;
}

.continuous-noise-line {
  pointer-events: all;
}

.hover-line {
  pointer-events: none;
}

.chart-tooltip {
  position: absolute;
  background: rgba(13, 17, 23, 0.95);
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 0.75rem;
  color: #f0f6fc;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  pointer-events: none;
  z-index: 1000;
  min-width: 200px;
}

.tooltip-header {
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #30363d;
}

.tooltip-title {
  font-weight: 600;
  color: #f0f6fc;
}

.tooltip-date {
  font-size: 0.8rem;
  color: #8b949e;
  margin-top: 0.25rem;
}

.tooltip-subtitle {
  font-size: 0.8rem;
  color: #8b949e;
  margin-top: 0.25rem;
  font-style: italic;
}

.tooltip-stats {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tooltip-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tooltip-stat .stat-label {
  color: #8b949e;
  font-size: 0.8rem;
}

.tooltip-stat .stat-value {
  color: #00ff88;
  font-weight: 600;
  font-family: 'Fira Code', monospace;
  font-size: 0.8rem;
}

.timeline-loading,
.timeline-error {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
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

@media (max-width: 768px) {
  .section-header h2 {
    font-size: 2rem;
    gap: 0.75rem;
  }
  
  .section-icon {
    width: 2rem;
    height: 2rem;
  }
  
  .chart-container {
    padding: 1rem;
  }
  
  .chart-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .chart-stats {
    gap: 1rem;
  }
  
  .timeline-chart {
    height: 300px;
  }
  
  .chart-tooltip {
    min-width: 150px;
    font-size: 0.8rem;
  }
}
</style>
