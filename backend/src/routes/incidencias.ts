import { Router } from 'express';
import { pool } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const EXPIRY_HOURS = 4;

// GET /incidencias
router.get('/', async (_req, res) => {
  const [rows] = await pool.execute<any[]>(`
    SELECT i.id, i.user_id, i.tipo, i.descripcion, i.via, i.severidad, i.confirmaciones,
           i.lat, i.lng, i.created_at, i.expires_at,
           p.username, p.avatar_url
    FROM incidencias i
    JOIN profiles p ON p.id = i.user_id
    WHERE i.activa = 1 AND i.expires_at > NOW()
    ORDER BY i.created_at DESC
  `);

  res.json(rows.map(i => ({ ...i, profiles: { username: i.username, avatar_url: i.avatar_url } })));
});

// POST /incidencias
router.post('/', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { tipo, descripcion, via, severidad, lat, lng, expiry_hours } = req.body;
  const hours = Number(expiry_hours) || EXPIRY_HOURS;
  const expires_at = new Date(Date.now() + hours * 60 * 60 * 1000);
  const id = uuidv4();

  await pool.execute(
    `INSERT INTO incidencias (id, user_id, tipo, descripcion, via, severidad, lat, lng, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, tipo, descripcion, via, severidad ?? 'medium', lat, lng, expires_at]
  );

  const [rows] = await pool.execute<any[]>('SELECT * FROM incidencias WHERE id = ?', [id]);
  res.status(201).json(rows[0]);
});

// POST /incidencias/:id/confirmar
router.post('/:id/confirmar', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const incidenciaId = req.params.id;

  const [existing] = await pool.execute<any[]>(
    'SELECT incidencia_id FROM confirmaciones_incidencia WHERE incidencia_id = ? AND user_id = ?',
    [incidenciaId, userId]
  );

  if (existing[0]) {
    await pool.execute(
      'DELETE FROM confirmaciones_incidencia WHERE incidencia_id = ? AND user_id = ?',
      [incidenciaId, userId]
    );
    res.json({ confirmado: false });
  } else {
    await pool.execute(
      'INSERT INTO confirmaciones_incidencia (incidencia_id, user_id) VALUES (?, ?)',
      [incidenciaId, userId]
    );
    res.json({ confirmado: true });
  }
});

// DELETE /incidencias/:id
router.delete('/:id', requireAuth, async (req, res) => {
  await pool.execute('DELETE FROM incidencias WHERE id = ? AND user_id = ?', [req.params.id, res.locals.userId]);
  res.status(204).send();
});

// PATCH /incidencias/:id/resolver
router.patch('/:id/resolver', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  await pool.execute(
    "UPDATE incidencias SET severidad = 'resolved', activa = 0 WHERE id = ? AND user_id = ?",
    [req.params.id, userId]
  );
  const [rows] = await pool.execute<any[]>('SELECT * FROM incidencias WHERE id = ?', [req.params.id]);
  if (!rows[0]) { res.status(404).json({ error: 'Incidencia no encontrada' }); return; }
  res.json(rows[0]);
});

export default router;
