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
create type estado_solicitud as enum ('pendiente', 'aceptada', 'rechazada');

-- ============================================================
-- PERFILES DE USUARIO
-- Se crea automáticamente al registrarse via Supabase Auth
-- ============================================================

create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  nombre          text not null,
  apellidos       text not null,
  username        text unique not null,
  avatar_url      text,
  zona            text,
  verified        boolean not null default false,
  online          boolean not null default false,
  last_seen       timestamptz,
  push_token      text,
  chat_abierto_id uuid,
  created_at      timestamptz not null default now()
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
-- SOLICITUDES DE AMISTAD
-- ============================================================

create table solicitudes_amistad (
  id          uuid primary key default uuid_generate_v4(),
  emisor_id   uuid not null references profiles(id) on delete cascade,
  receptor_id uuid not null references profiles(id) on delete cascade,
  estado      estado_solicitud not null default 'pendiente',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint solicitud_distinta_persona check (emisor_id <> receptor_id),
  unique (emisor_id, receptor_id)
);

-- ============================================================
-- CHAT PRIVADO ENTRE AMIGOS
-- ============================================================

create table conversaciones (
  id                uuid primary key default uuid_generate_v4(),
  usuario1_id       uuid not null references profiles(id) on delete cascade,
  usuario2_id       uuid not null references profiles(id) on delete cascade,
  created_at        timestamptz not null default now(),
  ultimo_mensaje_at timestamptz not null default now(),
  constraint conversacion_distinta_persona check (usuario1_id <> usuario2_id),
  constraint conversacion_orden check (usuario1_id < usuario2_id),
  unique (usuario1_id, usuario2_id)
);

alter table profiles
  add constraint profiles_chat_abierto_fkey
  foreign key (chat_abierto_id) references conversaciones(id) on delete set null;

create table mensajes (
  id              uuid primary key default uuid_generate_v4(),
  conversacion_id uuid not null references conversaciones(id) on delete cascade,
  emisor_id       uuid not null references profiles(id) on delete cascade,
  contenido       text not null,
  created_at      timestamptz not null default now(),
  leido           boolean not null default false
);

create table conversaciones_ocultas (
  conversacion_id uuid not null references conversaciones(id) on delete cascade,
  usuario_id      uuid not null references profiles(id) on delete cascade,
  ocultada_at     timestamptz not null default now(),
  primary key (conversacion_id, usuario_id)
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
-- FUNCIÓN + TRIGGER: sincronizar conversación al recibir mensaje
-- ============================================================

create or replace function sync_conversacion_on_mensaje()
returns trigger language plpgsql as $$
begin
  update conversaciones set ultimo_mensaje_at = new.created_at where id = new.conversacion_id;
  delete from conversaciones_ocultas where conversacion_id = new.conversacion_id;
  return new;
end;
$$;

create trigger trg_sync_conversacion_on_mensaje
  after insert on mensajes
  for each row execute procedure sync_conversacion_on_mensaje();

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
alter table solicitudes_amistad       enable row level security;
alter table conversaciones            enable row level security;
alter table mensajes                  enable row level security;
alter table conversaciones_ocultas    enable row level security;
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

-- solicitudes_amistad: ambos implicados ven/gestionan la solicitud, solo el emisor crea
create policy "solicitudes_select" on solicitudes_amistad for select using (auth.uid() = emisor_id or auth.uid() = receptor_id);
create policy "solicitudes_insert" on solicitudes_amistad for insert with check (auth.uid() = emisor_id);
create policy "solicitudes_update" on solicitudes_amistad for update using (auth.uid() = emisor_id or auth.uid() = receptor_id);
create policy "solicitudes_delete" on solicitudes_amistad for delete using (auth.uid() = emisor_id or auth.uid() = receptor_id);

-- conversaciones: solo los dos participantes pueden ver/crear/actualizar
create policy "conversaciones_select" on conversaciones for select using (auth.uid() = usuario1_id or auth.uid() = usuario2_id);
create policy "conversaciones_insert" on conversaciones for insert with check (auth.uid() = usuario1_id or auth.uid() = usuario2_id);
create policy "conversaciones_update" on conversaciones for update using (auth.uid() = usuario1_id or auth.uid() = usuario2_id);

-- mensajes: solo los participantes de la conversación pueden ver/crear/actualizar
create policy "mensajes_select" on mensajes for select
  using (exists (
    select 1 from conversaciones c
    where c.id = mensajes.conversacion_id
      and (c.usuario1_id = auth.uid() or c.usuario2_id = auth.uid())
  ));
create policy "mensajes_insert" on mensajes for insert
  with check (
    auth.uid() = emisor_id
    and exists (
      select 1 from conversaciones c
      where c.id = mensajes.conversacion_id
        and (c.usuario1_id = auth.uid() or c.usuario2_id = auth.uid())
    )
  );
create policy "mensajes_update" on mensajes for update
  using (exists (
    select 1 from conversaciones c
    where c.id = mensajes.conversacion_id
      and (c.usuario1_id = auth.uid() or c.usuario2_id = auth.uid())
  ));

-- conversaciones_ocultas: cada usuario gestiona solo sus propias filas
create policy "ocultas_select" on conversaciones_ocultas for select using (auth.uid() = usuario_id);
create policy "ocultas_insert" on conversaciones_ocultas for insert with check (auth.uid() = usuario_id);
create policy "ocultas_delete" on conversaciones_ocultas for delete using (auth.uid() = usuario_id);

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

-- ============================================================
-- REALTIME
-- ============================================================

alter publication supabase_realtime add table mensajes;
