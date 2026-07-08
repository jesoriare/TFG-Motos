import { Router } from 'express';
import { pool } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

async function isFriend(userId: string, otherId: string): Promise<boolean> {
  const [rows] = await pool.execute<any[]>(`
    SELECT id FROM solicitudes_amistad
    WHERE estado = 'aceptada'
      AND ((emisor_id = ? AND receptor_id = ?) OR (emisor_id = ? AND receptor_id = ?))
  `, [userId, otherId, otherId, userId]);
  return rows.length > 0;
}

function ordenarPar(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function enviarPushSiCorresponde(destinatarioId: string, conversacionId: string, emisorId: string, contenido: string) {
  const [dest] = await pool.execute<any[]>('SELECT push_token, chat_abierto_id FROM profiles WHERE id = ?', [destinatarioId]);
  const d = dest[0];
  if (!d?.push_token || d.chat_abierto_id === conversacionId) return;

  const [emis] = await pool.execute<any[]>('SELECT nombre, apellidos FROM profiles WHERE id = ?', [emisorId]);
  const e = emis[0];
  const titulo = e ? `${e.nombre} ${e.apellidos}` : 'Nuevo mensaje';
  const cuerpo = contenido.length > 100 ? `${contenido.slice(0, 97)}...` : contenido;

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ to: d.push_token, title: titulo, body: cuerpo, data: { conversacionId } }),
  });
}

// GET /chat — listado de conversaciones
router.get('/', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const [ocultas] = await pool.execute<any[]>(
    'SELECT conversacion_id FROM conversaciones_ocultas WHERE usuario_id = ?', [userId]
  );
  const ocultasIds = ocultas.map(o => o.conversacion_id);

  let sql = `
    SELECT c.id, c.ultimo_mensaje_at, c.usuario1_id, c.usuario2_id,
           p1.id AS u1_id, p1.username AS u1_un, p1.nombre AS u1_nom, p1.apellidos AS u1_ap, p1.avatar_url AS u1_av, p1.online AS u1_on,
           p2.id AS u2_id, p2.username AS u2_un, p2.nombre AS u2_nom, p2.apellidos AS u2_ap, p2.avatar_url AS u2_av, p2.online AS u2_on
    FROM conversaciones c
    JOIN profiles p1 ON p1.id = c.usuario1_id
    JOIN profiles p2 ON p2.id = c.usuario2_id
    WHERE (c.usuario1_id = ? OR c.usuario2_id = ?)
  `;
  const params: any[] = [userId, userId];

  if (ocultasIds.length > 0) {
    sql += ` AND c.id NOT IN (${ocultasIds.map(() => '?').join(',')})`;
    params.push(...ocultasIds);
  }
  sql += ' ORDER BY c.ultimo_mensaje_at DESC';

  const [convRows] = await pool.execute<any[]>(sql, params);

  const conversaciones = await Promise.all(convRows.map(async (c) => {
    const otro = c.usuario1_id === userId
      ? { id: c.u2_id, username: c.u2_un, nombre: c.u2_nom, apellidos: c.u2_ap, avatar_url: c.u2_av, online: !!c.u2_on }
      : { id: c.u1_id, username: c.u1_un, nombre: c.u1_nom, apellidos: c.u1_ap, avatar_url: c.u1_av, online: !!c.u1_on };

    const [ult] = await pool.execute<any[]>(
      'SELECT contenido, created_at, emisor_id FROM mensajes WHERE conversacion_id = ? ORDER BY created_at DESC LIMIT 1',
      [c.id]
    );
    const [nl] = await pool.execute<any[]>(
      'SELECT COUNT(*) AS count FROM mensajes WHERE conversacion_id = ? AND leido = 0 AND emisor_id <> ?',
      [c.id, userId]
    );

    return { id: c.id, usuario: otro, ultimo_mensaje: ult[0] ?? null, no_leidos: Number(nl[0].count), ultimo_mensaje_at: c.ultimo_mensaje_at };
  }));

  res.json(conversaciones);
});

// GET /chat/no-leidos
router.get('/no-leidos', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const [ocultas] = await pool.execute<any[]>('SELECT conversacion_id FROM conversaciones_ocultas WHERE usuario_id = ?', [userId]);
  const ocultasIds = new Set(ocultas.map(o => o.conversacion_id));

  const [convs] = await pool.execute<any[]>('SELECT id FROM conversaciones WHERE usuario1_id = ? OR usuario2_id = ?', [userId, userId]);
  const ids = convs.map(c => c.id).filter(id => !ocultasIds.has(id));

  if (ids.length === 0) { res.json({ count: 0 }); return; }

  const [rows] = await pool.execute<any[]>(
    `SELECT COUNT(*) AS count FROM mensajes WHERE conversacion_id IN (${ids.map(() => '?').join(',')}) AND leido = 0 AND emisor_id <> ?`,
    [...ids, userId]
  );
  res.json({ count: Number(rows[0].count) });
});

// GET /chat/:id/mensajes
router.get('/:id/mensajes', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const conversacionId = req.params.id;

  const [convs] = await pool.execute<any[]>('SELECT id, usuario1_id, usuario2_id FROM conversaciones WHERE id = ?', [conversacionId]);
  const conv = convs[0];
  if (!conv) { res.status(404).json({ error: 'Conversación no encontrada' }); return; }
  if (conv.usuario1_id !== userId && conv.usuario2_id !== userId) { res.status(403).json({ error: 'Sin acceso' }); return; }

  const [data] = await pool.execute<any[]>(
    'SELECT id, conversacion_id, emisor_id, contenido, created_at, leido FROM mensajes WHERE conversacion_id = ? ORDER BY created_at ASC',
    [conversacionId]
  );

  await pool.execute(
    'UPDATE mensajes SET leido = 1 WHERE conversacion_id = ? AND leido = 0 AND emisor_id <> ?',
    [conversacionId, userId]
  );

  res.json(data);
});

// POST /chat/:username — crear o redirigir a conversación con un amigo
router.post('/:username', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const [others] = await pool.execute<any[]>('SELECT id FROM profiles WHERE username = ?', [req.params.username]);
  if (!others[0]) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
  const otherId = others[0].id;
  if (otherId === userId) { res.status(400).json({ error: 'No puedes abrir un chat contigo mismo' }); return; }

  if (!(await isFriend(userId, otherId))) {
    res.status(403).json({ error: 'Solo puedes chatear con tus amigos' });
    return;
  }

  const [u1, u2] = ordenarPar(userId, otherId);

  const [existing] = await pool.execute<any[]>('SELECT id FROM conversaciones WHERE usuario1_id = ? AND usuario2_id = ?', [u1, u2]);
  let conversacionId = existing[0]?.id as string | undefined;

  if (!conversacionId) {
    conversacionId = uuidv4();
    await pool.execute('INSERT INTO conversaciones (id, usuario1_id, usuario2_id) VALUES (?, ?, ?)', [conversacionId, u1, u2]);
  }

  await pool.execute('DELETE FROM conversaciones_ocultas WHERE conversacion_id = ? AND usuario_id = ?', [conversacionId, userId]);
  res.json({ id: conversacionId });
});

// POST /chat/:id/mensajes — enviar mensaje
router.post('/:id/mensajes', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const conversacionId = req.params.id;
  const contenido = typeof req.body?.contenido === 'string' ? req.body.contenido.trim() : '';
  if (!contenido) { res.status(400).json({ error: 'El mensaje no puede estar vacío' }); return; }

  const [convs] = await pool.execute<any[]>('SELECT id, usuario1_id, usuario2_id FROM conversaciones WHERE id = ?', [conversacionId]);
  const conv = convs[0];
  if (!conv) { res.status(404).json({ error: 'Conversación no encontrada' }); return; }
  if (conv.usuario1_id !== userId && conv.usuario2_id !== userId) { res.status(403).json({ error: 'Sin acceso' }); return; }

  const mensajeId = uuidv4();
  await pool.execute('INSERT INTO mensajes (id, conversacion_id, emisor_id, contenido) VALUES (?, ?, ?, ?)', [mensajeId, conversacionId, userId, contenido]);

  const [rows] = await pool.execute<any[]>(
    'SELECT id, conversacion_id, emisor_id, contenido, created_at, leido FROM mensajes WHERE id = ?', [mensajeId]
  );

  res.status(201).json(rows[0]);

  const destinatarioId = conv.usuario1_id === userId ? conv.usuario2_id : conv.usuario1_id;
  enviarPushSiCorresponde(destinatarioId, conversacionId, userId, contenido).catch(() => {});
});

// PATCH /chat/abierto — marcar conversación activa (para no recibir push)
router.patch('/abierto', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const conversacionId = req.body?.conversacionId as string | null | undefined;

  if (conversacionId) {
    const [convs] = await pool.execute<any[]>('SELECT id, usuario1_id, usuario2_id FROM conversaciones WHERE id = ?', [conversacionId]);
    const conv = convs[0];
    if (!conv) { res.status(404).json({ error: 'Conversación no encontrada' }); return; }
    if (conv.usuario1_id !== userId && conv.usuario2_id !== userId) { res.status(403).json({ error: 'Sin acceso' }); return; }
    await pool.execute('UPDATE profiles SET chat_abierto_id = ? WHERE id = ?', [conversacionId, userId]);
  } else {
    await pool.execute('UPDATE profiles SET chat_abierto_id = NULL WHERE id = ?', [userId]);
  }
  res.json({ ok: true });
});

// DELETE /chat/:id — ocultar conversación
router.delete('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const conversacionId = req.params.id;

  const [convs] = await pool.execute<any[]>('SELECT id, usuario1_id, usuario2_id FROM conversaciones WHERE id = ?', [conversacionId]);
  const conv = convs[0];
  if (!conv) { res.status(404).json({ error: 'Conversación no encontrada' }); return; }
  if (conv.usuario1_id !== userId && conv.usuario2_id !== userId) { res.status(403).json({ error: 'Sin acceso' }); return; }

  await pool.execute(
    'INSERT INTO conversaciones_ocultas (conversacion_id, usuario_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE ocultada_at = NOW()',
    [conversacionId, userId]
  );
  res.status(204).send();
});

export default router;
