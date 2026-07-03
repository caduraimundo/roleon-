export function validateName(name: unknown): string | null {
  if (typeof name !== 'string') return 'Nome inválido'
  const trimmed = name.trim()
  if (trimmed.length < 2 || trimmed.length > 50) {
    return 'Nome deve ter entre 2 e 50 caracteres'
  }
  return null
}
