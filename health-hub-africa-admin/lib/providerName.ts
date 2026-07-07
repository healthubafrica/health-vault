/** Assembles "Title FirstName LastName" from the dedicated fields. Always
 * use this instead of hand-concatenating a provider's title into a
 * display string. */
export function buildProviderDisplayName(provider: {
  title?: string | null
  firstName: string
  lastName: string
}): string {
  return [provider.title?.trim(), provider.firstName?.trim(), provider.lastName?.trim()]
    .filter(Boolean)
    .join(' ')
}
