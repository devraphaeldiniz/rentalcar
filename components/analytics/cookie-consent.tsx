'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Cookie } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getConsent, setConsent } from '@/lib/analytics/client'

/** Aviso de cookies (LGPD): o monitoramento só começa depois de "Aceitar". */
export function CookieConsent() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(getConsent() === null)
    const reopen = () => setOpen(true)
    window.addEventListener('astacar-consent-open', reopen)
    return () => window.removeEventListener('astacar-consent-open', reopen)
  }, [])

  if (!open || pathname?.startsWith('/admin')) return null

  const choose = (value: 'granted' | 'denied') => {
    setConsent(value)
    setOpen(false)
  }

  return (
    <div role="dialog" aria-live="polite" aria-label="Aviso de cookies" className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl border bg-card/95 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl sm:flex-row sm:items-center sm:p-5">
        <Cookie className="hidden h-8 w-8 shrink-0 text-electric sm:block" aria-hidden />
        <p className="flex-1 text-sm text-muted-foreground">
          Usamos cookies próprios para contar visitas e entender como as pessoas usam o site, sem anúncios e sem compartilhar
          com terceiros. Você decide.{' '}
          <Link href="/privacidade" className="text-electric hover:underline">Saiba mais</Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={() => choose('denied')} className="flex-1 sm:flex-none">Recusar</Button>
          <Button variant="brand" onClick={() => choose('granted')} className="flex-1 sm:flex-none">Aceitar</Button>
        </div>
      </div>
    </div>
  )
}
