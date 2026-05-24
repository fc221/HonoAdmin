export function getSiteLogoText(siteTitle: string): string {
  const normalized = siteTitle.trim()
  if (!normalized) {
    return 'HA'
  }

  const latinWords = normalized.match(/[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])/g) || []
  if (latinWords.length >= 2) {
    return latinWords
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
  }

  const uppercaseLetters = normalized.match(/[A-Z]/g) || []
  if (uppercaseLetters.length >= 2) {
    return uppercaseLetters.slice(0, 2).join('')
  }

  return [...normalized.replace(/\s+/g, '')]
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
