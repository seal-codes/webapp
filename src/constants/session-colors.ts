// Shared session colors for consistency across terminal tree and timeline
export const SESSION_COLORS = {
  1: '#00ff88', // Foundation - green
  2: '#4ecdc4', // Verification - teal  
  3: '#ff6b6b', // Authentication - red
  4: '#ffd93d', // Signature - yellow
  5: '#a78bfa', // UI - purple
} as const

export const SESSION_TITLES = {
  1: 'Foundation Architecture',
  2: 'Verification System', 
  3: 'Authentication & Backend',
  4: 'Signature Verification',
  5: 'UI Polishing'
} as const

// Map category names to session numbers
export const CATEGORY_TO_SESSION = {
  'foundation': 1,
  'verification': 2,
  'authentication': 3,
  'signature': 4,
  'ui': 5,
  'manual': 0 // Special case for manual work
} as const

export const NOISE_COLOR = '#30363d' // Subtle gray for manual polishing
export const MANUAL_COLOR = '#8b949e' // Gray for manual work

export const getSessionColor = (sessionNumber: number): string => {
  return SESSION_COLORS[sessionNumber as keyof typeof SESSION_COLORS] || '#8b949e'
}

export const getSessionTitle = (sessionNumber: number): string => {
  return SESSION_TITLES[sessionNumber as keyof typeof SESSION_TITLES] || `Session ${sessionNumber}`
}

export const getCategoryColor = (categoryName: string): string => {
  const sessionNumber = CATEGORY_TO_SESSION[categoryName as keyof typeof CATEGORY_TO_SESSION]
  if (sessionNumber === 0) return MANUAL_COLOR // Manual work
  return getSessionColor(sessionNumber)
}
