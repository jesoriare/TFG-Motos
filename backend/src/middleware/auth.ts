import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'changeme';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    res.locals.userId = payload.id;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
