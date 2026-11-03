'use client'

import { CONSENT_KEY, type ClientEvent, type Consent } from './events'

export function getConsent(): Consent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY)
    return v === 'granted' || v === 'denied' ? v : null
  } catch {
    return null
  }
}

export function setConsent(value: Consent) {
  try { localStorage.setItem(CONSENT_KEY, value) } catch {}
  window.dispatchEvent(new CustomEvent('astacar-consent', { detail: value }))
}

type Payload = {
  path?: string
  vehicleId?: string
  referrer?: string
  meta?: Record<string, string | number | boolean>
}

/**
 * Registra um evento de navegação. Sem consentimento, nada é enviado,
 * exceto quando a própria pessoa responde algo (explicit = true).
 */
export function track(event: ClientEvent, payload: Payload = {}, { explicit = false } = {}) {
  const consent = getConsent() === 'granted'
  if (!consent && !explicit) return
  const body = JSON.stringify({ event, consent, ...payload })
  try {
    if (navigator.sendBeacon?.('/api/track', new Blob([body], { type: 'application/json' }))) return
  } catch {}
  fetch('/api/track', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {})
}
