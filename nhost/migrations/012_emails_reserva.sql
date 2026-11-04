-- 012: e-mails da reserva (confirmação e lembrete na véspera da retirada).
-- As colunas marcam o envio e impedem e-mail duplicado (webhook repetido, cron rodando de novo).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_email_sent_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_bookings_reminder ON bookings(start_date) WHERE reminder_email_sent_at IS NULL;
