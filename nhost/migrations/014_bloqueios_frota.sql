-- 014: bloqueio de um carro por período (manutenção, revisão, limpeza), sem reserva falsa.
-- Mesma convenção das reservas: [start_date, end_date), ou seja, o carro volta a ficar livre em end_date.
-- @track vehicle_blocks
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS vehicle_blocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL DEFAULT 'maintenance' CHECK (reason IN ('maintenance', 'inspection', 'cleaning', 'other')),
  notes TEXT CHECK (char_length(notes) <= 500),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vehicle_blocks_dates CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_blocks_vehicle ON vehicle_blocks(vehicle_id, start_date);

DO $do$
BEGIN
  -- Dois bloqueios do mesmo carro não se sobrepõem.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicle_blocks_no_overlap') THEN
    ALTER TABLE vehicle_blocks
      ADD CONSTRAINT vehicle_blocks_no_overlap
      EXCLUDE USING gist (vehicle_id WITH =, daterange(start_date, end_date, '[)') WITH &&);
  END IF;
END
$do$;

-- Reserva em período bloqueado é recusada pelo próprio banco, mesmo que a busca esteja desatualizada.
CREATE OR REPLACE FUNCTION bookings_check_vehicle_block() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  -- Datas invertidas ficam para o CHECK da tabela, com a mensagem certa.
  IF NEW.end_date <= NEW.start_date THEN RETURN NEW; END IF;
  IF NEW.status IN ('pending', 'confirmed', 'active') AND EXISTS (
    SELECT 1 FROM vehicle_blocks vb
    WHERE vb.vehicle_id = NEW.vehicle_id
      AND daterange(vb.start_date, vb.end_date, '[)') && daterange(NEW.start_date, NEW.end_date, '[)')
  ) THEN
    RAISE EXCEPTION 'vehicle_blocked: carro bloqueado nesse período';
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS bookings_vehicle_block ON bookings;
CREATE TRIGGER bookings_vehicle_block
  BEFORE INSERT OR UPDATE OF vehicle_id, start_date, end_date ON bookings
  FOR EACH ROW EXECUTE FUNCTION bookings_check_vehicle_block();

-- E o contrário: não dá para bloquear um período que já tem reserva ativa.
CREATE OR REPLACE FUNCTION vehicle_blocks_check_bookings() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF NEW.end_date <= NEW.start_date THEN RETURN NEW; END IF;
  IF EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.vehicle_id = NEW.vehicle_id
      AND b.status IN ('pending', 'confirmed', 'active')
      AND daterange(b.start_date, b.end_date, '[)') && daterange(NEW.start_date, NEW.end_date, '[)')
  ) THEN
    RAISE EXCEPTION 'vehicle_block_conflict: existe reserva nesse período';
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS vehicle_blocks_bookings ON vehicle_blocks;
CREATE TRIGGER vehicle_blocks_bookings
  BEFORE INSERT OR UPDATE ON vehicle_blocks
  FOR EACH ROW EXECUTE FUNCTION vehicle_blocks_check_bookings();
