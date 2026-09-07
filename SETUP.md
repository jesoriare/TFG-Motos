# Arrancar el proyecto en otro ordenador

Guía resumida — ver el README para más detalle.

La base de datos vive en Clever Cloud (MySQL en la nube) — no hace falta instalar nada de base de datos en local, solo pedir las credenciales del addon.

## Pasos rápidos

```sh
# 1. Clonar e instalar
git clone <url-del-repo>
cd TFG-Motos
npm install
cd backend && npm install
cd ../frontend && npm install

# 2. Crear los .env con las credenciales de Clever Cloud (ver plantillas abajo)

# 3. Arrancar
start-backend.bat    # → http://localhost:3001
start-frontend.bat   # → http://localhost:8080
```

---

## Plantillas `.env`

### `backend/.env`

```env
PORT=3001
FRONTEND_URL=http://localhost:8080

# Clever Cloud → addon MySQL → Dashboard → "Database Credentials"
DB_HOST=<host>.services.clever-cloud.com
DB_PORT=3306
DB_USER=<usuario-del-addon>
DB_PASSWORD=<password-del-addon>
DB_NAME=<nombre-de-la-base>

# Cualquier cadena larga y aleatoria
# Generar: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=<cadena-aleatoria-larga>

# Gratis en https://openrouteservice.org → Dashboard → API Keys
ORS_API_KEY=<tu-api-key-de-openrouteservice>
```

### `frontend/.env`

```env
VITE_API_URL=http://localhost:3001
```

### `mobile/.env`

```env
# IP del ordenador donde corre el backend (no localhost)
# Obtener con: ipconfig → "Dirección IPv4"
EXPO_PUBLIC_API_URL=http://<IP-LOCAL>:3001
```
