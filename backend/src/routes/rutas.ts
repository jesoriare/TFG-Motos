import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /rutas — listar rutas publicadas
router.get('/', async (req, res) => {
  const { region, dificultad } = req.query;

  let query = supabase
    .from('rutas')
    .select(`
      id, nombre, region, distancia_km, duracion_min, dificultad, tags, created_at,
      profiles!rutas_user_id_fkey (username, avatar_url, verified),
      valoraciones_ruta (puntuacion)
    `)
    .eq('publicada', true)
    .order('created_at', { ascending: false });

  if (region) query = query.ilike('region', `%${region}%`);
  if (dificultad) query = query.eq('dificultad', dificultad);

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }

  const withRating = data.map((r) => {
    const vals = r.valoraciones_ruta as { puntuacion: number }[];
    const rating = vals.length
      ? vals.reduce((s, v) => s + v.puntuacion, 0) / vals.length
      : null;
    return { ...r, rating: rating ? +rating.toFixed(1) : null, num_valoraciones: vals.length };
  });

  res.json(withRating);
});

// GET /rutas/:id — detalle de ruta
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('rutas')
    .select(`
      *,
      profiles!rutas_user_id_fkey (username, avatar_url, verified, zona),
      valoraciones_ruta (puntuacion, comentario, created_at, profiles!valoraciones_ruta_user_id_fkey (username, avatar_url))
    `)
    .eq('id', req.params.id)
    .single();

  if (error) { res.status(404).json({ error: 'Ruta no encontrada' }); return; }
  res.json(data);
});

// POST /rutas — crear ruta
router.post('/', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { nombre, region, distancia_km, duracion_min, dificultad, descripcion, tags } = req.body;

  const { data, error } = await supabase
    .from('rutas')
    .insert({ user_id: userId, nombre, region, distancia_km, duracion_min, dificultad, descripcion, tags })
    .select()
    .single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// DELETE /rutas/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const { error } = await supabase
    .from('rutas')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', userId);

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(204).send();
});

// POST /rutas/:id/valorar
router.post('/:id/valorar', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { puntuacion, comentario } = req.body;

  const { data, error } = await supabase
    .from('valoraciones_ruta')
    .upsert({ ruta_id: req.params.id, user_id: userId, puntuacion, comentario })
    .select()
    .single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json(data);
});

export default router;
