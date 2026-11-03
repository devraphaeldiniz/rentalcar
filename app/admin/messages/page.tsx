'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Message = { id: string; name: string; email: string; phone: string | null; subject: string | null; message: string; read: boolean; created_at: string }

const dt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/messages')
    const d = await r.json().catch(() => ({}))
    if (!r.ok) setError(d.error || 'Erro ao carregar as mensagens')
    setMessages(d.messages ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  const toggle = async (m: Message) => {
    await fetch('/api/admin/messages', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id, read: !m.read }) })
    load()
  }

  if (!messages) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" aria-label="Carregando" /></div>

  const unread = messages.filter((m) => !m.read).length

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Mensagens</h1>
      <p className="text-muted-foreground">Enviadas pelo formulário de contato. {unread > 0 ? `${unread} não lida${unread > 1 ? 's' : ''}.` : 'Todas lidas.'}</p>
      {error && <p role="alert" className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {messages.length === 0 ? (
        <p className="mt-8 rounded-lg border p-6 text-muted-foreground">Nenhuma mensagem ainda.</p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {messages.map((m) => (
            <li key={m.id} className={`rounded-lg border p-4 ${m.read ? 'bg-card' : 'border-primary/40 bg-primary/5'}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{m.subject || 'Sem assunto'}</p>
                  <p className="text-sm text-muted-foreground">
                    {m.name} | <a href={`mailto:${m.email}`} className="underline">{m.email}</a>{m.phone ? ` | ${m.phone}` : ''} | {dt.format(new Date(m.created_at))}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => toggle(m)}>{m.read ? 'Marcar como não lida' : 'Marcar como lida'}</Button>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm">{m.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
