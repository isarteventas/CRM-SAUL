import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import Salir from '@/components/Salir';

export const dynamic = 'force-dynamic';

export default async function Inicio() {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login');

  // Admin de EDAI: se revisa con la función y, si falla, leyendo su propia fila
  const rpc = await sb.rpc('crm_es_admin');
  const fila = await sb.from('edai_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  const esAdmin = rpc.data === true || !!fila.data;

  const acc = await sb
    .from('crm_usuarios')
    .select('negocio_id, rol, crm_negocios(nombre)')
    .eq('user_id', user.id);
  const lista: any[] = acc.data || [];

  if (esAdmin && lista.length === 0) redirect('/admin');
  if (!esAdmin && lista.length === 1) redirect('/crm?n=' + lista[0].negocio_id);

  const errores = [rpc.error, fila.error, acc.error].filter(Boolean).map((e: any) => e.message);
  const proyecto = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace('https://', '').split('.')[0];

  return (
    <main className="center">
      <div className="card login-card">
        <h1>Hola</h1>
        <p className="lead" style={{ marginBottom: 16 }}>{user.email}</p>
        {lista.map((a) => (
          <Link key={a.negocio_id} className="choice" href={'/crm?n=' + a.negocio_id}>
            <span>{a.crm_negocios?.nombre || 'Negocio'}</span>
            <span className="chip">{a.rol === 'dueno' ? 'Dueño' : 'Vendedor'}</span>
          </Link>
        ))}
        {esAdmin ? (
          <Link className="choice" href="/admin">
            <span>Panel maestro EDAI</span>
            <span className="chip ok">Admin</span>
          </Link>
        ) : null}
        {!esAdmin && lista.length === 0 ? (
          <p className="sub">Tu cuenta todavía no está vinculada a ningún negocio. Pide acceso al dueño del negocio o a EDAI.</p>
        ) : null}
        {!esAdmin && lista.length === 0 ? (
          <div className="note" style={{ fontSize: 12.5 }}>
            <b>Diagnóstico</b><br />
            Proyecto Supabase: {proyecto || 'sin configurar'}<br />
            Usuario: {user.id}<br />
            {errores.length ? errores.map((m, i) => <span key={i}>Error: {m}<br /></span>) : 'Sin errores de consulta: tu usuario no está en edai_admins de este proyecto.'}
          </div>
        ) : null}
        <div className="actions">
          <Salir />
        </div>
      </div>
    </main>
  );
}
