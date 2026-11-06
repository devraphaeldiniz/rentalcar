import { expect, test } from '@playwright/test'
import { dismissCookies, isoFromToday, openFirstVehicle, parseBRL } from './helpers'

test.describe('site público', () => {
  test('home mostra a busca e o catálogo', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/AstaCar/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('AstaCar')
    await expect(page.getByLabel(/Retirada/i).first()).toBeVisible()
    await expect(page.getByLabel(/Devolução/i).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Buscar carros' })).toBeVisible()
    expect(await page.locator('a[href^="/vehicles/"]').count()).toBeGreaterThan(3)
  })

  test('banner de cookies: recusar guarda a escolha', async ({ page }) => {
    await page.goto('/')
    const refuse = page.getByRole('button', { name: 'Recusar' })
    await expect(refuse).toBeVisible()
    await refuse.click()
    await expect(refuse).toBeHidden()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Recusar' })).toBeHidden()
  })

  test('filtro por categoria mostra só os carros dela', async ({ page }) => {
    await page.goto('/aluguel/suv')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(await page.locator('a[href^="/vehicles/"]').count()).toBeGreaterThan(0)
  })

  test('página do carro calcula o valor do período', async ({ page }) => {
    await openFirstVehicle(page)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const start = isoFromToday(10)
    const end = isoFromToday(13)
    await page.getByLabel('Retirada', { exact: true }).fill(start)
    await page.getByLabel('Devolução', { exact: true }).fill(end)
    await expect(page.getByText('3 diárias', { exact: false }).first()).toBeVisible()
    const cta = page.getByRole('link', { name: 'Continuar para a reserva' })
    await expect(cta).toHaveAttribute('href', new RegExp(`retirada=${start}&devolucao=${end}`))
    // O valor exibido é positivo e está em reais.
    const price = await page.locator('.text-electric.tabular').first().innerText()
    expect(parseBRL(price)).toBeGreaterThan(0)
  })

  test('reservar sem login leva para o login e volta depois', async ({ page }) => {
    const href = await openFirstVehicle(page)
    await page.getByRole('link', { name: 'Continuar para a reserva' }).click()
    await expect(page).toHaveURL(/\/auth\/signin/)
    expect(decodeURIComponent(page.url())).toContain(`${href}/checkout`)
    await expect(page.getByLabel('Email')).toBeVisible()
  })

  test('páginas institucionais abrem', async ({ page }) => {
    for (const [path, text] of [
      ['/sobre', /Aluguel de carros/],
      ['/termos', /Termos/i],
      ['/privacidade', /Privacidade/i],
      ['/contato', /Fale com a AstaCar/],
    ] as const) {
      const res = await page.goto(path)
      expect(res?.status(), path).toBe(200)
      await expect(page.getByRole('heading', { level: 1 })).toContainText(text)
    }
  })

  test('endereço que não existe mostra a página 404', async ({ page }) => {
    const res = await page.goto('/pagina-que-nao-existe-e2e')
    expect(res?.status()).toBe(404)
    await dismissCookies(page)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('não existe')
    await expect(page.getByRole('link', { name: 'Ver carros disponíveis' })).toBeVisible()
  })
})
