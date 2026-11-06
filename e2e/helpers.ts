import { expect, type Page } from '@playwright/test'

/** Recusa o banner de cookies (a opção que menos coleta) para ele não cobrir botões. */
export async function dismissCookies(page: Page) {
  const refuse = page.getByRole('button', { name: 'Recusar' })
  if (await refuse.isVisible().catch(() => false)) await refuse.click()
}

/** Primeiro carro do catálogo da home. */
export async function openFirstVehicle(page: Page) {
  await page.goto('/')
  await dismissCookies(page)
  const card = page.locator('a[href^="/vehicles/"]').first()
  await expect(card).toBeVisible()
  const href = await card.getAttribute('href')
  await page.goto(href ?? '/')
  return href ?? ''
}

/** Data AAAA-MM-DD daqui a `days` dias, no calendário de Brasília. */
export function isoFromToday(days: number) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const d = new Date(`${today}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Converte "R$ 1.234,56" em 1234.56. */
export const parseBRL = (text: string) => Number(text.replace(/[^\d,]/g, '').replace(',', '.'))
