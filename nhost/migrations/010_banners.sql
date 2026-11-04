-- 010: banners da própria AstaCar (ofertas e avisos), editáveis no painel.
CREATE TABLE IF NOT EXISTS banners (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  placement TEXT NOT NULL CHECK (placement IN ('home', 'vehicle_sidebar')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 80),
  body TEXT CHECK (char_length(body) <= 200),
  cta_label TEXT CHECK (char_length(cta_label) <= 30),
  -- só caminhos internos: banner não leva para sites de fora
  cta_href TEXT CHECK (cta_href IS NULL OR (cta_href ~ '^/[^/\\]' OR cta_href = '/')),
  coupon_code TEXT CHECK (coupon_code IS NULL OR coupon_code ~ '^[A-Z0-9]{3,20}$'),
  tone TEXT NOT NULL DEFAULT 'brand' CHECK (tone IN ('brand', 'electric', 'success', 'warning')),
  starts_on DATE,
  ends_on DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT banners_dates CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on)
);

INSERT INTO banners (placement, title, body, cta_label, cta_href, coupon_code, tone, sort)
SELECT * FROM (VALUES
  ('home', 'Alugue por 7 dias ou mais e ganhe até 25% de desconto', 'O desconto entra sozinho no valor total: 10% na semana, 15% na quinzena e 25% no mês.', 'Ver carros', '/#carros', NULL, 'brand', 1),
  ('vehicle_sidebar', 'Primeira reserva na AstaCar?', 'Use o cupom no checkout e ganhe 10% nas diárias.', NULL, NULL, 'BEMVINDO10', 'electric', 1),
  ('vehicle_sidebar', 'Viaje sem franquia', 'Com a Proteção total você não paga nada por avarias, vidros ou pneus.', 'Ver regras', '/termos', NULL, 'success', 2)
) AS v(placement, title, body, cta_label, cta_href, coupon_code, tone, sort)
WHERE NOT EXISTS (SELECT 1 FROM banners);
