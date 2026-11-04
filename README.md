# AstaCar · Aluguel de carros

[![CI](https://github.com/devraphaeldiniz/rentalcar/actions/workflows/ci.yml/badge.svg)](https://github.com/devraphaeldiniz/rentalcar/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Nhost](https://img.shields.io/badge/Nhost-Hasura%20%2B%20Postgres-purple?style=flat-square)](https://nhost.io)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

Plataforma full stack de locação de veículos: o cliente escolhe as datas, vê o **valor total do período** de cada carro, reserva, cancela e avalia; o administrador gerencia frota, reservas, usuários e mensagens em um painel próprio.

> Projeto de portfólio. As reservas são de demonstração e não geram cobrança.

![Home da AstaCar com o buscador de datas](docs/screenshots/01-home.jpg)

---

## Telas

| Catálogo com valor total do período | Detalhe do carro |
| :---: | :---: |
| ![Catálogo](docs/screenshots/02-catalogo.jpg) | ![Detalhe do carro](docs/screenshots/03-detalhe.jpg) |
| **Revisão e confirmação da reserva** | **Minhas reservas** |
| ![Checkout](docs/screenshots/04-checkout.jpg) | ![Minhas reservas](docs/screenshots/05-minhas-reservas.jpg) |
| **Celular** | **Tema claro** |
| ![Versão para celular](docs/screenshots/06-celular.jpg) | ![Tema claro](docs/screenshots/07-tema-claro.jpg) |

---

## ✨ Funcionalidades

**Cliente**
- Catálogo de 32 carros em 8 categorias, com filtro por categoria e fotos creditadas (Wikimedia Commons, Creative Commons).
- Busca por período: cada carro mostra o total do aluguel e os já reservados nas datas aparecem marcados.
- Reserva com revisão final; o preço é sempre recalculado no servidor.
- Minhas reservas: acompanhar status, cancelar e avaliar o carro depois da devolução.
- Meus dados: nome, celular e CPF (com validação dos dígitos) e troca de senha.
- Tema escuro (padrão) e claro, layout responsivo.

**Administrador**
- Dashboard, frota (cadastro e edição), reservas, usuários (papel e bloqueio), avaliações e mensagens do formulário de contato.
- **Funil e visitas:** visitas por dia, funil (visitou → abriu um carro → começou a reserva → reservou), carros mais vistos e motivos de desistência informados no checkout, com monitoramento próprio e consentimento de cookies (LGPD).
- Relatórios com exportação em CSV e PDF.
- Trilha de auditoria das ações sensíveis.

---

## 🏗️ Arquitetura

```mermaid
flowchart LR
    Browser[Navegador] -->|App Router, Server Components| Next[Next.js 15]
    Next -->|rotas /api com validação zod| API[Route handlers]
    API -->|GraphQL com admin secret, só no servidor| Hasura[Hasura GraphQL]
    API --> Auth[Nhost Auth: JWT + refresh token]
    Hasura --> PG[(PostgreSQL)]
    subgraph Banco
      PG --- EX[EXCLUDE: sem reservas sobrepostas]
      PG --- TR[Triggers: perfil e nota média]
      PG --- AU[audit_logs e login_attempts]
    end
```

O navegador nunca fala direto com o Hasura para escrever: toda reserva, cancelamento ou alteração passa por uma rota do Next.js que valida o usuário e os dados antes de gravar.

---

## 🔒 Segurança

- Sessão em cookies `httpOnly` com rotação do refresh token e revogação no logout.
- Limite de tentativas de login por e-mail e por IP (cabeçalhos de proxy só são confiados atrás da Vercel ou com `TRUST_PROXY_HEADERS`).
- Painel admin protegido no servidor (layout com checagem de papel), não só no cliente.
- Cabeçalhos CSP, HSTS, `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy`.
- Redirecionamentos só para caminhos internos; exportação CSV protegida contra injeção de fórmulas.
- Integridade no banco: restrição `EXCLUDE USING gist` impede duas reservas do mesmo carro no mesmo período, mesmo com pedidos simultâneos.
- `npm audit` sem vulnerabilidades, verificado no CI.

---

## 🛠️ Stack

| Camada | Tecnologia |
| :--- | :--- |
| Framework | Next.js 15 (App Router) + React 18 + TypeScript 5 |
| Interface | Tailwind CSS 3, componentes Radix/shadcn, ícones Lucide, fonte Inter |
| Backend | Nhost: PostgreSQL + Hasura GraphQL + Nhost Auth |
| Validação | Zod |
| Qualidade | Vitest (testes), Biome (lint), TypeScript estrito, GitHub Actions |

---

## 🚀 Como rodar

**Pré-requisitos:** Node.js 22 (fixado em `.nvmrc`) e um projeto no [Nhost](https://app.nhost.io).

```bash
git clone https://github.com/devraphaeldiniz/rentalcar.git
cd rentalcar
npm ci
```

1. Copie `.env.example` para `.env.local` e preencha subdomínio, região e o admin secret do Hasura.
2. Crie o banco inteiro (tabelas, gatilhos, relações, permissões e o catálogo de carros):
   ```bash
   npm run db:setup
   ```
   O comando pode rodar de novo sem duplicar nada: as migrações aplicadas ficam em `schema_migrations`.
3. Crie uma conta pelo site e promova-a a administrador:
   ```bash
   npm run db:setup -- --admin seu@email.com
   ```
4. Inicie o servidor e acesse `http://localhost:3000`:
   ```bash
   npm run dev
   ```

### Scripts

| Comando | O que faz |
| :--- | :--- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm test` | Testes (Vitest) |
| `npm run lint` | Lint (Biome) |
| `npm run typecheck` | Checagem de tipos |
| `npm run db:setup` | Aplica migrações e permissões no Nhost |
| `npm run user:create -- --email ... --name ... [--admin]` | Cria uma conta de teste |

---

## 🧭 Próximos passos

- [ ] Lojas e horários de retirada/devolução, com devolução em outro local.
- [ ] Proteções e opcionais com preço calculado no servidor.
- [ ] Cupons de desconto e programa de pontos.
- [ ] Orçamento para empresas e vitrine de seminovos.
- [ ] Pagamento online (cartão e PIX) via gateway e e-mail de confirmação da reserva.

---

## 📄 Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE).

As fotos dos veículos pertencem aos seus autores e são usadas sob licenças Creative Commons; os créditos estão na página `/creditos` do site.
