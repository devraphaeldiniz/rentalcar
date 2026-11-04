-- 011: pagamento online pelo Mercado Pago (Payment Brick / Payments API).
-- O cliente escolhe no checkout: pagar agora (online) ou na retirada (on_pickup).

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'on_pickup';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS mp_payment_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_payment_method_check') THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_payment_method_check CHECK (payment_method IN ('on_pickup', 'online'));
  END IF;
END $$;

-- Cada tentativa de pagamento no Mercado Pago (cartão recusado, Pix gerado, boleto...).
-- Só o servidor (admin secret) lê e grava: nenhuma permissão para user/anonymous.
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  mp_payment_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  status_detail TEXT,
  payment_method_id TEXT,
  payment_type_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id, created_at DESC);
