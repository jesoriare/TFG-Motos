import { Router } from 'express';
import { pool } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

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
