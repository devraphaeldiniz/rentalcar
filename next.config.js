const path = require('node:path')

/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production'
const nhost = 'https://*.nhost.run'

// Política de conteúdo: só carrega scripts do próprio site, imagens das
// fontes usadas pelo catálogo e conexões com o Nhost. 'unsafe-inline' em
// script é exigido pelo Next.js sem nonce; 'unsafe-eval' só em desenvolvimento.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://upload.wikimedia.org https://i.ibb.co ${nhost}`,
  "font-src 'self' data:",
  `connect-src 'self' ${nhost}${isProd ? '' : ' ws:'}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }] : []),
]

const nextConfig = {
  // Raiz do projeto explícita: evita que um package-lock.json solto em
  // pastas acima (ex.: a pasta do usuário) confunda o Next.
  outputFileTracingRoot: path.join(__dirname),
  poweredByHeader: false,
  images: {
    // As fotos são servidas direto da origem; o otimizador de imagens do
    // Next fica desligado, o que também elimina a superfície de ataque dele.
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**.nhost.run' },
      { protocol: 'https', hostname: 'i.ibb.co' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

module.exports = nextConfig
