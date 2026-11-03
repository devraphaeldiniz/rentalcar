-- 004: novas categorias de frota e crédito das fotos.

-- Elétrico/híbrido, picape, esportivo e 7 lugares, além das quatro originais.
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_category_check;
ALTER TABLE vehicles ADD CONSTRAINT vehicles_category_check
  CHECK (category IN ('economy', 'standard', 'suv', 'luxury', 'electric', 'pickup', 'sports', 'minivan'));

-- Autor, licença e link de cada foto, na mesma ordem de images.
-- Fotos com licença Creative Commons exigem esse crédito visível.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS image_credits JSONB NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_vehicles_category ON vehicles(category);
