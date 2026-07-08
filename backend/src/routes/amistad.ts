import { Router } from 'express';
import { pool } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /amistad/solicitudes — solicitudes pendientes recibidas
router.get('/solicitudes', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const [rows] = await pool.execute<any[]>(`
    SELECT sa.id, sa.created_at,
           p.username, p.nombre, p.apellidos, p.avatar_url, p.verified
    FROM solicitudes_amistad sa
    JOIN profiles p ON p.id = sa.emisor_id
    WHERE sa.receptor_id = ? AND sa.estado = 'pendiente'
    ORDER BY sa.created_at DESC
  `, [userId]);

  res.json(rows.map(r => ({
    id: r.id, created_at: r.created_at,
    profiles: { username: r.username, nombre: r.nombre, apellidos: r.apellidos, avatar_url: r.avatar_url, verified: !!r.verified },
  })));
});

// GET /amistad/estado/:username
router.get('/estado/:username', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const [others] = await pool.execute<any[]>('SELECT id FROM profiles WHERE username = ?', [req.params.username]);
  if (!others[0]) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
  const otherId = others[0].id;

  if (otherId === userId) { res.json({ estado: 'propio' }); return; }

  const [rows] = await pool.execute<any[]>(`
    SELECT id, emisor_id, receptor_id, estado FROM solicitudes_amistad
    WHERE (emisor_id = ? AND receptor_id = ?) OR (emisor_id = ? AND receptor_id = ?)
    ORDER BY updated_at DESC LIMIT 1
  `, [userId, otherId, otherId, userId]);

  const data = rows[0] ?? null;
  if (!data || data.estado === 'rechazada') { res.json({ estado: 'ninguno' }); return; }
  if (data.estado === 'aceptada')           { res.json({ estado: 'amigos', id: data.id }); return; }
  if (data.emisor_id === userId)            { res.json({ estado: 'pendiente_enviada', id: data.id }); return; }
  res.json({ estado: 'pendiente_recibida', id: data.id });
});

// GET /amistad/amigos/:username/count
router.get('/amigos/:username/count', async (req, res) => {
  const [targets] = await pool.execute<any[]>('SELECT id FROM profiles WHERE username = ?', [req.params.username]);
  if (!targets[0]) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
  const targetId = targets[0].id;

  const [rows] = await pool.execute<any[]>(
    "SELECT COUNT(*) AS count FROM solicitudes_amistad WHERE estado = 'aceptada' AND (emisor_id = ? OR receptor_id = ?)",
    [targetId, targetId]
  );
  res.json({ count: Number(rows[0].count) });
});

// GET /amistad/amigos/:username
router.get('/amigos/:username', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const [targets] = await pool.execute<any[]>('SELECT id FROM profiles WHERE username = ?', [req.params.username]);
  if (!targets[0]) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
  const targetId = targets[0].id;

  if (targetId !== userId) {
    const [amistad] = await pool.execute<any[]>(`
      SELECT id FROM solicitudes_amistad
      WHERE estado = 'aceptada'
        AND ((emisor_id = ? AND receptor_id = ?) OR (emisor_id = ? AND receptor_id = ?))
    `, [userId, targetId, targetId, userId]);
    if (!amistad[0]) { res.status(403).json({ error: 'No eres amigo de este usuario' }); return; }
  }

  const [rows] = await pool.execute<any[]>(`
    SELECT sa.emisor_id, sa.receptor_id,
           pe.id AS e_id, pe.username AS e_un, pe.nombre AS e_nom, pe.apellidos AS e_ap, pe.avatar_url AS e_av, pe.verified AS e_ver, pe.online AS e_on,
           pr.id AS r_id, pr.username AS r_un, pr.nombre AS r_nom, pr.apellidos AS r_ap, pr.avatar_url AS r_av, pr.verified AS r_ver, pr.online AS r_on
    FROM solicitudes_amistad sa
    JOIN profiles pe ON pe.id = sa.emisor_id
    JOIN profiles pr ON pr.id = sa.receptor_id
    WHERE sa.estado = 'aceptada' AND (sa.emisor_id = ? OR sa.receptor_id = ?)
  `, [targetId, targetId]);

  const amigos = rows.map(r =>
    r.emisor_id === targetId
      ? { id: r.r_id, username: r.r_un, nombre: r.r_nom, apellidos: r.r_ap, avatar_url: r.r_av, verified: !!r.r_ver, online: !!r.r_on }
      : { id: r.e_id, username: r.e_un, nombre: r.e_nom, apellidos: r.e_ap, avatar_url: r.e_av, verified: !!r.e_ver, online: !!r.e_on }
  );

  res.json(amigos);
});

// POST /amistad/:username — enviar solicitud
router.post('/:username', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const [others] = await pool.execute<any[]>('SELECT id FROM profiles WHERE username = ?', [req.params.username]);
  if (!others[0]) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
  const otherId = others[0].id;
  if (otherId === userId) { res.status(400).json({ error: 'No puedes enviarte una solicitud a ti mismo' }); return; }

  const [rows] = await pool.execute<any[]>(`
    SELECT id, emisor_id, receptor_id, estado FROM solicitudes_amistad
    WHERE (emisor_id = ? AND receptor_id = ?) OR (emisor_id = ? AND receptor_id = ?)
    ORDER BY updated_at DESC
  `, [userId, otherId, otherId, userId]);

  const [existing, ...duplicados] = rows;

  if (duplicados.length > 0) {
    const ids = duplicados.map(d => d.id);
    await pool.execute(`DELETE FROM solicitudes_amistad WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
  }

  if (!existing) {
    const id = uuidv4();
    await pool.execute('INSERT INTO solicitudes_amistad (id, emisor_id, receptor_id) VALUES (?, ?, ?)', [id, userId, otherId]);
    const [r] = await pool.execute<any[]>('SELECT * FROM solicitudes_amistad WHERE id = ?', [id]);
    res.status(201).json(r[0]);
    return;
  }

  if (existing.estado === 'aceptada') { res.status(409).json({ error: 'Ya sois amigos' }); return; }

  if (existing.estado === 'pendiente') {
    if (existing.emisor_id === userId) { res.status(409).json({ error: 'Ya existe una solicitud con este usuario' }); return; }
    await pool.execute("UPDATE solicitudes_amistad SET estado = 'aceptada', updated_at = NOW() WHERE id = ?", [existing.id]);
    const [r] = await pool.execute<any[]>('SELECT * FROM solicitudes_amistad WHERE id = ?', [existing.id]);
    res.json(r[0]);
    return;
  }

  await pool.execute(
    "UPDATE solicitudes_amistad SET emisor_id = ?, receptor_id = ?, estado = 'pendiente', updated_at = NOW() WHERE id = ?",
    [userId, otherId, existing.id]
  );
  const [r] = await pool.execute<any[]>('SELECT * FROM solicitudes_amistad WHERE id = ?', [existing.id]);
  res.status(201).json(r[0]);
});

// POST /amistad/:id/aceptar
router.post('/:id/aceptar', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  await pool.execute(
    "UPDATE solicitudes_amistad SET estado = 'aceptada', updated_at = NOW() WHERE id = ? AND receptor_id = ?",
    [req.params.id, userId]
  );
  const [rows] = await pool.execute<any[]>('SELECT * FROM solicitudes_amistad WHERE id = ?', [req.params.id]);
  if (!rows[0]) { res.status(400).json({ error: 'Solicitud no encontrada' }); return; }
  res.json(rows[0]);
});

// POST /amistad/:id/rechazar
router.post('/:id/rechazar', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  await pool.execute(
    "UPDATE solicitudes_amistad SET estado = 'rechazada', updated_at = NOW() WHERE id = ? AND receptor_id = ?",
    [req.params.id, userId]
  );
  const [rows] = await pool.execute<any[]>('SELECT * FROM solicitudes_amistad WHERE id = ?', [req.params.id]);
  if (!rows[0]) { res.status(400).json({ error: 'Solicitud no encontrada' }); return; }
  res.json(rows[0]);
});

// DELETE /amistad/:id — cancelar o eliminar amistad
router.delete('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  await pool.execute(
    'DELETE FROM solicitudes_amistad WHERE id = ? AND (emisor_id = ? OR receptor_id = ?)',
    [req.params.id, userId, userId]
  );
  res.status(204).send();
});

export default router;
