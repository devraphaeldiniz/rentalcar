-- 009: preço inteligente (descontos por duração e temporadas) e cupons.

CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('duration', 'season')),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  -- duração: desconto a partir de N diárias
  min_days INTEGER CHECK (min_days IS NULL OR min_days BETWEEN 2 AND 90),
  -- temporada: diárias dentro do intervalo têm o preço ajustado
  start_date DATE,
  end_date DATE,
  -- positivo encarece (alta temporada), negativo barateia; duração é sempre desconto
  percent NUMERIC(5,2) NOT NULL CHECK (percent BETWEEN -60 AND 100),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pricing_rules_shape CHECK (
    (kind = 'duration' AND min_days IS NOT NULL AND percent > 0 AND percent <= 60 AND start_date IS NULL AND end_date IS NULL)
    OR (kind = 'season' AND min_days IS NULL AND start_date IS NOT NULL AND end_date IS NOT NULL AND end_date >= start_date AND percent <> 0)
  )
);

CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{3,20}$'),
  description TEXT CHECK (char_length(description) <= 200),
  percent NUMERIC(5,2) CHECK (percent IS NULL OR (percent > 0 AND percent <= 60)),
  amount NUMERIC(10,2) CHECK (amount IS NULL OR amount > 0),
  min_days INTEGER NOT NULL DEFAULT 1 CHECK (min_days BETWEEN 1 AND 90),
  valid_from DATE,
  valid_until DATE,
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  uses INTEGER NOT NULL DEFAULT 0 CHECK (uses >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coupons_one_value CHECK ((percent IS NULL) <> (amount IS NULL)),
  CONSTRAINT coupons_dates CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from),
  CONSTRAINT coupons_limit CHECK (max_uses IS NULL OR uses <= max_uses)
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS coupon_code TEXT;

-- Exemplos iniciais; o admin ajusta em Preços e opcionais.
INSERT INTO pricing_rules (kind, name, min_days, percent)
SELECT * FROM (VALUES
  ('duration', 'Desconto semanal', 7, 10.00),
  ('duration', 'Desconto quinzenal', 15, 15.00),
  ('duration', 'Desconto mensal', 30, 25.00)
) AS v(kind, name, min_days, percent)
WHERE NOT EXISTS (SELECT 1 FROM pricing_rules WHERE kind = 'duration');

INSERT INTO pricing_rules (kind, name, start_date, end_date, percent)
SELECT * FROM (VALUES
  ('season', 'Alta temporada de fim de ano', DATE '2026-12-20', DATE '2027-01-05', 20.00),
  ('season', 'Carnaval', DATE '2027-02-05', DATE '2027-02-10', 15.00)
) AS v(kind, name, start_date, end_date, percent)
WHERE NOT EXISTS (SELECT 1 FROM pricing_rules WHERE kind = 'season');

INSERT INTO coupons (code, description, percent, min_days, valid_until, max_uses)
VALUES ('BEMVINDO10', '10% na primeira reserva', 10, 2, DATE '2027-06-30', 100)
ON CONFLICT (code) DO NOTHING;
