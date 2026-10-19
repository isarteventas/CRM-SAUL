'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { crearNegocio, actualizarNegocio } from '@/app/actions';
import * as U from '@/lib/utils';
import Salir from '@/components/Salir';

const PLANES_EDAI = ['Emprende', 'Negocio', 'Empresa'];

export default function AdminApp({ email }: { email: string }) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [filas, setFilas] = useState<any[]>([]);
  const [cargado, setCargado] = useState(false);
  const [nuevo, setNuevo] = useState(false);
  const [f, setF] = useState<any>({ nombre: '', telefono: '', plan_edai: 'Negocio', vence_edai: U.addMonths(U.hoy(), 1), dueno_nombre: '', dueno_email: '' });
  const [ediciones, setEdiciones] = useState<Record<string, any>>({});
  const [msg, setMsg] = useState('');
  const [enviando, setEnviando] = useState(false);
  const tRef = useRef<any>(null);
  const toast = (t: string) => {
    setMsg(t);
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setMsg(''), 3200);
  };

  const cargar = useCallback(async () => {
    const { data, error } = await sb.rpc('crm_admin_metricas');
    if (error) toast(U.errorTxt(error));
    setFilas(data || []);
    setCargado(true);
  }, [sb]);
  useEffect(() => {
    cargar();
  }, [cargar]);

  const crear = async () => {
    setEnviando(true);
    const r = await crearNegocio(f);
    setEnviando(false);
    if (!r.ok) return toast(r.error);
    toast(r.mensaje || 'Negocio creado');
    setNuevo(false);
    setF({ nombre: '', telefono: '', plan_edai: 'Negocio', vence_edai: U.addMonths(U.hoy(), 1), dueno_nombre: '', dueno_email: '' });
    cargar();
  };

  const guardarFila = async (n: any) => {
    const e = { ...n, ...(ediciones[n.negocio_id] || {}) };
    const r = await actualizarNegocio({ id: n.negocio_id, estado: e.estado, plan_edai: e.plan_edai, vence_edai: e.vence_edai });
    if (!r.ok) return toast(r.error);
    toast('Negocio actualizado');
    setEdiciones((x) => {
      const y = { ...x };
      delete y[n.negocio_id];
      return y;
    });
    cargar();
  };
  const editar = (id: string, k: string, v: any) => setEdiciones((x) => ({ ...x, [id]: { ...(x[id] || {}), [k]: v } }));

  const activos = filas.filter((n) => n.estado === 'activo').length;
  const porCobrar = filas.filter((n) => n.vence_edai && (U.dias(n.vence_edai) ?? 99) <= 7).length;
  const sinUso = filas.filter((n) => !n.ultima_actividad || (Date.now() - new Date(n.ultima_actividad).getTime()) / 864e5 > 14).length;

  return (
    <>
      <main style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="topbar">
          <div>
            <h1>Panel maestro EDAI</h1>
            <p className="lead">Negocios que usan el CRM de seguimiento · {email}</p>
          </div>
          <div className="tools">
            <button className="btn primary" onClick={() => setNuevo((v) => !v)}>{nuevo ? 'Cerrar' : 'Nuevo negocio'}</button>
            <Salir className="btn" />
          </div>
        </div>

        <div className="kpis" style={{ marginBottom: 18 }}>
          <div className="kpi o"><span>Negocios activos</span><b>{activos}</b><small>de {filas.length} en total</small></div>
          <div className="kpi w"><span>Por cobrar</span><b>{porCobrar}</b><small>Su plan EDAI vence en 7 días o menos</small></div>
          <div className="kpi d"><span>Sin uso</span><b>{sinUso}</b><small>Sin actividad en 14 días</small></div>
          <div className="kpi"><span>Clientes gestionados</span><b>{filas.reduce((t, n) => t + Number(n.clientes || 0), 0)}</b><small>En todos los negocios</small></div>
        </div>

        {nuevo ? (
          <div className="card" style={{ marginBottom: 18 }}>
            <h3>Nuevo negocio</h3>
            <div className="meta">Se crea el negocio y su dueño recibe un correo para crear su contraseña.</div>
            <div className="grid2" style={{ marginTop: 8 }}>
              <label className="field"><span>Nombre del negocio *</span><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></label>
              <label className="field"><span>Teléfono</span><input value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} /></label>
            </div>
            <div className="grid2">
              <label className="field"><span>Nombre del dueño *</span><input value={f.dueno_nombre} onChange={(e) => setF({ ...f, dueno_nombre: e.target.value })} /></label>
              <label className="field"><span>Correo del dueño *</span><input type="email" value={f.dueno_email} onChange={(e) => setF({ ...f, dueno_email: e.target.value })} /></label>
            </div>
            <div className="grid2">
              <label className="field"><span>Plan EDAI</span><select value={f.plan_edai} onChange={(e) => setF({ ...f, plan_edai: e.target.value })}>{PLANES_EDAI.map((p) => <option key={p}>{p}</option>)}</select></label>
              <label className="field"><span>Pagado hasta</span><input type="date" value={f.vence_edai} onChange={(e) => setF({ ...f, vence_edai: e.target.value })} /></label>
            </div>
            <div className="actions"><button className="btn primary" onClick={crear} disabled={enviando}>{enviando ? 'Creando…' : 'Crear e invitar'}</button></div>
          </div>
        ) : null}

        {!cargado ? (
          <p className="loading">Cargando negocios…</p>
        ) : !filas.length ? (
          <div className="list"><div className="empty"><p>Todavía no hay negocios. Crea el primero.</p></div></div>
        ) : (
          <div className="tablewrap">
            <table className="table">
              <thead>
                <tr><th>Negocio</th><th>Clientes</th><th>Usuarios</th><th>Última actividad</th><th>Plan EDAI</th><th>Pagado hasta</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                {filas.map((n) => {
                  const e = { ...n, ...(ediciones[n.negocio_id] || {}) };
                  const x = U.dias(n.vence_edai);
                  return (
                    <tr key={n.negocio_id}>
                      <td><b>{n.nombre}</b></td>
                      <td>{n.clientes_activos} activos <span style={{ color: 'var(--muted)' }}>/ {n.clientes}</span></td>
                      <td>{n.usuarios}</td>
                      <td>{n.ultima_actividad ? U.fmtF(String(n.ultima_actividad).slice(0, 10), true) : <span className="chip">Sin uso</span>}</td>
                      <td><select value={e.plan_edai || ''} onChange={(ev) => editar(n.negocio_id, 'plan_edai', ev.target.value)}><option value="">—</option>{PLANES_EDAI.map((p) => <option key={p}>{p}</option>)}</select></td>
                      <td>
                        <input type="date" value={e.vence_edai || ''} onChange={(ev) => editar(n.negocio_id, 'vence_edai', ev.target.value)} />
                        {x != null && x < 0 ? <div className="chip danger" style={{ marginTop: 4 }}>Vencido</div> : null}
                      </td>
                      <td><select value={e.estado} onChange={(ev) => editar(n.negocio_id, 'estado', ev.target.value)}><option value="activo">Activo</option><option value="suspendido">Suspendido</option></select></td>
                      <td><button className="btn sm" disabled={!ediciones[n.negocio_id]} onClick={() => guardarFila(n)}>Guardar</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="credit">Panel maestro · <b>EDAI</b></p>
      </main>
      <div id="toast" className={msg ? 'show' : ''} role="status" aria-live="polite">{msg}</div>
    </>
  );
}
