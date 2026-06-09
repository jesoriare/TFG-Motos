import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const EXPIRY_HOURS = 4;

// GET /incidencias — listar activas y no expiradas (RF-12.2)
router.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('incidencias')
    .select(`
      id, user_id, tipo, descripcion, via, severidad, confirmaciones, lat, lng, created_at, expires_at,
      profiles!incidencias_user_id_fkey (username, avatar_url)
    `)
    .eq('activa', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// POST /incidencias — reportar incidencia (RF-12.1)
router.post('/', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { tipo, descripcion, via, severidad, lat, lng, expiry_hours } = req.body;
  const hours = Number(expiry_hours) || EXPIRY_HOURS;
  const expires_at = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('incidencias')
    .insert({ user_id: userId, tipo, descripcion, via, severidad, lat, lng, expires_at })
    .select()
    .single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// POST /incidencias/:id/confirmar — confirmar o desconfirmar (RF-12.3)
router.post('/:id/confirmar', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const incidenciaId = req.params.id;

  const { data: existing } = await supabase
    .from('confirmaciones_incidencia')
    .select('incidencia_id')
    .eq('incidencia_id', incidenciaId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('confirmaciones_incidencia')
      .delete()
      .eq('incidencia_id', incidenciaId)
      .eq('user_id', userId);
    res.json({ confirmado: false });
  } else {
    await supabase
      .from('confirmaciones_incidencia')
      .insert({ incidencia_id: incidenciaId, user_id: userId });
    res.json({ confirmado: true });
  }
});

// DELETE /incidencias/:id — eliminar manualmente (solo el autor) (RF-12.4)
router.delete('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const { error } = await supabase
    .from('incidencias')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', userId);

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(204).send();
});

// PATCH /incidencias/:id/resolver — marcar como resuelta (solo el autor)
router.patch('/:id/resolver', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const { data, error } = await supabase
    .from('incidencias')
    .update({ severidad: 'resolved', activa: false })
    .eq('id', req.params.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json(data);
});

export default router;
