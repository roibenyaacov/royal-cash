type ProfileLike = {
  full_name?: string | null
  email?: string | null
} | null

type AuthUserLike = {
  email?: string | null
  user_metadata?: Record<string, unknown>
}

export function resolveUserDisplayName(
  profile: ProfileLike,
  authUser: AuthUserLike,
): string {
  return (
    profile?.full_name?.trim() ||
    (authUser.user_metadata?.full_name as string | undefined)?.trim() ||
    (profile?.email ?? authUser.email ?? '').split('@')[0]
  )
}
