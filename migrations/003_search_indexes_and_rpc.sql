-- =====================================================================
--  003 · índices de búsqueda y funciones de lista para el catálogo de objetos mágicos y equipo
--  Ejecutar en Supabase > SQL Editor ANTES de desplegar el frontend que las usa.
--  Si no se ejecuta, el frontend cae al método antiguo (más lento, misma respuesta).
--  Idempotente: se puede ejecutar más de una vez.
-- =====================================================================

-- ---------- búsqueda por subcadena (ilike '%x%') con índices trigram
-- Supabase guarda las extensiones en el esquema "extensions". En otra instalación, quita "with schema".
create extension if not exists pg_trgm with schema extensions;

-- Un índice por columna de MAGIC_SEARCH_FIELDS (src/lib/supabase.js). Postgres combina los índices
-- cuando la búsqueda es un OR entre columnas (BitmapOr), así que basta con un índice por columna.
-- Nota: fulltext es el campo más grande; su índice ocupará bastante espacio. Ver el tamaño tras crearlo.
create index if not exists magic_items_name_trgm        on public.magic_items using gin (name extensions.gin_trgm_ops);
create index if not exists magic_items_slot_trgm        on public.magic_items using gin (slot extensions.gin_trgm_ops);
create index if not exists magic_items_group_trgm       on public.magic_items using gin (group_name extensions.gin_trgm_ops);
create index if not exists magic_items_descr_trgm       on public.magic_items using gin (descr extensions.gin_trgm_ops);
create index if not exists magic_items_aura_trgm        on public.magic_items using gin (aura extensions.gin_trgm_ops);
create index if not exists magic_items_source_trgm      on public.magic_items using gin (source extensions.gin_trgm_ops);
create index if not exists magic_items_requirements_trgm on public.magic_items using gin (requirements extensions.gin_trgm_ops);
create index if not exists magic_items_price_trgm       on public.magic_items using gin (price extensions.gin_trgm_ops);
create index if not exists magic_items_cl_trgm          on public.magic_items using gin (cl extensions.gin_trgm_ops);
create index if not exists magic_items_fulltext_trgm    on public.magic_items using gin (fulltext extensions.gin_trgm_ops);

-- ---------- valores de los desplegables: calculados en la base de datos
-- Antes el cliente descargaba dos columnas enteras (cientos o miles de filas) en cada carga.
-- Mismas reglas que antes: grupos = nombres no vacíos; huecos = slots de los objetos "Wondrous Item".
create or replace function public.magic_facets()
returns json language sql stable security invoker set search_path = public as $$
  select json_build_object(
    'groups', coalesce((
      select json_agg(g order by g) from (
        select distinct trim(group_name) as g from public.magic_items where trim(group_name) <> ''
      ) s), '[]'::json),
    'slots', coalesce((
      select json_agg(x order by x) from (
        select distinct trim(slot) as x from public.magic_items
        where lower(trim(group_name)) = 'wondrous item' and trim(slot) <> ''
      ) s), '[]'::json)
  )
$$;
grant execute on function public.magic_facets() to anon, authenticated;

-- Categorías del catálogo de equipo (vista equipment_catalog). Devuelve un array de texto.
create or replace function public.equipment_categories()
returns setof text language sql stable security invoker set search_path = public as $$
  select distinct trim(category) from public.equipment_catalog
  where trim(category) <> ''
  order by 1
$$;
grant execute on function public.equipment_categories() to anon, authenticated;

-- ---------- índices del catálogo de equipo
-- No se pueden crear sobre la vista equipment_catalog. Hay que ponerlos en las tablas de origen
-- (item, item_stat…), cuyo esquema está en migrations/002_equipment_catalog.sql, que no está en el repo.
-- Pendiente: añadir aquí los índices trigram de las columnas que usa equipmentParams (name, heading, category).
