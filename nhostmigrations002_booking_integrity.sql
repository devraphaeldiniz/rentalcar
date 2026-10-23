-- Integridade comercial de reservas: impede valores inválidos e sobreposição.
ALTER TABLE vehicles
  ADD CONSTRAINT vehicles_daily_rate_positive CHECK (daily_rate > 0);

ALTER TABLE bookings
  ADD CONSTRAINT bookings_total_positive CHECK (total_amount >= 0);

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    vehicle_id WITH =,
    daterange(start_date, end_date, '[)') WITH &&
  )
  WHERE (status IN ('pending', 'confirmed', 'active'));
