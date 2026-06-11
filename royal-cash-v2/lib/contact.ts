export const CONTACT_EMAIL = 'royalcash.pokerapp@gmail.com'

export function contactMailtoUrl(subject?: string): string {
  const params = subject ? `?subject=${encodeURIComponent(subject)}` : ''
  return `mailto:${CONTACT_EMAIL}${params}`
}
