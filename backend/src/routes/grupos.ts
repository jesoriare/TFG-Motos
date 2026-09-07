import { Router } from 'express';
import { pool } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

function shapeGrupo(g: any) {
  return {
    id: g.id,
    nombre: g.nombre,
    descripcion: g.descripcion,
    privacidad: g.privacidad,
    lider_id: g.lider_id,
    ruta_id: g.ruta_id,
    activo: !!g.activo,
    created_at: g.created_at,
    ruta: g.ruta_nombre ? { id: g.ruta_id, nombre: g.ruta_nombre, region: g.ruta_region } : null,
  };
}

async function esMiembroOLider(grupoId: string | string[], userId: string) {
  const [grupos] = await pool.execute<any[]>('SELECT * FROM grupos WHERE id = ?', [grupoId]);
  const grupo = grupos[0];
  if (!grupo) return { grupo: null, esLider: false, esMiembro: false };
  if (grupo.lider_id === userId) return { grupo, esLider: true, esMiembro: true };
  const [miembros] = await pool.execute<any[]>(
    'SELECT 1 FROM miembros_grupo WHERE grupo_id = ? AND user_id = ?', [grupoId, userId]
  );
  return { grupo, esLider: false, esMiembro: !!miembros[0] };
}

// GET /grupos/mios — grupos donde soy líder o miembro
router.get('/mios', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const [rows] = await pool.execute<any[]>(`
    SELECT g.*, r.nombre AS ruta_nombre, r.region AS ruta_region,
           CASE WHEN g.lider_id = ? THEN 'lider' ELSE 'miembro' END AS rol
    FROM grupos g
    JOIN miembros_grupo mg ON mg.grupo_id = g.id AND mg.user_id = ?
    LEFT JOIN rutas r ON r.id = g.ruta_id
    WHERE g.activo = 1
    ORDER BY g.created_at DESC
  `, [userId, userId]);

  res.json(rows.map(r => ({ ...shapeGrupo(r), rol: r.rol })));
});

// GET /grupos/no-leidos — total de mensajes de grupo no leídos, sumados entre todos los grupos
router.get('/no-leidos', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const [rows] = await pool.execute<any[]>(`
    SELECT COUNT(*) AS count
    FROM miembros_grupo mg
    JOIN mensajes_grupo m ON m.grupo_id = mg.grupo_id AND m.created_at > mg.last_read_at AND m.emisor_id <> mg.user_id
    WHERE mg.user_id = ?
  `, [userId]);

  res.json({ count: Number(rows[0].count) });
});

// GET /grupos/invitaciones — invitaciones pendientes recibidas
router.get('/invitaciones', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const [rows] = await pool.execute<any[]>(`
    SELECT ig.id, ig.created_at,
           g.id AS grupo_id, g.nombre AS grupo_nombre,
           p.username AS emisor_username, p.nombre AS emisor_nombre, p.avatar_url AS emisor_avatar
    FROM invitaciones_grupo ig
    JOIN grupos g ON g.id = ig.grupo_id
    JOIN profiles p ON p.id = ig.emisor_id
    WHERE ig.receptor_id = ?
    ORDER BY ig.created_at DESC
  `, [userId]);

  res.json(rows.map(r => ({
    id: r.id, created_at: r.created_at,
    grupo: { id: r.grupo_id, nombre: r.grupo_nombre },
    emisor: { username: r.emisor_username, nombre: r.emisor_nombre, avatar_url: r.emisor_avatar },
  })));
});

// GET /grupos/publicos — buscar grupos públicos a los que aún no perteneces
router.get('/publicos', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  const [rows] = await pool.execute<any[]>(`
    SELECT g.*, r.nombre AS ruta_nombre, r.region AS ruta_region,
           p.username AS lider_username
    FROM grupos g
    LEFT JOIN rutas r ON r.id = g.ruta_id
    JOIN profiles p ON p.id = g.lider_id
    WHERE g.activo = 1 AND g.privacidad = 'publico'
      AND g.id NOT IN (SELECT grupo_id FROM miembros_grupo WHERE user_id = ?)
      AND (g.nombre LIKE ? OR g.descripcion LIKE ?)
    ORDER BY g.created_at DESC
    LIMIT 50
  `, [userId, `%${q}%`, `%${q}%`]);

  res.json(rows.map(r => ({ ...shapeGrupo(r), lider_username: r.lider_username })));
});

// POST /grupos/:id/unirse — unirse directamente a un grupo público
router.post('/:id/unirse', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const [grupos] = await pool.execute<any[]>('SELECT * FROM grupos WHERE id = ? AND activo = 1', [req.params.id]);
  const grupo = grupos[0];
  if (!grupo) { res.status(404).json({ error: 'Grupo no encontrado' }); return; }
  if (grupo.privacidad !== 'publico') { res.status(403).json({ error: 'Este grupo es privado, necesitas una invitación' }); return; }

  const [yaMiembro] = await pool.execute<any[]>(
    'SELECT 1 FROM miembros_grupo WHERE grupo_id = ? AND user_id = ?', [req.params.id, userId]
  );
  if (yaMiembro[0]) { res.status(409).json({ error: 'Ya eres miembro de este grupo' }); return; }

  await pool.execute('INSERT INTO miembros_grupo (grupo_id, user_id) VALUES (?, ?)', [req.params.id, userId]);
  res.status(201).json({ grupo_id: req.params.id });
});

// GET /grupos/:id — detalle con miembros
router.get('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { esMiembro, grupo } = await esMiembroOLider(req.params.id, userId);
  if (!grupo) { res.status(404).json({ error: 'Grupo no encontrado' }); return; }
  if (!esMiembro) { res.status(403).json({ error: 'No perteneces a este grupo' }); return; }

  const [rutaRows] = grupo.ruta_id
    ? await pool.execute<any[]>('SELECT nombre, region FROM rutas WHERE id = ?', [grupo.ruta_id])
    : [[]] as any;

  const [miembros] = await pool.execute<any[]>(`
    SELECT p.id, p.username, p.nombre, p.apellidos, p.avatar_url, p.verified, mg.joined_at
    FROM miembros_grupo mg JOIN profiles p ON p.id = mg.user_id
    WHERE mg.grupo_id = ?
    ORDER BY mg.joined_at ASC
  `, [req.params.id]);

  res.json({
    ...shapeGrupo({ ...grupo, ruta_nombre: rutaRows[0]?.nombre, ruta_region: rutaRows[0]?.region }),
    miembros: miembros.map(m => ({
      id: m.id, username: m.username, nombre: m.nombre, apellidos: m.apellidos,
      avatar_url: m.avatar_url, verified: !!m.verified, joined_at: m.joined_at,
    })),
  });
});

// POST /grupos — crear grupo
router.post('/', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { nombre, ruta_id, descripcion, privacidad } = req.body;

  if (!nombre || !String(nombre).trim()) { res.status(400).json({ error: 'El nombre es obligatorio' }); return; }
  if (privacidad && privacidad !== 'privado' && privacidad !== 'publico') {
    res.status(400).json({ error: 'Privacidad inválida' }); return;
  }

  let rutaIdFinal: string | null = null;
  if (ruta_id) {
    const [rutas] = await pool.execute<any[]>('SELECT id FROM rutas WHERE id = ? AND user_id = ?', [ruta_id, userId]);
    if (!rutas[0]) { res.status(400).json({ error: 'La ruta no existe o no te pertenece' }); return; }
    rutaIdFinal = ruta_id;
  }

  const id = uuidv4();
  await pool.execute(
    'INSERT INTO grupos (id, nombre, descripcion, privacidad, lider_id, ruta_id) VALUES (?, ?, ?, ?, ?, ?)',
    [id, nombre.trim(), descripcion?.trim() || null, privacidad === 'publico' ? 'publico' : 'privado', userId, rutaIdFinal]
  );
  await pool.execute('INSERT INTO miembros_grupo (grupo_id, user_id) VALUES (?, ?)', [id, userId]);

  const [rows] = await pool.execute<any[]>('SELECT * FROM grupos WHERE id = ?', [id]);
  res.status(201).json(shapeGrupo(rows[0]));
});

// PUT /grupos/:id — editar (solo líder)
router.put('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { nombre, ruta_id, descripcion, privacidad } = req.body;

  const [check] = await pool.execute<any[]>('SELECT id FROM grupos WHERE id = ? AND lider_id = ?', [req.params.id, userId]);
  if (!check[0]) { res.status(404).json({ error: 'Grupo no encontrado o sin permiso' }); return; }
  if (privacidad && privacidad !== 'privado' && privacidad !== 'publico') {
    res.status(400).json({ error: 'Privacidad inválida' }); return;
  }

  let rutaIdFinal: string | null = null;
  if (ruta_id) {
    const [rutas] = await pool.execute<any[]>('SELECT id FROM rutas WHERE id = ? AND user_id = ?', [ruta_id, userId]);
    if (!rutas[0]) { res.status(400).json({ error: 'La ruta no existe o no te pertenece' }); return; }
    rutaIdFinal = ruta_id;
  }

  await pool.execute(
    'UPDATE grupos SET nombre = ?, descripcion = ?, privacidad = ?, ruta_id = ? WHERE id = ?',
    [nombre?.trim(), descripcion?.trim() || null, privacidad === 'publico' ? 'publico' : 'privado', rutaIdFinal, req.params.id]
  );
  const [rows] = await pool.execute<any[]>('SELECT * FROM grupos WHERE id = ?', [req.params.id]);
  res.json(shapeGrupo(rows[0]));
});

// DELETE /grupos/:id — eliminar (solo líder, cascada)
router.delete('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const [result]: any = await pool.execute('DELETE FROM grupos WHERE id = ? AND lider_id = ?', [req.params.id, userId]);
  if (result.affectedRows === 0) { res.status(404).json({ error: 'Grupo no encontrado o sin permiso' }); return; }
  res.status(204).send();
});

// POST /grupos/:id/salir — un miembro (no líder) abandona el grupo
router.post('/:id/salir', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { grupo, esMiembro } = await esMiembroOLider(req.params.id, userId);
  if (!grupo) { res.status(404).json({ error: 'Grupo no encontrado' }); return; }
  if (!esMiembro) { res.status(403).json({ error: 'No perteneces a este grupo' }); return; }
  if (grupo.lider_id === userId) { res.status(400).json({ error: 'El líder no puede salir del grupo, debe eliminarlo' }); return; }

  await pool.execute('DELETE FROM miembros_grupo WHERE grupo_id = ? AND user_id = ?', [req.params.id, userId]);
  res.status(204).send();
});

// DELETE /grupos/:id/miembros/:userId — expulsar (solo líder)
router.delete('/:id/miembros/:userId', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { grupo } = await esMiembroOLider(req.params.id, userId);
  if (!grupo) { res.status(404).json({ error: 'Grupo no encontrado' }); return; }
  if (grupo.lider_id !== userId) { res.status(403).json({ error: 'Solo el líder puede expulsar miembros' }); return; }
  if (req.params.userId === userId) { res.status(400).json({ error: 'No puedes expulsarte a ti mismo' }); return; }

  await pool.execute('DELETE FROM miembros_grupo WHERE grupo_id = ? AND user_id = ?', [req.params.id, req.params.userId]);
  res.status(204).send();
});

// POST /grupos/:id/invitar/:username — invitar a un amigo (solo líder)
router.post('/:id/invitar/:username', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { grupo } = await esMiembroOLider(req.params.id, userId);
  if (!grupo) { res.status(404).json({ error: 'Grupo no encontrado' }); return; }
  if (grupo.lider_id !== userId) { res.status(403).json({ error: 'Solo el líder puede invitar' }); return; }

  const [targets] = await pool.execute<any[]>('SELECT id FROM profiles WHERE username = ?', [req.params.username]);
  if (!targets[0]) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
  const targetId = targets[0].id;

  const [amistad] = await pool.execute<any[]>(`
    SELECT id FROM solicitudes_amistad
    WHERE estado = 'aceptada' AND ((emisor_id = ? AND receptor_id = ?) OR (emisor_id = ? AND receptor_id = ?))
  `, [userId, targetId, targetId, userId]);
  if (!amistad[0]) { res.status(403).json({ error: 'Solo puedes invitar a amigos' }); return; }

  const [yaMiembro] = await pool.execute<any[]>(
    'SELECT 1 FROM miembros_grupo WHERE grupo_id = ? AND user_id = ?', [req.params.id, targetId]
  );
  if (yaMiembro[0]) { res.status(409).json({ error: 'Ya es miembro del grupo' }); return; }

  const [existente] = await pool.execute<any[]>(
    'SELECT id FROM invitaciones_grupo WHERE grupo_id = ? AND receptor_id = ?', [req.params.id, targetId]
  );
  if (existente[0]) { res.status(409).json({ error: 'Ya existe una invitación pendiente para este usuario' }); return; }

  const id = uuidv4();
  await pool.execute(
    'INSERT INTO invitaciones_grupo (id, grupo_id, emisor_id, receptor_id) VALUES (?, ?, ?, ?)',
    [id, req.params.id, userId, targetId]
  );
  res.status(201).json({ id });
});

// POST /grupos/invitaciones/:id/aceptar
router.post('/invitaciones/:id/aceptar', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const [rows] = await pool.execute<any[]>(
    'SELECT * FROM invitaciones_grupo WHERE id = ? AND receptor_id = ?', [req.params.id, userId]
  );
  const invitacion = rows[0];
  if (!invitacion) { res.status(404).json({ error: 'Invitación no encontrada' }); return; }

  await pool.execute(
    'INSERT IGNORE INTO miembros_grupo (grupo_id, user_id) VALUES (?, ?)', [invitacion.grupo_id, userId]
  );
  await pool.execute('DELETE FROM invitaciones_grupo WHERE id = ?', [req.params.id]);
  res.json({ grupo_id: invitacion.grupo_id });
});

// POST /grupos/invitaciones/:id/rechazar
router.post('/invitaciones/:id/rechazar', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const [result]: any = await pool.execute(
    'DELETE FROM invitaciones_grupo WHERE id = ? AND receptor_id = ?', [req.params.id, userId]
  );
  if (result.affectedRows === 0) { res.status(404).json({ error: 'Invitación no encontrada' }); return; }
  res.status(204).send();
});

// DELETE /grupos/invitaciones/:id — cancelar invitación enviada (solo el líder que la envió)
router.delete('/invitaciones/:id', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const [result]: any = await pool.execute(
    'DELETE FROM invitaciones_grupo WHERE id = ? AND emisor_id = ?', [req.params.id, userId]
  );
  if (result.affectedRows === 0) { res.status(404).json({ error: 'Invitación no encontrada' }); return; }
  res.status(204).send();
});

// GET /grupos/:id/mensajes — historial del chat de grupo
router.get('/:id/mensajes', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { grupo, esMiembro } = await esMiembroOLider(req.params.id, userId);
  if (!grupo) { res.status(404).json({ error: 'Grupo no encontrado' }); return; }
  if (!esMiembro) { res.status(403).json({ error: 'No perteneces a este grupo' }); return; }

  const [rows] = await pool.execute<any[]>(`
    SELECT m.id, m.grupo_id, m.emisor_id, m.contenido, m.created_at,
           p.username AS emisor_username, p.nombre AS emisor_nombre, p.apellidos AS emisor_apellidos, p.avatar_url AS emisor_avatar
    FROM mensajes_grupo m
    JOIN profiles p ON p.id = m.emisor_id
    WHERE m.grupo_id = ?
    ORDER BY m.created_at ASC
  `, [req.params.id]);

  await pool.execute(
    'UPDATE miembros_grupo SET last_read_at = NOW() WHERE grupo_id = ? AND user_id = ?',
    [req.params.id, userId]
  );

  res.json(rows.map(r => ({
    id: r.id, grupo_id: r.grupo_id, emisor_id: r.emisor_id, contenido: r.contenido, created_at: r.created_at,
    emisor: { username: r.emisor_username, nombre: r.emisor_nombre, apellidos: r.emisor_apellidos, avatar_url: r.emisor_avatar },
  })));
});

// POST /grupos/:id/mensajes — enviar mensaje al chat de grupo
router.post('/:id/mensajes', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { grupo, esMiembro } = await esMiembroOLider(req.params.id, userId);
  if (!grupo) { res.status(404).json({ error: 'Grupo no encontrado' }); return; }
  if (!esMiembro) { res.status(403).json({ error: 'No perteneces a este grupo' }); return; }

  const contenido = typeof req.body?.contenido === 'string' ? req.body.contenido.trim() : '';
  if (!contenido) { res.status(400).json({ error: 'El mensaje no puede estar vacío' }); return; }

  const id = uuidv4();
  await pool.execute('INSERT INTO mensajes_grupo (id, grupo_id, emisor_id, contenido) VALUES (?, ?, ?, ?)', [id, req.params.id, userId, contenido]);

  const [rows] = await pool.execute<any[]>(`
    SELECT m.id, m.grupo_id, m.emisor_id, m.contenido, m.created_at,
           p.username AS emisor_username, p.nombre AS emisor_nombre, p.apellidos AS emisor_apellidos, p.avatar_url AS emisor_avatar
    FROM mensajes_grupo m
    JOIN profiles p ON p.id = m.emisor_id
    WHERE m.id = ?
  `, [id]);
  const r = rows[0];
  res.status(201).json({
    id: r.id, grupo_id: r.grupo_id, emisor_id: r.emisor_id, contenido: r.contenido, created_at: r.created_at,
    emisor: { username: r.emisor_username, nombre: r.emisor_nombre, apellidos: r.emisor_apellidos, avatar_url: r.emisor_avatar },
  });
});

export default router;
