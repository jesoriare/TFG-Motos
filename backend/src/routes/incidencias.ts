import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /incidencias — listar activas
router.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('incidencias')
    .select(`
      id, tipo, descripcion, via, severidad, confirmaciones, lat, lng, created_at,
      profiles (username, avatar_url)
    `)
    .eq('activa', true)
    .order('created_at', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// POST /incidencias — reportar incidencia
router.post('/', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { tipo, descripcion, via, severidad, lat, lng } = req.body;

  const { data, error } = await supabase
    .from('incidencias')
    .insert({ user_id: userId, tipo, descripcion, via, severidad, lat, lng })
    .select()
    .single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// POST /incidencias/:id/confirmar — confirmar o desconfirmar
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
