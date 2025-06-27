export interface FaqCategory {
  id: string
  title: string
  description: string
  icon: string
  order: number
}

export interface FaqEntry {
  id: string
  category: string
  question: string
  analogy: string
  technical: string
  tags: string[]
  related_ui_steps: string[]
  order: number
}

export interface FaqData {
  categories: FaqCategory[]
  faqs: FaqEntry[]
}

export interface FaqFilter {
  category?: string
  tags?: string[]
  searchTerm?: string
}

export type PopoverTrigger = 'hover' | 'click' | 'both'

export interface FaqLinkProps {
  faqIds: string | string[]
  trigger?: PopoverTrigger
  className?: string
  showIcon?: boolean
  iconPosition?: 'left' | 'right'
}
