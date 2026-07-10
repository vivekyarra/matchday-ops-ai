import type { LanguageCode, Role } from './schemas'

export const APP_NAME = 'Matchday Ops AI'
export const CHALLENGE_VERTICAL = 'Smart Stadiums & Tournament Operations'
export const CHALLENGE_ID = 'Challenge 4'
export const CHALLENGE_CONTEXT = 'FIFA World Cup 2026'
export const CHALLENGE_PROBLEM_STATEMENT =
  'Build a GenAI-enabled solution that enhances stadium operations and the overall tournament experience for fans, organizers, volunteers, or venue staff. The solution must leverage Generative AI to improve navigation, crowd management, accessibility, transportation, sustainability, multilingual assistance, operational intelligence, or real-time decision support during the FIFA World Cup 2026.'

export const challengeCapabilities = [
  'navigation',
  'crowd management',
  'accessibility',
  'transportation',
  'sustainability',
  'multilingual assistance',
  'operational intelligence',
  'real-time decision support',
] as const

export const challengeAudiences = [
  'fans',
  'organizers',
  'volunteers',
  'venue staff',
] as const

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
