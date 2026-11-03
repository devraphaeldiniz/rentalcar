import type { Metadata } from "next"
import { Archivo } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/lib/contexts/theme-context"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

// Uma família só, com eixo de largura: títulos mais largos, texto normal.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
})

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "RentalCar | Aluguel de carros",
  description: "Escolha as datas, compare o valor total e reserve seu carro online.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={archivo.variable} suppressHydrationWarning>
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
