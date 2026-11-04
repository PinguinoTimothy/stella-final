-- =====================================================================
--  Migración 004 · bloqueo con retroceso exponencial para el código de DM
--  Antes: 5 fallos => 15 min de bloqueo, y el contador volvía a 0.
--         Eso permitía ~480 intentos al día sin límite real.
--  Ahora: cada bloqueo dura el doble que el anterior (15 min, 30, 60… hasta ~16 h),
--         y el contador de bloqueos solo se resetea con un código correcto.
--  Ejecutar en Supabase > SQL Editor, DESPUÉS de cambiar el código (ver abajo).
-- =====================================================================

alter table public.dm_access add column if not exists lockouts int not null default 0;

create or replace function public.dm_read(pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  a dm_access; rv sync_state; tables jsonb;
begin
  select * into a from public.dm_access where id = 1 for update;

  if a.locked_until is not null and a.locked_until > now() then
    return jsonb_build_object('error', 'locked');
  end if;

  if a.pin_hash = '' or extensions.crypt(coalesce(pin, ''), a.pin_hash) <> a.pin_hash then
    if a.fails + 1 >= 5 then
      -- 5 fallos: bloqueo que crece con cada reincidencia (15 min × 2^lockouts, máx. 2^6)
      update public.dm_access
         set fails = 0,
             lockouts = a.lockouts + 1,
             locked_until = now() + interval '15 minutes' * power(2, least(a.lockouts, 6))
       where id = 1;
    else
      update public.dm_access set fails = a.fails + 1 where id = 1;
    end if;
    return jsonb_build_object('error', 'wrong');
  end if;

  -- código correcto: se resetea todo
  update public.dm_access set fails = 0, lockouts = 0, locked_until = null where id = 1;

  select * into rv from public.sync_state where id = 'main';
  select jsonb_build_object(
    'characters',     (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.characters t),
    'wallets',        (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.wallets t),
    'caster_classes', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.caster_classes t),
    'class_spells',   (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.class_spells t),
    'items',          (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.items t),
    'effects',        (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.effects t),
    'settings',       (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.settings t),
    'spells',         (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.spells t where t.custom)
  ) into tables;

  return jsonb_build_object('rev', coalesce(rv.rev, 0), 'updated_at', rv.updated_at, 'tables', tables);
end $function$;

-- =====================================================================
--  CAMBIAR EL CÓDIGO (hazlo tú, con tu propio código; no lo guardes en el repo):
--
--    update public.dm_access
--       set pin_hash = extensions.crypt('TU_CODIGO_DE_6_DIGITOS', extensions.gen_salt('bf', 10)),
--           fails = 0, lockouts = 0, locked_until = null
--     where id = 1;
--
--  Hazlo ANTES de desplegar la app con código de 6 dígitos: si no, el DM no podrá entrar.
-- =====================================================================
