-- 015: vistoria na retirada e na devolução (quilometragem, combustível, avarias e cobranças extras).
-- Uma de cada tipo por reserva. Salvar a vistoria é o que muda a reserva para "em andamento" e "concluída".
-- @track booking_inspections
CREATE TABLE IF NOT EXISTS booking_inspections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('pickup', 'return')),
  odometer_km INTEGER NOT NULL CHECK (odometer_km >= 0 AND odometer_km < 2000000),
  -- Nível do tanque em oitavos, como no marcador do painel (0 = vazio, 8 = cheio).
  fuel_eighths SMALLINT NOT NULL CHECK (fuel_eighths BETWEEN 0 AND 8),
  damages JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(damages) = 'array'),
  extra_charges JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(extra_charges) = 'array'),
  extra_total DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (extra_total >= 0),
  notes TEXT CHECK (char_length(notes) <= 1000),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT booking_inspections_one_per_kind UNIQUE (booking_id, kind)
);

-- A quilometragem da devolução não pode ser menor que a da retirada.
CREATE OR REPLACE FUNCTION booking_inspections_check_km() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE
  pickup_km INTEGER;
BEGIN
  IF NEW.kind = 'return' THEN
    SELECT odometer_km INTO pickup_km FROM booking_inspections WHERE booking_id = NEW.booking_id AND kind = 'pickup';
    IF pickup_km IS NULL THEN
      RAISE EXCEPTION 'inspection_without_pickup: faça a vistoria de retirada antes';
    END IF;
    IF NEW.odometer_km < pickup_km THEN
      RAISE EXCEPTION 'inspection_km_lower: quilometragem menor que a da retirada';
    END IF;
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS booking_inspections_km ON booking_inspections;
CREATE TRIGGER booking_inspections_km
  BEFORE INSERT OR UPDATE ON booking_inspections
  FOR EACH ROW EXECUTE FUNCTION booking_inspections_check_km();
