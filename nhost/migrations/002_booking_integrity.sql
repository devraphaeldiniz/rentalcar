-- Integridade comercial de reservas: impede valores inválidos e sobreposição.
-- Idempotente: pode rodar em um banco que já tenha parte dessas regras.
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_daily_rate_positive') THEN
    ALTER TABLE vehicles ADD CONSTRAINT vehicles_daily_rate_positive CHECK (daily_rate > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_total_positive') THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_total_positive CHECK (total_amount >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_no_overlap') THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_no_overlap
      EXCLUDE USING gist (
        vehicle_id WITH =,
        daterange(start_date, end_date, '[)') WITH &&
      )
      WHERE (status IN ('pending', 'confirmed', 'active'));
  END IF;
END
$do$;
