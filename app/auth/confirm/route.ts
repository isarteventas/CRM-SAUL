import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// Enlaces de los correos de invitación y recuperación de contraseña.
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const token_hash = sp.get('token_hash');
  const type = sp.get('type') as EmailOtpType | null;
  const code = sp.get('code');
  const next = sp.get('next') || '/';
  const destino = request.nextUrl.clone();
  destino.search = '';

  const sb = supabaseServer();
  let ok = false;
  if (token_hash && type) {
    const { error } = await sb.auth.verifyOtp({ type, token_hash });
    ok = !error;
  } else if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (ok) {
    destino.pathname = next.startsWith('/') ? next : '/';
    return NextResponse.redirect(destino);
  }
  destino.pathname = '/login';
  destino.searchParams.set('error', 'El enlace no es válido o ya expiró. Pide uno nuevo.');
  return NextResponse.redirect(destino);
}
