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
- MySQL (mysql2) — hosted en Railway
- JWT (jsonwebtoken + bcryptjs), multer (subida de ficheros)

**Base de datos**
- MySQL en [Railway](https://railway.app) (compatible con el schema, escrito originalmente para MariaDB)
- Schema completo en `MariaDB/schema.sql`
- No hay servidor de base de datos en local — toda la app (local o desplegada) apunta a la misma instancia en la nube

## Despliegue

- **Frontend**: [Vercel](https://vercel.com) — https://tfg-motos.vercel.app
- **Backend**: [Render](https://render.com) (plan free — la instancia se duerme tras 15 min sin tráfico, la primera petición tras eso tarda ~30-60s) — https://tfg-motos.onrender.com
- **Base de datos**: [Railway](https://railway.app) MySQL, accesible por su endpoint público (TCP Proxy)

Cada push a `main` redespliega frontend y backend automáticamente (Vercel y Render están conectados al repo de GitHub).

**Excepción — cálculo de ruta con "evitar autopistas" (`frontend/api/route.ts`):** OpenRouteService devuelve `403 Access to this API has been disallowed` a las peticiones que salen del servidor de Render (comprobado: misma request, misma key, funciona desde cualquier otra red). Por eso esa llamada concreta no la hace el backend, sino una función serverless en el propio proyecto de Vercel (`frontend/api/route.ts`), que Vercel despliega automáticamente junto al frontend. Necesita su propia variable `ORS_API_KEY` en Vercel (Settings → Environments → Production — **sin** el prefijo `VITE_`, para que no acabe en el bundle del navegador). El backend en Render conserva su propia copia de esta lógica (con reintentos) para servir a la app móvil, que sí sigue pasando por Render.

> ⚠️ En local (`npm run dev` del frontend), `/api/route` no existe — Vite no ejecuta funciones serverless de Vercel. El toggle "evitar autopistas" no tendrá efecto en desarrollo local (cae a `null` silenciosamente); para probarlo hay que hacerlo contra el despliegue de Vercel, o usar `vercel dev` si se instala el CLI de Vercel.

**Cambiar variables de entorno en producción:**
- Backend (Render): dashboard del servicio → *Environment* → editar valor → guardar (redespliega solo).
- Frontend (Vercel): las variables `VITE_...` se incrustan en el build — si cambias una, hay que forzar un redeploy (Deployments → ⋯ → Redeploy) para que se aplique, un simple guardado no basta.
- Base de datos (Railway): *Connect → Public Network* siempre tiene los datos vigentes; si se regenera el proxy público, cambia el host/puerto y hay que actualizar `DB_HOST`/`DB_PORT` en Render.

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
- Acceso a la base de datos en **Railway** (credenciales del servicio MySQL — pídelas si no las tienes)
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

### 2. Base de datos (Railway)

La base ya existe en Railway y el schema ya está importado — no hace falta instalar ni configurar nada localmente.

- **Credenciales**: en la consola de Railway → servicio MySQL → botón *Connect* → pestaña *Public Network* (host, puerto, usuario, contraseña y nombre de la base ya resueltos).
- **Para inspeccionar los datos**: conecta HeidiSQL (u otro cliente) con esos mismos datos.
- **Si necesitas reimportar el schema** (p. ej. tras un cambio de estructura): abre `MariaDB/schema.sql` en HeidiSQL contra la conexión de Railway y ejecútalo. El script hace `DROP TABLE` de todo antes de recrear, así que borra los datos existentes.

> El schema fue escrito para MariaDB pero no usa nada específico de ese motor, así que es compatible con MySQL. Los triggers que sincronizaban `confirmaciones`, `ultimo_mensaje_at` y `conversaciones_ocultas` se eliminaron del schema (el primer proveedor probado, Clever Cloud, no concedía el privilegio `SUPER` necesario para crearlos en su plan gratuito) — esa lógica ahora vive en el backend (`incidencias.ts`, `chat.ts`), lo que además hace la app portable entre proveedores de base de datos.

---

### 3. Variables de entorno

Los `.env` **no están en git** — hay que crearlos a mano en cada máquina.

#### `backend/.env`

```env
# Puerto en el que escucha el servidor
PORT=3001

# URL del frontend (para la cabecera CORS)
FRONTEND_URL=http://localhost:8080

# Conexión a la base de datos (Railway — botón "Connect" del servicio MySQL → Public Network)
DB_HOST=<host>.proxy.rlwy.net
DB_PORT=<puerto-publico>
DB_USER=root
DB_PASSWORD=<password-de-railway>
DB_NAME=railway

# Secreto para firmar los JWT — cualquier cadena larga y aleatoria
# Generar: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=cambia_esto_por_una_clave_secreta_larga

# API key de OpenRouteService (geocoding y cálculo de rutas)
# Gratis en https://openrouteservice.org → Dashboard → API Keys
# En producción, esta misma key hay que ponerla TAMBIÉN en Vercel
# (ver sección "Despliegue" — ahí es donde se usa de verdad).
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
- Catálogo de rutas con dificultad, distancia y valoraciones — crear y editar rutas propias
- Directorio de moteros con filtros por zona y tipo de moto
- Sistema de alertas viales comunitarias, con autorrelleno de la vía/carretera al marcar el punto en el mapa
- Chat privado entre amigos
- Gestión de solicitudes de amistad
- Grupos de rodada: crear, unirse a grupos públicos, invitar amigos y chat de grupo

## Design system

Tema **Dark Asphalt** — dark mode único inspirado en asfalto nocturno con acentos naranja. Tokens definidos en `frontend/src/index.css`.
