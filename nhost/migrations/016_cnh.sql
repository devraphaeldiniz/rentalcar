-- 016: dados da CNH no perfil, conferidos antes de cada reserva
-- (categoria B, validade na retirada e pelo menos 2 anos de habilitação).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cnh_number TEXT CHECK (cnh_number ~ '^[0-9]{11}$');
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cnh_category TEXT CHECK (cnh_category IN ('B', 'AB', 'C', 'AC', 'D', 'AD', 'E', 'AE'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cnh_expires_on DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cnh_first_issued_on DATE;

-- A mesma CNH não pode estar em duas contas.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cnh_number_key ON profiles(cnh_number) WHERE cnh_number IS NOT NULL;
