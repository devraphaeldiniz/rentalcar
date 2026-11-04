import { ImageResponse } from 'next/og'

export const alt = 'AstaCar, aluguel de carros com o valor total antes de reservar'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Imagem de compartilhamento (WhatsApp, LinkedIn, redes sociais).
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: 'radial-gradient(circle at 50% -20%, #0a3a99 0%, #0b0f17 60%)',
          color: '#f1f5f9',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <svg width="72" height="72" viewBox="0 0 40 40" aria-hidden>
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#0A5BFF" />
                <stop offset="1" stopColor="#00C2E0" />
              </linearGradient>
            </defs>
            <rect width="40" height="40" rx="10" fill="url(#g)" />
            <path d="M8.5 31.5 20 8.5l11.5 23" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 30.5v-3.2M20 23.6v-2.6M20 17.6v-1.8" stroke="#0B1220" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <div style={{ display: 'flex', fontSize: 52, fontWeight: 900, letterSpacing: 2 }}>
            ASTA<span style={{ color: '#00e5ff' }}>CAR</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, maxWidth: 980 }}>A liberdade de ir mais longe</div>
          <div style={{ marginTop: 24, fontSize: 32, color: '#94a3b8' }}>Veja o valor total do aluguel antes de reservar.</div>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 26, color: '#cbd5e1' }}>
          <span>32 carros</span><span>·</span><span>8 categorias</span><span>·</span><span>Pagamento na retirada</span>
        </div>
      </div>
    ),
    size,
  )
}
