export function isProfileComplete(profile: {
  full_name?: string | null;
  preference?: string | null;
} | null | undefined) {
  const fullName = profile?.full_name?.trim();
  const preference = profile?.preference?.trim();

  return Boolean(fullName && preference);
}
