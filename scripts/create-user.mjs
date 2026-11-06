#!/usr/bin/env node
// Cria uma conta no Nhost Auth do projeto, já com e-mail confirmado.
//
//   npm run user:create -- --email cliente.teste@example.com --name "Cliente Teste"
//   npm run user:create -- --email admin.teste@example.com --name "Admin" --admin
//
// A senha é gerada aqui e gravada só em .env.contas-teste.local (fora do Git).
// Nada é mostrado no terminal além do e-mail e do caminho do arquivo.

import { readFileSync, appendFileSync, existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const arg = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)

const email = arg('--email')?.trim().toLowerCase()
const name = arg('--name') ?? ''
const makeAdmin = args.includes('--admin')

function fail(msg) {
  console.error(`\n✖ ${msg}`)
  process.exit(1)
}

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('Informe um e-mail válido com --email.')

const envFile = join(root, '.env.local')
if (!existsSync(envFile)) fail('Arquivo .env.local não encontrado.')
const env = Object.fromEntries(
  readFileSync(envFile, 'utf8').split(/\r?\n/).map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]),
)
const sub = env.NEXT_PUBLIC_NHOST_SUBDOMAIN
const region = env.NEXT_PUBLIC_NHOST_REGION
if (!sub || !region || !env.NHOST_ADMIN_SECRET) fail('Faltam variáveis do Nhost no .env.local.')

const AUTH = `https://${sub}.auth.${region}.nhost.run/v1`
const GRAPHQL = `https://${sub}.graphql.${region}.nhost.run/v1`

async function gql(query, variables) {
  const res = await fetch(GRAPHQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': env.NHOST_ADMIN_SECRET },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0].message)
  return json.data
}

// 20 caracteres aleatórios; letras, números e símbolos simples.
const password = `${randomBytes(15).toString('base64').replace(/\+/g, '-').replace(/\//g, '_')}!`

try {
  const res = await fetch(`${AUTH}/signup/email-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, options: name ? { displayName: name } : {} }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (body?.error === 'email-already-in-use') fail(`Já existe uma conta com ${email}. Use outro e-mail.`)
    fail(`O Nhost recusou o cadastro: ${body?.message ?? body?.error ?? res.status}`)
  }

  const { users } = await gql('query U($email: citext!) { users(where: { email: { _eq: $email } }) { id } }', { email })
  const id = users?.[0]?.id
  if (!id) fail('Conta criada, mas não foi encontrada para confirmar o e-mail.')

  // Confirma o e-mail (contas de teste não recebem o link) e garante o perfil.
  await gql('mutation V($id: uuid!) { updateUser(pk_columns: { id: $id }, _set: { emailVerified: true }) { id } }', { id })
  await gql(
    `mutation P($o: profiles_insert_input!) {
      insert_profiles_one(object: $o, on_conflict: { constraint: profiles_pkey, update_columns: [] }) { id }
    }`,
    { o: { id, email, full_name: name || null } },
  )
  if (makeAdmin) {
    await gql(`mutation R($id: uuid!) { update_profiles_by_pk(pk_columns: { id: $id }, _set: { role: "admin" }) { id } }`, { id })
  }

  const out = join(root, '.env.contas-teste.local')
  if (!existsSync(out)) appendFileSync(out, '# Contas de teste da AstaCar. Arquivo local, ignorado pelo Git.\n')
  appendFileSync(out, `\n# ${new Date().toISOString().slice(0, 16)} ${makeAdmin ? 'admin' : 'cliente'}\n${email}\n${password}\n`)

  console.log(`\n✔ Conta ${makeAdmin ? 'de administrador ' : ''}criada: ${email}`)
  console.log('  E-mail já confirmado. A senha está em .env.contas-teste.local')
} catch (error) {
  fail(error.message)
}
