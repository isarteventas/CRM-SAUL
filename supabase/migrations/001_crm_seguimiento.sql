-- =====================================================================
-- EDAI · CRM de seguimiento — Migración 001 (multi-negocio)
-- Ejecutar en Supabase > SQL Editor del proyecto de EDAI-PANEL.
--
-- Modelo:
--   crm_negocios      cada negocio que te compra el CRM (lo crea EDAI)
--   crm_usuarios      dueño y vendedores de cada negocio (con login)
--   crm_planes        planes/productos del negocio (periodo y personas)
--   crm_clientes      clientes finales; titular_id = integrante de grupo
--   crm_recordatorios seguimientos
--   crm_plantillas    mensajes de WhatsApp
--   crm_actividad     historial (mensajes, renovaciones, cambios)
--   edai_admins       usuarios de EDAI con acceso al panel maestro
--
-- Las acciones de administración de EDAI (crear negocios, suspender,
-- cambiar plan EDAI, invitar al dueño) se hacen desde admin.edaisoftware.com
-- en el servidor con la service_role key, nunca desde el navegador.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------
create table if not exists public.edai_admins (
  user_id    uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_negocios (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  logo_url     text,
  telefono     text,
  pais_codigo  text not null default '591',
  moneda       text not null default 'Bs.',
  dias_aviso   int  not null default 7 check (dias_aviso between 1 and 60),
  plan_edai    text,                                   -- Emprende / Negocio / Empresa
  estado       text not null default 'activo' check (estado in ('activo','suspendido')),
  vence_edai   date,                                   -- vencimiento de la suscripción a EDAI
  created_at   timestamptz not null default now()
);

create table if not exists public.crm_usuarios (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references public.crm_negocios on delete cascade,
  user_id     uuid references auth.users on delete set null,
  rol         text not null default 'vendedor' check (rol in ('dueno','vendedor')),
  nombre      text not null,
  empresa     text,
  telefono    text,
  email       text,
  created_at  timestamptz not null default now(),
  unique (negocio_id, user_id)
);

create table if not exists public.crm_planes (
  id             uuid primary key default gen_random_uuid(),
  negocio_id     uuid not null references public.crm_negocios on delete cascade,
  nombre         text not null,
  precio         numeric(12,2),
  periodo_meses  int  not null default 1 check (periodo_meses in (0,1,3,6,12)),  -- 0 = sin periodo fijo
  personas       int  not null default 1 check (personas between 1 and 50),        -- >1 = plan grupal
  descripcion    text,
  activo         boolean not null default true,
  created_at     timestamptz not null default now()
);

create table if not exists public.crm_clientes (
  id               uuid primary key default gen_random_uuid(),
  negocio_id       uuid not null references public.crm_negocios on delete cascade,
  nombre           text not null,                 -- cliente o negocio
  telefono         text not null,
  plan_id          uuid references public.crm_planes on delete set null,
  vendedor_id      uuid references public.crm_usuarios on delete set null,
  titular_id       uuid references public.crm_clientes on delete set null,
  monto            numeric(12,2),
  periodo_meses    int  not null default 1 check (periodo_meses in (0,1,3,6,12)),
  inicio           date default current_date,
  vencimiento      date,
  estado           text not null default 'activo' check (estado in ('activo','pausado','baja')),
  notas            text,
  ultimo_contacto  date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (titular_id is null or titular_id <> id)
);
create index if not exists crm_clientes_venc_idx    on public.crm_clientes (negocio_id, vencimiento);
create index if not exists crm_clientes_titular_idx on public.crm_clientes (titular_id);
create index if not exists crm_clientes_vend_idx    on public.crm_clientes (vendedor_id);

create table if not exists public.crm_recordatorios (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references public.crm_negocios on delete cascade,
  cliente_id  uuid not null references public.crm_clientes on delete cascade,
  fecha       date not null,
  nota        text,
  hecho       boolean not null default false,
  hecho_el    date,
  creado_por  uuid default auth.uid() references auth.users on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists crm_rec_fecha_idx on public.crm_recordatorios (negocio_id, hecho, fecha);

create table if not exists public.crm_plantillas (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references public.crm_negocios on delete cascade,
  nombre      text not null,
  texto       text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.crm_actividad (
  id          bigint generated always as identity primary key,
  negocio_id  uuid not null references public.crm_negocios on delete cascade,
  cliente_id  uuid not null references public.crm_clientes on delete cascade,
  tipo        text not null check (tipo in ('mensaje','renovacion','cambio_plan','vencimiento','grupo','nota')),
  detalle     text,
  user_id     uuid default auth.uid() references auth.users on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists crm_act_cliente_idx on public.crm_actividad (cliente_id, created_at desc);

-- ---------------------------------------------------------------------
-- Funciones de permisos (security definer: evitan recursión en RLS)
-- ---------------------------------------------------------------------
create or replace function public.crm_es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from edai_admins where user_id = auth.uid());
$$;

create or replace function public.crm_rol(p_negocio uuid) returns text
language sql stable security definer set search_path = public as $$
  select rol from crm_usuarios where negocio_id = p_negocio and user_id = auth.uid() limit 1;
$$;

create or replace function public.crm_mi_usuario(p_negocio uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from crm_usuarios where negocio_id = p_negocio and user_id = auth.uid() limit 1;
$$;

-- Un negocio suspendido o con la suscripción EDAI vencida hace más de 5 días
-- queda en solo lectura.
create or replace function public.crm_puede_escribir(p_negocio uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select crm_rol(p_negocio) is not null
     and exists (select 1 from crm_negocios n
                 where n.id = p_negocio and n.estado = 'activo'
                   and (n.vence_edai is null or n.vence_edai >= current_date - 5));
$$;

-- ---------------------------------------------------------------------
-- Integridad de clientes y grupos
-- ---------------------------------------------------------------------
create or replace function public.crm_clientes_antes() returns trigger
language plpgsql security definer set search_path = public as $$
declare t crm_clientes; cap int; n int;
begin
  new.updated_at := now();

  if new.plan_id is not null and not exists
     (select 1 from crm_planes where id = new.plan_id and negocio_id = new.negocio_id) then
    raise exception 'El plan no pertenece a este negocio';
  end if;
  if new.vendedor_id is not null and not exists
     (select 1 from crm_usuarios where id = new.vendedor_id and negocio_id = new.negocio_id) then
    raise exception 'El vendedor no pertenece a este negocio';
  end if;

  if new.titular_id is not null then
    select * into t from crm_clientes where id = new.titular_id;
    if t.id is null or t.negocio_id <> new.negocio_id then
      raise exception 'Titular inválido';
    end if;
    if t.titular_id is not null then
      raise exception 'El titular no puede ser integrante de otro grupo';
    end if;
    if exists (select 1 from crm_clientes where titular_id = new.id) then
      raise exception 'Este cliente ya es titular de un grupo';
    end if;
    select coalesce(personas, 1) into cap from crm_planes where id = t.plan_id;
    select count(*) into n from crm_clientes where titular_id = t.id and id <> new.id;
    if n + 1 >= coalesce(cap, 1) then
      raise exception 'El grupo de % está completo (% personas)', t.nombre, coalesce(cap, 1);
    end if;
    -- El integrante sigue al titular
    new.plan_id       := t.plan_id;
    new.periodo_meses := t.periodo_meses;
    new.inicio        := t.inicio;
    new.vencimiento   := t.vencimiento;
    new.estado        := t.estado;
    new.vendedor_id   := t.vendedor_id;
    new.monto         := null;
  end if;
  return new;
end $$;

drop trigger if exists crm_clientes_antes on public.crm_clientes;
create trigger crm_clientes_antes before insert or update on public.crm_clientes
  for each row execute function public.crm_clientes_antes();

-- Cuando cambia el titular, se actualiza todo su grupo. Si el nuevo plan
-- admite menos personas, los integrantes que sobran quedan individuales.
create or replace function public.crm_sync_grupo() returns trigger
language plpgsql security definer set search_path = public as $$
declare cap int;
begin
  if new.titular_id is null and
     (new.plan_id, new.periodo_meses, new.inicio, new.vencimiento, new.estado, new.vendedor_id)
     is distinct from
     (old.plan_id, old.periodo_meses, old.inicio, old.vencimiento, old.estado, old.vendedor_id) then
    select coalesce(personas, 1) into cap from crm_planes where id = new.plan_id;
    cap := coalesce(cap, 1);
    update crm_clientes set titular_id = null
     where id in (select id from crm_clientes where titular_id = new.id
                  order by created_at offset greatest(cap - 1, 0));
    update crm_clientes set updated_at = now() where titular_id = new.id;  -- re-copia vía trigger
  end if;
  return null;
end $$;

drop trigger if exists crm_sync_grupo on public.crm_clientes;
create trigger crm_sync_grupo after update on public.crm_clientes
  for each row execute function public.crm_sync_grupo();

-- Plantillas iniciales al crear un negocio
create or replace function public.crm_negocio_nuevo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into crm_plantillas (negocio_id, nombre, texto) values
  (new.id, 'Suscripción por vencer', E'Hola {nombre} 👋, te saluda {vendedor} de {empresa}.\nTe recuerdo que tu suscripción {plan} vence el {fecha} (faltan {dias} días).\n¿Te ayudo a renovarla para que no pierdas el servicio?'),
  (new.id, 'Suscripción vencida',    E'Hola {nombre}, tu suscripción {plan} venció el {fecha}.\nPara reactivarla el monto es {moneda} {monto}. ¿Te paso los datos para el pago?\nSaludos, {vendedor}.'),
  (new.id, 'Seguimiento',            E'Hola {nombre}, ¿cómo te va con {plan}? Quería saber si necesitas algo de nuestra parte.\nSaludos, {vendedor} – {empresa}.'),
  (new.id, 'Gracias por renovar',    E'¡Gracias {nombre}! 🎉 Tu suscripción {plan} quedó renovada hasta el {fecha}.\nCualquier cosa, aquí estoy. {vendedor}.');
  return new;
end $$;

drop trigger if exists crm_negocio_nuevo on public.crm_negocios;
create trigger crm_negocio_nuevo after insert on public.crm_negocios
  for each row execute function public.crm_negocio_nuevo();

-- ---------------------------------------------------------------------
-- RPC para la app
-- ---------------------------------------------------------------------
-- Renueva: con periodo del plan suma automáticamente; sin periodo exige fecha.
-- Si se llama con un integrante, renueva al titular (y el grupo lo sigue).
create or replace function public.crm_renovar(p_cliente uuid, p_hasta date default null)
returns date language plpgsql security invoker set search_path = public as $$
declare c crm_clientes; meses int; base date; nueva date;
begin
  select * into c from crm_clientes where id = p_cliente;
  if c.id is null then raise exception 'Cliente no encontrado'; end if;
  if c.titular_id is not null then
    select * into c from crm_clientes where id = c.titular_id;
  end if;

  if p_hasta is not null then
    nueva := p_hasta;
  else
    select p.periodo_meses into meses from crm_planes p where p.id = c.plan_id;
    meses := coalesce(meses, c.periodo_meses, 0);
    if meses = 0 then
      raise exception 'Este plan no tiene periodo fijo: indica la nueva fecha';
    end if;
    base  := greatest(coalesce(c.vencimiento, current_date), current_date);
    nueva := (base + make_interval(months => meses))::date;
  end if;

  update crm_clientes set vencimiento = nueva, estado = 'activo' where id = c.id;
  insert into crm_actividad (negocio_id, cliente_id, tipo, detalle)
  values (c.negocio_id, c.id, 'renovacion', 'Renovado hasta ' || to_char(nueva, 'DD/MM/YYYY'));
  return nueva;
end $$;

-- Números del Panel (respeta RLS: un vendedor ve solo lo suyo)
create or replace function public.crm_resumen(p_negocio uuid)
returns table (por_vencer bigint, vencidos bigint, al_dia bigint, inactivos bigint, por_cobrar numeric)
language sql stable security invoker set search_path = public as $$
  with d as (
    select c.estado, c.titular_id, (c.vencimiento - current_date) as dr, n.dias_aviso,
           coalesce(c.monto, p.precio, 0) as m
      from crm_clientes c
      join crm_negocios n on n.id = c.negocio_id
      left join crm_planes p on p.id = c.plan_id
     where c.negocio_id = p_negocio
  )
  select count(*) filter (where estado = 'activo' and dr between 0 and dias_aviso),
         count(*) filter (where estado = 'activo' and dr < 0),
         count(*) filter (where estado = 'activo' and (dr is null or dr > dias_aviso)),
         count(*) filter (where estado <> 'activo'),
         coalesce(sum(m) filter (where estado = 'activo' and dr <= dias_aviso and titular_id is null), 0)
    from d;
$$;

-- Métricas para el panel maestro de EDAI (a quién ofrecer un plan mejor)
create or replace function public.crm_admin_metricas()
returns table (negocio_id uuid, nombre text, plan_edai text, estado text, vence_edai date,
               clientes bigint, clientes_activos bigint, usuarios bigint, ultima_actividad timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not crm_es_admin() then raise exception 'No autorizado'; end if;
  return query
  select n.id, n.nombre, n.plan_edai, n.estado, n.vence_edai,
         (select count(*) from crm_clientes c where c.negocio_id = n.id),
         (select count(*) from crm_clientes c where c.negocio_id = n.id and c.estado = 'activo'),
         (select count(*) from crm_usuarios u where u.negocio_id = n.id),
         (select max(a.created_at) from crm_actividad a where a.negocio_id = n.id)
    from crm_negocios n
   order by n.nombre;
end $$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.edai_admins       enable row level security;
alter table public.crm_negocios      enable row level security;
alter table public.crm_usuarios      enable row level security;
alter table public.crm_planes        enable row level security;
alter table public.crm_clientes      enable row level security;
alter table public.crm_recordatorios enable row level security;
alter table public.crm_plantillas    enable row level security;
alter table public.crm_actividad     enable row level security;

-- edai_admins: solo lectura de la propia fila
create policy admins_sel on public.edai_admins for select to authenticated
  using (user_id = auth.uid());

-- negocios: los miembros leen; el dueño edita solo datos de su perfil
create policy neg_sel on public.crm_negocios for select to authenticated
  using (crm_es_admin() or crm_rol(id) is not null);
create policy neg_upd on public.crm_negocios for update to authenticated
  using (crm_rol(id) = 'dueno') with check (crm_rol(id) = 'dueno');
revoke insert, delete, update on public.crm_negocios from anon, authenticated;
grant update (nombre, logo_url, telefono, pais_codigo, moneda, dias_aviso)
  on public.crm_negocios to authenticated;

-- usuarios: todos los miembros los ven; el dueño los administra
create policy usu_sel on public.crm_usuarios for select to authenticated
  using (crm_es_admin() or crm_rol(negocio_id) is not null);
create policy usu_ins on public.crm_usuarios for insert to authenticated
  with check (crm_rol(negocio_id) = 'dueno' and crm_puede_escribir(negocio_id));
create policy usu_upd on public.crm_usuarios for update to authenticated
  using (crm_rol(negocio_id) = 'dueno' and crm_puede_escribir(negocio_id))
  with check (crm_rol(negocio_id) = 'dueno');
create policy usu_del on public.crm_usuarios for delete to authenticated
  using (crm_rol(negocio_id) = 'dueno' and crm_puede_escribir(negocio_id) and user_id is distinct from auth.uid());

-- planes y plantillas: todos leen, el dueño edita
create policy pla_sel on public.crm_planes for select to authenticated
  using (crm_es_admin() or crm_rol(negocio_id) is not null);
create policy pla_ins on public.crm_planes for insert to authenticated
  with check (crm_rol(negocio_id) = 'dueno' and crm_puede_escribir(negocio_id));
create policy pla_upd on public.crm_planes for update to authenticated
  using (crm_rol(negocio_id) = 'dueno' and crm_puede_escribir(negocio_id))
  with check (crm_rol(negocio_id) = 'dueno');
create policy pla_del on public.crm_planes for delete to authenticated
  using (crm_rol(negocio_id) = 'dueno' and crm_puede_escribir(negocio_id));

create policy tpl_sel on public.crm_plantillas for select to authenticated
  using (crm_es_admin() or crm_rol(negocio_id) is not null);
create policy tpl_ins on public.crm_plantillas for insert to authenticated
  with check (crm_rol(negocio_id) = 'dueno' and crm_puede_escribir(negocio_id));
create policy tpl_upd on public.crm_plantillas for update to authenticated
  using (crm_rol(negocio_id) = 'dueno' and crm_puede_escribir(negocio_id))
  with check (crm_rol(negocio_id) = 'dueno');
create policy tpl_del on public.crm_plantillas for delete to authenticated
  using (crm_rol(negocio_id) = 'dueno' and crm_puede_escribir(negocio_id));

-- clientes: el dueño ve todo; cada vendedor solo su cartera
create policy cli_sel on public.crm_clientes for select to authenticated
  using (crm_es_admin()
         or crm_rol(negocio_id) = 'dueno'
         or (crm_rol(negocio_id) = 'vendedor' and vendedor_id = crm_mi_usuario(negocio_id)));
create policy cli_ins on public.crm_clientes for insert to authenticated
  with check (crm_puede_escribir(negocio_id)
              and (crm_rol(negocio_id) = 'dueno' or vendedor_id = crm_mi_usuario(negocio_id)));
create policy cli_upd on public.crm_clientes for update to authenticated
  using (crm_puede_escribir(negocio_id)
         and (crm_rol(negocio_id) = 'dueno' or vendedor_id = crm_mi_usuario(negocio_id)))
  with check (crm_rol(negocio_id) = 'dueno' or vendedor_id = crm_mi_usuario(negocio_id));
create policy cli_del on public.crm_clientes for delete to authenticated
  using (crm_rol(negocio_id) = 'dueno' and crm_puede_escribir(negocio_id));

-- recordatorios y actividad: siguen la visibilidad del cliente
create policy rec_sel on public.crm_recordatorios for select to authenticated
  using (exists (select 1 from crm_clientes c where c.id = cliente_id));
create policy rec_ins on public.crm_recordatorios for insert to authenticated
  with check (crm_puede_escribir(negocio_id)
              and exists (select 1 from crm_clientes c where c.id = cliente_id and c.negocio_id = crm_recordatorios.negocio_id));
create policy rec_upd on public.crm_recordatorios for update to authenticated
  using (crm_puede_escribir(negocio_id) and exists (select 1 from crm_clientes c where c.id = cliente_id))
  with check (exists (select 1 from crm_clientes c where c.id = cliente_id and c.negocio_id = crm_recordatorios.negocio_id));
create policy rec_del on public.crm_recordatorios for delete to authenticated
  using (crm_puede_escribir(negocio_id) and exists (select 1 from crm_clientes c where c.id = cliente_id));

create policy act_sel on public.crm_actividad for select to authenticated
  using (exists (select 1 from crm_clientes c where c.id = cliente_id));
create policy act_ins on public.crm_actividad for insert to authenticated
  with check (crm_puede_escribir(negocio_id)
              and exists (select 1 from crm_clientes c where c.id = cliente_id and c.negocio_id = crm_actividad.negocio_id));

grant execute on function public.crm_renovar(uuid, date)  to authenticated;
grant execute on function public.crm_resumen(uuid)         to authenticated;
grant execute on function public.crm_admin_metricas()      to authenticated;

-- ---------------------------------------------------------------------
-- Para darte acceso al panel maestro (cambia el correo y ejecútalo una vez):
-- insert into public.edai_admins (user_id)
--   select id from auth.users where email = 'tu-correo@edaisoftware.com';
-- ---------------------------------------------------------------------
