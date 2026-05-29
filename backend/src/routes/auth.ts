import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// GET /auth/email/:username
// Devuelve el email asociado a un username para poder iniciar sesión
router.get('/email/:username', async (req, res) => {
  const { username } = req.params;

  // Buscar el user_id por username en profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single();

  if (profileError || !profile) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  // Obtener el email desde auth.users usando la service key
  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(profile.id);

  if (userError || !user) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  res.json({ email: user.email });
});

export default router;
