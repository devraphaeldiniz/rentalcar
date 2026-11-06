import { expect, test } from '@playwright/test'

test.describe('proteção do painel e das contas', () => {
  test('/admin sem login vai para o login', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/auth\/signin\?redirect=%2Fadmin/)
  })

  test('/profile e /bookings exigem login', async ({ page }) => {
    for (const path of ['/profile', '/profile/bookings']) {
      await page.goto(path)
      await expect(page, path).toHaveURL(/\/auth\/signin/)
    }
  })

  test('rotas de API do admin recusam visitante', async ({ request }) => {
    for (const path of ['/api/admin/bookings', '/api/admin/users', '/api/admin/dashboard', '/api/admin/messages']) {
      const res = await request.get(path)
      expect(res.status(), path).toBe(403)
    }
  })

  test('reserva sem login é recusada pela API', async ({ request }) => {
    const res = await request.post('/api/bookings/create', {
      data: { vehicle_id: '00000000-0000-4000-8000-000000000000', start_date: '2099-01-01', end_date: '2099-01-03', accept_terms: true },
    })
    expect([401, 409]).toContain(res.status())
  })

  test('cabeçalhos de segurança', async ({ request }) => {
    const res = await request.get('/')
    const headers = res.headers()
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['content-security-policy'] ?? headers['content-security-policy-report-only']).toBeTruthy()
  })
})

test.describe('SEO', () => {
  test('robots.txt esconde áreas privadas e aponta o sitemap', async ({ request }) => {
    const body = await (await request.get('/robots.txt')).text()
    expect(body).toContain('Disallow: /admin')
    expect(body).toContain('Disallow: /api/')
    expect(body).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/)
  })

  test('sitemap lista as páginas dos carros', async ({ request }) => {
    const body = await (await request.get('/sitemap.xml')).text()
    expect((body.match(/<loc>/g) ?? []).length).toBeGreaterThan(10)
    expect(body).toContain('/vehicles/')
  })

  test('página do carro tem dados estruturados (schema.org)', async ({ page }) => {
    await page.goto('/')
    const href = await page.locator('a[href^="/vehicles/"]').first().getAttribute('href')
    await page.goto(href ?? '/')
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent()
    expect(JSON.parse(ld ?? '{}')['@type']).toBe('Car')
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/)
  })
})
