-- Añadir waypoints (paradas) a rutas para guardar los puntos del mapa
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS waypoints jsonb NOT NULL DEFAULT '[]';
