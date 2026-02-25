-- Tabla principal: registra cada pago y el estado de enrollment
CREATE TABLE IF NOT EXISTS pack_leyes_administrativo (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id text UNIQUE NOT NULL,
  customer_email  text NOT NULL,
  customer_name   text,
  teachable_user_id integer,
  enrolled_at     timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,
  unenrolled_at   timestamptz,
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'expired')),
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pack_leyes_status ON pack_leyes_administrativo(status);
CREATE INDEX IF NOT EXISTS idx_pack_leyes_email  ON pack_leyes_administrativo(customer_email);
