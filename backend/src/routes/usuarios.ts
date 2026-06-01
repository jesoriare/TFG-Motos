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

// GET /usuarios — listar moteros con filtros opcionales
// Query params: search (username/nombre/apellidos/zona/moto), tipo
router.get('/', async (req, res) => {
  const { search, tipo } = req.query as { search?: string; tipo?: string };

  const { data, error } = await supabase
    .from('profiles')
    .select(`id, nombre, apellidos, username, avatar_url, zona, verified, online, motos (marca_modelo, cilindrada, tipo)`)
    .order('online', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }

  let result = data ?? [];

  // Filtrar por tipo de moto
  if (tipo) {
    result = result.filter((u) =>
      u.motos?.some((m: { tipo: string }) => m.tipo.toLowerCase() === tipo.toLowerCase())
    );
  }

  // Filtrar por búsqueda: username, nombre, apellidos, zona y marca de moto
  if (search) {
    const s = search.toLowerCase();
    result = result.filter((u) =>
      u.username?.toLowerCase().includes(s) ||
      u.nombre?.toLowerCase().includes(s) ||
      u.apellidos?.toLowerCase().includes(s) ||
      u.zona?.toLowerCase().includes(s) ||
      u.motos?.some((m: { marca_modelo: string }) => m.marca_modelo?.toLowerCase().includes(s))
    );
  }

  res.json(result);
});

export default router;
