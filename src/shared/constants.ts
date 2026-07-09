import type { LanguageCode, Role } from './schemas'

export const APP_NAME = 'Matchday Ops AI'
export const CHALLENGE_VERTICAL = 'Smart Stadiums & Tournament Operations'

export const languageOptions: Array<{ code: LanguageCode; label: string; direction: 'ltr' | 'rtl' }> = [
  { code: 'en', label: 'English', direction: 'ltr' },
  { code: 'es', label: 'Spanish', direction: 'ltr' },
  { code: 'fr', label: 'French', direction: 'ltr' },
  { code: 'ar', label: 'Arabic', direction: 'rtl' },
  { code: 'hi', label: 'Hindi', direction: 'ltr' },
  { code: 'pt', label: 'Portuguese', direction: 'ltr' },
]

export const roleLabels: Record<Role, string> = {
  operations: 'Venue operations',
  security: 'Security',
  accessibility: 'Accessibility',
  transport: 'Transport',
  sustainability: 'Sustainability',
}

export const riskRank = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
} as const
