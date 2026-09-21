import { Router } from 'express';
import { pool } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

function toProfileJson(profile: any, motos: any[]) {
  return {
    ...profile,
    verified: !!profile.verified,
    online: !!profile.online,
    motos: motos.map(m => ({ ...m, principal: !!m.principal })),
  };
}

// GET /usuarios/me — perfil propio (por id, no depende del username del JWT)
// NOTA: debe declararse antes de GET /:username, si no Express la capturaría como username="me"
router.get('/me', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const [profiles] = await pool.execute<any[]>(
    'SELECT id, nombre, apellidos, username, avatar_url, zona, verified, online, last_seen, created_at FROM profiles WHERE id = ?',
    [userId]
  );
  if (!profiles[0]) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

  const profile = profiles[0];
  const [motos] = await pool.execute<any[]>(
    'SELECT id, marca_modelo, cilindrada, tipo, principal FROM motos WHERE user_id = ?',
    [userId]
  );

  res.json(toProfileJson(profile, motos));
});

// PATCH /usuarios/me/estado — marcar online/offline
router.patch('/me/estado', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const online = !!req.body?.online;
  await pool.execute('UPDATE profiles SET online = ?, last_seen = NOW() WHERE id = ?', [online, userId]);
  res.json({ ok: true });
});

// PUT /usuarios/me — actualizar perfil (y moto principal opcionalmente)
router.put('/me', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { nombre, apellidos, username, zona, avatar_url, marca_modelo, cilindrada } = req.body;

  if (!nombre || !apellidos || !username) {
    res.status(400).json({ error: 'Faltan campos obligatorios' });
    return;
  }

  try {
    await pool.execute(
      'UPDATE profiles SET nombre = ?, apellidos = ?, username = ?, zona = ?, avatar_url = ? WHERE id = ?',
      [nombre, apellidos, username, zona ?? null, avatar_url ?? null, userId]
    );
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') { res.status(409).json({ error: 'El nombre de usuario ya existe' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el perfil' });
    return;
  }

  if (marca_modelo && cilindrada) {
    const [existing] = await pool.execute<any[]>(
      'SELECT id FROM motos WHERE user_id = ? AND principal = 1',
      [userId]
    );
    if (existing[0]) {
      await pool.execute(
        'UPDATE motos SET marca_modelo = ?, cilindrada = ? WHERE id = ?',
        [marca_modelo, parseInt(cilindrada), existing[0].id]
      );
    } else {
      await pool.execute(
        'INSERT INTO motos (id, user_id, marca_modelo, cilindrada, principal) VALUES (?, ?, ?, ?, 1)',
        [uuidv4(), userId, marca_modelo, parseInt(cilindrada)]
      );
    }
  }

  const [rows] = await pool.execute<any[]>('SELECT * FROM profiles WHERE id = ?', [userId]);
  const [motosActualizadas] = await pool.execute<any[]>(
    'SELECT id, marca_modelo, cilindrada, tipo, principal FROM motos WHERE user_id = ?',
    [userId]
  );
  res.json(toProfileJson(rows[0], motosActualizadas));
});

// GET /usuarios/stats — total de usuarios registrados (para estadísticas públicas de la portada)
// NOTA: debe declararse antes de GET /:username, si no Express la capturaría como username="stats"
router.get('/stats', async (req, res) => {
  const [rows] = await pool.execute<any[]>('SELECT COUNT(*) AS total FROM profiles');
  res.json({ total: Number(rows[0].total) });
});

// GET /usuarios/:username — perfil público
router.get('/:username', async (req, res) => {
  const [profiles] = await pool.execute<any[]>(
    'SELECT id, nombre, apellidos, username, avatar_url, zona, verified, online, last_seen, created_at FROM profiles WHERE username = ?',
    [req.params.username]
  );
  if (!profiles[0]) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

  const profile = profiles[0];
  const [motos] = await pool.execute<any[]>(
    'SELECT id, marca_modelo, cilindrada, tipo, principal FROM motos WHERE user_id = ?',
    [profile.id]
  );

  res.json(toProfileJson(profile, motos));
});

// PATCH /usuarios/me/push-token
router.patch('/me/push-token', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const push_token = typeof req.body?.push_token === 'string' ? req.body.push_token : null;
  await pool.execute('UPDATE profiles SET push_token = ? WHERE id = ?', [push_token, userId]);
  res.json({ ok: true });
});

// GET /usuarios — listar moteros con filtros
router.get('/', async (req, res) => {
  const { search, tipo, cilindrada_min, cilindrada_max } = req.query as {
    search?: string; tipo?: string; cilindrada_min?: string; cilindrada_max?: string;
  };
  const cilMin = cilindrada_min ? Number(cilindrada_min) : null;
  const cilMax = cilindrada_max ? Number(cilindrada_max) : null;

  const [rows] = await pool.execute<any[]>(`
    SELECT p.id, p.nombre, p.apellidos, p.username, p.avatar_url, p.zona, p.verified, p.online,
           m.marca_modelo, m.cilindrada, m.tipo AS moto_tipo
    FROM profiles p
    LEFT JOIN motos m ON m.user_id = p.id
    ORDER BY p.online DESC, p.username ASC
  `);

  const usersMap = new Map<string, any>();
  for (const row of rows) {
    if (!usersMap.has(row.id)) {
      usersMap.set(row.id, {
        id: row.id, nombre: row.nombre, apellidos: row.apellidos,
        username: row.username, avatar_url: row.avatar_url,
        zona: row.zona, verified: !!row.verified, online: !!row.online,
        motos: [],
      });
    }
    if (row.marca_modelo) {
      usersMap.get(row.id).motos.push({ marca_modelo: row.marca_modelo, cilindrada: row.cilindrada, tipo: row.moto_tipo });
    }
  }

  let result = Array.from(usersMap.values());

  if (tipo) {
    result = result.filter(u => u.motos.some((m: any) => m.tipo?.toLowerCase() === tipo.toLowerCase()));
  }
  if (cilMin !== null && !Number.isNaN(cilMin)) {
    result = result.filter(u => u.motos.some((m: any) => m.cilindrada >= cilMin));
  }
  if (cilMax !== null && !Number.isNaN(cilMax)) {
    result = result.filter(u => u.motos.some((m: any) => m.cilindrada <= cilMax));
  }
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(u =>
      u.username?.toLowerCase().includes(s) ||
      u.nombre?.toLowerCase().includes(s) ||
      u.apellidos?.toLowerCase().includes(s) ||
      u.zona?.toLowerCase().includes(s) ||
      u.motos.some((m: any) => m.marca_modelo?.toLowerCase().includes(s))
    );
  }

  res.json(result);
});

export default router;
