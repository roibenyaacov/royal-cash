const CLAIM_AFTER_AUTH_KEY = 'royal-cash-claim-after-auth'
const GROUP_INVITE_AFTER_AUTH_KEY = 'royal-cash-group-invite-after-auth'

export function markClaimAfterAuth(token: string) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(CLAIM_AFTER_AUTH_KEY, token)
}

export function consumeClaimAfterAuth(expectedToken: string): boolean {
  if (typeof window === 'undefined') return false
  const stored = sessionStorage.getItem(CLAIM_AFTER_AUTH_KEY)
  if (stored === expectedToken) {
    sessionStorage.removeItem(CLAIM_AFTER_AUTH_KEY)
    return true
  }
  return false
}

export function markGroupInviteAfterAuth(token: string) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(GROUP_INVITE_AFTER_AUTH_KEY, token)
}

export function consumeGroupInviteAfterAuth(expectedToken: string): boolean {
  if (typeof window === 'undefined') return false
  const stored = sessionStorage.getItem(GROUP_INVITE_AFTER_AUTH_KEY)
  if (stored === expectedToken) {
    sessionStorage.removeItem(GROUP_INVITE_AFTER_AUTH_KEY)
    return true
  }
  return false
}
