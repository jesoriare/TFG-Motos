-- ============================================================
-- RodadaMoto — Schema completo MariaDB
-- Base de datos: tfg_db
-- Ejecutar en HeidiSQL: selecciona tfg_db y abre este archivo
-- Requiere MariaDB 10.3.3+
-- ============================================================

-- ============================================================
-- LIMPIEZA PREVIA (por si ya existen tablas)
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TRIGGER IF EXISTS trg_sync_confirmaciones_insert;
DROP TRIGGER IF EXISTS trg_sync_confirmaciones_delete;
DROP TRIGGER IF EXISTS trg_sync_conversacion_on_mensaje;

DROP TABLE IF EXISTS conversaciones_ocultas;
DROP TABLE IF EXISTS mensajes;
DROP TABLE IF EXISTS conversaciones;
DROP TABLE IF EXISTS invitaciones_grupo;
DROP TABLE IF EXISTS solicitudes_amistad;
DROP TABLE IF EXISTS confirmaciones_incidencia;
DROP TABLE IF EXISTS incidencias;
DROP TABLE IF EXISTS rutas_favoritas;
DROP TABLE IF EXISTS valoraciones_ruta;
DROP TABLE IF EXISTS rutas;
DROP TABLE IF EXISTS motos;
DROP TABLE IF EXISTS puntos_interes;
DROP TABLE IF EXISTS mensajes_grupo;
DROP TABLE IF EXISTS miembros_grupo;
DROP TABLE IF EXISTS grupos;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- USERS (reemplaza Supabase Auth)
-- ============================================================

CREATE TABLE users (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PERFILES DE USUARIO
-- ============================================================

CREATE TABLE profiles (
  id              CHAR(36)     NOT NULL PRIMARY KEY,
  nombre          VARCHAR(255) NOT NULL,
  apellidos       VARCHAR(255) NOT NULL,
  username        VARCHAR(100) NOT NULL UNIQUE,
  avatar_url      MEDIUMTEXT,
  zona            VARCHAR(100),
  verified        TINYINT(1)   NOT NULL DEFAULT 0,
  online          TINYINT(1)   NOT NULL DEFAULT 0,
  last_seen       DATETIME,
  push_token      TEXT,
  chat_abierto_id CHAR(36),
  created_at      DATETIME     NOT NULL DEFAULT NOW(),
  FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- MOTOS
-- ============================================================

CREATE TABLE motos (
  id           CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id      CHAR(36)     NOT NULL,
  marca_modelo VARCHAR(255) NOT NULL,
  cilindrada   INT          NOT NULL CHECK (cilindrada > 0),
  tipo         ENUM('sport','naked','adventure','custom','touring','enduro') NOT NULL DEFAULT 'naked',
  principal    TINYINT(1)   NOT NULL DEFAULT 1,
  created_at   DATETIME     NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- ============================================================
-- RUTAS
-- ============================================================

CREATE TABLE rutas (
  id             CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id        CHAR(36)     NOT NULL,
  nombre         VARCHAR(255) NOT NULL,
  region         VARCHAR(255) NOT NULL,
  distancia_km   INT          NOT NULL CHECK (distancia_km > 0),
  duracion_min   INT          NOT NULL CHECK (duracion_min > 0),
  dificultad     ENUM('facil','media','media_alta','alta') NOT NULL DEFAULT 'media',
  descripcion    TEXT,
  tags           JSON         NOT NULL DEFAULT ('[]'),
  waypoints      JSON         NOT NULL DEFAULT ('[]'),
  puntos_interes JSON         NOT NULL DEFAULT ('[]'),
  avoid_highways TINYINT(1)   NOT NULL DEFAULT 0,
  publicada      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at     DATETIME     NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE valoraciones_ruta (
  id         CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  ruta_id    CHAR(36) NOT NULL,
  user_id    CHAR(36) NOT NULL,
  puntuacion INT      NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
  comentario TEXT,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uk_ruta_user (ruta_id, user_id),
  FOREIGN KEY (ruta_id) REFERENCES rutas(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE rutas_favoritas (
  user_id    CHAR(36) NOT NULL,
  ruta_id    CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, ruta_id),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (ruta_id) REFERENCES rutas(id) ON DELETE CASCADE
);

-- ============================================================
-- INCIDENCIAS EN TIEMPO REAL
-- ============================================================

CREATE TABLE incidencias (
  id             CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id        CHAR(36)      NOT NULL,
  tipo           ENUM('control_gc','radar','firme_mal_estado','accidente','obras','otro') NOT NULL,
  descripcion    TEXT          NOT NULL,
  via            VARCHAR(255)  NOT NULL,
  severidad      ENUM('high','medium','low','resolved') NOT NULL DEFAULT 'medium',
  confirmaciones INT           NOT NULL DEFAULT 0,
  lat            DECIMAL(10,6) NOT NULL,
  lng            DECIMAL(10,6) NOT NULL,
  activa         TINYINT(1)    NOT NULL DEFAULT 1,
  expires_at     DATETIME      NOT NULL DEFAULT (DATE_ADD(NOW(), INTERVAL 4 HOUR)),
  created_at     DATETIME      NOT NULL DEFAULT NOW(),
  updated_at     DATETIME      NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE confirmaciones_incidencia (
  incidencia_id CHAR(36) NOT NULL,
  user_id       CHAR(36) NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT NOW(),
  PRIMARY KEY (incidencia_id, user_id),
  FOREIGN KEY (incidencia_id) REFERENCES incidencias(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)       REFERENCES profiles(id)    ON DELETE CASCADE
);

-- ============================================================
-- SOLICITUDES DE AMISTAD
-- ============================================================

CREATE TABLE solicitudes_amistad (
  id          CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  emisor_id   CHAR(36) NOT NULL,
  receptor_id CHAR(36) NOT NULL,
  estado      ENUM('pendiente','aceptada','rechazada') NOT NULL DEFAULT 'pendiente',
  created_at  DATETIME NOT NULL DEFAULT NOW(),
  updated_at  DATETIME NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_solicitud_distinta CHECK (emisor_id <> receptor_id),
  UNIQUE KEY uk_solicitud (emisor_id, receptor_id),
  FOREIGN KEY (emisor_id)   REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (receptor_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- ============================================================
-- CHAT PRIVADO
-- ============================================================

CREATE TABLE conversaciones (
  id                CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  usuario1_id       CHAR(36) NOT NULL,
  usuario2_id       CHAR(36) NOT NULL,
  created_at        DATETIME NOT NULL DEFAULT NOW(),
  ultimo_mensaje_at DATETIME NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_conv_distinta CHECK (usuario1_id <> usuario2_id),
  CONSTRAINT ck_conv_orden    CHECK (usuario1_id < usuario2_id),
  UNIQUE KEY uk_conversacion (usuario1_id, usuario2_id),
  FOREIGN KEY (usuario1_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario2_id) REFERENCES profiles(id) ON DELETE CASCADE
);

ALTER TABLE profiles
  ADD CONSTRAINT fk_chat_abierto
  FOREIGN KEY (chat_abierto_id) REFERENCES conversaciones(id) ON DELETE SET NULL;

CREATE TABLE mensajes (
  id              CHAR(36)   NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  conversacion_id CHAR(36)   NOT NULL,
  emisor_id       CHAR(36)   NOT NULL,
  contenido       TEXT       NOT NULL,
  created_at      DATETIME   NOT NULL DEFAULT NOW(),
  leido           TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (conversacion_id) REFERENCES conversaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (emisor_id)       REFERENCES profiles(id)       ON DELETE CASCADE
);

CREATE TABLE conversaciones_ocultas (
  conversacion_id CHAR(36) NOT NULL,
  usuario_id      CHAR(36) NOT NULL,
  ocultada_at     DATETIME NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversacion_id, usuario_id),
  FOREIGN KEY (conversacion_id) REFERENCES conversaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id)      REFERENCES profiles(id)       ON DELETE CASCADE
);

-- ============================================================
-- GRUPOS DE RODADA
-- ============================================================

CREATE TABLE grupos (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  nombre     VARCHAR(255) NOT NULL,
  descripcion TEXT,
  privacidad ENUM('privado', 'publico') NOT NULL DEFAULT 'privado',
  lider_id   CHAR(36)     NOT NULL,
  ruta_id    CHAR(36),
  activo     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT NOW(),
  FOREIGN KEY (lider_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (ruta_id)  REFERENCES rutas(id)    ON DELETE SET NULL
);

CREATE TABLE miembros_grupo (
  grupo_id     CHAR(36) NOT NULL,
  user_id      CHAR(36) NOT NULL,
  joined_at    DATETIME NOT NULL DEFAULT NOW(),
  last_read_at DATETIME NOT NULL DEFAULT NOW(),
  PRIMARY KEY (grupo_id, user_id),
  FOREIGN KEY (grupo_id) REFERENCES grupos(id)   ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE invitaciones_grupo (
  id          CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  grupo_id    CHAR(36) NOT NULL,
  emisor_id   CHAR(36) NOT NULL,
  receptor_id CHAR(36) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uk_invitacion (grupo_id, receptor_id),
  FOREIGN KEY (grupo_id)    REFERENCES grupos(id)   ON DELETE CASCADE,
  FOREIGN KEY (emisor_id)   REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (receptor_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE mensajes_grupo (
  id         CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  grupo_id   CHAR(36) NOT NULL,
  emisor_id  CHAR(36) NOT NULL,
  contenido  TEXT     NOT NULL,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  FOREIGN KEY (grupo_id)  REFERENCES grupos(id)   ON DELETE CASCADE,
  FOREIGN KEY (emisor_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- ============================================================
-- PUNTOS DE INTERES EN EL MAPA
-- ============================================================

CREATE TABLE puntos_interes (
  id          CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id     CHAR(36),
  tipo        ENUM('mirador','descanso','alerta','recarga') NOT NULL,
  nombre      VARCHAR(255)  NOT NULL,
  descripcion TEXT,
  lat         DECIMAL(10,6) NOT NULL,
  lng         DECIMAL(10,6) NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL
);

-- ============================================================
-- NOTA: la sincronización que antes hacían los triggers
-- (confirmaciones, ultimo_mensaje_at, conversaciones_ocultas)
-- se gestiona ahora en el backend (incidencias.ts, chat.ts),
-- porque los hosts MySQL gestionados (p. ej. Clever Cloud)
-- no conceden privilegio SUPER para crear triggers.
-- ============================================================
