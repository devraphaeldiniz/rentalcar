import { defineConfig, devices } from '@playwright/test'

// Testes de ponta a ponta contra um site no ar: local (npm run dev), preview da Vercel ou produção.
//   E2E_BASE_URL=https://rentalcar-eight.vercel.app npm run test:e2e
// Por padrão só leem o site. Com E2E_BOOKING=1 e a conta de demonstração ligada,
// também fazem uma reserva completa e a cancelam no fim.
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
// Preview protegida da Vercel: Settings > Deployment Protection > Protection Bypass for Automation.
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    extraHTTPHeaders: bypass ? { 'x-vercel-protection-bypass': bypass, 'x-vercel-set-bypass-cookie': 'true' } : undefined,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'celular', use: { ...devices['Pixel 7'] }, testIgnore: /reserva-demo/ },
  ],
})
