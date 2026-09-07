import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';

import authRouter from './routes/auth.js';
import usuariosRouter from './routes/usuarios.js';
import rutasRouter from './routes/rutas.js';
import incidenciasRouter from './routes/incidencias.js';
import mapaRouter from './routes/mapa.js';
import geocodeRouter from './routes/geocode.js';
import amistadRouter from './routes/amistad.js';
import chatRouter from './routes/chat.js';
import uploadRouter from './routes/upload.js';
import gruposRouter from './routes/grupos.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRouter);

app.use('/usuarios', usuariosRouter);
app.use('/rutas', rutasRouter);
app.use('/incidencias', incidenciasRouter);
app.use('/mapa', mapaRouter);
app.use('/geocode', geocodeRouter);
app.use('/amistad', amistadRouter);
app.use('/chat', chatRouter);
app.use('/upload', uploadRouter);
app.use('/grupos', gruposRouter);

app.listen(PORT, () => console.log(`Backend RodadaMoto en http://localhost:${PORT}`));
