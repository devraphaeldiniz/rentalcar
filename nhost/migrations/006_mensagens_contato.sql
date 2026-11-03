-- 006: mensagens do formulário de contato, lidas pelo painel admin.
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  email TEXT NOT NULL CHECK (char_length(email) <= 200),
  phone TEXT CHECK (char_length(phone) <= 30),
  subject TEXT CHECK (char_length(subject) <= 150),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 5 AND 3000),
  ip_address INET,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(created_at DESC);
