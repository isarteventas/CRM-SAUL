import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import CrmApp from '@/components/crm/CrmApp';

export const dynamic = 'force-dynamic';

export default async function CrmPage({ searchParams }: { searchParams: { n?: string } }) {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login');

  let q = sb.from('crm_usuarios').select('*').eq('user_id', user.id);
  if (searchParams?.n) q = q.eq('negocio_id', searchParams.n);
  const { data: yos } = await q.limit(1);
  const yo = yos?.[0];
  if (!yo) redirect('/');

  const { data: negocio } = await sb.from('crm_negocios').select('*').eq('id', yo.negocio_id).single();
  if (!negocio) redirect('/');

  return <CrmApp negocioInicial={negocio} yo={yo} />;
}
