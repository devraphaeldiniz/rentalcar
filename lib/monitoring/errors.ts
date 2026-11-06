import { adminGraphql } from '@/lib/auth/authorization'
import { type ErrorReport, toRow } from '@/lib/monitoring/sanitize'

// Limite por instância: um erro em loop não pode encher o banco nem deixar o site lento.
const PER_FINGERPRINT_MS = 60_000
const MAX_PER_MINUTE = 60
const recent = new Map<string, number>()
let windowStart = 0
let windowCount = 0

function shouldStore(fp: string, now = Date.now()): boolean {
  if (now - windowStart > 60_000) {
    windowStart = now
    windowCount = 0
  }
  if (windowCount >= MAX_PER_MINUTE) return false
  const last = recent.get(fp)
  if (last && now - last < PER_FINGERPRINT_MS) return false
  if (recent.size > 2000) recent.clear()
  recent.set(fp, now)
  windowCount += 1
  return true
}

/**
 * Registra um erro: sempre no log da Vercel (JSON numa linha, fácil de filtrar) e,
 * respeitando o limite, na tabela app_errors que o painel mostra. Nunca lança.
 */
export async function recordError(report: ErrorReport): Promise<void> {
  try {
    const row = toRow(report)
    console.error(JSON.stringify({ level: 'error', type: 'app_error', ...row, stack: undefined }))
    if (!process.env.NHOST_ADMIN_SECRET || !shouldStore(row.fingerprint)) return
    await adminGraphql('mutation E($o: app_errors_insert_input!) { insert_app_errors_one(object: $o) { id } }', { o: row })
  } catch {
    // O monitoramento nunca pode derrubar a requisição que já está com erro.
  }
}
