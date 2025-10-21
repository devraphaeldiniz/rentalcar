import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from './providers'
import { Header } from '@/components/layout/header'
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rental Car - Aluguel de Veículos",
  description: "Sistema completo de aluguel de veículos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}