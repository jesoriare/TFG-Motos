import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /mapa/riders — posiciones en vivo de todos los usuarios online
router.get('/riders', async (_req, res) => {
  const { data, error } = await supabase
    .from('ubicaciones')
    .select(`lat, lng, updated_at, profiles (id, username, avatar_url, online, motos (marca_modelo, tipo))`)
    .order('updated_at', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// PUT /mapa/ubicacion — actualizar posición propia
router.put('/ubicacion', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { lat, lng } = req.body;

  const { error } = await supabase
    .from('ubicaciones')
    .upsert({ user_id: userId, lat, lng, updated_at: new Date().toISOString() });

  if (error) { res.status(400).json({ error: error.message }); return; }

  await supabase.from('profiles').update({ online: true, last_seen: new Date().toISOString() }).eq('id', userId);

  res.json({ ok: true });
});

// GET /mapa/pois — puntos de interés
router.get('/pois', async (_req, res) => {
  const { data, error } = await supabase
    .from('puntos_interes')
    .select('id, tipo, nombre, descripcion, lat, lng')
    .order('created_at', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// POST /mapa/pois — añadir punto de interés
router.post('/pois', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { tipo, nombre, descripcion, lat, lng } = req.body;

  const { data, error } = await supabase
    .from('puntos_interes')
    .insert({ user_id: userId, tipo, nombre, descripcion, lat, lng })
    .select()
    .single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json(data);
});

export default router;
