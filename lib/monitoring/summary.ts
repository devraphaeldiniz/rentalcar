export type ErrorRow = {
  id: string
  source: 'server' | 'client'
  fingerprint: string
  message: string
  route: string | null
  path: string | null
  method: string | null
  stack: string | null
  created_at: string
}

export type ErrorGroup = {
  fingerprint: string
  source: 'server' | 'client'
  message: string
  route: string | null
  count: number
  firstSeen: string
  lastSeen: string
  paths: string[]
  sample: ErrorRow
}

/** Junta ocorrências do mesmo erro; as mais recentes primeiro. `rows` vem ordenado do mais novo para o mais antigo. */
export function groupErrors(rows: ErrorRow[]): ErrorGroup[] {
  const groups = new Map<string, ErrorGroup>()
  for (const row of rows) {
    const g = groups.get(row.fingerprint)
    if (!g) {
      groups.set(row.fingerprint, {
        fingerprint: row.fingerprint,
        source: row.source,
        message: row.message,
        route: row.route,
        count: 1,
        firstSeen: row.created_at,
        lastSeen: row.created_at,
        paths: row.path ? [row.path] : [],
        sample: row,
      })
      continue
    }
    g.count += 1
    if (row.created_at < g.firstSeen) g.firstSeen = row.created_at
    if (row.created_at > g.lastSeen) g.lastSeen = row.created_at
    if (row.path && !g.paths.includes(row.path) && g.paths.length < 5) g.paths.push(row.path)
  }
  return [...groups.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
}
