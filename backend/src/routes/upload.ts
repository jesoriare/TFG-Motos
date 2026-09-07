import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Guardado en memoria: el resultado se devuelve como data URL en base64 y el
// propio cliente lo guarda en avatar_url (MEDIUMTEXT). El disco de Render es
// efímero (se borra en cada redeploy), así que no se persiste ningún fichero.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB (en base64 ocupa ~33% más)
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// POST /upload/avatar
router.post('/avatar', requireAuth, (req, res) => {
  upload.single('avatar')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'La imagen no puede superar 2 MB' : err.message });
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

    const url = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    res.json({ url });
  });
});

export default router;
