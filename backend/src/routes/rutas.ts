import { Router } from 'express';
import { pool } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

function parseJson(val: any) {
  if (typeof val === 'string') try { return JSON.parse(val); } catch { return []; }
  return val ?? [];
}

// GET /rutas
router.get('/', async (req, res) => {
  const { region, dificultad, username } = req.query as { region?: string; dificultad?: string; username?: string };

  let where = 'r.publicada = 1';
  const params: any[] = [];

  if (region)   { where += ' AND r.region LIKE ?';     params.push(`%${region}%`); }
  if (dificultad) { where += ' AND r.dificultad = ?';  params.push(dificultad); }
  if (username) { where += ' AND p.username = ?';       params.push(username); }

  const [rows] = await pool.execute<any[]>(`
    SELECT r.id, r.nombre, r.region, r.distancia_km, r.duracion_min, r.dificultad, r.tags, r.created_at,
           p.username, p.avatar_url, p.verified,
           AVG(v.puntuacion) AS avg_rating, COUNT(v.id) AS num_valoraciones
    FROM rutas r
    JOIN profiles p ON p.id = r.user_id
    LEFT JOIN valoraciones_ruta v ON v.ruta_id = r.id
    WHERE ${where}
    GROUP BY r.id, r.nombre, r.region, r.distancia_km, r.duracion_min, r.dificultad, r.tags, r.created_at,
             p.username, p.avatar_url, p.verified
    ORDER BY r.created_at DESC
  `, params);

  res.json(rows.map(r => ({
    ...r,
    tags: parseJson(r.tags),
    profiles: { username: r.username, avatar_url: r.avatar_url, verified: !!r.verified },
    rating: r.avg_rating ? +Number(r.avg_rating).toFixed(1) : null,
    num_valoraciones: Number(r.num_valoraciones),
  })));
});

// GET /rutas/:id
router.get('/:id', async (req, res) => {
  const [rows] = await pool.execute<any[]>(`
    SELECT r.*, p.username, p.avatar_url, p.verified, p.zona
    FROM rutas r JOIN profiles p ON p.id = r.user_id
    WHERE r.id = ?
  `, [req.params.id]);

  if (!rows[0]) { res.status(404).json({ error: 'Ruta no encontrada' }); return; }

  const ruta = rows[0];
  ruta.tags           = parseJson(ruta.tags);
  ruta.waypoints      = parseJson(ruta.waypoints);
  ruta.puntos_interes = parseJson(ruta.puntos_interes);
  ruta.profiles  = { username: ruta.username, avatar_url: ruta.avatar_url, verified: !!ruta.verified, zona: ruta.zona };

  const [valoraciones] = await pool.execute<any[]>(`
    SELECT v.puntuacion, v.comentario, v.created_at, p.username, p.avatar_url
    FROM valoraciones_ruta v JOIN profiles p ON p.id = v.user_id
    WHERE v.ruta_id = ? ORDER BY v.created_at DESC
  `, [req.params.id]);

  ruta.valoraciones_ruta = valoraciones.map(v => ({
    puntuacion: v.puntuacion, comentario: v.comentario, created_at: v.created_at,
    profiles: { username: v.username, avatar_url: v.avatar_url },
  }));

  res.json(ruta);
});

// POST /rutas
router.post('/', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { nombre, region, distancia_km, duracion_min, dificultad, descripcion, tags, waypoints, puntos_interes, avoid_highways } = req.body;
  const id = uuidv4();

  await pool.execute(
    `INSERT INTO rutas (id, user_id, nombre, region, distancia_km, duracion_min, dificultad, descripcion, tags, waypoints, puntos_interes, avoid_highways)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, nombre, region, distancia_km, duracion_min, dificultad ?? 'media',
     descripcion ?? null, JSON.stringify(tags ?? []), JSON.stringify(waypoints ?? []),
     JSON.stringify(puntos_interes ?? []), !!avoid_highways]
  );

  const [rows] = await pool.execute<any[]>('SELECT * FROM rutas WHERE id = ?', [id]);
  const r = rows[0];
  r.tags = parseJson(r.tags);
  r.waypoints = parseJson(r.waypoints);
  r.puntos_interes = parseJson(r.puntos_interes);
  res.status(201).json(r);
});

// PUT /rutas/:id
router.put('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { nombre, region, distancia_km, duracion_min, dificultad, descripcion, tags, waypoints, puntos_interes, avoid_highways } = req.body;

  const [check] = await pool.execute<any[]>('SELECT id FROM rutas WHERE id = ? AND user_id = ?', [req.params.id, userId]);
  if (!check[0]) { res.status(404).json({ error: 'Ruta no encontrada o sin permiso' }); return; }

  await pool.execute(
    `UPDATE rutas SET nombre = ?, region = ?, distancia_km = ?, duracion_min = ?,
     dificultad = ?, descripcion = ?, tags = ?, waypoints = ?, puntos_interes = ?, avoid_highways = ? WHERE id = ? AND user_id = ?`,
    [nombre, region, distancia_km, duracion_min, dificultad, descripcion ?? null,
     JSON.stringify(tags ?? []), JSON.stringify(waypoints ?? []), JSON.stringify(puntos_interes ?? []),
     !!avoid_highways, req.params.id, userId]
  );

  const [rows] = await pool.execute<any[]>('SELECT * FROM rutas WHERE id = ?', [req.params.id]);
  const r = rows[0];
  r.tags = parseJson(r.tags);
  r.waypoints = parseJson(r.waypoints);
  r.puntos_interes = parseJson(r.puntos_interes);
  res.json(r);
});

// DELETE /rutas/:id
router.delete('/:id', requireAuth, async (req, res) => {
  await pool.execute('DELETE FROM rutas WHERE id = ? AND user_id = ?', [req.params.id, res.locals.userId]);
  res.status(204).send();
});

// POST /rutas/:id/valorar
router.post('/:id/valorar', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { puntuacion, comentario } = req.body;

  const [existing] = await pool.execute<any[]>(
    'SELECT id FROM valoraciones_ruta WHERE ruta_id = ? AND user_id = ?', [req.params.id, userId]
  );

  if (existing[0]) {
    await pool.execute(
      'UPDATE valoraciones_ruta SET puntuacion = ?, comentario = ? WHERE ruta_id = ? AND user_id = ?',
      [puntuacion, comentario ?? null, req.params.id, userId]
    );
  } else {
    await pool.execute(
      'INSERT INTO valoraciones_ruta (id, ruta_id, user_id, puntuacion, comentario) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), req.params.id, userId, puntuacion, comentario ?? null]
    );
  }

  const [rows] = await pool.execute<any[]>(
    'SELECT * FROM valoraciones_ruta WHERE ruta_id = ? AND user_id = ?', [req.params.id, userId]
  );
  res.json(rows[0]);
});

export default router;
