-- 013: erros da aplicação (servidor e navegador) para a tela "Erros e saúde" do painel.
-- Guarda só o necessário para corrigir: mensagem, rota e trecho da pilha, sem IP e sem dados do formulário.
-- @track app_errors
CREATE TABLE IF NOT EXISTS app_errors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('server', 'client')),
  fingerprint TEXT NOT NULL,
  message TEXT NOT NULL,
  route TEXT,
  path TEXT,
  method TEXT,
  digest TEXT,
  stack TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_errors_created ON app_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_errors_fingerprint ON app_errors(fingerprint, created_at DESC);
