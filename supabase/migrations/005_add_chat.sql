-- Chat privado entre usuarios amigos (RF-14)

create table if not exists conversaciones (
  id                uuid primary key default uuid_generate_v4(),
  usuario1_id       uuid not null references profiles(id) on delete cascade,
  usuario2_id       uuid not null references profiles(id) on delete cascade,
  created_at        timestamptz not null default now(),
  ultimo_mensaje_at timestamptz not null default now(),
  constraint conversacion_distinta_persona check (usuario1_id <> usuario2_id),
  constraint conversacion_orden check (usuario1_id < usuario2_id),
  unique (usuario1_id, usuario2_id)
);

create table if not exists mensajes (
  id              uuid primary key default uuid_generate_v4(),
  conversacion_id uuid not null references conversaciones(id) on delete cascade,
  emisor_id       uuid not null references profiles(id) on delete cascade,
  contenido       text not null,
  created_at      timestamptz not null default now(),
  leido           boolean not null default false
);

create table if not exists conversaciones_ocultas (
  conversacion_id uuid not null references conversaciones(id) on delete cascade,
  usuario_id      uuid not null references profiles(id) on delete cascade,
  ocultada_at     timestamptz not null default now(),
  primary key (conversacion_id, usuario_id)
);

alter table profiles add column if not exists push_token text;
alter table profiles add column if not exists chat_abierto_id uuid references conversaciones(id) on delete set null;

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

alter table conversaciones        enable row level security;
alter table mensajes              enable row level security;
alter table conversaciones_ocultas enable row level security;

-- conversaciones: solo los dos participantes pueden ver/crear/actualizar
create policy "conversaciones_select" on conversaciones for select
  using (auth.uid() = usuario1_id or auth.uid() = usuario2_id);

create policy "conversaciones_insert" on conversaciones for insert
  with check (auth.uid() = usuario1_id or auth.uid() = usuario2_id);

create policy "conversaciones_update" on conversaciones for update
  using (auth.uid() = usuario1_id or auth.uid() = usuario2_id);

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
create policy "ocultas_select" on conversaciones_ocultas for select
  using (auth.uid() = usuario_id);

create policy "ocultas_insert" on conversaciones_ocultas for insert
  with check (auth.uid() = usuario_id);

create policy "ocultas_delete" on conversaciones_ocultas for delete
  using (auth.uid() = usuario_id);

-- ============================================================
-- REALTIME
-- ============================================================

alter publication supabase_realtime add table mensajes;
