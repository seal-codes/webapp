<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}

const props = withDefaults(defineProps<Props>(), {
  position: 'top-right',
})

const positionClasses = computed(() => {
  const classes = {
    'bottom-right': 'fixed bottom-0 right-0 z-[9999]',
    'bottom-left': 'fixed bottom-0 left-0 z-[9999]',
    'top-right': 'fixed top-0 right-0 z-[9999]',
    'top-left': 'fixed top-0 left-0 z-[9999]',
  }
  
  return classes[props.position as keyof typeof classes]
})

const cornerStyle = computed(() => {
  const styles = {
    'top-right': 'border-top: 180px solid rgba(0, 0, 0, 0.85); border-left: 180px solid transparent;',
    'top-left': 'border-top: 180px solid rgba(0, 0, 0, 0.85); border-right: 180px solid transparent;',
    'bottom-right': 'border-bottom: 180px solid rgba(0, 0, 0, 0.85); border-left: 180px solid transparent;',
    'bottom-left': 'border-bottom: 180px solid rgba(0, 0, 0, 0.85); border-right: 180px solid transparent;',
  }
  
  return styles[props.position as keyof typeof styles]
})

const badgePosition = computed(() => {
  const positions = {
    'top-right': { top: '40px', right: '40px' },
    'top-left': { top: '40px', left: '40px' },
    'bottom-right': { bottom: '40px', right: '40px' },
    'bottom-left': { bottom: '40px', left: '40px' },
  }
  
  return positions[props.position as keyof typeof positions]
})
</script>

<template>
  <div
    :class="positionClasses"
    class="folded-corner-container"
  >
    <!-- Folded corner triangle -->
    <div 
      class="folded-corner"
      :style="cornerStyle"
    />
    
    <!-- Badge image positioned within the triangle -->
    <a
      href="/about"
      rel="noopener noreferrer"
      title="Built with Bolt - Hackathon Entry"
      class="badge-link"
      :style="badgePosition"
    >
      <img 
        src="/white_circle_360x360.png" 
        alt="Bolt Badge" 
        class="badge-image"
      >
    </a>
  </div>
</template>

<style scoped>
.folded-corner-container {
  width: 180px;
  height: 180px;
  pointer-events: none;
}

.folded-corner {
  position: absolute;
  top: 0;
  right: 0;
  width: 0;
  height: 0;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0));
  transition: filter 0.3s ease;
}

.badge-link {
  position: absolute;
  z-index: 10;
  pointer-events: auto;
  transition: transform 0.3s ease;
}

.badge-image {
  width: 100px;
  height: 100px;
  object-fit: contain;
  transition: transform 0.3s ease;
  border-radius: 50%;
  border: 16px solid rgba(0, 0, 0);
  box-shadow: 0 2px 8px rgba(85, 84, 84, 0.2);
}

/* Hover effects */
.folded-corner-container:hover .folded-corner {
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

.folded-corner-container:hover .badge-image {
  transform: scale(1.1);
}

/* Mobile: always bottom-right with smaller size */
@media (max-width: 768px) {
  .folded-corner-container {
    position: fixed !important;
    top: auto !important;
    left: auto !important;
    bottom: 0 !important;
    right: 0 !important;
    width: 130px;
    height: 130px;
  }
  
  .folded-corner {
    border: none !important;
    border-bottom: 130px solid rgba(0, 0, 0, 0.85) !important;
    border-left: 130px solid transparent !important;
  }
  
  .badge-link {
    top: auto !important;
    left: auto !important;
    bottom: 25px !important;
    right: 25px !important;
  }
  
  .badge-image {
    width: 80px;
    height: 80px;
  }
}
</style>
