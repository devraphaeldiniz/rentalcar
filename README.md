# ��� RentalCar - Sistema de Aluguel de Veículos

Sistema completo de aluguel de veículos com autenticação avançada, gerenciamento administrativo e recursos de segurança de nível enterprise.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Nhost](https://img.shields.io/badge/Nhost-Backend-purple)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-cyan)

## ��� Características Principais

### ✨ Funcionalidades do Sistema
- ��� **Catálogo de Veículos** com carrossel de imagens
- ��� **Sistema de Reservas** com cálculo automático de preços
- ��� **Gestão de Pagamentos** com impostos e descontos
- ��� **Busca e Filtros** avançados por categoria, preço e status
- ��� **Design Responsivo** otimizado para mobile

### ��� Segurança & Autenticação
- ���️ **Autenticação JWT** com refresh tokens
- ��� **2FA (TOTP)** com Google Authenticator
- ��� **Audit Logs** completo de atividades
- ��� **Rate Limiting** contra ataques de força bruta
- ��� **Gerenciamento de Sessões** multi-dispositivo
- ��� **Criptografia bcrypt** de senhas
- ��� **IP Tracking** e device fingerprinting
- ��� **Reset de Senha** seguro
- ✉️ **Verificação de Email**

### ���‍��� Painel Administrativo
- ��� **Dashboard** com estatísticas em tempo real
- ��� **Gerenciamento de Usuários** (CRUD completo)
- ��� **Gerenciamento de Veículos** (CRUD completo)
- ��� **Gerenciamento de Reservas**
- ��� **Logs de Segurança** e auditoria
- ��� **Analytics** e métricas de performance

## ���️ Tecnologias

### Frontend
- **Next.js 15** - React Framework com App Router
- **TypeScript** - Tipagem estática
- **TailwindCSS** - Estilização
- **Shadcn/ui** - Componentes UI
- **React Hook Form** - Formulários
- **Zod** - Validação de schemas

### Backend & Infraestrutura
- **Nhost** - Backend-as-a-Service
- **PostgreSQL** - Banco de dados
- **Hasura** - GraphQL Engine
- **Nhost Auth** - Autenticação
- **Nhost Storage** - Armazenamento de arquivos

### Segurança
- **JWT** - JSON Web Tokens
- **bcrypt** - Hash de senhas
- **Speakeasy** - 2FA/TOTP
- **QRCode** - Geração de QR codes
- **Rate Limiting** - Proteção contra brute force

## ��� Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta no Nhost (gratuita)

## ��� Instalação

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/rental-car.git
cd rental-car
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env.local` na raiz:
```env
NEXT_PUBLIC_NHOST_SUBDOMAIN=seu-subdomain
NEXT_PUBLIC_NHOST_REGION=sa-east-1
NHOST_ADMIN_SECRET=seu-admin-secret
```

### 4. Execute as migrações do banco

No Hasura Console, execute os SQLs da pasta `/migrations`:
- `001_create_tables.sql`
- `002_create_security_tables.sql`
- `003_create_policies.sql`

### 5. Inicie o servidor de desenvolvimento
```bash
npm run dev
```

Acesse: `http://localhost:3000`

## ��� Estrutura do Projeto
```
rental-car/
├── app/
│   ├── admin/              # Painel administrativo
│   │   ├── users/         # Gerenciamento de usuários
│   │   ├── vehicles/      # Gerenciamento de veículos
│   │   └── bookings/      # Gerenciamento de reservas
│   ├── auth/              # Autenticação
│   │   ├── signin/        # Login
│   │   └── signup/        # Cadastro
│   ├── profile/           # Perfil do usuário
│   │   ├── sessions/      # Sessões ativas
│   │   ├── security/      # 2FA e segurança
│   │   └── audit-logs/    # Histórico de atividades
│   ├── vehicles/          # Catálogo público
│   └── api/               # API Routes
├── components/
│   ├── layout/            # Componentes de layout
│   ├── client/            # Client components
│   └── ui/                # UI components (shadcn)
├── lib/
│   ├── hooks/             # React hooks customizados
│   ├── security/          # Utilitários de segurança
│   ├── validations/       # Schemas Zod
│   └── utils/             # Funções auxiliares
└── types/                 # TypeScript types
```

## ��� Segurança

Este sistema implementa múltiplas camadas de segurança:

### Autenticação
- ✅ JWT com expiração automática
- ✅ Refresh tokens rotativos
- ✅ 2FA via TOTP (Google Authenticator)
- ✅ Códigos de backup para 2FA

### Proteção de Dados
- ✅ Criptografia bcrypt (salt rounds: 10)
- ✅ Sanitização de inputs (Zod)
- ✅ Row Level Security (RLS) no PostgreSQL
- ✅ HTTPS obrigatório em produção

### Monitoramento
- ✅ Audit logs de todas as ações críticas
- ✅ Rastreamento de IP e User-Agent
- ✅ Sessões multi-dispositivo rastreadas
- ✅ Alertas de login suspeito

### Prevenção de Ataques
- ✅ Rate limiting (5 tentativas / 15 minutos)
- ✅ Proteção contra SQL Injection (Hasura)
- ✅ Proteção contra XSS (React)
- ✅ CSRF tokens
- ✅ Bloqueio automático após tentativas falhas

## ��� Usuário Admin Padrão
```
Email: admin@rental.com
Senha: Admin123!@#
```

⚠️ **Importante**: Altere estas credenciais em produção!

## ��� Banco de Dados

### Tabelas Principais
- `vehicles` - Veículos disponíveis
- `bookings` - Reservas
- `profiles` - Perfis de usuários

### Tabelas de Segurança
- `audit_logs` - Logs de auditoria
- `user_sessions` - Sessões ativas
- `login_attempts` - Tentativas de login
- `user_2fa` - Configurações de 2FA
- `password_reset_tokens` - Tokens de reset

## ��� Features Implementadas

- [x] Sistema de autenticação completo
- [x] 2FA com Google Authenticator
- [x] Gerenciamento de sessões
- [x] Audit logs
- [x] Dashboard administrativo
- [x] CRUD de usuários
- [x] CRUD de veículos
- [x] Sistema de reservas
- [x] Cálculo automático de preços
- [x] Carrossel de imagens
- [x] Filtros avançados
- [x] Rate limiting
- [x] Proteção de rotas
- [x] Design responsivo

## ��� Roadmap

- [ ] Integração com gateway de pagamento
- [ ] Sistema de avaliações
- [ ] Chat em tempo real
- [ ] Notificações por email
- [ ] Relatórios em PDF
- [ ] API pública
- [ ] App mobile (React Native)

## ��� Licença

Este projeto está sob a licença MIT.

## ���‍��� Autor

Desenvolvido com ❤️ por [Seu Nome]

## ��� Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

## ��� Contato

- Email: seu@email.com
- LinkedIn: [Seu LinkedIn](https://linkedin.com/in/seu-perfil)
- Portfolio: [Seu Site](https://seu-site.com)

---

⭐ Se este projeto foi útil para você, deixe uma estrela!
