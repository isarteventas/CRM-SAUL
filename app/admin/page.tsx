import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import AdminApp from '@/components/AdminApp';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login');
  const { data: esAdmin } = await sb.rpc('crm_es_admin');
  if (!esAdmin) redirect('/');
  return <AdminApp email={user.email || ''} />;
}
