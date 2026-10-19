import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sin variables de entorno no se puede validar la sesión: mostramos un aviso claro.
  if (!url || !key) {
    return new NextResponse(
      'Falta configurar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel (Settings > Environment Variables) y volver a desplegar.',
      { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } }
    );
  }

  let response = NextResponse.next({ request });
  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(lista) {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const ruta = request.nextUrl.pathname;
    const publica = ruta.startsWith('/login') || ruta.startsWith('/auth');
    if (!user && !publica) {
      const destino = request.nextUrl.clone();
      destino.pathname = '/login';
      destino.search = '';
      return NextResponse.redirect(destino);
    }
    return response;
  } catch (e) {
    console.error('middleware', e);
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
