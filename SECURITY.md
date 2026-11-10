# Laudo de segurança — AstaCar

Teste de segurança da própria aplicação (abordagem *red team*), feito antes de publicar o projeto.
O objetivo foi atacar a aplicação como um invasor faria e, para cada classe de ataque, provar no site
no ar se a defesa resiste.

- **Alvo:** `https://rentalcar-eight.vercel.app` e o código-fonte deste repositório.
- **Método:** revisão de código das rotas sensíveis + prova dinâmica no ambiente de produção, de forma
  não destrutiva (nenhum ataque de volume/negação de serviço, para não violar os termos da Vercel).
- **Data:** novembro de 2026.

## Resumo

Nenhuma falha **crítica** ou **alta** foi encontrada. As principais classes de ataque contra uma locadora
— acessar reserva de outro cliente, virar admin, manipular o preço, forjar um pagamento, injeção — foram
testadas e **resistiram**. Os achados são todos de severidade **baixa** ou **informativa**, e a maioria já
tinha uma defesa compensatória; esta entrega corrige os que valiam código e documenta os riscos aceitos.

## Defesas verificadas (com prova no site no ar)

| Classe de ataque | Teste | Resultado |
| :-- | :-- | :-- |
| **IDOR** (reserva de outro) | cancelar e baixar contrato de uma reserva que não é minha | `404`; sem login → `401` |
| **Controle de acesso do painel** | chamar as rotas `/api/admin/*` sem ser admin | `403` em todas |
| **Modo demonstração do admin** | a conta demo (só leitura) tentando promover admin, criar cupom e excluir carro | `403` nas três, direto na API |
| **Manipulação de preço** | enviar `total_amount: 1`, `daily_rate: 0.01` numa cotação | ignorado; servidor recalculou e cobrou o valor real |
| **Forjar pagamento** | webhook do Mercado Pago sem assinatura válida | `401`; o corpo nunca é fonte do status, o pagamento é reconsultado na API do MP |
| **Escalada de privilégio** | virar admin pelo cadastro ou pela edição de perfil | impossível: `role` só é escrito na rota de admin |
| **Injeção SQL/GraphQL** | revisão de todas as consultas | 100% parametrizadas, sem interpolação de entrada do usuário |
| **XSS** | revisão de renderização (avaliações, banners, contato) e dos usos de `dangerouslySetInnerHTML` | React escapa por padrão; JSON-LD com `<` escapado |
| **Open redirect** | `?redirect=//site-externo` e variações | `safeRedirect` recusa e valida a origem |
| **Validação de datas** | reserva no passado, de 3 anos e com datas invertidas | `400` nas três |
| **Cabeçalhos** | resposta do site | CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, sem `X-Powered-By` |

### Camadas que sustentam isso

- **Identidade** sempre validada no Nhost Auth; nenhuma rota decodifica o JWT por conta própria.
- **Autorização** no servidor: o papel vem de `profiles.role`, e `getUserRole` falha fechado.
- **Preço** recalculado no servidor na cotação, na criação da reserva e no pagamento — o navegador nunca
  decide o valor.
- **Regras no banco:** `EXCLUDE` contra reservas sobrepostas, `CHECK` no limite de cupom (consumo atômico),
  gatilhos de bloqueio e de vistoria.
- **Pagamento:** webhook com assinatura HMAC, idempotência, limite de tentativas e conferência de valor e
  moeda antes de marcar como pago.

## Achados e correções

| # | Severidade | Achado | Status |
| :-: | :-- | :-- | :-- |
| 1 | Baixa | Rate limit de login "falha aberto": se a consulta ao banco falhar, o login era liberado sem freio | **Corrigido** |
| 2 | Baixa | Limite de cadastro só em memória (por instância): no serverless, o limite real multiplica pelo número de instâncias | **Corrigido** |
| 3 | Baixa | Sessão das contas de demonstração durava 30 dias, apesar de serem compartilhadas | **Corrigido** |
| 4 | Baixa/Info | Webhook do n8n confia 100% no chamador (marca "pago" sem reverificar) | **Risco aceito** |
| 5 | Info | CSP usa `script-src 'unsafe-inline'` (limitação do Next sem *nonce*) | **Risco aceito** |

### 1. Rate limit de login à prova de falha (corrigido)

Antes, se a consulta à tabela de tentativas falhasse, `checkLoginRateLimit` liberava o login
(`allowed: true`). Um invasor que conseguisse provocar erros no banco poderia tentar senhas sem freio.

**Correção:** quando a consulta ao banco falha, entra um *backstop* em memória (por instância) que ainda
limita as tentativas por `email+IP`. O login continua disponível se o banco tiver um soluço, mas nunca
fica totalmente sem freio. (`lib/security/rate-limit.ts`)

### 2. Limite de cadastro entre instâncias (corrigido)

O cadastro era limitado por um contador em memória (8/hora por IP), que no serverless da Vercel vale por
instância. Vários processos = limite efetivo maior.

**Correção:** além do freio em memória (que segura rajadas), agora há um teto **no banco**, contando os
cadastros recentes por IP na trilha de auditoria (`user.register`). Esse limite vale entre todas as
instâncias. Migração `017` adiciona o índice que mantém a contagem rápida. (`app/api/auth/signup/route.ts`,
`lib/security/rate-limit.ts`)

### 3. Sessão de demonstração curta (corrigido)

As contas de demonstração são compartilhadas por quem visita o portfólio, mas o cookie de sessão durava
30 dias como o de qualquer usuário. (Durante este próprio teste, uma sessão demo de dois dias atrás ainda
estava ativa.)

**Correção:** o login de demonstração passa a gravar uma sessão curta (2 horas). Contas de verdade seguem
com a duração normal. (`app/api/auth/demo/route.ts`)

## Riscos aceitos (decisão consciente, com controle compensatório)

### 4. Webhook do n8n

A rota `/api/webhooks/n8n` marca uma reserva como paga/confirmada **confiando no chamador**, diferente do
webhook do Mercado Pago, que reconsulta o pagamento na API oficial. É assim de propósito: é um webhook de
automação interna, não uma fonte pública.

**Controle compensatório:** fica **desligado por padrão** e só liga com um segredo de pelo menos 32
caracteres, comparado em tempo constante. O segredo deve ser tratado como o segredo do admin. Se o fluxo
de pagamento oficial (Mercado Pago) for o único usado, a recomendação é manter essa rota desligada.

### 5. CSP com `script-src 'unsafe-inline'`

O Next.js, sem *nonce* por requisição, exige `'unsafe-inline'` em `script-src`. Isso enfraquece a CSP como
segunda camada contra XSS.

**Controle compensatório:** não existe ponto de injeção de HTML na aplicação (React escapa tudo; os dois
usos de `dangerouslySetInnerHTML` são um script de tema estático e um JSON-LD com `<` escapado). Além
disso a CSP tem `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` e `frame-ancestors 'none'`.
Migrar para CSP com *nonce* fica como endurecimento futuro.

## Nota de método

Durante o teste, as rotas de admin responderam `200` com dados — por um instante pareceu um bypass grave.
Mas os nomes vinham **mascarados**, a marca do modo demonstração: era uma sessão `painel@astacar.dev`
antiga, guardada pelo navegador. A identidade foi confirmada (`/api/auth/check`) e as tentativas de
escrita deram `403` antes de qualquer conclusão. A lição: confirmar o estado da sessão antes de declarar
uma falha — foi o que separou o achado real do falso positivo (e motivou a correção nº 3).
