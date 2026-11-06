import { expect, test } from '@playwright/test'
import { dismissCookies, isoFromToday, openFirstVehicle } from './helpers'

// Fluxo completo com a conta de demonstração: reserva, confere em Minhas reservas e cancela.
// Escreve no banco, por isso só roda com E2E_BOOKING=1 e quando o botão de demonstração existe.
test.describe('reserva de ponta a ponta (conta de demonstração)', () => {
  test.skip(process.env.E2E_BOOKING !== '1', 'Defina E2E_BOOKING=1 para fazer uma reserva de verdade.')
  test.describe.configure({ mode: 'serial' })

  test('reservar, ver em Minhas reservas e cancelar', async ({ page, request }) => {
    const demo = await (await request.get('/api/auth/demo')).json()
    test.skip(!demo.enabled, 'Conta de demonstração desligada (DEMO_CLIENT_EMAIL/DEMO_CLIENT_PASSWORD).')

    // 1. Entra como cliente de demonstração.
    await page.goto('/auth/signin')
    await dismissCookies(page)
    await page.getByRole('button', { name: 'Entrar como cliente de demonstração' }).click()
    await expect(page).not.toHaveURL(/\/auth\/signin/)

    // 2. Escolhe um carro e um período curto, longe o bastante para não cruzar com outras reservas de teste.
    await openFirstVehicle(page)
    const offset = 20 + Math.floor(Math.random() * 30)
    await page.getByLabel('Retirada', { exact: true }).fill(isoFromToday(offset))
    await page.getByLabel('Devolução', { exact: true }).fill(isoFromToday(offset + 2))
    await page.getByRole('link', { name: 'Continuar para a reserva' }).click()
    await expect(page).toHaveURL(/\/checkout/)

    // 3. Checkout: aceita os termos e paga na retirada.
    const onPickup = page.getByRole('radio', { name: /Pagar na retirada/ })
    if (await onPickup.isVisible().catch(() => false)) await onPickup.check()
    await page.getByRole('checkbox').last().check()
    await page.getByRole('button', { name: /Confirmar reserva/ }).click()

    // 4. Confirmação.
    await expect(page).toHaveURL(/\/bookings\/[0-9a-f-]{36}\/confirmation/, { timeout: 20_000 })
    const bookingId = page.url().match(/bookings\/([0-9a-f-]{36})/)?.[1]
    expect(bookingId).toBeTruthy()

    // 5. Minhas reservas: aparece e pode ser cancelada.
    await page.goto('/profile/bookings')
    const code = `ASTA-${bookingId?.slice(0, 8).toUpperCase()}`
    const card = page.locator('li').filter({ hasText: code })
    await expect(card).toBeVisible()
    await card.getByRole('button', { name: 'Cancelar reserva' }).click()
    await card.getByRole('button', { name: 'Sim, cancelar' }).click()
    await expect(card.getByText(/Cancelada/i)).toBeVisible()
  })
})
