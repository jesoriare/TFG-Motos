import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /usuarios/:username — perfil público de un usuario
router.get('/:username', async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, nombre, apellidos, username, avatar_url, zona, verified, online, last_seen, created_at,
      motos (id, marca_modelo, cilindrada, tipo, principal)
    `)
    .eq('username', req.params.username)
    .single();

  if (error) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
  res.json(data);
});

// PUT /usuarios/me — actualizar perfil propio
router.put('/me', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { nombre, apellidos, zona, avatar_url } = req.body;

  const { data, error } = await supabase
    .from('profiles')
    .update({ nombre, apellidos, zona, avatar_url })
    .eq('id', userId)
    .select()
    .single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json(data);
});

// GET /usuarios — listar moteros (con filtros opcionales)
router.get('/', async (req, res) => {
  const { zona, tipo } = req.query;

  let query = supabase
    .from('profiles')
    .select(`id, nombre, username, avatar_url, zona, verified, online, motos (marca_modelo, cilindrada, tipo)`)
    .order('online', { ascending: false });

  if (zona) query = query.ilike('zona', `%${zona}%`);

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }

  const result = tipo
    ? data.filter((u) => u.motos?.some((m: { tipo: string }) => m.tipo === tipo))
    : data;

  res.json(result);
});

export default router;
