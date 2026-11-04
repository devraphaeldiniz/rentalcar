<div align="center">

<img src="app/icon.svg" width="72" alt="Logo AstaCar" />

# AstaCar · Aluguel de carros

**Reserva online com o valor total do período antes de confirmar, preço inteligente, cupons, proteções e um painel administrativo com funil de conversão.**

[![CI](https://github.com/devraphaeldiniz/rentalcar/actions/workflows/ci.yml/badge.svg)](https://github.com/devraphaeldiniz/rentalcar/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Nhost](https://img.shields.io/badge/Nhost-Hasura%20%2B%20Postgres-7c3aed?style=flat-square)](https://nhost.io)
[![Vercel](https://img.shields.io/badge/deploy-Vercel-000?style=flat-square&logo=vercel)](https://rentalcar-eight.vercel.app)
[![License](https://img.shields.io/badge/licença-MIT-blue.svg?style=flat-square)](LICENSE)

### [🚗 Ver o site no ar →](https://rentalcar-eight.vercel.app)

<sub>Projeto de portfólio. As reservas são de demonstração e não geram cobrança.<br />Quer só conhecer? Na tela de login, use <b>Entrar como cliente de demonstração</b>, sem cadastro.</sub>

<br />

<img src="docs/screenshots/01-home.jpg" alt="Home da AstaCar com o buscador de datas" width="900" />

</div>

---

## Sumário

- [O que a AstaCar faz](#-o-que-a-astacar-faz)
- [Telas](#-telas)
- [Como funciona](#-como-funciona)
  - [Fluxo de uma reserva](#fluxo-de-uma-reserva)
  - [Como o preço é calculado](#como-o-preço-é-calculado)
  - [Monitoramento e funil](#monitoramento-e-funil)
- [Arquitetura](#-arquitetura)
- [Banco de dados](#-banco-de-dados)
- [API](#-api)
- [Segurança](#-segurança)
- [Stack e decisões técnicas](#-stack-e-decisões-técnicas)
- [Rodando localmente](#-rodando-localmente)
- [Testes e qualidade](#-testes-e-qualidade)
- [Deploy](#-deploy)
- [Próximos passos](#-próximos-passos)

---

## ✨ O que a AstaCar faz

| Para o cliente | Para a locadora (painel admin) |
| :-- | :-- |
| Busca por datas com o **valor total do período** em cada carro | **Agenda** de retiradas e devoluções, atrasos e reservas a confirmar |
| Catálogo de **32 carros em 8 categorias**, com fotos creditadas | **Funil de conversão**: visitas → carro aberto → início da reserva → reserva |
| **Proteções** (básica, completa, total) e **opcionais** (condutor, cadeirinha, GPS, tanque cheio) | **Motivos de desistência** informados pelos clientes (preço, concorrência, datas…) |
| **Desconto automático** por duração e **preço de temporada** | **Preços e opcionais**, **descontos**, **temporadas** e **cupons** editáveis |
| **Cupons de desconto** com validade e limite de usos | **Banners** de ofertas próprias nos espaços do site |
| Aceite dos **termos da locação** e detalhamento do valor | Frota, reservas, usuários (papel e bloqueio), avaliações e mensagens |
| Minhas reservas: acompanhar, **cancelar** e **avaliar** | Relatórios com exportação **CSV e PDF** e trilha de **auditoria** |
| Tema **escuro e claro**, layout para celular, aviso de cookies (LGPD) | Estatísticas, segurança (tentativas de login) e configurações |

---

## 📸 Telas

### Cliente

| Catálogo com o total do período | Página do carro com ofertas |
| :---: | :---: |
| ![Catálogo](docs/screenshots/02-catalogo.jpg) | ![Detalhe do carro](docs/screenshots/03-detalhe.jpg) |
| **Checkout: proteção, opcionais, cupom e resumo** | **Minhas reservas** |
| ![Checkout](docs/screenshots/04-checkout.jpg) | ![Minhas reservas](docs/screenshots/05-minhas-reservas.jpg) |
| **Página por categoria (SEO)** | **Tema claro** |
| ![Aluguel de SUV](docs/screenshots/12-categoria.jpg) | ![Tema claro](docs/screenshots/07-tema-claro.jpg) |

<p align="center"><img src="docs/screenshots/06-celular.jpg" alt="Versão para celular" width="520" /><br /><sub>Versão para celular</sub></p>

### Painel administrativo

| Funil de conversão e motivos de desistência | Carros mais vistos, aparelhos e origem |
| :---: | :---: |
| ![Funil](docs/screenshots/08-admin-funil.jpg) | ![Detalhes do funil](docs/screenshots/09-admin-funil-detalhes.jpg) |
| **Agenda de retiradas e devoluções** | **Preço inteligente e cupons** |
| ![Agenda](docs/screenshots/10-admin-agenda.jpg) | ![Preços](docs/screenshots/11-admin-precos.jpg) |

---

## ⚙️ Como funciona

### Fluxo de uma reserva

O navegador nunca grava nada direto no banco. Toda escrita passa por uma rota do Next.js que confere quem é o usuário no Nhost Auth, valida os dados e **recalcula o preço** antes de gravar.

```mermaid
sequenceDiagram
    autonumber
    actor C as Cliente
    participant W as Next.js (páginas)
    participant A as Rotas /api
    participant H as Hasura (GraphQL)
    participant P as PostgreSQL

    C->>W: escolhe datas na home
    W->>H: carros + reservas que se sobrepõem ao período
    H-->>W: catálogo com o total de cada carro
    C->>W: abre o carro e vai para o checkout
    W->>A: POST /api/quote (proteção, opcionais, cupom)
    A->>H: preços, regras e cupom atuais
    A-->>W: cotação linha a linha
    C->>A: POST /api/bookings/create + aceite dos termos
    A->>A: valida sessão (Nhost Auth) e recalcula o valor
    A->>H: reserva o uso do cupom (atômico)
    A->>H: insert booking com price_lines
    H->>P: EXCLUDE impede período sobreposto
    P-->>A: ok ou conflito
    A-->>C: confirmação ASTA-XXXX (ou erro claro)
```

### Como o preço é calculado

Uma única função ([`lib/pricing.ts`](lib/pricing.ts)) é usada no navegador (para mostrar) e no servidor (que decide o valor gravado). A ordem é sempre a mesma:

```mermaid
flowchart LR
    A[Diárias<br/>dias × diária] --> B[Temporada<br/>± % nas diárias<br/>dentro do período]
    B --> C[Desconto por duração<br/>maior faixa alcançada]
    C --> D[Cupom<br/>% ou valor fixo]
    D --> E[+ Proteção<br/>+ Opcionais<br/>com teto por reserva]
    E --> F((Total))
```

**Exemplo real** (Renault Kwid, 7 diárias, proteção completa, cadeirinha e cupom `BEMVINDO10`):

| Linha | Valor |
| :-- | --: |
| 7 diárias × R$ 124,90 | R$ 874,30 |
| Desconto semanal (7+ diárias) −10% | −R$ 87,43 |
| Cupom BEMVINDO10 −10% | −R$ 78,69 |
| Proteção completa 7 × R$ 29,00 | R$ 203,00 |
| Cadeirinha infantil 7 × R$ 20,00 | R$ 140,00 |
| **Total** | **R$ 1.051,18** |

A reserva guarda esse detalhamento (`price_lines`): se o admin mudar um preço depois, as reservas antigas continuam com o valor que o cliente aceitou.

### Monitoramento e funil

```mermaid
flowchart TD
    V[Visitante] --> K{Aceitou os cookies?}
    K -- não --> X[Nada é registrado]
    K -- sim --> E[Eventos próprios<br/>página vista · busca · carro aberto · início da reserva]
    E --> T[/POST /api/track<br/>zod · filtro de robôs · limite por IP/]
    R[Reserva concluída] -->|gravada pelo servidor| DB[(analytics_events)]
    T --> DB
    F[Pergunta opcional no checkout<br/>Não vai reservar agora?] --> DB
    DB --> P[Painel: Funil e visitas<br/>conversão · motivos · carros mais vistos · caminho de cada visita]
```

Sem ferramentas de terceiros: não há Google Analytics, e o IP não é guardado. A página [`/privacidade`](https://rentalcar-eight.vercel.app/privacidade) explica o que é coletado.

---

## 🏗️ Arquitetura

```mermaid
flowchart LR
    subgraph Vercel
      N[Next.js 15<br/>App Router · Server Components]
      API[Rotas /api<br/>validação zod]
    end
    subgraph Nhost
      AUTH[Nhost Auth<br/>JWT + refresh token]
      HAS[Hasura GraphQL]
      PG[(PostgreSQL)]
    end
    B[Navegador] -->|HTML/RSC| N
    B -->|fetch| API
    N -->|admin secret, só no servidor| HAS
    API --> HAS
    API --> AUTH
    HAS --> PG
```

```
app/
  (páginas)            home, carro, checkout, confirmação, minhas reservas, perfil,
                       /aluguel/[categoria], termos, privacidade, sobre, contato
  admin/               painel: agenda, funil, preços, banners, reservas, frota, usuários...
  api/                 rotas de servidor (auth, reservas, cotação, tracking, admin)
  opengraph-image.tsx  imagem de compartilhamento gerada
  sitemap.ts · robots.ts
components/            interface (cliente, admin, marca, layout, ui)
lib/
  pricing.ts           cálculo do valor (puro, testado)
  pricing-rules.ts     temporada, desconto por duração e cupons
  quote-server.ts      cotação oficial com dados do banco
  analytics/           eventos, coleta e resumo do funil
  auth/ security/      sessão, autorização, rate limit, auditoria
nhost/migrations/      001 → 010, aplicadas em ordem pelo db:setup
scripts/               setup do Nhost e criação de contas de teste
__tests__/             Vitest
```

---

## 🗄️ Banco de dados

PostgreSQL no Nhost, versionado em [`nhost/migrations`](nhost/migrations). O comando `npm run db:setup` aplica cada migração uma única vez (registradas em `schema_migrations`) e configura tabelas, relações e permissões no Hasura.

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "tem"
    PROFILES ||--o{ BOOKINGS : "faz"
    VEHICLES ||--o{ BOOKINGS : "é reservado em"
    BOOKINGS ||--o| REVIEWS : "pode gerar"
    VEHICLES ||--o{ REVIEWS : "recebe"
    VEHICLES ||--o{ ANALYTICS_EVENTS : "é visto em"
    AUTH_USERS ||--o{ ANALYTICS_EVENTS : "gera"
    AUTH_USERS ||--o{ AUDIT_LOGS : "registra"

    PROFILES {
        uuid id PK "= auth.users.id"
        text email
        text full_name
        text phone
        text cpf "dígitos verificados"
        text role "admin ou client"
        bool blocked
    }
    VEHICLES {
        uuid id PK
        text brand
        text model
        int year
        text plate UK
        text category "8 categorias"
        numeric daily_rate
        text status "available ou rented ou maintenance"
        jsonb images
        jsonb image_credits
        numeric average_rating "atualizada por trigger"
    }
    BOOKINGS {
        uuid id PK
        uuid user_id FK
        uuid vehicle_id FK
        date start_date
        date end_date
        text status "pending > confirmed > active > completed ou cancelled"
        numeric total_amount
        numeric base_amount
        numeric extras_amount
        numeric discount_amount
        jsonb price_lines "detalhamento aceito"
        text coupon_code
        timestamptz terms_accepted_at
    }
    REVIEWS {
        uuid id PK
        uuid booking_id FK
        uuid vehicle_id FK
        int rating "1 a 5"
        text status "pending ou approved ou rejected"
    }
    RENTAL_EXTRAS {
        uuid id PK
        text code UK
        text kind "protection ou addon"
        numeric price
        text pricing "per_day ou per_rental"
        numeric max_total "teto por reserva"
        bool is_default
    }
    PRICING_RULES {
        uuid id PK
        text kind "duration ou season"
        int min_days
        date start_date
        date end_date
        numeric percent
    }
    COUPONS {
        uuid id PK
        text code UK
        numeric percent "ou amount"
        int min_days
        date valid_until
        int max_uses
        int uses "CHECK uses <= max_uses"
    }
    BANNERS {
        uuid id PK
        text placement "home ou vehicle_sidebar"
        text cta_href "só links internos"
        text coupon_code
        date ends_on
    }
    ANALYTICS_EVENTS {
        bigint id PK
        uuid session_id
        uuid visitor_id
        text event
        uuid vehicle_id FK
        jsonb meta
    }
    AUDIT_LOGS {
        uuid id PK
        text action
        text resource
        jsonb metadata
    }
    LOGIN_ATTEMPTS {
        uuid id PK
        text email
        inet ip_address
        bool success
    }
    CONTACT_MESSAGES {
        uuid id PK
        text name
        text email
        text message
        bool read
    }
```

**Regras garantidas pelo próprio banco** (não dependem do código):

| Regra | Como |
| :-- | :-- |
| Um carro não tem duas reservas no mesmo período | `EXCLUDE USING gist` em `bookings` (vale até com cliques simultâneos) |
| Cupom não passa do limite de usos | `CHECK (uses <= max_uses)` + incremento atômico |
| Banner não leva para site externo | `CHECK` com expressão regular em `cta_href` |
| Desconto por duração entre 0 e 60%, temporada com datas válidas | `CHECK pricing_rules_shape` |
| Eventos do funil só de tipos conhecidos | `CHECK` em `analytics_events.event` |
| Perfil criado junto com a conta e nota média do carro sempre atualizada | triggers em `auth.users` e `reviews` |

| Migração | Conteúdo |
| :-- | :-- |
| `001_initial` | perfis, veículos e reservas |
| `002_booking_integrity` | trava contra sobreposição e checagens de valor |
| `003_schema_completo` | avaliações, auditoria, tentativas de login, triggers |
| `004_categorias_e_creditos` · `005_catalogo_frota` | 8 categorias e a frota de 32 carros com créditos das fotos |
| `006_mensagens_contato` | formulário de contato |
| `007_monitoramento` | eventos do funil |
| `008_protecoes_e_termos` | proteções, opcionais e detalhamento do valor |
| `009_precos_e_cupons` | regras de preço e cupons |
| `010_banners` | banners de ofertas |

---

## 🔌 API

Todas as rotas validam a entrada com **zod**. As do admin exigem papel `admin` conferido no servidor.

<details>
<summary><b>Rotas públicas e do cliente</b></summary>

| Método | Rota | Para quê |
| :-- | :-- | :-- |
| POST | `/api/auth/signup` · `/signin` · `/signout` | cadastro, login (com limite de tentativas) e logout |
| GET | `/api/auth/check` | quem está logado |
| GET | `/api/vehicles/[id]` · `/api/extras` | carro e proteções/opcionais ativos |
| POST | `/api/quote` | cotação oficial (temporada, duração, cupom, opcionais) |
| POST | `/api/bookings/create` | cria a reserva (recalcula o valor e exige o aceite dos termos) |
| GET | `/api/bookings/my` | reservas do cliente |
| POST | `/api/bookings/[id]/cancel` | cancela antes da retirada |
| GET · PATCH | `/api/profile` | dados do cliente (CPF validado) |
| POST | `/api/profile/password` | troca de senha |
| GET · POST | `/api/reviews` | avaliações |
| POST | `/api/contact` | formulário de contato (campo-isca e limite por IP) |
| POST | `/api/track` | eventos do funil (só com consentimento) |
| POST | `/api/webhooks/n8n` | integração opcional, desligada sem segredo forte |

</details>

<details>
<summary><b>Rotas do painel admin</b></summary>

| Rota | Métodos |
| :-- | :-- |
| `/api/admin/dashboard` · `/analytics` · `/security` | GET |
| `/api/admin/bookings` · `/bookings/[id]` | GET · PATCH |
| `/api/admin/vehicles` · `/vehicles/[id]` | GET · POST · PATCH · DELETE |
| `/api/admin/users` · `/users/role` · `/users/block` | GET · POST |
| `/api/admin/extras` | GET · PATCH |
| `/api/admin/pricing-rules` | GET · POST · PATCH · DELETE |
| `/api/admin/coupons` | GET · POST · PATCH |
| `/api/admin/banners` | GET · POST · PATCH · DELETE |
| `/api/admin/reviews` · `/messages` | GET · PATCH |
| `/api/admin/reports/bookings` · `/reports/financial` | GET |

</details>

---

## 🔒 Segurança

- **Sessão** em cookies `httpOnly` e `secure`, com rotação do refresh token e revogação no logout. O token nunca fica acessível ao JavaScript.
- **Identidade** sempre conferida no Nhost Auth, nunca a partir de um JWT decodificado à mão.
- **Autorização** no servidor: o layout do admin e cada página/rota do painel conferem o papel.
- **Rate limit** no login (por e-mail + IP, e-mail e IP), no cadastro, no contato e no tracking.
- **Preço** sempre recalculado no servidor; o navegador não decide o valor.
- **Cabeçalhos**: CSP, HSTS, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`.
- **Entradas**: redirecionamentos só para caminhos internos, CSV protegido contra injeção de fórmulas, CPF com dígitos verificados.
- **LGPD**: consentimento de cookies, sem IP no monitoramento, página de privacidade.
- **Dependências**: `npm audit` sem vulnerabilidades, verificado no CI.

---

## 🛠️ Stack e decisões técnicas

| Camada | Tecnologia | Por quê |
| :-- | :-- | :-- |
| Framework | **Next.js 15** (App Router) + React 18 | Server Components buscam o catálogo no servidor; rotas `/api` concentram regras e segredos |
| Linguagem | **TypeScript 5** | tipos de ponta a ponta, do banco à interface |
| Dados e auth | **Nhost**: PostgreSQL + Hasura + Auth | banco relacional de verdade com GraphQL pronto e autenticação gerenciada |
| Interface | **Tailwind CSS 3**, Radix/shadcn, Lucide, Inter | tokens de tema (escuro/claro) e componentes acessíveis |
| Validação | **Zod** | o mesmo esquema protege API e formulários |
| Qualidade | **Vitest**, **Biome**, GitHub Actions | testes do que tem regra (preço, cupons, funil, segurança), lint rápido e CI em cada PR |
| Deploy | **Vercel** | prévia automática por branch e produção no `master` |

---

## 🚀 Rodando localmente

**Pré-requisitos:** Node.js 22 (fixado em [`.nvmrc`](.nvmrc)) e um projeto gratuito no [Nhost](https://app.nhost.io).

```bash
git clone https://github.com/devraphaeldiniz/rentalcar.git
cd rentalcar
npm ci
cp .env.example .env.local   # preencha com os dados do seu projeto Nhost
npm run db:setup             # cria tabelas, regras, permissões e a frota de exemplo
npm run dev                  # http://localhost:3000
```

Crie uma conta pelo site e promova-a a administrador:

```bash
npm run db:setup -- --admin seu@email.com
```

### Conta de demonstração (opcional)

Crie a conta e copie o e-mail e a senha gerada (gravada em `.env.contas-teste.local`) para as variáveis `DEMO_CLIENT_*` do `.env.local` e da Vercel:

```bash
npm run user:create -- --email demo@astacar.dev --name "Cliente Demonstração"
```

A conta de demonstração não pode alterar os próprios dados nem a senha, porque é compartilhada.

### Variáveis de ambiente

| Variável | Onde é usada | Obrigatória |
| :-- | :-- | :-: |
| `NEXT_PUBLIC_NHOST_SUBDOMAIN` | navegador e servidor | ✅ |
| `NEXT_PUBLIC_NHOST_REGION` | navegador e servidor | ✅ |
| `NHOST_ADMIN_SECRET` | **só no servidor** (nunca exposta) | ✅ |
| `NEXT_PUBLIC_SITE_URL` | endereço público para sitemap e compartilhamento (padrão: domínio da Vercel) | – |
| `N8N_WEBHOOK_SECRET` | webhook opcional; com menos de 32 caracteres a rota fica desligada | – |
| `DEMO_CLIENT_EMAIL` · `DEMO_CLIENT_PASSWORD` | **só no servidor**: liga o botão "Entrar como cliente de demonstração" | – |

### Scripts

| Comando | O que faz |
| :-- | :-- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` · `npm start` | build e servidor de produção |
| `npm test` | testes (Vitest) |
| `npm run lint` · `npm run typecheck` | Biome e TypeScript |
| `npm run db:setup` | migrações e permissões no Nhost (`--admin email` promove um usuário) |
| `npm run user:create -- --email ... --name ... [--admin]` | cria uma conta de teste |

---

## 🧪 Testes e qualidade

```bash
npm test
```

| Arquivo | O que garante |
| :-- | :-- |
| `pricing.test.ts` | soma de diárias, proteção, opcionais com teto, descontos em sequência, arredondamento |
| `pricing-rules.test.ts` | temporada só nas diárias certas, maior desconto por duração, todas as recusas de cupom |
| `analytics.test.ts` | contagem do funil por visita, motivos, carros mais vistos, fuso de Brasília, filtro de robôs |
| `security.test.ts` | redirecionamento seguro, CSV, CPF, datas, campos permitidos |
| `bookings.test.ts` | validação da reserva e data de hoje no fuso de Brasília |

O CI (GitHub Actions) roda lint, typecheck, testes, build e `npm audit` em cada pull request.

---

## ☁️ Deploy

1. Importe o repositório na **Vercel** e cadastre as variáveis de ambiente.
2. No **Nhost**, em *Settings → Authentication*, defina a **Client URL** e as **Allowed Redirect URLs** com o domínio da Vercel.
3. Rode `npm run db:setup` apontando para o projeto de produção antes de publicar mudanças com migrações novas.

Cada branch ganha uma URL de prévia; o `master` é publicado em produção.

---

## 🧭 Próximos passos

- [ ] Pagamento online com **Mercado Pago** (PIX e cartão) e webhook de confirmação. *Em desenvolvimento.*
- [ ] E-mail de confirmação e lembrete na véspera da retirada
- [ ] Entrega do carro no endereço do cliente ou pontos de retirada
- [ ] Check-in digital: foto da CNH e vistoria por fotos
- [ ] Programa de pontos e aluguel mensal (assinatura)
- [ ] Domínio próprio

---

## 📄 Licença e créditos

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE).

As fotos dos veículos são do Wikimedia Commons e pertencem aos seus autores, sob licenças Creative Commons. Os créditos completos estão em [`/creditos`](https://rentalcar-eight.vercel.app/creditos).

<div align="center"><sub>Feito por <a href="https://github.com/devraphaeldiniz">Raphael Diniz</a></sub></div>
