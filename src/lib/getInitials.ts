export function getInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ''

  const words = trimmed.split(/\s+/)
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return words
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}
