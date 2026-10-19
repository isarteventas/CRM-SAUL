'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('error');
    if (e) setError(e);
  }, []);

  const entrar = async () => {
    setError('');
    setOk('');
    if (!email || !clave) {
      setError('Escribe tu correo y contraseña.');
      return;
    }
    setCargando(true);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password: clave });
    setCargando(false);
    if (error) {
      setError('Correo o contraseña incorrectos.');
      return;
    }
    router.replace('/');
    router.refresh();
  };

  const recuperar = async () => {
    setError('');
    setOk('');
    if (!email) {
      setError('Escribe tu correo para enviarte el enlace.');
      return;
    }
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=/actualizar-clave`,
    });
    if (error) setError(error.message);
    else setOk('Te enviamos un correo para crear una nueva contraseña.');
  };

  return (
    <main className="center">
      <div className="card login-card">
        <h1>CRM de seguimiento</h1>
        <p className="lead" style={{ marginBottom: 18 }}>Ingresa con tu cuenta</p>
        {error ? <p className="err-msg">{error}</p> : null}
        {ok ? <p className="ok-msg">{ok}</p> : null}
        <label className="field">
          <span>Correo</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && entrar()}
          />
        </label>
        <button className="btn primary" style={{ width: '100%', marginTop: 4 }} onClick={entrar} disabled={cargando}>
          {cargando ? 'Entrando…' : 'Entrar'}
        </button>
        <p style={{ marginTop: 14, fontSize: 14 }}>
          <button className="link" onClick={recuperar}>Olvidé mi contraseña</button>
        </p>
        <p className="credit" style={{ marginTop: 18 }}>
          Desarrollado por <b>EDAI</b>
        </p>
      </div>
    </main>
  );
}
