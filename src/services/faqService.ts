import { load } from 'js-yaml'
import type { FaqData, FaqEntry, FaqCategory, FaqFilter } from '@/types/faq'

class FaqService {
  private faqData: FaqData | null = null
  private isLoading = false

  /**
   * Load FAQ data from YAML file
   */
  async loadFaqData(): Promise<FaqData> {
    if (this.faqData) {
      return this.faqData
    }

    if (this.isLoading) {
      // Wait for existing load to complete
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      return this.faqData!
    }

    this.isLoading = true

    try {
      // Import the YAML file as text
      const response = await fetch('/data/faq.yaml')
      if (!response.ok) {
        throw new Error(`Failed to load FAQ data: ${response.statusText}`)
      }
      
      const yamlText = await response.text()
      const parsedData = load(yamlText) as FaqData

      // Validate the data structure
      if (!parsedData.categories || !parsedData.faqs) {
        throw new Error('Invalid FAQ data structure')
      }

      // Sort categories and FAQs by order
      parsedData.categories.sort((a, b) => a.order - b.order)
      parsedData.faqs.sort((a, b) => {
        // First sort by category order, then by FAQ order within category
        const categoryA = parsedData.categories.find(c => c.id === a.category)
        const categoryB = parsedData.categories.find(c => c.id === b.category)
        
        if (categoryA && categoryB && categoryA.order !== categoryB.order) {
          return categoryA.order - categoryB.order
        }
        
        return a.order - b.order
      })

      this.faqData = parsedData
      return this.faqData
    } catch (error) {
      console.error('Error loading FAQ data:', error)
      throw error
    } finally {
      this.isLoading = false
    }
  }

  /**
   * Get all FAQ categories
   */
  async getCategories(): Promise<FaqCategory[]> {
    const data = await this.loadFaqData()
    return data.categories
  }

  /**
   * Get all FAQ entries
   */
  async getFaqs(): Promise<FaqEntry[]> {
    const data = await this.loadFaqData()
    return data.faqs
  }

  /**
   * Get FAQ entries by category
   */
  async getFaqsByCategory(categoryId: string): Promise<FaqEntry[]> {
    const data = await this.loadFaqData()
    return data.faqs.filter(faq => faq.category === categoryId)
  }

  /**
   * Get a specific FAQ entry by ID
   */
  async getFaqById(faqId: string): Promise<FaqEntry | undefined> {
    const data = await this.loadFaqData()
    return data.faqs.find(faq => faq.id === faqId)
  }

  /**
   * Get multiple FAQ entries by IDs
   */
  async getFaqsByIds(faqIds: string[]): Promise<FaqEntry[]> {
    const data = await this.loadFaqData()
    return data.faqs.filter(faq => faqIds.includes(faq.id))
  }

  /**
   * Filter FAQ entries based on criteria
   */
  async filterFaqs(filter: FaqFilter): Promise<FaqEntry[]> {
    const data = await this.loadFaqData()
    let filteredFaqs = [...data.faqs]

    // Filter by category
    if (filter.category) {
      filteredFaqs = filteredFaqs.filter(faq => faq.category === filter.category)
    }

    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      filteredFaqs = filteredFaqs.filter(faq => 
        filter.tags!.some(tag => faq.tags.includes(tag)),
      )
    }

    // Filter by search term (searches in question, analogy, and technical fields)
    if (filter.searchTerm) {
      const searchTerm = filter.searchTerm.toLowerCase()
      filteredFaqs = filteredFaqs.filter(faq => 
        faq.question.toLowerCase().includes(searchTerm) ||
        faq.analogy.toLowerCase().includes(searchTerm) ||
        faq.technical.toLowerCase().includes(searchTerm) ||
        faq.tags.some(tag => tag.toLowerCase().includes(searchTerm)),
      )
    }

    return filteredFaqs
  }

  /**
   * Get all unique tags from FAQ entries
   */
  async getAllTags(): Promise<string[]> {
    const data = await this.loadFaqData()
    const allTags = data.faqs.flatMap(faq => faq.tags)
    return [...new Set(allTags)].sort()
  }

  /**
   * Get FAQ entries related to specific UI steps
   */
  async getFaqsByUiStep(uiStep: string): Promise<FaqEntry[]> {
    const data = await this.loadFaqData()
    return data.faqs.filter(faq => faq.related_ui_steps.includes(uiStep))
  }

  /**
   * Search FAQ entries (for future enhancement)
   */
  async searchFaqs(searchTerm: string): Promise<FaqEntry[]> {
    return this.filterFaqs({ searchTerm })
  }

  /**
   * Get category by ID
   */
  async getCategoryById(categoryId: string): Promise<FaqCategory | undefined> {
    const data = await this.loadFaqData()
    return data.categories.find(category => category.id === categoryId)
  }

  /**
   * Clear cached data (useful for testing or data refresh)
   */
  clearCache(): void {
    this.faqData = null
  }
}

// Export singleton instance
export const faqService = new FaqService()
export default faqService
