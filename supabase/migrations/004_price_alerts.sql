-- Users subscribe to price alerts for specific properties
CREATE TABLE IF NOT EXISTS price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  user_email text NOT NULL,
  property_ref text NOT NULL,
  property_name text,
  alert_price integer, -- trigger when price drops below this
  created_at timestamptz DEFAULT now(),
  last_triggered_at timestamptz,
  active boolean DEFAULT true,
  UNIQUE(user_id, property_ref)
);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_ref ON price_alerts(property_ref);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON price_alerts(active);

-- Track which alerts have been sent to avoid duplicates
CREATE TABLE IF NOT EXISTS alert_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES price_alerts ON DELETE CASCADE,
  old_price integer,
  new_price integer,
  drop_pct numeric,
  sent_at timestamptz DEFAULT now()
);

-- Users can subscribe to "new listings in region/type" alerts
CREATE TABLE IF NOT EXISTS new_listing_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  regions text[], -- e.g. ['alicante', 'murcia']
  types text[],   -- e.g. ['apartment', 'villa']
  max_price integer,
  min_score integer DEFAULT 60,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
