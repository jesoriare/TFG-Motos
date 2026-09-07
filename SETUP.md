# Arrancar el proyecto en otro ordenador

Guía resumida — ver el README para más detalle.

La base de datos vive en Railway (MySQL en la nube) — no hace falta instalar nada de base de datos en local, solo pedir las credenciales del servicio.

## Pasos rápidos

```sh
# 1. Clonar e instalar
git clone <url-del-repo>
cd TFG-Motos
npm install
cd backend && npm install
cd ../frontend && npm install

# 2. Crear los .env con las credenciales de Railway (ver plantillas abajo)

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

# Railway → servicio MySQL → botón "Connect" → pestaña "Public Network"
DB_HOST=<host>.proxy.rlwy.net
DB_PORT=<puerto-publico>
DB_USER=root
DB_PASSWORD=<password-de-railway>
DB_NAME=railway

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
