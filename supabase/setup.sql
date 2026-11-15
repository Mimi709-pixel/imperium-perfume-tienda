-- =====================================================================
-- IMPERIUM PERFUME GALLERY - Configuración de Supabase
-- Pegar completo en Supabase > SQL Editor > New query > Run
-- Se puede ejecutar varias veces sin dañar nada.
-- =====================================================================


-- 1. PRODUCTOS: columnas que el admin necesita guardar
-- (antes se perdían precio anterior, etiqueta, disponible y destacado)
alter table public.products add column if not exists original_price numeric default 0;
alter table public.products add column if not exists promo_badge   text    default '';
alter table public.products add column if not exists available     boolean default true;
alter table public.products add column if not exists featured      boolean default false;
alter table public.products add column if not exists description   text    default '';


-- 2. CONFIGURACIÓN DE LA TIENDA (envíos, cupones, anuncios, WhatsApp)
create table if not exists public.store_config (
  id         text primary key default 'main',
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.store_config (id, data)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;


-- 3. ADMINISTRADORES
-- Solo los usuarios que estén en esta tabla pueden modificar la tienda
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

grant execute on function public.is_admin() to anon, authenticated;


-- 4. SEGURIDAD (RLS): todos pueden ver, solo el admin puede modificar
alter table public.products     enable row level security;
alter table public.store_config enable row level security;
alter table public.admin_users  enable row level security;

-- Quita las políticas anteriores de estas tablas (podían permitir que cualquiera escribiera)
do $$
declare p record;
begin
  for p in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('products', 'store_config', 'admin_users')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

create policy "Lectura publica de productos" on public.products
  for select using (true);
create policy "Solo admin crea productos" on public.products
  for insert to authenticated with check (public.is_admin());
create policy "Solo admin edita productos" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Solo admin elimina productos" on public.products
  for delete to authenticated using (public.is_admin());

create policy "Lectura publica de configuracion" on public.store_config
  for select using (true);
create policy "Solo admin crea configuracion" on public.store_config
  for insert to authenticated with check (public.is_admin());
create policy "Solo admin edita configuracion" on public.store_config
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Cada admin ve su registro" on public.admin_users
  for select to authenticated using (user_id = auth.uid());


-- 5. IMÁGENES DE PRODUCTOS (Supabase Storage)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images', 'product-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Imagenes publicas"        on storage.objects;
drop policy if exists "Solo admin sube imagenes" on storage.objects;
drop policy if exists "Solo admin edita imagenes" on storage.objects;
drop policy if exists "Solo admin borra imagenes" on storage.objects;

create policy "Imagenes publicas" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "Solo admin sube imagenes" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
create policy "Solo admin edita imagenes" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_admin());
create policy "Solo admin borra imagenes" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());


-- 6. TIEMPO REAL: la tienda se actualiza sola cuando el admin guarda
do $$
begin
  begin
    alter publication supabase_realtime add table public.products;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.store_config;
  exception when duplicate_object then null;
  end;
end $$;


-- =====================================================================
-- 7. DAR PERMISO DE ADMINISTRADOR (ejecutar DESPUÉS de crear el usuario)
-- Primero crea el usuario en Authentication > Users > Add user
-- con el correo y la clave del cliente, marcando "Auto Confirm User".
-- Luego cambia el correo de abajo y ejecuta solo esta parte:
-- =====================================================================
-- insert into public.admin_users (user_id)
-- select id from auth.users where email = 'CORREO_DEL_ADMIN@ejemplo.com'
-- on conflict do nothing;
