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

  const { data: esAdmin } = await sb.rpc('crm_es_admin');
  const { data: accesos } = await sb
    .from('crm_usuarios')
    .select('negocio_id, rol, crm_negocios(nombre)')
    .eq('user_id', user.id);

  const lista: any[] = accesos || [];
  if (esAdmin && lista.length === 0) redirect('/admin');
  if (!esAdmin && lista.length === 1) redirect('/crm?n=' + lista[0].negocio_id);

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
        <div className="actions">
          <Salir />
        </div>
      </div>
    </main>
  );
}
