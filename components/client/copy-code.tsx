'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-lg border border-dashed border-electric/60 bg-background/60 px-3 py-1.5 font-mono text-sm font-bold text-electric hover:bg-background"
      aria-label={copied ? `Cupom ${code} copiado` : `Copiar cupom ${code}`}
    >
      {code}
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
    </button>
  )
}
