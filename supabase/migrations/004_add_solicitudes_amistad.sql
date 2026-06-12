-- Solicitudes de amistad entre usuarios

create type estado_solicitud as enum ('pendiente', 'aceptada', 'rechazada');

create table if not exists solicitudes_amistad (
  id          uuid primary key default uuid_generate_v4(),
  emisor_id   uuid not null references profiles(id) on delete cascade,
  receptor_id uuid not null references profiles(id) on delete cascade,
  estado      estado_solicitud not null default 'pendiente',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint solicitud_distinta_persona check (emisor_id <> receptor_id),
  unique (emisor_id, receptor_id)
);

alter table solicitudes_amistad enable row level security;

-- ambos implicados pueden ver la solicitud
create policy "solicitudes_select" on solicitudes_amistad for select
  using (auth.uid() = emisor_id or auth.uid() = receptor_id);

-- solo el emisor puede crear la solicitud
create policy "solicitudes_insert" on solicitudes_amistad for insert
  with check (auth.uid() = emisor_id);

-- emisor o receptor pueden actualizar (aceptar/rechazar/reenviar)
create policy "solicitudes_update" on solicitudes_amistad for update
  using (auth.uid() = emisor_id or auth.uid() = receptor_id);

-- emisor o receptor pueden eliminar (cancelar solicitud o eliminar amistad)
create policy "solicitudes_delete" on solicitudes_amistad for delete
  using (auth.uid() = emisor_id or auth.uid() = receptor_id);
