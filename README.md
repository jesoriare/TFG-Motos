# RodadaMoto

Plataforma web para motoristas centrada en la organización de rutas en grupo y la conexión social entre moteros.

## Stack tecnológico

**Frontend**
- React 18 + Vite 5, TypeScript 5
- Tailwind CSS v3 + shadcn/ui (Radix UI)
- React Router v6, React Query, React Hook Form + Zod
- Leaflet (mapas interactivos), Recharts, Vitest

**Backend**
- Node.js + Express 4, TypeScript (tsx)
- MySQL (mysql2) — hosted en Clever Cloud
- JWT (jsonwebtoken + bcryptjs), multer (subida de ficheros)

**Base de datos**
- MySQL 8.0 en [Clever Cloud](https://www.clever-cloud.com) (compatible con el schema, escrito originalmente para MariaDB)
- Schema completo en `MariaDB/schema.sql`
- No hay servidor de base de datos en local — toda la app (local o desplegada) apunta a la misma instancia en la nube

## Estructura del proyecto

```
TFG-Motos/
├── MariaDB/          # Schema SQL único
├── backend/          # API REST (Express + TypeScript)
├── frontend/         # SPA React + Vite
├── mobile/           # App Expo React Native
├── start-backend.bat
├── start-frontend.bat
└── start-mobile.bat
```

---

## Requisitos previos

- **Node.js** 18 o superior
- Acceso a la base de datos en **Clever Cloud** (credenciales del addon MySQL — pídelas si no las tienes)
- **HeidiSQL** (recomendado en Windows) u otro cliente SQL, solo para inspeccionar la base o reimportar el schema

---

## Puesta en marcha desde cero

### 1. Clonar e instalar dependencias

```sh
git clone <url-del-repo>
cd TFG-Motos

npm install            # raíz (husky + commitlint)
cd backend && npm install
cd ../frontend && npm install
```

---

### 2. Base de datos (Clever Cloud)

La base ya existe en Clever Cloud y el schema ya está importado — no hace falta instalar ni configurar nada localmente.

- **Credenciales**: en la consola de Clever Cloud → addon MySQL (`tfg-motos-db`) → pestaña *Dashboard* → "Database Credentials".
- **Para inspeccionar los datos**: conecta HeidiSQL (u otro cliente) con esos mismos datos (host, puerto, usuario, contraseña, nombre de la base).
- **Si necesitas reimportar el schema** (p. ej. tras un cambio de estructura): abre `MariaDB/schema.sql` en HeidiSQL contra la conexión de Clever Cloud y ejecútalo. El script hace `DROP TABLE` de todo antes de recrear, así que borra los datos existentes.

> El schema fue escrito para MariaDB pero no usa nada específico de ese motor, así que es 100% compatible con MySQL 8.0. Los triggers que sincronizaban `confirmaciones`, `ultimo_mensaje_at` y `conversaciones_ocultas` se eliminaron del schema porque el plan gratuito de Clever Cloud no concede el privilegio `SUPER` necesario para crearlos — esa lógica ahora vive en el backend (`incidencias.ts`, `chat.ts`).

---

### 3. Variables de entorno

Los `.env` **no están en git** — hay que crearlos a mano en cada máquina.

#### `backend/.env`

```env
# Puerto en el que escucha el servidor
PORT=3001

# URL del frontend (para la cabecera CORS)
FRONTEND_URL=http://localhost:8080

# Conexión a la base de datos (Clever Cloud — ver "Database Credentials" en su dashboard)
DB_HOST=<host>.services.clever-cloud.com
DB_PORT=3306
DB_USER=<usuario-del-addon>
DB_PASSWORD=<password-del-addon>
DB_NAME=<nombre-de-la-base>

# Secreto para firmar los JWT — cualquier cadena larga y aleatoria
# Generar: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=cambia_esto_por_una_clave_secreta_larga

# API key de OpenRouteService (geocoding y cálculo de rutas)
# Gratis en https://openrouteservice.org → Dashboard → API Keys
ORS_API_KEY=<tu-api-key>
```

#### `frontend/.env`

```env
# URL base del backend
VITE_API_URL=http://localhost:3001
```

#### `mobile/.env` (solo si usas la app móvil)

```env
# URL del backend accesible desde el móvil
# No puede ser localhost — usar la IP del ordenador en la red Wi-Fi
# Obtener con: ipconfig (Windows) → "Dirección IPv4"
EXPO_PUBLIC_API_URL=http://<IP-LOCAL-DEL-ORDENADOR>:3001
```

---

### 4. Arrancar la aplicación

**Con los scripts .bat (Windows):**

```sh
start-backend.bat    # abre backend en http://localhost:3001
start-frontend.bat   # abre frontend en http://localhost:8080
```

**O manualmente en dos terminales:**

```sh
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

La aplicación queda disponible en **http://localhost:8080**.

---

### 5. App móvil (opcional)

```sh
cd mobile
npm install
npm run start     # abre Expo Go
```

Escanea el QR con Expo Go (iOS/Android). Asegúrate de que `EXPO_PUBLIC_API_URL` en `mobile/.env` apunta a la IP correcta del ordenador.

---

## Scripts disponibles

### Backend (`cd backend`)

```sh
npm run dev      # Servidor con hot-reload (tsx watch)
npm run build    # Compila TypeScript
npm start        # Arranca el build compilado
```

### Frontend (`cd frontend`)

```sh
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Vista previa del build
npm run test     # Ejecutar tests (Vitest)
npm run lint     # ESLint
```

---

## Funcionalidades

- Mapa interactivo con riders en tiempo real y POIs
- Catálogo de rutas con dificultad, distancia y valoraciones
- Directorio de moteros con filtros por zona y tipo de moto
- Sistema de alertas viales comunitarias
- Chat privado entre amigos
- Gestión de solicitudes de amistad

## Design system

Tema **Dark Asphalt** — dark mode único inspirado en asfalto nocturno con acentos naranja. Tokens definidos en `frontend/src/index.css`.
