'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/hooks/useAuth'
import { CnhForm } from '@/components/client/cnh-form'

type Profile = { full_name: string | null; phone: string | null; cpf: string | null; email: string; role: string; created_at: string }

function Notice({ kind, text }: { kind: 'ok' | 'error'; text: string }) {
  return (
    <p role={kind === 'error' ? 'alert' : 'status'}
      className={`rounded-md p-3 text-sm ${kind === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
      {text}
    </p>
  )
}

export default function ProfilePage() {
  const { isAuthenticated, isLoading: authLoading, refetch } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState({ fullName: '', phone: '', cpf: '' })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const [pwd, setPwd] = useState({ next: '', confirm: '' })
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdMsg, setPwdMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.replace('/auth/signin?redirect=%2Fprofile')
      return
    }
    fetch('/api/profile').then((r) => r.json()).then((d) => {
      if (!d.profile) return
      setProfile(d.profile)
      setForm({ fullName: d.profile.full_name ?? '', phone: d.profile.phone ?? '', cpf: d.profile.cpf ?? '' })
    })
  }, [authLoading, isAuthenticated, router])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveMsg(null)
    try {
      const r = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await r.json().catch(() => ({}))
      setSaveMsg(r.ok ? { kind: 'ok', text: 'Dados salvos.' } : { kind: 'error', text: d.error || 'Não foi possível salvar.' })
      if (r.ok) refetch()
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdMsg(null)
    if (pwd.next !== pwd.confirm) return setPwdMsg({ kind: 'error', text: 'As duas senhas não são iguais.' })
    setPwdSaving(true)
    try {
      const r = await fetch('/api/profile/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newPassword: pwd.next }) })
      const d = await r.json().catch(() => ({}))
      setPwdMsg(r.ok ? { kind: 'ok', text: 'Senha alterada. Use a nova senha no próximo login.' } : { kind: 'error', text: d.error || 'Não foi possível trocar a senha.' })
      if (r.ok) setPwd({ next: '', confirm: '' })
    } finally {
      setPwdSaving(false)
    }
  }

  if (authLoading || !profile) {
    return (
      <main className="container flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Carregando" />
      </main>
    )
  }

  return (
    <main className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold">Meus dados</h1>
      <p className="mt-1 text-muted-foreground">
        {profile.email}
        {profile.role === 'admin' && <> | <Link href="/admin" className="text-electric hover:underline">Painel administrativo</Link></>}
      </p>

      <form onSubmit={save} className="mt-8 grid gap-4 rounded-lg border p-5">
        <h2 className="text-lg font-bold">Quem vai retirar o carro</h2>
        <div className="grid gap-1.5">
          <Label htmlFor="nome">Nome completo</Label>
          <Input id="nome" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required minLength={3} autoComplete="name" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="telefone">Celular com DDD</Label>
            <Input id="telefone" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="31999999999" autoComplete="tel" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" inputMode="numeric" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="Somente números" />
          </div>
        </div>
        {saveMsg && <Notice {...saveMsg} />}
        <div><Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar dados'}</Button></div>
      </form>

      <section className="mt-6 grid gap-3 rounded-lg border p-5" aria-labelledby="cnh-perfil">
        <div>
          <h2 id="cnh-perfil" className="text-lg font-bold">CNH</h2>
          <p className="text-sm text-muted-foreground">Usada para conferir, antes de cada reserva, se a carteira vale na data da retirada.</p>
        </div>
        <CnhForm />
      </section>

      <form onSubmit={changePassword} className="mt-6 grid gap-4 rounded-lg border p-5">
        <h2 className="text-lg font-bold">Trocar senha</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="nova">Nova senha</Label>
            <Input id="nova" type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} minLength={9} required autoComplete="new-password" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="confirmar">Repita a nova senha</Label>
            <Input id="confirmar" type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} minLength={9} required autoComplete="new-password" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Pelo menos 9 caracteres.</p>
        {pwdMsg && <Notice {...pwdMsg} />}
        <div><Button type="submit" variant="outline" disabled={pwdSaving}>{pwdSaving ? 'Trocando...' : 'Trocar senha'}</Button></div>
      </form>

      <nav className="mt-6 flex flex-wrap gap-3" aria-label="Conta">
        <Button asChild variant="outline"><Link href="/profile/bookings">Minhas reservas</Link></Button>
        <Button asChild variant="outline"><Link href="/profile/audit-logs">Histórico de acessos</Link></Button>
      </nav>
    </main>
  )
}
