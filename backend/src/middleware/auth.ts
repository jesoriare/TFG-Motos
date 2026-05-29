import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: 'Token inválido o expirado' });
    return;
  }

  res.locals.userId = data.user.id;
  next();
}
