import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /amistad/solicitudes — solicitudes pendientes recibidas
router.get('/solicitudes', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const { data, error } = await supabase
    .from('solicitudes_amistad')
    .select(`
      id, created_at,
      profiles!solicitudes_amistad_emisor_id_fkey (username, nombre, apellidos, avatar_url, verified)
    `)
    .eq('receptor_id', userId)
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// GET /amistad/estado/:username — relación entre el usuario autenticado y :username
router.get('/estado/:username', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const { data: other, error: otherError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', req.params.username)
    .single();

  if (otherError || !other) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
  if (other.id === userId) { res.json({ estado: 'propio' }); return; }

  const { data, error } = await supabase
    .from('solicitudes_amistad')
    .select('id, emisor_id, receptor_id, estado')
    .or(`and(emisor_id.eq.${userId},receptor_id.eq.${other.id}),and(emisor_id.eq.${other.id},receptor_id.eq.${userId})`)
    .maybeSingle();

  if (error) { res.status(500).json({ error: error.message }); return; }

  if (!data || data.estado === 'rechazada') { res.json({ estado: 'ninguno' }); return; }
  if (data.estado === 'aceptada') { res.json({ estado: 'amigos', id: data.id }); return; }
  if (data.emisor_id === userId) { res.json({ estado: 'pendiente_enviada', id: data.id }); return; }
  res.json({ estado: 'pendiente_recibida', id: data.id });
});

// GET /amistad/amigos/:username/count — número de amigos (público)
router.get('/amigos/:username/count', async (req, res) => {
  const { data: target, error: targetError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', req.params.username)
    .single();

  if (targetError || !target) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

  const { count, error } = await supabase
    .from('solicitudes_amistad')
    .select('id', { count: 'exact', head: true })
    .eq('estado', 'aceptada')
    .or(`emisor_id.eq.${target.id},receptor_id.eq.${target.id}`);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ count: count ?? 0 });
});

// GET /amistad/amigos/:username — lista de amigos (solo el propio usuario o sus amigos)
router.get('/amigos/:username', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const { data: target, error: targetError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', req.params.username)
    .single();

  if (targetError || !target) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

  if (target.id !== userId) {
    const { data: amistad } = await supabase
      .from('solicitudes_amistad')
      .select('id')
      .eq('estado', 'aceptada')
      .or(`and(emisor_id.eq.${userId},receptor_id.eq.${target.id}),and(emisor_id.eq.${target.id},receptor_id.eq.${userId})`)
      .maybeSingle();

    if (!amistad) { res.status(403).json({ error: 'No eres amigo de este usuario' }); return; }
  }

  const { data, error } = await supabase
    .from('solicitudes_amistad')
    .select(`
      emisor_id, receptor_id,
      emisor:profiles!solicitudes_amistad_emisor_id_fkey (id, username, nombre, apellidos, avatar_url, verified, online),
      receptor:profiles!solicitudes_amistad_receptor_id_fkey (id, username, nombre, apellidos, avatar_url, verified, online)
    `)
    .eq('estado', 'aceptada')
    .or(`emisor_id.eq.${target.id},receptor_id.eq.${target.id}`);

  if (error) { res.status(500).json({ error: error.message }); return; }

  const amigos = (data ?? []).map((row: any) =>
    row.emisor_id === target.id ? row.receptor : row.emisor
  );

  res.json(amigos);
});

// POST /amistad/:username — enviar solicitud de amistad
router.post('/:username', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const { data: other, error: otherError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', req.params.username)
    .single();

  if (otherError || !other) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
  if (other.id === userId) { res.status(400).json({ error: 'No puedes enviarte una solicitud a ti mismo' }); return; }

  // Si el otro usuario ya te había enviado una solicitud pendiente, se acepta directamente
  const { data: inversa } = await supabase
    .from('solicitudes_amistad')
    .select('id, estado')
    .eq('emisor_id', other.id)
    .eq('receptor_id', userId)
    .maybeSingle();

  if (inversa && inversa.estado === 'pendiente') {
    const { data, error } = await supabase
      .from('solicitudes_amistad')
      .update({ estado: 'aceptada', updated_at: new Date().toISOString() })
      .eq('id', inversa.id)
      .select()
      .single();

    if (error) { res.status(400).json({ error: error.message }); return; }
    res.json(data);
    return;
  }

  const { data: existing } = await supabase
    .from('solicitudes_amistad')
    .select('id, estado')
    .eq('emisor_id', userId)
    .eq('receptor_id', other.id)
    .maybeSingle();

  if (existing) {
    if (existing.estado !== 'rechazada') { res.status(409).json({ error: 'Ya existe una solicitud con este usuario' }); return; }

    const { data, error } = await supabase
      .from('solicitudes_amistad')
      .update({ estado: 'pendiente', updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) { res.status(400).json({ error: error.message }); return; }
    res.status(201).json(data);
    return;
  }

  const { data, error } = await supabase
    .from('solicitudes_amistad')
    .insert({ emisor_id: userId, receptor_id: other.id })
    .select()
    .single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// POST /amistad/:id/aceptar — aceptar una solicitud recibida
router.post('/:id/aceptar', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const { data, error } = await supabase
    .from('solicitudes_amistad')
    .update({ estado: 'aceptada', updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('receptor_id', userId)
    .select()
    .single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json(data);
});

// POST /amistad/:id/rechazar — rechazar una solicitud recibida
router.post('/:id/rechazar', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const { data, error } = await supabase
    .from('solicitudes_amistad')
    .update({ estado: 'rechazada', updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('receptor_id', userId)
    .select()
    .single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json(data);
});

// DELETE /amistad/:id — cancelar solicitud enviada o eliminar amistad
router.delete('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const { error } = await supabase
    .from('solicitudes_amistad')
    .delete()
    .eq('id', req.params.id)
    .or(`emisor_id.eq.${userId},receptor_id.eq.${userId}`);

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(204).send();
});

export default router;
