'use client'

import { useState } from 'react'
import { MessageCircleQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { track } from '@/lib/analytics/client'
import { FEEDBACK_REASONS, type FeedbackReason } from '@/lib/analytics/events'

type Props = { vehicleId: string; days: number; total: number }

/** Pergunta opcional para quem desiste: ajuda a entender preço, concorrência etc. */
export function CheckoutFeedback({ vehicleId, days, total }: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<FeedbackReason | null>(null)
  const [comment, setComment] = useState('')
  const [sent, setSent] = useState(false)

  if (sent) {
    return <p className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">Obrigado! Sua resposta ajuda a melhorar a AstaCar.</p>
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <MessageCircleQuestion className="h-4 w-4 text-electric" aria-hidden />
        Não vai reservar agora? Conte o motivo
      </button>
    )
  }

  const send = () => {
    if (!reason) return
    track(
      'checkout_feedback',
      { vehicleId, meta: { reason, days, total, ...(comment.trim() ? { comment: comment.trim().slice(0, 300) } : {}) } },
      { explicit: true },
    )
    setSent(true)
  }

  return (
    <section className="rounded-2xl border bg-card p-5" aria-labelledby="fb-titulo">
      <h2 id="fb-titulo" className="font-bold">O que fez você desistir?</h2>
      <p className="mt-1 text-sm text-muted-foreground">Resposta anônima e opcional.</p>
      <fieldset className="mt-4">
        <legend className="sr-only">Motivo</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FEEDBACK_REASONS) as FeedbackReason[]).map((key) => (
            <label
              key={key}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
                reason === key ? 'border-electric bg-electric/10 text-electric' : 'hover:border-electric/40'
              }`}
            >
              <input
                type="radio"
                name="fb-motivo"
                value={key}
                checked={reason === key}
                onChange={() => setReason(key)}
                className="sr-only"
              />
              {FEEDBACK_REASONS[key]}
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor="fb-comentario" className="mt-4 block text-sm font-medium">Quer contar mais? (opcional)</label>
      <textarea
        id="fb-comentario"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={300}
        rows={2}
        className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        placeholder="Ex.: encontrei mais barato em outro lugar"
      />
      <div className="mt-3 flex gap-2">
        <Button type="button" onClick={send} disabled={!reason}>Enviar</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </section>
  )
}
