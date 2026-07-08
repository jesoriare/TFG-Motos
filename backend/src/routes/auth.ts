import { Router } from 'express';
import { pool } from '../lib/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET ?? 'changeme';

// POST /auth/register
router.post('/register', async (req, res) => {
  const { nombre, apellidos, email, username, password, marca_modelo, cilindrada } = req.body;

  if (!nombre || !apellidos || !email || !username || !password) {
    res.status(400).json({ error: 'Faltan campos obligatorios' });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const hash = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    await conn.execute('INSERT INTO users (id, email, password) VALUES (?, ?, ?)', [userId, email, hash]);
    await conn.execute(
      'INSERT INTO profiles (id, nombre, apellidos, username) VALUES (?, ?, ?, ?)',
      [userId, nombre, apellidos, username]
    );

    if (marca_modelo && cilindrada) {
      await conn.execute(
        'INSERT INTO motos (id, user_id, marca_modelo, cilindrada, principal) VALUES (?, ?, ?, ?, 1)',
        [uuidv4(), userId, marca_modelo, parseInt(cilindrada)]
      );
    }

    await conn.commit();

    const token = jwt.sign({ id: userId, email, username }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user: { id: userId, email, username } });
  } catch (err: any) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      const msg = err.message.includes('email') ? 'El email ya está registrado' : 'El nombre de usuario ya existe';
      res.status(409).json({ error: msg });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Error al crear la cuenta' });
    }
  } finally {
    conn.release();
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Faltan campos obligatorios' });
    return;
  }

  const [rows] = await pool.execute<any[]>(
    'SELECT u.id, u.email, u.password, p.username FROM users u JOIN profiles p ON p.id = u.id WHERE p.username = ?',
    [username]
  );

  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: 'Nombre de usuario o contraseña incorrectos' });
    return;
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
  res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
});

// GET /auth/email/:username — devuelve el email asociado a un username
router.get('/email/:username', async (req, res) => {
  const [rows] = await pool.execute<any[]>(
    'SELECT u.email FROM users u JOIN profiles p ON p.id = u.id WHERE p.username = ?',
    [req.params.username]
  );
  if (!rows[0]) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
  res.json({ email: rows[0].email });
});

export default router;
