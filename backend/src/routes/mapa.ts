import { Router } from 'express';
import { pool } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /mapa/riders
router.get('/riders', async (_req, res) => {
  const [rows] = await pool.execute<any[]>(`
    SELECT u.lat, u.lng, u.updated_at,
           p.id, p.username, p.avatar_url, p.online,
           m.marca_modelo, m.tipo
    FROM ubicaciones u
    JOIN profiles p ON p.id = u.user_id
    LEFT JOIN motos m ON m.user_id = p.id AND m.principal = 1
    ORDER BY u.updated_at DESC
  `);

  const map = new Map<string, any>();
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        lat: row.lat, lng: row.lng, updated_at: row.updated_at,
        profiles: { id: row.id, username: row.username, avatar_url: row.avatar_url, online: !!row.online, motos: [] },
      });
    }
    if (row.marca_modelo) map.get(row.id).profiles.motos.push({ marca_modelo: row.marca_modelo, tipo: row.tipo });
  }

  res.json(Array.from(map.values()));
});

// PUT /mapa/ubicacion
router.put('/ubicacion', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { lat, lng } = req.body;

  await pool.execute(
    'INSERT INTO ubicaciones (user_id, lat, lng) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE lat = ?, lng = ?, updated_at = NOW()',
    [userId, lat, lng, lat, lng]
  );
  await pool.execute('UPDATE profiles SET online = 1, last_seen = NOW() WHERE id = ?', [userId]);
  res.json({ ok: true });
});

// GET /mapa/pois
router.get('/pois', async (_req, res) => {
  const [data] = await pool.execute<any[]>(
    'SELECT id, tipo, nombre, descripcion, lat, lng FROM puntos_interes ORDER BY created_at DESC'
  );
  res.json(data);
});

// POST /mapa/pois
router.post('/pois', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { tipo, nombre, descripcion, lat, lng } = req.body;
  const id = uuidv4();

  await pool.execute(
    'INSERT INTO puntos_interes (id, user_id, tipo, nombre, descripcion, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, userId, tipo, nombre, descripcion ?? null, lat, lng]
  );

  const [rows] = await pool.execute<any[]>('SELECT * FROM puntos_interes WHERE id = ?', [id]);
  res.status(201).json(rows[0]);
});

export default router;
