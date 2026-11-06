import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/lib/contexts/theme-context"
import { ToastProvider } from "@/lib/contexts/toast-context"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { WhatsappButton } from "@/components/layout/whatsapp-button"
import { CookieConsent } from "@/components/analytics/cookie-consent"
import { PageTracker } from "@/components/analytics/page-tracker"
import { SITE_URL } from "@/lib/site"
import { ErrorReporter } from "@/components/monitoring/error-reporter"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const dynamic = "force-dynamic"

const description = "Escolha as datas, compare o valor total do período e reserve seu carro online na AstaCar."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "AstaCar | Aluguel de carros", template: "%s | AstaCar" },
  description,
  applicationName: "AstaCar",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "AstaCar",
    title: "AstaCar | Aluguel de carros",
    description,
  },
  twitter: { card: "summary_large_image", title: "AstaCar | Aluguel de carros", description },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0f17" },
    { media: "(prefers-color-scheme: light)", color: "#f5f7fa" },
  ],
}

// Aplica o tema salvo antes da primeira pintura, para não piscar claro → escuro.
// O padrão da marca é o tema escuro.
const themeScript = `try{var t=localStorage.getItem('theme');document.documentElement.classList.toggle('dark',t!=='light')}catch(e){document.documentElement.classList.add('dark')}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} dark`} suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: script fixo, sem dados do usuário */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen flex flex-col font-sans">
        <ThemeProvider>
          {/* Avisos rápidos (avaliação enviada, upload, painel). Sem o provider, essas telas quebravam. */}
          <ToastProvider>
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
          <WhatsappButton />
          <CookieConsent />
          <PageTracker />
          <ErrorReporter />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
