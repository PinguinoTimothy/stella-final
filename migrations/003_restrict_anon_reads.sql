-- =====================================================================
--  Migración 003 · cerrar lectura anónima de settings y wallets
--  Ejecutar UNA vez en Supabase > SQL Editor en bases que ya tienen schema.sql.
--  Los jugadores (clave anon) pasan a ver solo lo que muestra la vista:
--    settings: name, history, conditions
--    wallets:  solo el bote del grupo (owner = '')
--  El admin no cambia: sigue leyendo y escribiendo todo.
-- =====================================================================

drop policy if exists "lectura publica" on public.settings;
create policy "lectura publica" on public.settings for select to anon
  using (key in ('name', 'history', 'conditions'));

drop policy if exists "lectura publica" on public.wallets;
create policy "lectura publica" on public.wallets for select to anon
  using (owner = '');

-- Comprobación rápida (debe devolver solo las claves permitidas y solo el bote):
--   set role anon;  select key from public.settings;  select owner from public.wallets;  reset role;
