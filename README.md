# Rental Car - Sistema de Locadora com Nhost

## Setup Inicial

1. Criar projeto no Nhost: https://app.nhost.io
2. Copiar subdomain e region
3. Atualizar `.env.local`
4. Instalar Nhost CLI:
```powershell
npm install -g nhost
nhost login
nhost link
```

## Migrations
```powershell
nhost db migrate up
```

Criar admin no SQL Editor do Nhost:
```sql
INSERT INTO profiles (id, email, role) 
VALUES ('user-uuid-here', 'admin@rental.com', 'admin');
```

## Dev
```powershell
npm run dev
```

## Deploy Vercel
```powershell
npm i -g vercel
vercel
```

Variáveis:
- NEXT_PUBLIC_NHOST_SUBDOMAIN
- NEXT_PUBLIC_NHOST_REGION
- NHOST_ADMIN_SECRET
- N8N_WEBHOOK_SECRET