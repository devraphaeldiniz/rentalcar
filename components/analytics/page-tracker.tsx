'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { track } from '@/lib/analytics/client'

/** Conta cada página vista (fora do painel admin). */
export function PageTracker() {
  const pathname = usePathname()
  const first = useRef(true)

  useEffect(() => {
    const send = () => {
      if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/api')) return
      track('page_view', {
        path: pathname,
        // A origem da visita só faz sentido na primeira página.
        referrer: first.current ? document.referrer || undefined : undefined,
      })
      first.current = false
    }
    send()
    // Quem aceita os cookies na primeira página também tem essa página contada.
    const onConsent = (e: Event) => { if ((e as CustomEvent).detail === 'granted') send() }
    window.addEventListener('astacar-consent', onConsent)
    return () => window.removeEventListener('astacar-consent', onConsent)
  }, [pathname])

  return null
}
