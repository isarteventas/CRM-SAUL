'use server';
import { headers } from 'next/headers';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

type Resultado = { ok: boolean; mensaje?: string; error?: string };

function origen() {
  const h = headers();
  return process.env.NEXT_PUBLIC_SITE_URL || h.get('origin') || `https://${h.get('host')}`;
}

const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// Invita por correo; si la persona ya tiene cuenta, la reutiliza.
async function invitarOEncontrar(email: string, nombre: string) {
  const admin = supabaseAdmin();
  const { data, error }: any = await admin.auth.admin.inviteUserByEmail(email, {
    data: { nombre },
    redirectTo: `${origen()}/auth/confirm?next=/actualizar-clave`,
  });
  if (!error && data?.user) return { id: data.user.id, invitado: true };

  for (let page = 1; page <= 20; page++) {
    const { data: lista, error: e2 }: any = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (e2) throw new Error(e2.message);
    const usuarios: any[] = lista?.users || [];
    const u = usuarios.find((x: any) => String(x.email || '').toLowerCase() === email);
    if (u) return { id: u.id as string, invitado: false };
    if (usuarios.length < 200) break;
  }
  throw new Error(error?.message || 'No se pudo invitar a ese correo');
}

async function sesion() {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return { sb, user };
}

async function esAdminEdai() {
  const { sb, user } = await sesion();
  if (!user) return false;
  const { data } = await sb.rpc('crm_es_admin');
  return !!data;
}

/** El dueño (o EDAI) da acceso con usuario y contraseña a un vendedor. */
export async function darAccesoUsuario(input: {
  negocioId: string;
  usuarioId?: string;
  nombre: string;
  empresa?: string;
  telefono?: string;
  email: string;
}): Promise<Resultado> {
  try {
    const { sb, user } = await sesion();
    if (!user) return { ok: false, error: 'Inicia sesión de nuevo.' };
    const { data: rol } = await sb.rpc('crm_rol', { p_negocio: input.negocioId });
    if (rol !== 'dueno' && !(await esAdminEdai())) return { ok: false, error: 'Solo el dueño puede dar acceso.' };

    const email = (input.email || '').trim().toLowerCase();
    if (!emailValido(email)) return { ok: false, error: 'Escribe un correo válido.' };

    const { id: userId, invitado } = await invitarOEncontrar(email, input.nombre);
    const admin = supabaseAdmin();

    if (input.usuarioId) {
      const { error } = await admin
        .from('crm_usuarios')
        .update({ user_id: userId, email })
        .eq('id', input.usuarioId)
        .eq('negocio_id', input.negocioId);
      if (error) return { ok: false, error: error.code === '23505' ? 'Esa cuenta ya tiene acceso a este negocio.' : error.message };
    } else {
      const { error } = await admin.from('crm_usuarios').insert({
        negocio_id: input.negocioId,
        user_id: userId,
        rol: 'vendedor',
        nombre: input.nombre,
        empresa: input.empresa || null,
        telefono: input.telefono || null,
        email,
      });
      if (error) return { ok: false, error: error.code === '23505' ? 'Esa cuenta ya tiene acceso a este negocio.' : error.message };
    }
    return {
      ok: true,
      mensaje: invitado ? `Invitación enviada a ${email}` : `${email} ya tenía cuenta: ahora puede entrar a este negocio`,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Error inesperado' };
  }
}

/** EDAI crea un negocio nuevo e invita a su dueño. */
export async function crearNegocio(input: {
  nombre: string;
  telefono?: string;
  plan_edai?: string;
  vence_edai?: string;
  dueno_nombre: string;
  dueno_email: string;
}): Promise<Resultado> {
  try {
    if (!(await esAdminEdai())) return { ok: false, error: 'No autorizado.' };
    const email = (input.dueno_email || '').trim().toLowerCase();
    if (!input.nombre?.trim()) return { ok: false, error: 'Escribe el nombre del negocio.' };
    if (!input.dueno_nombre?.trim()) return { ok: false, error: 'Escribe el nombre del dueño.' };
    if (!emailValido(email)) return { ok: false, error: 'Escribe un correo válido para el dueño.' };

    const admin = supabaseAdmin();
    const { data: negocio, error } = await admin
      .from('crm_negocios')
      .insert({
        nombre: input.nombre.trim(),
        telefono: input.telefono || null,
        plan_edai: input.plan_edai || null,
        vence_edai: input.vence_edai || null,
      })
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };

    // Si la invitación falla, se borra el negocio para no dejar duplicados vacíos.
    let userId = '';
    let invitado = false;
    try {
      const r = await invitarOEncontrar(email, input.dueno_nombre);
      userId = r.id;
      invitado = r.invitado;
    } catch (e: any) {
      await admin.from('crm_negocios').delete().eq('id', negocio.id);
      return { ok: false, error: 'No se pudo invitar al dueño: ' + (e?.message || 'error') };
    }
    const { error: e2 } = await admin.from('crm_usuarios').insert({
      negocio_id: negocio.id,
      user_id: userId,
      rol: 'dueno',
      nombre: input.dueno_nombre.trim(),
      telefono: input.telefono || null,
      email,
    });
    if (e2) {
      await admin.from('crm_negocios').delete().eq('id', negocio.id);
      return { ok: false, error: e2.message };
    }
    return { ok: true, mensaje: invitado ? `Negocio creado. Invitación enviada a ${email}` : `Negocio creado. ${email} ya tenía cuenta.` };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Error inesperado' };
  }
}

/** EDAI edita un negocio: nombre, WhatsApp, dueño, plan, fecha de pago y estado. */
export async function actualizarNegocio(input: {
  id: string;
  nombre?: string;
  telefono?: string;
  dueno_nombre?: string;
  estado?: 'activo' | 'suspendido';
  plan_edai?: string;
  vence_edai?: string;
}): Promise<Resultado> {
  try {
    if (!(await esAdminEdai())) return { ok: false, error: 'No autorizado.' };
    const admin = supabaseAdmin();
    const cambios: Record<string, any> = {};
    if (input.nombre !== undefined) {
      if (!input.nombre.trim()) return { ok: false, error: 'El nombre del negocio no puede quedar vacío.' };
      cambios.nombre = input.nombre.trim();
    }
    if (input.telefono !== undefined) cambios.telefono = input.telefono.trim() || null;
    if (input.estado !== undefined) cambios.estado = input.estado;
    if (input.plan_edai !== undefined) cambios.plan_edai = input.plan_edai || null;
    if (input.vence_edai !== undefined) cambios.vence_edai = input.vence_edai || null;

    if (Object.keys(cambios).length) {
      const { error } = await admin.from('crm_negocios').update(cambios).eq('id', input.id);
      if (error) return { ok: false, error: error.message };
    }
    if (input.dueno_nombre !== undefined && input.dueno_nombre.trim()) {
      const { error } = await admin
        .from('crm_usuarios')
        .update({ nombre: input.dueno_nombre.trim(), telefono: input.telefono?.trim() || undefined })
        .eq('negocio_id', input.id)
        .eq('rol', 'dueno');
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true, mensaje: 'Negocio actualizado' };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Error inesperado' };
  }
}

/** EDAI elimina un negocio con todos sus datos (clientes, planes, recordatorios...). */
export async function eliminarNegocio(input: { id: string }): Promise<Resultado> {
  try {
    if (!(await esAdminEdai())) return { ok: false, error: 'No autorizado.' };
    const { error } = await supabaseAdmin().from('crm_negocios').delete().eq('id', input.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, mensaje: 'Negocio eliminado' };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Error inesperado' };
  }
}

/** EDAI reenvía al dueño el correo para crear o cambiar su contraseña. */
export async function reenviarAcceso(input: { email: string }): Promise<Resultado> {
  try {
    if (!(await esAdminEdai())) return { ok: false, error: 'No autorizado.' };
    const correo = (input.email || '').trim().toLowerCase();
    if (!emailValido(correo)) return { ok: false, error: 'Correo inválido.' };
    const { error } = await supabaseAdmin().auth.resetPasswordForEmail(correo, {
      redirectTo: `${origen()}/auth/confirm?next=/actualizar-clave`,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, mensaje: `Acceso reenviado a ${correo}` };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Error inesperado' };
  }
}
