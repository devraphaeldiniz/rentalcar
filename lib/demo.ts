// Conta de demonstração: recrutadores e visitantes entram com um clique,
// sem criar conta. A senha fica só nas variáveis do servidor.

export const DEMO_EMAIL = (process.env.DEMO_CLIENT_EMAIL ?? '').trim().toLowerCase()
const DEMO_PASSWORD = process.env.DEMO_CLIENT_PASSWORD ?? ''

export const demoEnabled = () => Boolean(DEMO_EMAIL && DEMO_PASSWORD)
export const demoCredentials = () => ({ email: DEMO_EMAIL, password: DEMO_PASSWORD })

/** A conta de demonstração é compartilhada: dados e senha não podem ser trocados. */
export const isDemoAccount = (email: string | null | undefined) => Boolean(DEMO_EMAIL && email?.trim().toLowerCase() === DEMO_EMAIL)

export const DEMO_LOCKED_MESSAGE = 'Na conta de demonstração os dados e a senha não podem ser alterados. Crie sua conta para testar isso.'
