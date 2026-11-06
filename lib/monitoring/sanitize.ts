// Funções puras do monitoramento (sem acesso ao banco), para poder testar.

export type ErrorSource = 'server' | 'client'

export type ErrorReport = {
  source: ErrorSource
  message: string
  route?: string | null
  path?: string | null
  method?: string | null
  digest?: string | null
  stack?: string | null
  userAgent?: string | null
}

const cut = (value: string | null | undefined, max: number) => (value ? value.slice(0, max) : null)

/** Tira dados pessoais e segredos que às vezes aparecem em mensagens de erro. */
export function scrub(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[cpf]')
    .replace(/\b(Bearer\s+)[\w.-]+/gi, '$1[token]')
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[jwt]')
    .replace(/((?:secret|token|password|senha|key)["']?\s*[:=]\s*["']?)[^\s"',}]+/gi, '$1[oculto]')
}

/** Caminho sem query string (pode ter token, e-mail ou cupom) e com ids trocados por ":id". */
export function normalizePath(path: string | null | undefined): string | null {
  if (!path) return null
  const clean = path.split(/[?#]/)[0]
  return clean.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id').slice(0, 300)
}

/**
 * Agrupa erros iguais: mesma origem, rota e mensagem, ignorando números e ids que mudam a cada vez.
 * Hash curto (FNV-1a) para não depender de crypto no navegador nem na edge.
 */
export function fingerprint(report: Pick<ErrorReport, 'source' | 'message' | 'route' | 'path'>): string {
  const message = report.message
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>')
    .replace(/\d+/g, '<n>')
    .slice(0, 200)
  const key = `${report.source}|${report.route ?? normalizePath(report.path) ?? ''}|${message}`
  let hash = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

/** Linha pronta para gravar: tudo cortado em tamanhos seguros e sem dados pessoais. */
export function toRow(report: ErrorReport) {
  const message = scrub(report.message || 'Erro sem mensagem').slice(0, 500)
  const path = normalizePath(report.path)
  return {
    source: report.source,
    fingerprint: fingerprint({ source: report.source, message, route: report.route, path }),
    message,
    route: cut(report.route, 200),
    path,
    method: cut(report.method?.toUpperCase(), 10),
    digest: cut(report.digest, 100),
    // As primeiras linhas da pilha bastam para achar o arquivo.
    stack: report.stack ? scrub(report.stack.split('\n').slice(0, 12).join('\n')).slice(0, 2000) : null,
    user_agent: cut(report.userAgent, 300),
  }
}
