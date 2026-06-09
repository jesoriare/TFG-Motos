-- RF-12.4: Auto-expiración de incidencias
-- Ejecutar en: Supabase Dashboard > SQL Editor
ALTER TABLE incidencias
ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '4 hours');
