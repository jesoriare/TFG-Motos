import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Comprueba si dos usuarios son amigos (solicitud aceptada en cualquier sentido)
async function isFriend(userId: string, otherId: string): Promise<boolean> {
  const { data } = await supabase
    .from('solicitudes_amistad')
    .select('id')
    .eq('estado', 'aceptada')
    .or(`and(emisor_id.eq.${userId},receptor_id.eq.${otherId}),and(emisor_id.eq.${otherId},receptor_id.eq.${userId})`)
    .maybeSingle();
  return !!data;
}

// Ordena el par de ids para cumplir la constraint usuario1_id < usuario2_id
function ordenarPar(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// Envía una notificación push al destinatario si tiene token y no tiene el chat abierto
async function enviarPushSiCorresponde(destinatarioId: string, conversacionId: string, emisorId: string, contenido: string) {
  const { data: destinatario } = await supabase
    .from('profiles')
    .select('push_token, chat_abierto_id')
    .eq('id', destinatarioId)
    .single();

  if (!destinatario?.push_token) return;
  if (destinatario.chat_abierto_id === conversacionId) return;

  const { data: emisor } = await supabase
    .from('profiles')
    .select('nombre, apellidos')
    .eq('id', emisorId)
    .single();

  const titulo = emisor ? `${emisor.nombre} ${emisor.apellidos}` : 'Nuevo mensaje';
  const cuerpo = contenido.length > 100 ? `${contenido.slice(0, 97)}...` : contenido;

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      to: destinatario.push_token,
      title: titulo,
      body: cuerpo,
      data: { conversacionId },
    }),
  });
}

// GET /chat — listado de conversaciones del usuario, ordenadas por mensaje más reciente
router.get('/', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const { data: ocultas } = await supabase
    .from('conversaciones_ocultas')
    .select('conversacion_id')
    .eq('usuario_id', userId);

  const ocultasIds = (ocultas ?? []).map(o => o.conversacion_id);

  let query = supabase
    .from('conversaciones')
    .select(`
      id, ultimo_mensaje_at, usuario1_id, usuario2_id,
      usuario1:profiles!conversaciones_usuario1_id_fkey (id, username, nombre, apellidos, avatar_url, online),
      usuario2:profiles!conversaciones_usuario2_id_fkey (id, username, nombre, apellidos, avatar_url, online)
    `)
    .or(`usuario1_id.eq.${userId},usuario2_id.eq.${userId}`)
    .order('ultimo_mensaje_at', { ascending: false });

  if (ocultasIds.length > 0) {
    query = query.not('id', 'in', `(${ocultasIds.join(',')})`);
  }

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }

  const conversaciones = await Promise.all((data ?? []).map(async (c: any) => {
    const otro = c.usuario1_id === userId ? c.usuario2 : c.usuario1;

    const { data: ultimoMensaje } = await supabase
      .from('mensajes')
      .select('contenido, created_at, emisor_id')
      .eq('conversacion_id', c.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { count: noLeidos } = await supabase
      .from('mensajes')
      .select('id', { count: 'exact', head: true })
      .eq('conversacion_id', c.id)
      .eq('leido', false)
      .neq('emisor_id', userId);

    return {
      id: c.id,
      usuario: otro,
      ultimo_mensaje: ultimoMensaje ?? null,
      no_leidos: noLeidos ?? 0,
      ultimo_mensaje_at: c.ultimo_mensaje_at,
    };
  }));

  res.json(conversaciones);
});

// GET /chat/no-leidos — total de mensajes no leídos del usuario
router.get('/no-leidos', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const [{ data: ocultas }, { data: conversaciones }] = await Promise.all([
    supabase.from('conversaciones_ocultas').select('conversacion_id').eq('usuario_id', userId),
    supabase.from('conversaciones').select('id').or(`usuario1_id.eq.${userId},usuario2_id.eq.${userId}`),
  ]);

  const ocultasIds = new Set((ocultas ?? []).map(o => o.conversacion_id));
  const ids = (conversaciones ?? []).map(c => c.id).filter(id => !ocultasIds.has(id));

  if (ids.length === 0) { res.json({ count: 0 }); return; }

  const { count, error } = await supabase
    .from('mensajes')
    .select('id', { count: 'exact', head: true })
    .in('conversacion_id', ids)
    .eq('leido', false)
    .neq('emisor_id', userId);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ count: count ?? 0 });
});

// GET /chat/:id/mensajes — mensajes de una conversación (marca como leídos los del otro usuario)
router.get('/:id/mensajes', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const conversacionId = req.params.id;

  const { data: conv, error: convError } = await supabase
    .from('conversaciones')
    .select('id, usuario1_id, usuario2_id')
    .eq('id', conversacionId)
    .maybeSingle();

  if (convError || !conv) { res.status(404).json({ error: 'Conversación no encontrada' }); return; }
  if (conv.usuario1_id !== userId && conv.usuario2_id !== userId) { res.status(403).json({ error: 'No tienes acceso a esta conversación' }); return; }

  const { data, error } = await supabase
    .from('mensajes')
    .select('id, conversacion_id, emisor_id, contenido, created_at, leido')
    .eq('conversacion_id', conversacionId)
    .order('created_at', { ascending: true });

  if (error) { res.status(500).json({ error: error.message }); return; }

  await supabase
    .from('mensajes')
    .update({ leido: true })
    .eq('conversacion_id', conversacionId)
    .eq('leido', false)
    .neq('emisor_id', userId);

  res.json(data);
});

// POST /chat/:username — crear o redirigir a la conversación con un amigo
router.post('/:username', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const { data: other, error: otherError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', req.params.username)
    .single();

  if (otherError || !other) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
  if (other.id === userId) { res.status(400).json({ error: 'No puedes abrir un chat contigo mismo' }); return; }

  if (!(await isFriend(userId, other.id))) {
    res.status(403).json({ error: 'Solo puedes chatear con tus amigos' });
    return;
  }

  const [usuario1_id, usuario2_id] = ordenarPar(userId, other.id);

  const { data: existing } = await supabase
    .from('conversaciones')
    .select('id')
    .eq('usuario1_id', usuario1_id)
    .eq('usuario2_id', usuario2_id)
    .maybeSingle();

  let conversacionId = existing?.id as string | undefined;

  if (!conversacionId) {
    const { data, error } = await supabase
      .from('conversaciones')
      .insert({ usuario1_id, usuario2_id })
      .select('id')
      .single();

    if (error) { res.status(400).json({ error: error.message }); return; }
    conversacionId = data.id;
  }

  await supabase
    .from('conversaciones_ocultas')
    .delete()
    .eq('conversacion_id', conversacionId)
    .eq('usuario_id', userId);

  res.json({ id: conversacionId });
});

// POST /chat/:id/mensajes — enviar un mensaje
router.post('/:id/mensajes', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const conversacionId = req.params.id as string;
  const contenido = typeof req.body?.contenido === 'string' ? req.body.contenido.trim() : '';

  if (!contenido) { res.status(400).json({ error: 'El mensaje no puede estar vacío' }); return; }

  const { data: conv, error: convError } = await supabase
    .from('conversaciones')
    .select('id, usuario1_id, usuario2_id')
    .eq('id', conversacionId)
    .maybeSingle();

  if (convError || !conv) { res.status(404).json({ error: 'Conversación no encontrada' }); return; }
  if (conv.usuario1_id !== userId && conv.usuario2_id !== userId) { res.status(403).json({ error: 'No tienes acceso a esta conversación' }); return; }

  const { data: mensaje, error } = await supabase
    .from('mensajes')
    .insert({ conversacion_id: conversacionId, emisor_id: userId, contenido })
    .select('id, conversacion_id, emisor_id, contenido, created_at, leido')
    .single();

  if (error) { res.status(400).json({ error: error.message }); return; }

  res.status(201).json(mensaje);

  const destinatarioId = conv.usuario1_id === userId ? conv.usuario2_id : conv.usuario1_id;
  enviarPushSiCorresponde(destinatarioId, conversacionId, userId, contenido).catch(() => {});
});

// PATCH /chat/abierto — marca/desmarca la conversación que el usuario tiene abierta
router.patch('/abierto', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const conversacionId = req.body?.conversacionId as string | null | undefined;

  if (conversacionId) {
    const { data: conv, error: convError } = await supabase
      .from('conversaciones')
      .select('id, usuario1_id, usuario2_id')
      .eq('id', conversacionId)
      .maybeSingle();

    if (convError || !conv) { res.status(404).json({ error: 'Conversación no encontrada' }); return; }
    if (conv.usuario1_id !== userId && conv.usuario2_id !== userId) { res.status(403).json({ error: 'No tienes acceso a esta conversación' }); return; }

    const { error } = await supabase.from('profiles').update({ chat_abierto_id: conversacionId }).eq('id', userId);
    if (error) { res.status(400).json({ error: error.message }); return; }
    res.json({ ok: true });
    return;
  }

  const { error } = await supabase.from('profiles').update({ chat_abierto_id: null }).eq('id', userId);
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json({ ok: true });
});

// DELETE /chat/:id — ocultar la conversación solo para el usuario autenticado
router.delete('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const conversacionId = req.params.id;

  const { data: conv, error: convError } = await supabase
    .from('conversaciones')
    .select('id, usuario1_id, usuario2_id')
    .eq('id', conversacionId)
    .maybeSingle();

  if (convError || !conv) { res.status(404).json({ error: 'Conversación no encontrada' }); return; }
  if (conv.usuario1_id !== userId && conv.usuario2_id !== userId) { res.status(403).json({ error: 'No tienes acceso a esta conversación' }); return; }

  const { error } = await supabase
    .from('conversaciones_ocultas')
    .upsert({ conversacion_id: conversacionId, usuario_id: userId });

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(204).send();
});

export default router;
