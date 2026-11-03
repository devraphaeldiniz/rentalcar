'use client'

import { Button } from '@/components/ui/button'

/** Reabre o aviso de cookies para a pessoa mudar a escolha. */
export function CookiePreferencesButton({ variant = 'button' }: { variant?: 'button' | 'link' }) {
  const open = () => window.dispatchEvent(new Event('astacar-consent-open'))
  if (variant === 'link') {
    return (
      <button type="button" onClick={open} className="text-left text-asphalt-foreground/65 transition-colors hover:text-[hsl(186_100%_50%)]">
        Preferências de cookies
      </button>
    )
  }
  return <Button variant="brand" onClick={open}>Preferências de cookies</Button>
}
