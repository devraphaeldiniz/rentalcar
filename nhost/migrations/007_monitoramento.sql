-- 007: eventos de navegação para o funil de conversão do painel admin.
-- Só é gravado com o consentimento do visitante (banner de cookies).
-- Não guarda IP nem o user-agent completo: apenas o tipo de aparelho.
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL,
  visitor_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event TEXT NOT NULL CHECK (event IN (
    'page_view', 'search', 'view_vehicle', 'start_checkout', 'booking_created', 'checkout_feedback'
  )),
  path TEXT CHECK (char_length(path) <= 300),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  device TEXT CHECK (device IN ('mobile', 'tablet', 'desktop')),
  referrer TEXT CHECK (char_length(referrer) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON analytics_events(event, created_at DESC);
