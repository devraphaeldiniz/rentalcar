# ��� RentalCar - Sistema de Aluguel de Veículos

Sistema completo de aluguel de veículos com autenticação avançada, gerenciamento administrativo e recursos de segurança de nível enterprise.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Nhost](https://img.shields.io/badge/Nhost-Backend-purple?style=for-the-badge)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-cyan?style=for-the-badge&logo=tailwindcss)

## ✨ Características Principais

### ��� Funcionalidades do Sistema
- **Catálogo de Veículos** - Listagem completa com carrossel de imagens
- **Sistema de Reservas** - Cálculo automático de preços com impostos e descontos
- **Gestão de Pagamentos** - Controle financeiro integrado
- **Busca Avançada** - Filtros por categoria, preço, status e disponibilidade
- **Design Responsivo** - Interface otimizada para desktop e mobile

### ��� Segurança & Autenticação (Nível Enterprise)
- **Autenticação JWT** - Tokens seguros com refresh automático
- **2FA/TOTP** - Autenticação de dois fatores com Google Authenticator
- **Audit Logs** - Registro completo de todas as atividades do sistema
- **Rate Limiting** - Proteção contra ataques de força bruta (5 tentativas/15min)
- **Session Management** - Gerenciamento de sessões multi-dispositivo
- **Criptografia bcrypt** - Hash de senhas com salt rounds
- **IP Tracking** - Rastreamento de IP e device fingerprinting
- **Reset de Senha** - Sistema seguro de recuperação de senha
- **Verificação de Email** - Validação de contas por email

### ���‍��� Painel Administrativo Completo
- **Dashboard Executivo** - Métricas e estatísticas em tempo real
- **Gerenciamento de Usuários** - CRUD completo com controle de permissões
- **Gerenciamento de Veículos** - CRUD completo com upload de múltiplas imagens
- **Gerenciamento de Reservas** - Controle total das locações
- **Logs de Segurança** - Auditoria completa de ações
- **Analytics** - Relatórios e métricas de performance

## ���️ Stack Tecnológico

### Frontend
- **Next.js 15** - React Framework com App Router e Server Components
- **TypeScript 5** - Tipagem estática para maior segurança
- **TailwindCSS 3** - Framework CSS utility-first
- **Shadcn/ui** - Biblioteca de componentes acessíveis
- **React Hook Form** - Gerenciamento de formulários performático
- **Zod** - Validação e parsing de schemas TypeScript-first

### Backend & Infraestrutura
- **Nhost** - Backend-as-a-Service completo
- **PostgreSQL 15** - Banco de dados relacional robusto
- **Hasura GraphQL Engine** - API GraphQL automática
- **Nhost Auth** - Autenticação gerenciada
- **Nhost Storage** - Armazenamento de arquivos

### Bibliotecas de Segurança
- **jsonwebtoken** - Geração e validação de JWT
- **bcryptjs** - Hash de senhas
- **speakeasy** - Geração de códigos TOTP para 2FA
- **qrcode** - Geração de QR codes
- **date-fns** - Manipulação de datas

## ��� Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn
- Conta no [Nhost](https://nhost.io) (plano gratuito disponível)
- Conta no [ImgBB](https://imgbb.com) para hospedagem de imagens (opcional)

## ��� Instalação e Configuração

### 1️⃣ Clone o repositório
```bash
git clone https://github.com/devraphaeldiniz/rentalcar.git
cd rentalcar
```

### 2️⃣ Instale as dependências
```bash
npm install
```

### 3️⃣ Configure o Nhost

1. Acesse [Nhost Console](https://app.nhost.io)
2. Crie um novo projeto
3. Anote as credenciais:
   - Subdomain
   - Region
   - Admin Secret (em Settings > Environment Variables)

### 4️⃣ Configure as variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:
```env
NEXT_PUBLIC_NHOST_SUBDOMAIN=seu-subdomain
NEXT_PUBLIC_NHOST_REGION=sa-east-1
NHOST_ADMIN_SECRET=seu-admin-secret
```

### 5️⃣ Execute as migrações do banco de dados

No Hasura Console (https://seu-subdomain.hasura.sa-east-1.nhost.run):

1. Vá em **Data** > **SQL**
2. Execute os scripts SQL na ordem:
   - Criação das tabelas principais
   - Criação das tabelas de segurança
   - Configuração de permissões (RLS)

### 6️⃣ Crie o usuário administrador

No Nhost Console > **Auth** > **Users**:
- Email: `admin@rental.com`
- Senha: `Admin123!@#`
- Metadata: `{ "role": "admin" }`

### 7️⃣ Inicie o servidor de desenvolvimento
```bash
npm run dev
```

Acesse: **http://localhost:3000**

## ��� Estrutura do Projeto
```
rentalcar/
├── app/
│   ├── admin/                    # ���‍��� Painel administrativo
│   │   ├── layout.tsx           # Layout com sidebar
│   │   ├── page.tsx             # Dashboard principal
│   │   ├── users/               # Gerenciamento de usuários
│   │   ├── vehicles/            # Gerenciamento de veículos
│   │   ├── bookings/            # Gerenciamento de reservas
│   │   ├── security/            # Logs de segurança
│   │   └── analytics/           # Estatísticas
│   ├── auth/                    # ��� Autenticação
│   │   ├── signin/              # Página de login
│   │   └── signup/              # Página de cadastro
│   ├── profile/                 # ��� Perfil do usuário
│   │   ├── page.tsx            # Perfil principal
│   │   ├── sessions/            # Sessões ativas
│   │   ├── security/            # 2FA e segurança
│   │   └── audit-logs/          # Histórico de atividades
│   ├── vehicles/                # ��� Catálogo público
│   │   ├── page.tsx            # Listagem de veículos
│   │   └── [id]/               # Detalhes do veículo
│   └── api/                     # ��� API Routes
│       ├── auth/                # Endpoints de autenticação
│       ├── admin/               # Endpoints administrativos
│       └── profile/             # Endpoints de perfil
├── components/
│   ├── layout/                  # Componentes de layout
│   │   └── header.tsx          # Header com navegação
│   ├── client/                  # Client components
│   │   └── vehicle-card.tsx    # Card de veículo
│   └── ui/                      # Componentes shadcn/ui
├── lib/
│   ├── hooks/                   # React hooks customizados
│   │   └── useAuth.ts          # Hook de autenticação
│   ├── nhost/                   # Configuração Nhost
│   │   └── client.ts           # Cliente Nhost
│   ├── security/                # Utilitários de segurança
│   │   ├── audit.ts            # Sistema de audit logs
│   │   └── rate-limit.ts       # Rate limiting
│   ├── validations/             # Schemas Zod
│   └── utils/                   # Funções auxiliares
│       ├── cn.ts               # Merge de classes CSS
│       └── ip.ts               # Utilidades de IP
├── types/                       # TypeScript types
│   └── index.ts                # Tipos globais
├── middleware.ts                # Middleware de proteção de rotas
└── .env.local                   # Variáveis de ambiente (não commitado)
```

## ��� Arquitetura de Segurança

Este sistema implementa **múltiplas camadas de segurança**:

### ���️ Camada de Autenticação
```
✅ JWT com expiração configurável
✅ Refresh tokens rotativos
✅ 2FA via TOTP (compatível com Google Authenticator, Authy, Microsoft Authenticator)
✅ 8 códigos de backup por usuário
✅ Verificação de email obrigatória
```

### ��� Camada de Proteção de Dados
```
✅ Criptografia bcrypt com 10 salt rounds
✅ Sanitização de inputs via Zod
✅ Row Level Security (RLS) no PostgreSQL
✅ Prepared statements (proteção SQL injection via Hasura)
✅ HTTPS obrigatório em produção
✅ Cookies httpOnly e secure
```

### ��� Camada de Monitoramento
```
✅ Audit logs de todas as ações críticas
✅ Rastreamento de IP e User-Agent
✅ Timestamp preciso de todas as ações
✅ Histórico de 90 dias mantido
✅ Alertas de atividades suspeitas
```

### ��� Camada de Prevenção de Ataques
```
✅ Rate limiting: 5 tentativas a cada 15 minutos
✅ Bloqueio automático após tentativas falhas
✅ Proteção contra SQL Injection (Hasura + prepared statements)
✅ Proteção contra XSS (React auto-escaping)
✅ CSRF tokens em todas as mutations
✅ Sanitização de HTML user-generated
✅ Validação de tipos em tempo de execução (Zod)
```

## ��� Credenciais Padrão

### Administrador
```
Email: admin@rental.com
Senha: Admin123!@#
```

⚠️ **IMPORTANTE**: Altere estas credenciais imediatamente em produção!

## ��� Estrutura do Banco de Dados

### Tabelas Principais
| Tabela | Descrição |
|--------|-----------|
| `vehicles` | Veículos disponíveis para locação |
| `bookings` | Reservas e locações |
| `profiles` | Perfis estendidos dos usuários |

### Tabelas de Segurança
| Tabela | Descrição |
|--------|-----------|
| `audit_logs` | Logs de auditoria de todas as ações |
| `user_sessions` | Sessões ativas dos usuários |
| `login_attempts` | Tentativas de login (rate limiting) |
| `user_2fa` | Configurações de 2FA por usuário |
| `password_reset_tokens` | Tokens de reset de senha |

### Relacionamentos
```
users (Nhost Auth)
  └─── profiles (1:1)
  └─── bookings (1:N)
  └─── audit_logs (1:N)
  └─── user_sessions (1:N)
  └─── user_2fa (1:1)

vehicles
  └─── bookings (1:N)
```

## ✅ Features Implementadas

### Autenticação & Segurança
- [x] Sistema de login/registro
- [x] JWT com refresh tokens
- [x] 2FA com Google Authenticator
- [x] Códigos de backup para 2FA
- [x] Reset de senha por email
- [x] Verificação de email
- [x] Gerenciamento de sessões
- [x] Audit logs completo
- [x] Rate limiting
- [x] IP tracking

### Painel Administrativo
- [x] Dashboard com estatísticas
- [x] Gerenciamento de usuários (CRUD)
- [x] Gerenciamento de veículos (CRUD)
- [x] Visualização de reservas
- [x] Logs de segurança
- [x] Controle de permissões (admin/user)

### Sistema de Veículos
- [x] Listagem de veículos
- [x] Detalhes do veículo
- [x] Carrossel de imagens
- [x] Filtros por categoria
- [x] Filtros por status
- [x] Busca por texto
- [x] Upload de múltiplas imagens

### Sistema de Reservas
- [x] Criação de reservas
- [x] Cálculo automático de preços
- [x] Validação de disponibilidade
- [x] Histórico de reservas

### UI/UX
- [x] Design responsivo
- [x] Dark mode ready
- [x] Animações suaves
- [x] Loading states
- [x] Error handling
- [x] Toast notifications

## ��� Roadmap Futuro

### Fase 2 - Pagamentos
- [ ] Integração Stripe/PagSeguro
- [ ] Gateway de pagamento
- [ ] Histórico de transações
- [ ] Emissão de notas fiscais

### Fase 3 - Comunicação
- [ ] Sistema de notificações por email
- [ ] Notificações push
- [ ] Chat em tempo real (suporte)
- [ ] SMS para confirmações

### Fase 4 - Analytics
- [ ] Dashboard de analytics avançado
- [ ] Relatórios em PDF
- [ ] Exportação de dados (CSV/Excel)
- [ ] Gráficos de performance

### Fase 5 - Mobile
- [ ] App React Native
- [ ] Autenticação biométrica
- [ ] Offline-first
- [ ] Push notifications

### Fase 6 - Integrações
- [ ] API pública documentada
- [ ] Webhooks
- [ ] Integração com CRMs
- [ ] Integração com ERPs

## ��� Screenshots

### Dashboard Administrativo
> Dashboard com métricas em tempo real, gráficos e atividade recente

### Gerenciamento de Veículos
> Interface completa para adicionar, editar e remover veículos

### Sistema de 2FA
> Configuração de autenticação de dois fatores com QR code

### Audit Logs
> Histórico completo de atividades com filtros avançados

## ��� Como Contribuir

Contribuições são muito bem-vindas! Para contribuir:

1. Faça um Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Convenções de Commit

Este projeto segue [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: nova funcionalidade
fix: correção de bug
docs: documentação
style: formatação
refactor: refatoração de código
test: adição de testes
chore: tarefas de manutenção
```

## ��� Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## ���‍��� Autor

**Raphael Aloisio Diniz**

- GitHub: [@devraphaeldiniz](https://github.com/devraphaeldiniz)
- LinkedIn: [devraphaeldiniz](https://www.linkedin.com/in/devraphaeldiniz/)
- Portfolio: Em breve

## ��� Contato

Para dúvidas, sugestões ou feedback:
- Abra uma [Issue](https://github.com/devraphaeldiniz/rentalcar/issues)
- Entre em contato via [LinkedIn](https://www.linkedin.com/in/devraphaeldiniz/)

## ��� Agradecimentos

- [Nhost](https://nhost.io) - Backend-as-a-Service incrível
- [Vercel](https://vercel.com) - Hospedagem e deploy
- [Shadcn](https://ui.shadcn.com) - Biblioteca de componentes
- Comunidade Open Source

---

<div align="center">

⭐ Se este projeto foi útil para você, considere dar uma estrela!

**[⬆ Voltar ao topo](#-rentalcar---sistema-de-aluguel-de-veículos)**

</div>
