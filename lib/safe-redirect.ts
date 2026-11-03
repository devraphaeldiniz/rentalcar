/**
 * Devolve um caminho interno seguro para redirecionar depois do login.
 * Recusa endereços externos e truques como "//site.com" e "/\site.com",
 * que o navegador interpreta como outro domínio (redirecionamento aberto).
 */
export function safeRedirect(target: string | null | undefined, fallback = '/'): string {
  if (!target || typeof target !== 'string') return fallback
  if (!target.startsWith('/') || target.startsWith('//') || target.includes('\\')) return fallback
  if (/[\u0000-\u001f\u007f]/.test(target)) return fallback
  try {
    const base = 'http://local.invalid'
    const url = new URL(target, base)
    if (url.origin !== base) return fallback
    return url.pathname + url.search + url.hash
  } catch {
    return fallback
  }
}
