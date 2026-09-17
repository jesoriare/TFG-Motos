# Arrancar el proyecto en otro ordenador

Guía resumida — ver el README para más detalle.

La base de datos vive en Railway (MySQL en la nube) por defecto — no hace falta instalar nada de base de datos en local, solo pedir las credenciales del servicio. También se puede usar una MariaDB en local en su lugar (ver "Alternativa: MariaDB en local" más abajo).

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

---

## Alternativa: MariaDB en local

Si no quieres depender de la conexión a Railway, instala MariaDB, crea una base de datos y un usuario, e importa `MariaDB/schema.sql` (pasos completos en el README, sección "2b. Alternativa: MariaDB en local"). Luego usa este `backend/.env` en vez del de arriba:

```env
PORT=3001
FRONTEND_URL=http://localhost:8080

# MariaDB en local, mismo equipo que el backend
DB_HOST=localhost
DB_PORT=3306
DB_USER=tfg_user
DB_PASSWORD=<tu-password>
DB_NAME=<nombre-de-tu-bd>

JWT_SECRET=<cadena-aleatoria-larga>
ORS_API_KEY=<tu-api-key-de-openrouteservice>
```
