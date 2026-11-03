import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/lib/contexts/theme-context"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: { default: "AstaCar | Aluguel de carros", template: "%s | AstaCar" },
  description: "Escolha as datas, compare o valor total do período e reserve seu carro online na AstaCar.",
  applicationName: "AstaCar",
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
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
