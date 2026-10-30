-- =====================================================================
--  PF1e tracker · esquema relacional
--  Pégalo entero en Supabase > SQL Editor y ejecútalo UNA vez.
--  Cambia el email de public.is_admin() si usas otro.
-- =====================================================================

-- ¿es el admin? (toda la seguridad de escritura pasa por aquí)
create or replace function public.is_admin() returns boolean
language sql stable as $$ select (auth.jwt() ->> 'email') = 'ianrodriguezocampo@gmail.com' $$;

-- ---------- control de versión (detecta conflictos entre dispositivos)
create table public.sync_state (
  id text primary key,
  rev bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------- ajustes sueltos (nombre del personaje, valoraciones)
create table public.settings (key text primary key, value jsonb);

-- ---------- party
create table public.characters (
  name text primary key,
  position int not null default 0
);
create table public.wallets (            -- owner = '' es el bote del grupo
  owner text primary key,
  pp int not null default 0, gp int not null default 0,
  sp int not null default 0, cp int not null default 0
);

-- ---------- inventario
create table public.items (
  id text primary key,
  position int not null default 0,
  owner text not null default '',        -- nombre del personaje ('' = compartido)
  name text not null,
  kind text not null default '',
  qty int not null default 1,
  equipped boolean not null default false,
  slot text not null default '',
  charges int not null default 0,
  max_charges int not null default 0,
  daily boolean not null default false,
  recovery text not null default 'none',
  notes text not null default '',
  spell_name text not null default '',
  cl int not null default 1,
  spell_level int not null default 0,
  catalog_id text not null default '',   -- id en magic_items
  price numeric not null default 0,
  weight numeric not null default 0,
  aura text not null default '',
  icl int not null default 0,
  extra jsonb not null default '{}'
);

-- ---------- efectos activos
create table public.effects (
  id text primary key,
  position int not null default 0,
  name text not null default '',
  kind text not null default '',
  target text not null default '',
  targets jsonb not null default '[]',
  rem numeric, tot numeric,
  cl int not null default 1,
  note text not null default '',         -- PRIVADO: los jugadores no lo ven
  extra jsonb not null default '{}'      -- PRIVADO
);

-- ---------- tus clases y hechizos (PRIVADO)
create table public.caster_classes (
  id text primary key,
  position int not null default 0,
  name text not null default '', pre text not null default '',
  lvl int not null default 1, type text not null default 'prep',
  ab text not null default 'wis', score int not null default 10,
  cl int not null default 1, abbr text not null default '', dcb int not null default 0,
  dom boolean not null default false, all_spells boolean not null default false,
  domains jsonb not null default '[]', dsel jsonb not null default '[]', sf jsonb not null default '[]',
  base jsonb not null default '[]', used jsonb not null default '[]', dused jsonb not null default '[]',
  extra jsonb not null default '{}'
);
create table public.class_spells (
  id text primary key,
  class_id text not null references public.caster_classes(id) on delete cascade,
  lvl int not null, position int not null default 0,
  name text not null,
  note text not null default '',
  prep int not null default 0, copies_left int not null default 0,
  dom boolean not null default false, dcb int not null default 0,
  extra jsonb not null default '{}'
);

-- ---------- catálogo de hechizos (importado del Excel) + hechizos propios
create table public.spells (
  id text primary key,
  custom boolean not null default false, -- true = creado por ti; false = catálogo
  position int not null default 0,
  name text not null,
  school text not null default '', tag text not null default '', lv text not null default '',
  ct text not null default '', rng text not null default '', area text not null default '',
  eff text not null default '', tg text not null default '', dur text not null default '',
  sv text not null default '', sr text not null default '', src text not null default '',
  comp text not null default '', cost text not null default '',
  rt int not null default 0, descr text not null default '',
  deity text not null default '', domain text not null default '',
  extra jsonb not null default '{}'
);
create index on public.spells (name);

-- ---------- catálogo de objetos mágicos
create table public.magic_items (
  id text primary key,
  position int not null default 0,
  name text not null,
  aura text not null default '', cl text not null default '', slot text not null default '',
  price text not null default '', weight text not null default '',
  descr text not null default '', requirements text not null default '',
  cost text not null default '', group_name text not null default '',
  source text not null default '', fulltext text not null default '',
  extra jsonb not null default '{}'
);
create index on public.magic_items (name);

-- versión de cada catálogo, para no descargarlo entero cada vez
create table public.catalog_ver (id text primary key, ver bigint not null default 0);

-- =====================================================================
--  Seguridad: escribe solo el admin; los jugadores solo leen lo público
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['sync_state','settings','characters','wallets','items','effects',
                           'caster_classes','class_spells','spells','magic_items','catalog_ver'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "admin todo" on public.%I for all to authenticated
                    using (public.is_admin()) with check (public.is_admin())', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;

  -- lectura pública (jugadores con la clave anon)
  foreach t in array array['sync_state','settings','characters','wallets','items',
                           'spells','magic_items','catalog_ver'] loop
    execute format('create policy "lectura publica" on public.%I for select to anon using (true)', t);
    execute format('grant select on public.%I to anon', t);
  end loop;
end $$;

-- efectos: los jugadores ven solo estas columnas (sin notas privadas)
create policy "lectura publica" on public.effects for select to anon using (true);
grant select (id, position, name, kind, target, targets, rem, tot, cl) on public.effects to anon;

-- caster_classes y class_spells: sin política para anon => invisibles para los jugadores

grant usage on schema public to anon, authenticated;

-- =====================================================================
--  Guardado atómico: aplica todos los cambios de una vez, o ninguno,
--  y falla con 409 si otro dispositivo guardó antes (rev distinta).
-- =====================================================================
create or replace function public.apply_changes(expected bigint, changes jsonb, full boolean default false)
returns bigint language plpgsql security invoker set search_path = public as $$
declare
  tbl text[] := array['characters','wallets','caster_classes','class_spells','items','effects','spells','settings'];
  pks text[] := array['name','owner','id','id','id','id','id','key'];
  t text; pk text; cols text; ups jsonb; dels jsonb; ids text[]; i int; cur bigint;
begin
  insert into sync_state(id, rev) values ('main', 0) on conflict (id) do nothing;
  select rev into cur from sync_state where id = 'main' for update;
  if cur <> expected then
    raise exception 'conflict' using errcode = 'PT409';
  end if;

  for i in 1 .. array_length(tbl, 1) loop
    t := tbl[i]; pk := pks[i];
    ups  := coalesce(changes -> t -> 'up',  '[]'::jsonb);
    dels := coalesce(changes -> t -> 'del', '[]'::jsonb);

    select string_agg(format('%I = excluded.%I', column_name, column_name), ', ') into cols
      from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name <> pk;

    if jsonb_array_length(ups) > 0 then
      execute format('insert into public.%I select * from jsonb_populate_recordset(null::public.%I, $1)
                      on conflict (%I) do update set %s', t, t, pk, cols) using ups;
    end if;
    if jsonb_array_length(dels) > 0 then
      execute format('delete from public.%I where %I = any($1)%s', t, pk,
                     case when t = 'spells' then ' and custom' else '' end)
        using array(select jsonb_array_elements_text(dels));
    end if;
    if full then   -- reemplazo completo: borra lo que no venga en esta subida
      ids := array(select r ->> pk from jsonb_array_elements(ups) r);
      execute format('delete from public.%I where not (%I = any($1))%s', t, pk,
                     case when t = 'spells' then ' and custom' else '' end) using ids;
    end if;
  end loop;

  update sync_state set rev = rev + 1, updated_at = now() where id = 'main' returning rev into cur;
  return cur;
end $$;
grant execute on function public.apply_changes(bigint, jsonb, boolean) to authenticated;
