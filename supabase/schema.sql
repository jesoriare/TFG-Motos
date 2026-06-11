-- ============================================================
-- RodadaMoto — Schema Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- Extensiones necesarias
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================

create type tipo_moto as enum ('sport', 'naked', 'adventure', 'custom', 'touring', 'enduro');
create type dificultad_ruta as enum ('facil', 'media', 'media_alta', 'alta');
create type tipo_incidencia as enum ('control_gc', 'radar', 'firme_mal_estado', 'accidente', 'obras', 'otro');
create type severidad_incidencia as enum ('high', 'medium', 'low', 'resolved');
create type tipo_poi as enum ('mirador', 'descanso', 'alerta', 'recarga');

-- ============================================================
-- PERFILES DE USUARIO
-- Se crea automáticamente al registrarse via Supabase Auth
-- ============================================================

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  nombre       text not null,
  apellidos    text not null,
  username     text unique not null,
  avatar_url   text,
  zona         text,
  verified     boolean not null default false,
  online       boolean not null default false,
  last_seen    timestamptz,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- MOTOS DE USUARIO
-- Un usuario puede tener varias motos
-- ============================================================

create table motos (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references profiles(id) on delete cascade,
  marca_modelo   text not null,
  cilindrada     integer not null check (cilindrada > 0),
  tipo           tipo_moto not null default 'naked',
  principal      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ============================================================
-- RUTAS
-- ============================================================

create table rutas (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  nombre          text not null,
  region          text not null,
  distancia_km    integer not null check (distancia_km > 0),
  duracion_min    integer not null check (duracion_min > 0),
  dificultad      dificultad_ruta not null default 'media',
  descripcion     text,
  tags            text[] default '{}',
  waypoints       jsonb not null default '[]',
  publicada       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Valoraciones de ruta
create table valoraciones_ruta (
  id          uuid primary key default uuid_generate_v4(),
  ruta_id     uuid not null references rutas(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  puntuacion  integer not null check (puntuacion between 1 and 5),
  comentario  text,
  created_at  timestamptz not null default now(),
  unique (ruta_id, user_id)
);

-- Rutas favoritas
create table rutas_favoritas (
  user_id     uuid not null references profiles(id) on delete cascade,
  ruta_id     uuid not null references rutas(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, ruta_id)
);

-- ============================================================
-- INCIDENCIAS EN TIEMPO REAL
-- ============================================================

create table incidencias (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  tipo            tipo_incidencia not null,
  descripcion     text not null,
  via             text not null,
  severidad       severidad_incidencia not null default 'medium',
  confirmaciones  integer not null default 0,
  lat             numeric(10, 6) not null,
  lng             numeric(10, 6) not null,
  activa          boolean not null default true,
  expires_at      timestamptz not null default (now() + interval '4 hours'),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Quién ha confirmado cada incidencia (evita duplicados por usuario)
create table confirmaciones_incidencia (
  incidencia_id  uuid not null references incidencias(id) on delete cascade,
  user_id        uuid not null references profiles(id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (incidencia_id, user_id)
);

-- ============================================================
-- GRUPOS DE RODADA
-- ============================================================

create table grupos (
  id          uuid primary key default uuid_generate_v4(),
  nombre      text not null,
  lider_id    uuid not null references profiles(id) on delete cascade,
  ruta_id     uuid references rutas(id) on delete set null,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table miembros_grupo (
  grupo_id    uuid not null references grupos(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (grupo_id, user_id)
);

-- ============================================================
-- MAPA EN TIEMPO REAL
-- ============================================================

-- Posición GPS en vivo de cada usuario
create table ubicaciones (
  user_id     uuid primary key references profiles(id) on delete cascade,
  lat         numeric(10, 6) not null,
  lng         numeric(10, 6) not null,
  updated_at  timestamptz not null default now()
);

-- Puntos de interés del mapa
create table puntos_interes (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references profiles(id) on delete set null,
  tipo         tipo_poi not null,
  nombre       text not null,
  descripcion  text,
  lat          numeric(10, 6) not null,
  lng          numeric(10, 6) not null,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- FUNCIÓN + TRIGGER: crear perfil al registrarse
-- ============================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, apellidos, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellidos', ''),
    coalesce(new.raw_user_meta_data->>'username', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- FUNCIÓN + TRIGGER: sincronizar confirmaciones al confirmar incidencia
-- ============================================================

create or replace function sync_confirmaciones()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update incidencias set confirmaciones = confirmaciones + 1, updated_at = now()
    where id = new.incidencia_id;
  elsif TG_OP = 'DELETE' then
    update incidencias set confirmaciones = greatest(confirmaciones - 1, 0), updated_at = now()
    where id = old.incidencia_id;
  end if;
  return null;
end;
$$;

create trigger trg_sync_confirmaciones
  after insert or delete on confirmaciones_incidencia
  for each row execute procedure sync_confirmaciones();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table profiles                  enable row level security;
alter table motos                     enable row level security;
alter table rutas                     enable row level security;
alter table valoraciones_ruta         enable row level security;
alter table rutas_favoritas           enable row level security;
alter table incidencias               enable row level security;
alter table confirmaciones_incidencia enable row level security;
alter table grupos                    enable row level security;
alter table miembros_grupo            enable row level security;
alter table ubicaciones               enable row level security;
alter table puntos_interes            enable row level security;

-- profiles: cualquiera puede leer, solo tú puedes editar el tuyo
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- motos: cualquiera lee, solo el dueño modifica
create policy "motos_select"  on motos for select using (true);
create policy "motos_insert"  on motos for insert with check (auth.uid() = user_id);
create policy "motos_update"  on motos for update using (auth.uid() = user_id);
create policy "motos_delete"  on motos for delete using (auth.uid() = user_id);

-- rutas: cualquiera lee las publicadas, solo el autor modifica
create policy "rutas_select"  on rutas for select using (publicada = true or auth.uid() = user_id);
create policy "rutas_insert"  on rutas for insert with check (auth.uid() = user_id);
create policy "rutas_update"  on rutas for update using (auth.uid() = user_id);
create policy "rutas_delete"  on rutas for delete using (auth.uid() = user_id);

-- valoraciones_ruta
create policy "valoraciones_select" on valoraciones_ruta for select using (true);
create policy "valoraciones_insert" on valoraciones_ruta for insert with check (auth.uid() = user_id);
create policy "valoraciones_delete" on valoraciones_ruta for delete using (auth.uid() = user_id);

-- rutas_favoritas
create policy "favoritas_select" on rutas_favoritas for select using (auth.uid() = user_id);
create policy "favoritas_insert" on rutas_favoritas for insert with check (auth.uid() = user_id);
create policy "favoritas_delete" on rutas_favoritas for delete using (auth.uid() = user_id);

-- incidencias: cualquiera lee las activas, usuarios autenticados crean
create policy "incidencias_select" on incidencias for select using (activa = true or auth.uid() = user_id);
create policy "incidencias_insert" on incidencias for insert with check (auth.uid() = user_id);
create policy "incidencias_update" on incidencias for update using (auth.uid() = user_id);

-- confirmaciones_incidencia
create policy "confirmaciones_select" on confirmaciones_incidencia for select using (true);
create policy "confirmaciones_insert" on confirmaciones_incidencia for insert with check (auth.uid() = user_id);
create policy "confirmaciones_delete" on confirmaciones_incidencia for delete using (auth.uid() = user_id);

-- grupos
create policy "grupos_select" on grupos for select using (true);
create policy "grupos_insert" on grupos for insert with check (auth.uid() = lider_id);
create policy "grupos_update" on grupos for update using (auth.uid() = lider_id);

-- miembros_grupo
create policy "miembros_select" on miembros_grupo for select using (true);
create policy "miembros_insert" on miembros_grupo for insert with check (auth.uid() = user_id);
create policy "miembros_delete" on miembros_grupo for delete using (auth.uid() = user_id);

-- ubicaciones: cualquiera puede ver posiciones, solo tú actualizas la tuya
create policy "ubicaciones_select" on ubicaciones for select using (true);
create policy "ubicaciones_upsert" on ubicaciones for insert with check (auth.uid() = user_id);
create policy "ubicaciones_update" on ubicaciones for update using (auth.uid() = user_id);

-- puntos_interes
create policy "poi_select" on puntos_interes for select using (true);
create policy "poi_insert" on puntos_interes for insert with check (auth.uid() = user_id);
create policy "poi_delete" on puntos_interes for delete using (auth.uid() = user_id);
