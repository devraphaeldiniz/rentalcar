-- 008: proteções e opcionais com preço, e detalhamento do valor da reserva.

CREATE TABLE IF NOT EXISTS rental_extras (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9_]{2,40}$'),
  kind TEXT NOT NULL CHECK (kind IN ('protection', 'addon')),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  description TEXT CHECK (char_length(description) <= 300),
  price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  -- por diária ou valor único por reserva
  pricing TEXT NOT NULL DEFAULT 'per_day' CHECK (pricing IN ('per_day', 'per_rental')),
  -- teto do valor por reserva (ex.: cadeirinha cobrada até 10 diárias)
  max_total NUMERIC(10,2) CHECK (max_total IS NULL OR max_total >= 0),
  -- a proteção padrão já vem selecionada e não pode faltar
  is_default BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS rental_extras_updated_at ON rental_extras;
CREATE TRIGGER rental_extras_updated_at BEFORE UPDATE ON rental_extras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO rental_extras (code, kind, name, description, price, pricing, max_total, is_default, sort) VALUES
  ('protecao_basica', 'protection', 'Proteção básica', 'Cobre roubo, furto e colisão, com franquia de R$ 3.000.', 0, 'per_day', NULL, true, 1),
  ('protecao_completa', 'protection', 'Proteção completa', 'Franquia reduzida para R$ 1.500 e cobertura de danos a terceiros.', 29, 'per_day', NULL, false, 2),
  ('protecao_total', 'protection', 'Proteção total', 'Sem franquia. Inclui vidros, faróis, pneus e danos a terceiros.', 59, 'per_day', NULL, false, 3),
  ('condutor_adicional', 'addon', 'Condutor adicional', 'Mais uma pessoa habilitada pode dirigir o carro.', 15, 'per_day', 150, false, 10),
  ('cadeirinha', 'addon', 'Cadeirinha infantil', 'Para crianças de até 4 anos, instalada na retirada.', 20, 'per_day', 200, false, 11),
  ('gps', 'addon', 'GPS', 'Aparelho com mapas atualizados do Brasil.', 12, 'per_day', 120, false, 12),
  ('tanque_cheio', 'addon', 'Tanque cheio pré-pago', 'Devolva sem abastecer. Valor fixo por reserva.', 180, 'per_rental', NULL, false, 13)
ON CONFLICT (code) DO NOTHING;

-- Detalhamento salvo na própria reserva: os preços podem mudar depois,
-- mas a reserva guarda exatamente o que o cliente aceitou pagar.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS base_amount NUMERIC(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS extras_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS price_lines JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
