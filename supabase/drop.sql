-- ============================================================
-- RodadaMoto — Drop completo
-- Ejecutar ANTES de schema.sql si las tablas ya existen
-- ============================================================

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists trg_sync_confirmaciones on confirmaciones_incidencia;

drop function if exists handle_new_user();
drop function if exists sync_confirmaciones();

drop table if exists valoraciones_ruta cascade;
drop table if exists rutas_favoritas cascade;
drop table if exists rutas cascade;
drop table if exists confirmaciones_incidencia cascade;
drop table if exists incidencias cascade;
drop table if exists miembros_grupo cascade;
drop table if exists grupos cascade;
drop table if exists motos cascade;
drop table if exists ubicaciones cascade;
drop table if exists puntos_interes cascade;
drop table if exists profiles cascade;

drop type if exists tipo_moto cascade;
drop type if exists dificultad_ruta cascade;
drop type if exists tipo_incidencia cascade;
drop type if exists severidad_incidencia cascade;
drop type if exists tipo_poi cascade;
