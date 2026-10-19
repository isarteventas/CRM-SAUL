'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function ActualizarClave() {
  const router = useRouter();
  const [clave, setClave] = useState('');
  const [clave2, setClave2] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const guardar = async () => {
    setError('');
    if (clave.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (clave !== clave2) return setError('Las contraseñas no coinciden.');
    setCargando(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password: clave });
    setCargando(false);
    if (error) return setError(error.message);
    router.replace('/');
    router.refresh();
  };

  return (
    <main className="center">
      <div className="card login-card">
        <h1>Crea tu contraseña</h1>
        <p className="lead" style={{ marginBottom: 18 }}>La usarás para entrar al CRM.</p>
        {error ? <p className="err-msg">{error}</p> : null}
        <label className="field">
          <span>Nueva contraseña</span>
          <input type="password" autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} />
        </label>
        <label className="field">
          <span>Repite la contraseña</span>
          <input type="password" autoComplete="new-password" value={clave2} onChange={(e) => setClave2(e.target.value)} />
        </label>
        <button className="btn primary" style={{ width: '100%' }} onClick={guardar} disabled={cargando}>
          {cargando ? 'Guardando…' : 'Guardar y entrar'}
        </button>
      </div>
    </main>
  );
}
