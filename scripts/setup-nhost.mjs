#!/usr/bin/env node
// Prepara um projeto Nhost do zero (ou atualiza um existente) para o RentalCar.
//
//   node scripts/setup-nhost.mjs                      aplica migrações e metadata
//   node scripts/setup-nhost.mjs --admin voce@email   ...e promove esse usuário a admin
//
// Lê NEXT_PUBLIC_NHOST_SUBDOMAIN, NEXT_PUBLIC_NHOST_REGION e NHOST_ADMIN_SECRET
// do .env.local. Pode rodar quantas vezes quiser: nada é aplicado duas vezes.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const adminEmail = args.includes('--admin') ? args[args.indexOf('--admin') + 1] : null

// ---------- configuração ----------
function loadEnv() {
  const file = join(root, '.env.local')
  if (!existsSync(file)) fail('Arquivo .env.local não encontrado na raiz do projeto.')
  const env = {}
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  for (const key of ['NEXT_PUBLIC_NHOST_SUBDOMAIN', 'NEXT_PUBLIC_NHOST_REGION', 'NHOST_ADMIN_SECRET']) {
    if (!env[key]) fail(`Falta ${key} no .env.local.`)
  }
  return env
}

function fail(msg) {
  console.error(`\n✖ ${msg}`)
  process.exit(1)
}

const env = loadEnv()
const HASURA = `https://${env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.hasura.${env.NEXT_PUBLIC_NHOST_REGION}.nhost.run`

async function hasura(path, body, { allowErrors = [] } = {}) {
  const res = await fetch(`${HASURA}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': env.NHOST_ADMIN_SECRET },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const code = data?.code ?? ''
    if (allowErrors.some((c) => code === c || String(data?.error ?? '').includes(c))) return null
    throw new Error(`${path} ${res.status}: ${data?.error ?? JSON.stringify(data)}`)
  }
  return data
}

const sql = (text) =>
  hasura('/v2/query', { type: 'run_sql', args: { source: 'default', sql: text, read_only: false } })

const metadata = (type, args, opts) => hasura('/v1/metadata', { type, args: { source: 'default', ...args } }, opts)

// ---------- 1. migrações ----------
async function migrate() {
  console.log('\n→ Migrações')
  await sql(`CREATE TABLE IF NOT EXISTS public.schema_migrations (
    name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`)

  const applied = new Set(
    ((await sql('SELECT name FROM public.schema_migrations')).result ?? []).slice(1).map((r) => r[0]),
  )

  // Banco criado antes deste script (sem registro de migrações): a 001 já
  // está lá, então só é registrada. As demais são idempotentes e rodam.
  if (applied.size === 0) {
    const exists = await sql("SELECT to_regclass('public.profiles') IS NOT NULL")
    if (exists.result?.[1]?.[0] === 't') {
      await sql("INSERT INTO public.schema_migrations (name) VALUES ('001_initial.sql') ON CONFLICT DO NOTHING")
      applied.add('001_initial.sql')
      console.log('  (banco existente: 001_initial.sql registrada sem executar)')
    }
  }

  const dir = join(root, 'nhost', 'migrations')
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    if (applied.has(file)) {
      console.log(`  ✓ ${file} (já aplicada)`)
      continue
    }
    const body = readFileSync(join(dir, file), 'utf8')
    // run_sql executa tudo em uma transação: ou a migração inteira entra, ou nada.
    await sql(`${body}\n;INSERT INTO public.schema_migrations (name) VALUES ('${file}');`)
    console.log(`  + ${file}`)
  }
}

// ---------- 2. metadata do Hasura ----------
const TABLES = ['profiles', 'vehicles', 'bookings', 'reviews', 'audit_logs', 'login_attempts', 'contact_messages', 'analytics_events', 'rental_extras', 'pricing_rules', 'coupons', 'banners', 'payments']
const AUTH_USERS = { schema: 'auth', name: 'users' }
const t = (name) => ({ schema: 'public', name })

const OBJECT_RELS = [
  ['bookings', 'vehicle', { foreign_key_constraint_on: 'vehicle_id' }],
  ['payments', 'booking', { foreign_key_constraint_on: 'booking_id' }],
  ['bookings', 'profile', { foreign_key_constraint_on: 'user_id' }],
  ['bookings', 'user', { manual_configuration: { remote_table: AUTH_USERS, column_mapping: { user_id: 'id' } } }],
  ['reviews', 'vehicle', { foreign_key_constraint_on: 'vehicle_id' }],
  ['reviews', 'booking', { foreign_key_constraint_on: 'booking_id' }],
  ['reviews', 'user', { manual_configuration: { remote_table: AUTH_USERS, column_mapping: { user_id: 'id' } } }],
  ['audit_logs', 'user', { manual_configuration: { remote_table: AUTH_USERS, column_mapping: { user_id: 'id' } } }],
  ['analytics_events', 'vehicle', { foreign_key_constraint_on: 'vehicle_id' }],
]

const ARRAY_RELS = [
  ['vehicles', 'bookings', { foreign_key_constraint_on: { table: t('bookings'), column: 'vehicle_id' } }],
  ['vehicles', 'reviews', { foreign_key_constraint_on: { table: t('reviews'), column: 'vehicle_id' } }],
  ['profiles', 'bookings', { foreign_key_constraint_on: { table: t('bookings'), column: 'user_id' } }],
  ['bookings', 'payments', { foreign_key_constraint_on: { table: t('payments'), column: 'booking_id' } }],
]

const VEHICLE_PUBLIC_COLUMNS = [
  'id', 'brand', 'model', 'year', 'plate', 'color', 'category', 'daily_rate', 'status',
  'description', 'transmission', 'fuel_type', 'passengers', 'doors', 'air_conditioning', 'trunk_capacity',
  'features', 'images', 'image_url', 'image_credits', 'average_rating', 'total_reviews', 'created_at',
]

const EXTRA_PUBLIC_COLUMNS = ['id', 'code', 'kind', 'name', 'description', 'price', 'pricing', 'max_total', 'is_default', 'sort']

// O admin do painel usa o admin secret no servidor; aqui só entram os papéis
// que o navegador pode usar diretamente. Reservas, avaliações, logs e tentativas
// de login são escritos só pelas rotas de API, nunca direto pelo cliente.
const SELECT_PERMS = [
  ['vehicles', 'anonymous', { columns: VEHICLE_PUBLIC_COLUMNS, filter: { status: { _neq: 'maintenance' } } }],
  ['vehicles', 'user', { columns: VEHICLE_PUBLIC_COLUMNS, filter: { status: { _neq: 'maintenance' } } }],
  ['rental_extras', 'anonymous', { columns: EXTRA_PUBLIC_COLUMNS, filter: { active: { _eq: true } } }],
  ['rental_extras', 'user', { columns: EXTRA_PUBLIC_COLUMNS, filter: { active: { _eq: true } } }],
  ['profiles', 'user', {
    columns: ['id', 'email', 'full_name', 'phone', 'cpf', 'role', 'email_verified', 'created_at'],
    filter: { id: { _eq: 'X-Hasura-User-Id' } },
  }],
  ['bookings', 'user', {
    columns: ['id', 'vehicle_id', 'start_date', 'end_date', 'total_amount', 'status', 'payment_status', 'payment_method', 'notes', 'created_at'],
    filter: { user_id: { _eq: 'X-Hasura-User-Id' } },
  }],
]

// Nenhuma escrita direta pelo navegador: alterações de perfil passam pela
// rota /api/profile, que valida nome, telefone e CPF.
const UPDATE_PERMS = []

async function applyMetadata() {
  console.log('\n→ Metadata (tabelas, relações e permissões)')
  const ignoreExisting = { allowErrors: ['already-tracked', 'already-exists', 'already exists'] }
  const ignoreMissing = { allowErrors: ['not-exists', 'not-found', 'does not exist', 'permission-denied'] }

  for (const name of TABLES) await metadata('pg_track_table', { table: t(name) }, ignoreExisting)
  console.log(`  ✓ ${TABLES.length} tabelas rastreadas`)

  for (const [table, name, using] of OBJECT_RELS) {
    await metadata('pg_drop_relationship', { table: t(table), relationship: name }, ignoreMissing)
    await metadata('pg_create_object_relationship', { table: t(table), name, using })
  }
  for (const [table, name, using] of ARRAY_RELS) {
    await metadata('pg_drop_relationship', { table: t(table), relationship: name }, ignoreMissing)
    await metadata('pg_create_array_relationship', { table: t(table), name, using })
  }
  console.log(`  ✓ ${OBJECT_RELS.length + ARRAY_RELS.length} relações`)

  // Remove permissões antigas de insert/update/delete que o cliente não deve ter.
  for (const table of TABLES) {
    for (const role of ['user', 'anonymous']) {
      for (const kind of ['insert', 'update', 'delete', 'select']) {
        await metadata(`pg_drop_${kind}_permission`, { table: t(table), role }, ignoreMissing)
      }
    }
  }
  for (const [table, role, permission] of SELECT_PERMS) {
    await metadata('pg_create_select_permission', { table: t(table), role, permission })
  }
  for (const [table, role, permission] of UPDATE_PERMS) {
    await metadata('pg_create_update_permission', { table: t(table), role, permission })
  }
  console.log(`  ✓ ${SELECT_PERMS.length + UPDATE_PERMS.length} permissões`)
}

// ---------- 3. extras ----------
// O catálogo de veículos vem da migração 005 (antes era a opção --seed).
async function makeAdmin(email) {
  console.log(`\n→ Admin: ${email}`)
  const safe = email.replace(/'/g, "''").toLowerCase()
  const result = await sql(`UPDATE profiles SET role = 'admin' WHERE lower(email) = '${safe}' RETURNING id`)
  const count = Math.max(0, (result.result?.length ?? 1) - 1)
  if (!count) fail(`Nenhum perfil com o e-mail ${email}. Cadastre-se no site primeiro e rode de novo.`)
  console.log('  ✓ promovido a admin')
}

try {
  console.log(`Projeto: ${env.NEXT_PUBLIC_NHOST_SUBDOMAIN} (${env.NEXT_PUBLIC_NHOST_REGION})`)
  await migrate()
  await applyMetadata()
  if (adminEmail) await makeAdmin(adminEmail)
  console.log('\n✔ Banco pronto.')
} catch (error) {
  fail(error.message)
}
