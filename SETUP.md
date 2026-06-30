# Arrancar el proyecto en otro ordenador

## 1. Clonar e instalar dependencias

```sh
git clone <repo>
cd Motos
npm install            # raíz (husky/commitlint)
cd backend && npm install
cd ../frontend && npm install
cd ../mobile && npm install
```

## 2. Variables de entorno (`.env`)

Los `.env` **no se suben a git** (están en `.gitignore`), hay que crearlos a mano en cada ordenador nuevo.

### `backend/.env`

```
PORT=3001
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
FRONTEND_URL=http://localhost:5173
ORS_API_KEY=...
```

⚠️ `SUPABASE_SERVICE_KEY` es secreta (bypasa RLS) — pásala por un canal seguro, no por git ni chat público.

### `frontend/.env`

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=http://localhost:3001
```

### `mobile/.env`

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_API_URL=http://<IP-LOCAL-DEL-ORDENADOR>:3001
```

⚠️ Este es el que más suele fallar al cambiar de máquina: como Expo Go corre en un móvil físico (u otro emulador), `localhost` no sirve — tiene que ser la IP local del ordenador en la red Wi-Fi. Hay que mirar la IP con `ipconfig` (Windows) y actualizar esta línea cada vez que se cambie de red.

Las claves `SUPABASE_*_ANON_KEY` / `SUPABASE_*_URL` no son secretas (son públicas por diseño), se pueden copiar tal cual del proyecto Supabase.

## 3. Base de datos

No hace falta tocar nada si se sigue usando el **mismo proyecto Supabase** (los `.env` ya apuntan a él) — los datos y migraciones ya están aplicados ahí. Solo haría falta volver a correr las migraciones de `supabase/migrations/` si se usara un proyecto Supabase distinto.

## 4. Arrancar

```sh
start-backend.bat     # o: cd backend && npm run dev
start-frontend.bat    # o: cd frontend && npm run dev   → http://localhost:8080
start-mobile.bat      # o: cd mobile && npm run start    → Expo Go
```
