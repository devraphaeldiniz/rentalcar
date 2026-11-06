// Painel em modo demonstração: quem visita o portfólio vê o admin funcionando de verdade,
// mas sem dados pessoais dos clientes e sem poder alterar nada.
// Este arquivo só tem funções puras (sem acesso ao servidor) para poder ser testado.

export const DEMO_ADMIN_LOCKED_MESSAGE = 'Painel de demonstração: aqui dá para ver tudo, mas nada pode ser alterado.'
export const DEMO_ADMIN_COOKIE = 'asta_demo_admin'
export const HIDDEN_TEXT = '[oculto na demonstração]'

const EMAIL_KEYS = new Set(['email', 'customer_email', 'user_email', 'reply_to'])
const NAME_KEYS = new Set(['displayname', 'display_name', 'full_name', 'customer_name', 'author_name', 'user_name'])
const PHONE_KEYS = new Set(['phone', 'phonenumber', 'phone_number', 'customer_phone', 'whatsapp'])
const CPF_KEYS = new Set(['cpf', 'customer_cpf', 'document'])
const IP_KEYS = new Set(['ip', 'ip_address', 'ipaddress'])
const DROP_KEYS = new Set(['avatarurl', 'avatar_url'])
/** Texto livre escrito pelo cliente no formulário de contato. */
const FREE_TEXT_KEYS = new Set(['message'])

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const CPF_RE = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g
const PHONE_RE = /(?:\+?55\s?)?\(?\b\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/g
const IPV4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function maskEmail(email: string): string {
  const [user, domain = ''] = email.split('@')
  const tld = domain.includes('.') ? domain.slice(domain.lastIndexOf('.')) : ''
  return `${user.slice(0, 1)}•••@•••${tld}`
}

/** "Maria Souza" → "M•••• S••••": dá para ver que existe um nome, não de quem é. */
export function maskName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}••••`)
    .join(' ')
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 4 ? `(••) •••••-••${digits.slice(-2)}` : '••••'
}

/** Procura e-mail, CPF, telefone e IP dentro de um texto qualquer (ex.: metadados de auditoria). */
export function maskText(text: string): string {
  if (UUID_RE.test(text)) return text
  return text
    .replace(EMAIL_RE, (m) => maskEmail(m))
    .replace(CPF_RE, '•••.•••.•••-••')
    .replace(PHONE_RE, (m) => maskPhone(m))
    .replace(IPV4_RE, '•••.•••.•••.•••')
}

function maskValue(key: string, value: unknown, siblings: Record<string, unknown>): unknown {
  const k = key.toLowerCase()
  if (DROP_KEYS.has(k)) return null
  if (typeof value === 'string' && value) {
    if (EMAIL_KEYS.has(k)) return maskEmail(value)
    if (NAME_KEYS.has(k)) return maskName(value)
    // "name" sozinho é nome de carro, categoria ou proteção; só é pessoa ao lado de um e-mail.
    if (k === 'name' && ('email' in siblings || 'phone' in siblings)) return maskName(value)
    if (PHONE_KEYS.has(k)) return maskPhone(value)
    if (CPF_KEYS.has(k)) return '•••.•••.•••-••'
    if (IP_KEYS.has(k)) return '•••.•••.•••.•••'
    if (FREE_TEXT_KEYS.has(k) && ('email' in siblings || 'name' in siblings)) return HIDDEN_TEXT
    if (k === 'id' || k.endsWith('_id')) return value
    return maskText(value)
  }
  return maskPersonalData(value)
}

/** Copia o valor trocando dados pessoais por versões mascaradas. Nunca altera o original. */
export function maskPersonalData<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => maskPersonalData(v)) as T
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const obj = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(obj)) out[key] = maskValue(key, v, obj)
    return out as T
  }
  if (typeof value === 'string') return maskText(value) as T
  return value
}
