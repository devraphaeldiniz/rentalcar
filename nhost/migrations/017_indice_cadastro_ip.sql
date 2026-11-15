-- 017: acelera a contagem de cadastros por IP na janela (limite de cadastro entre instâncias).
-- A trilha de auditoria já guarda cada cadastro como action = 'user.register' com o ip_address.
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_ip
  ON audit_logs(action, ip_address, created_at DESC);
