/**
 * Service for interfacing with hackathon analysis data
 * Fetches JSON data from pre-generated analysis files
 */

export interface BoltSession {
  session_number: number
  hash: string
  message: string
  date: string
  author: string
  summary: string
  key_achievements: string[]
  files_created: number
  lines_added: number
  impact: string
}

export interface ArchitecturalDNAData {
  analysis_type: 'architectural_dna'
  timestamp: string
  git_commit: string
  git_branch: string
  bolt_sessions: BoltSession[]
  categories: {
    foundation: CategoryData
    verification: CategoryData
    authentication: CategoryData
    signature: CategoryData
    ui: CategoryData
    manual: CategoryData
  }
  totals: {
    bolt_lines: number
    manual_lines: number
    analyzed_lines: number
    analyzed_files: number
  }
  coverage: {
    total_codebase_files: number
    total_codebase_lines: number
    file_coverage_percent: number
    line_coverage_percent: number
  }
  impact: {
    bolt_percentage: number
    manual_percentage: number
  }
  methodology: {
    approach: string
    focus: string
    measurement: string
    verification: string
  }
}

export interface CategoryData {
  files: Record<string, number>
  total_lines: number
  file_count: number
  session?: number | string
  session_name?: string
  description?: string
}

export interface TimelineData {
  analysis_type: 'development_timeline'
  timestamp: string
  git_commit: string
  git_branch: string
  sessions: Array<{
    session_number: number
    hash: string
    subject: string
    session_name: string
    date: string
    author: string
    files_changed: number
    lines_added: number
    lines_removed: number
    cumulative_files: number
    cumulative_lines: number
    key_files: Array<{
      status: string
      file: string
    }>
  }>
  velocity_metrics: {
    total_sessions: number
    total_files_created: number
    total_lines_added: number
    avg_files_per_session: number
    avg_lines_per_session: number
  }
  development_model: {
    approach: string
    pattern: string
    complexity_progression: string
  }
}

class HackathonAnalysisService {
  private dnaCache: ArchitecturalDNAData | null = null
  private timelineCache: TimelineData | null = null
  private cacheTimestamp: number = 0
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  /**
   * Get architectural DNA analysis data from pre-generated JSON
   */
  async getArchitecturalDNA(): Promise<ArchitecturalDNAData> {
    if (this.isCacheValid() && this.dnaCache) {
      return this.dnaCache
    }

    try {
      const response = await fetch('/hackathon-analysis.json')
      if (!response.ok) {
        throw new Error(`Failed to fetch analysis data: ${response.status}`)
      }
      
      const data = await response.json()
      this.dnaCache = data
      this.cacheTimestamp = Date.now()
      return data
    } catch (error) {
      console.error('Failed to fetch architectural DNA data:', error)
      throw new Error('Unable to load architectural analysis data')
    }
  }

  /**
   * Get development timeline data
   */
  async getTimeline(): Promise<TimelineData> {
    if (this.isCacheValid() && this.timelineCache) {
      return this.timelineCache
    }

    try {
      // For now, return mock timeline data
      // TODO: Generate timeline JSON file similar to DNA analysis
      const mockData: TimelineData = {
        analysis_type: 'development_timeline',
        timestamp: new Date().toISOString(),
        git_commit: 'b459f7d',
        git_branch: 'hackathon',
        sessions: [
          {
            session_number: 1,
            hash: '1d9182f',
            subject: 'bolt.new session 1: Scaffolding + document selection',
            session_name: 'Scaffolding + document selection',
            date: '2025-06-06',
            author: 'Oliver Jägle',
            files_changed: 42,
            lines_added: 5399,
            lines_removed: 1,
            cumulative_files: 42,
            cumulative_lines: 5399,
            key_files: [
              { status: 'A', file: 'src/App.vue' },
              { status: 'A', file: 'src/main.ts' },
              { status: 'A', file: 'src/router/index.ts' },
              { status: 'A', file: 'src/stores/documentStore.ts' },
              { status: 'A', file: 'src/views/TheHomePage.vue' },
            ],
          },
          {
            session_number: 2,
            hash: 'ca97162',
            subject: 'bolt.new session 2: verification page',
            session_name: 'verification page',
            date: '2025-06-09',
            author: 'Oliver Jägle',
            files_changed: 23,
            lines_added: 3004,
            lines_removed: 94,
            cumulative_files: 65,
            cumulative_lines: 8403,
            key_files: [
              { status: 'A', file: 'src/views/TheVerificationPage.vue' },
              { status: 'A', file: 'src/services/verification-service.ts' },
              { status: 'A', file: 'src/services/qr-reader-service.ts' },
              { status: 'A', file: 'src/components/verification/VerificationResults.vue' },
            ],
          },
          {
            session_number: 3,
            hash: '09293c2',
            subject: 'bolt.new session 3: backend',
            session_name: 'backend',
            date: '2025-06-13',
            author: 'Oliver Jägle',
            files_changed: 28,
            lines_added: 3692,
            lines_removed: 173,
            cumulative_files: 93,
            cumulative_lines: 12095,
            key_files: [
              { status: 'A', file: 'src/services/auth-service.ts' },
              { status: 'A', file: 'src/stores/authStore.ts' },
              { status: 'A', file: 'src/services/signing-service.ts' },
              { status: 'A', file: 'src/views/AuthCallbackPage.vue' },
            ],
          },
          {
            session_number: 4,
            hash: '5ea6e11',
            subject: 'bolt.new session 4: online signature verification',
            session_name: 'online signature verification',
            date: '2025-06-14',
            author: 'Oliver Jägle',
            files_changed: 27,
            lines_added: 860,
            lines_removed: 2674,
            cumulative_files: 120,
            cumulative_lines: 12955,
            key_files: [
              { status: 'A', file: 'src/services/signature-verification-service.ts' },
              { status: 'M', file: 'src/components/verification/VerificationResults.vue' },
            ],
          },
          {
            session_number: 5,
            hash: 'f1619dc',
            subject: 'bolt.new session 5: UI polishing',
            session_name: 'UI polishing',
            date: '2025-06-27',
            author: 'Oliver Jägle',
            files_changed: 15,
            lines_added: 372,
            lines_removed: 60,
            cumulative_files: 135,
            cumulative_lines: 13327,
            key_files: [
              { status: 'A', file: 'src/components/common/GradientText.vue' },
              { status: 'A', file: 'src/components/common/HackathonBadge.vue' },
              { status: 'A', file: 'src/plugins/mediaQueries.ts' },
            ],
          },
        ],
        velocity_metrics: {
          total_sessions: 5,
          total_files_created: 121,
          total_lines_added: 12982,
          avg_files_per_session: 24,
          avg_lines_per_session: 2596,
        },
        development_model: {
          approach: 'incremental_architecture',
          pattern: 'foundation_first',
          complexity_progression: 'structure_to_features_to_polish',
        },
      }

      this.timelineCache = mockData
      this.cacheTimestamp = Date.now()
      return mockData
    } catch (error) {
      console.error('Failed to fetch timeline data:', error)
      throw new Error('Unable to load timeline analysis data')
    }
  }

  /**
   * Clear cache and force fresh data fetch
   */
  clearCache(): void {
    this.dnaCache = null
    this.timelineCache = null
    this.cacheTimestamp = 0
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_DURATION
  }
}

export const hackathonAnalysisService = new HackathonAnalysisService()
