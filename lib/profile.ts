export type ProfileRow = {
  full_name?: string | null
  college?: string | null
}

export function hasRequiredProfileFields(profile: ProfileRow | null | undefined) {
  return Boolean(profile?.full_name?.trim() && profile?.college?.trim())
}

export function isProfileIncomplete(
  profile: ProfileRow | null | undefined
) {
  return !hasRequiredProfileFields(profile)
}
