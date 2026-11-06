import { todayIso } from '@/lib/rental'
import Papa from 'papaparse'

// Um nome de cliente como "=HYPERLINK(...)" viraria fórmula ao abrir no Excel.
const FORMULA = /^[=+\-@\t\r]/
const neutralize = (value: unknown) => (typeof value === 'string' && FORMULA.test(value) ? `'${value}` : value)

export function exportToCSV(data: any[], filename: string) {
  const safe = data.map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, neutralize(v)])))
  const csv = Papa.unparse(safe)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${todayIso()}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
