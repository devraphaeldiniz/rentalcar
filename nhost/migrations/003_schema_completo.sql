-- 003: completa o schema com tudo o que o código usa.
-- Pode rodar em um banco novo (depois de 001 e 002) ou em um já existente:
-- todos os comandos são idempotentes.

-- ---------- profiles ----------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS blocked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_count INTEGER NOT NULL DEFAULT 0;

-- Todo usuário do Nhost Auth ganha um perfil automaticamente.
-- Sem isso, reservas (FK para profiles) e o papel de admin não funcionam.
CREATE OR REPLACE FUNCTION public.sync_profile_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Usuários sem e-mail (anônimos) não ganham perfil; sem este guarda o cadastro falharia.
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(NEW.display_name, ''),
    COALESCE(NEW.metadata ->> 'phone', NEW.phone_number),
    COALESCE(NEW.email_verified, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    email_verified = EXCLUDED.email_verified;
  RETURN NEW;
END;
$$;

-- Em alguns planos o papel do Hasura não é dono de auth.users. Nesse caso o
-- trigger é pulado (com aviso) e o perfil é criado pela rota de login.
DO $do$
BEGIN
  EXECUTE 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users';
  EXECUTE 'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
           FOR EACH ROW EXECUTE FUNCTION public.sync_profile_from_auth()';
  EXECUTE 'DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users';
  EXECUTE 'CREATE TRIGGER on_auth_user_updated AFTER UPDATE OF email, email_verified ON auth.users
           FOR EACH ROW EXECUTE FUNCTION public.sync_profile_from_auth()';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Sem permissão para criar trigger em auth.users; perfis serão criados no login.';
END
$do$;

-- Usuários que já existiam antes do trigger.
INSERT INTO public.profiles (id, email, full_name, email_verified)
SELECT u.id, u.email, NULLIF(u.display_name, ''), COALESCE(u.email_verified, false)
FROM auth.users u
WHERE u.email IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- ---------- vehicles ----------
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS air_conditioning BOOLEAN;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS transmission TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_type TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS passengers INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS doors INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS trunk_capacity TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2) NOT NULL DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS total_reviews INTEGER NOT NULL DEFAULT 0;

-- ---------- bookings ----------
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_cpf TEXT;
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);

-- ---------- reviews ----------
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT CHECK (char_length(comment) <= 1000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reviews_one_per_booking UNIQUE (booking_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_vehicle_status ON reviews(vehicle_id, status);

DROP TRIGGER IF EXISTS set_reviews_updated_at ON reviews;
CREATE TRIGGER set_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Nota média e total do veículo calculados pelo banco, só com avaliações aprovadas.
CREATE OR REPLACE FUNCTION public.refresh_vehicle_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target UUID := COALESCE(NEW.vehicle_id, OLD.vehicle_id);
BEGIN
  UPDATE vehicles v SET
    average_rating = COALESCE((SELECT ROUND(AVG(r.rating)::numeric, 2) FROM reviews r WHERE r.vehicle_id = target AND r.status = 'approved'), 0),
    total_reviews = (SELECT COUNT(*) FROM reviews r WHERE r.vehicle_id = target AND r.status = 'approved')
  WHERE v.id = target;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS reviews_refresh_vehicle_rating ON reviews;
CREATE TRIGGER reviews_refresh_vehicle_rating
  AFTER INSERT OR UPDATE OF status, rating OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION public.refresh_vehicle_rating();

-- Recalcula uma vez a nota de todos os veículos com os dados atuais.
UPDATE vehicles v SET
  average_rating = COALESCE((SELECT ROUND(AVG(r.rating)::numeric, 2) FROM reviews r WHERE r.vehicle_id = v.id AND r.status = 'approved'), 0),
  total_reviews = (SELECT COUNT(*) FROM reviews r WHERE r.vehicle_id = v.id AND r.status = 'approved');

-- ---------- audit_logs ----------
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ---------- login_attempts ----------
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address INET NOT NULL,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email, created_at DESC) WHERE success = false;
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address, created_at DESC) WHERE success = false;
