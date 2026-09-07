import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${req.body._userId ?? 'unknown'}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// POST /upload/avatar
router.post('/avatar', requireAuth, (req, res) => {
  const userId = res.locals.userId as string;
  req.body._userId = userId;

  upload.single('avatar')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'La imagen no puede superar 5 MB' : err.message });
      return;
    }
    if (err) {
      res.status(400).json({ error: 'Formato de imagen no permitido' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'No se recibió ningún archivo' });
      return;
    }

    const apiUrl = `${req.protocol}://${req.get('host')}`;
    const url = `${apiUrl}/uploads/avatars/${req.file.filename}`;
    res.json({ url });
  });
});

export default router;
