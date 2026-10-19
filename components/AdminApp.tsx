'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { crearNegocio, actualizarNegocio, eliminarNegocio, reenviarAcceso } from '@/app/actions';
import * as U from '@/lib/utils';
import Salir from '@/components/Salir';
import { IcoWa } from '@/components/crm/ui';

const PLANES_EDAI = ['Emprende', 'Negocio', 'Empresa'];
const nuevoForm = () => ({ nombre: '', telefono: '', plan_edai: 'Negocio', vence_edai: U.addMonths(U.hoy(), 1), dueno_nombre: '', dueno_email: '' });

const PLANTILLAS: { id: string; nombre: string; texto: string }[] = [
  { id: 'porvencer', nombre: 'Plan por vencer', texto: 'Hola {dueno} 👋, te saluda EDAI.\nTu plan {plan} del CRM de seguimiento de {negocio} vence el {fecha} (faltan {dias} días).\n¿Te paso los datos para renovarlo y que tu equipo siga trabajando sin interrupciones?' },
  { id: 'vencido', nombre: 'Plan vencido', texto: 'Hola {dueno}, te saluda EDAI.\nTu plan {plan} del CRM de seguimiento de {negocio} venció el {fecha}.\nPara que tu equipo pueda seguir registrando clientes y renovaciones, renuévalo hoy. ¿Te paso los datos de pago?' },
  { id: 'suspendido', nombre: 'Cuenta suspendida', texto: 'Hola {dueno}, te saluda EDAI.\nEl CRM de seguimiento de {negocio} está en solo lectura: tus datos están seguros, pero no se pueden hacer cambios.\nApenas renueves tu plan {plan}, lo reactivamos. ¿Te ayudo?' },
  { id: 'bienvenida', nombre: 'Bienvenida', texto: '¡Hola {dueno}! 🎉 Bienvenido al CRM de seguimiento de EDAI para {negocio}.\nTe enviamos un correo a {correo} para crear tu contraseña.\nDespués entras aquí: {url}\nCualquier duda, escríbeme.' },
  { id: 'gracias', nombre: 'Gracias por renovar', texto: '¡Gracias {dueno}! 🙌 Tu plan {plan} del CRM de seguimiento quedó renovado hasta el {fecha}.\nSaludos del equipo de EDAI.' },
];

export default function AdminApp({ email }: { email: string }) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [filas, setFilas] = useState<any[]>([]);
  const [cargado, setCargado] = useState(false);
  const [nuevo, setNuevo] = useState(false);
  const [f, setF] = useState<any>(nuevoForm());
  const [ediciones, setEdiciones] = useState<Record<string, any>>({});
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<any>(null);
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
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(null); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);

  const crear = async () => {
    setEnviando(true);
    const r = await crearNegocio(f);
    setEnviando(false);
    if (!r.ok) return toast(r.error || 'Error');
    toast(r.mensaje || 'Negocio creado');
    setNuevo(false);
    setF(nuevoForm());
    cargar();
  };

  const guardarFila = async (n: any) => {
    const e = ediciones[n.negocio_id] || {};
    const r = await actualizarNegocio({ id: n.negocio_id, ...e });
    if (!r.ok) return toast(r.error || 'Error');
    toast('Negocio actualizado');
    setEdiciones((x) => { const y = { ...x }; delete y[n.negocio_id]; return y; });
    cargar();
  };
  const editar = (id: string, k: string, v: any) => setEdiciones((x) => ({ ...x, [id]: { ...(x[id] || {}), [k]: v } }));

  const tel = (n: any) => n.telefono || n.dueno_telefono || '';
  const t = q.trim().toLowerCase();
  const visibles = filas.filter((n) => !t || [n.nombre, n.dueno_nombre, n.dueno_email, tel(n)].some((x) => String(x || '').toLowerCase().includes(t)));
  const activos = filas.filter((n) => n.estado === 'activo').length;
  const porCobrar = filas.filter((n) => n.estado === 'activo' && n.vence_edai && (U.dias(n.vence_edai) ?? 99) <= 7).length;
  const sinUso = filas.filter((n) => !n.ultima_actividad || (Date.now() - new Date(n.ultima_actividad).getTime()) / 864e5 > 14).length;

  const chipPago = (n: any) => {
    const x = U.dias(n.vence_edai);
    if (x == null) return null;
    if (x < 0) return <span className="chip danger">Vencido hace {-x} {U.plural(-x, 'día')}</span>;
    if (x <= 7) return <span className="chip warn">Vence en {x} {U.plural(x, 'día')}</span>;
    return null;
  };

  return (
    <>
      <main style={{ maxWidth: 1240, margin: '0 auto' }}>
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
          <div className="kpi"><span>Clientes gestionados</span><b>{filas.reduce((s, n) => s + Number(n.clientes || 0), 0)}</b><small>En todos los negocios</small></div>
        </div>

        {nuevo ? (
          <div className="card" style={{ marginBottom: 18 }}>
            <h3>Nuevo negocio</h3>
            <div className="meta">Se crea el negocio y su dueño recibe un correo para crear su contraseña.</div>
            <div className="grid2" style={{ marginTop: 8 }}>
              <label className="field"><span>Nombre del negocio *</span><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></label>
              <label className="field"><span>WhatsApp del dueño</span><input inputMode="tel" placeholder="70012345" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} /></label>
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

        <div className="tools" style={{ marginBottom: 12 }}>
          <input className="inp search" type="search" placeholder="Buscar por negocio, dueño, correo o teléfono" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {!cargado ? (
          <p className="loading">Cargando negocios…</p>
        ) : !visibles.length ? (
          <div className="list"><div className="empty"><p>{filas.length ? 'Ningún negocio coincide con la búsqueda.' : 'Todavía no hay negocios. Crea el primero.'}</p></div></div>
        ) : (
          <div className="tablewrap">
            <table className="table" style={{ minWidth: 980 }}>
              <thead>
                <tr><th>Negocio y dueño</th><th>Clientes</th><th>Última actividad</th><th>Plan EDAI</th><th>Pagado hasta</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                {visibles.map((n) => {
                  const e = { ...n, ...(ediciones[n.negocio_id] || {}) };
                  return (
                    <tr key={n.negocio_id}>
                      <td>
                        <b>{n.nombre}</b>
                        <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                          {n.dueno_nombre || 'Sin dueño'}{n.dueno_email ? ` · ${n.dueno_email}` : ''}
                        </div>
                        {tel(n) ? <div style={{ color: 'var(--muted)', fontSize: 13 }}>{U.fmtTel(tel(n))}</div> : null}
                      </td>
                      <td>{n.clientes_activos} activos <span style={{ color: 'var(--muted)' }}>/ {n.clientes}</span><div style={{ color: 'var(--muted)', fontSize: 13 }}>{n.usuarios} {U.plural(Number(n.usuarios), 'usuario')}</div></td>
                      <td>{n.ultima_actividad ? U.fmtF(String(n.ultima_actividad).slice(0, 10), true) : <span className="chip">Sin uso</span>}</td>
                      <td><select value={e.plan_edai || ''} onChange={(ev) => editar(n.negocio_id, 'plan_edai', ev.target.value)}><option value="">—</option>{PLANES_EDAI.map((p) => <option key={p}>{p}</option>)}</select></td>
                      <td>
                        <input type="date" value={e.vence_edai || ''} onChange={(ev) => editar(n.negocio_id, 'vence_edai', ev.target.value)} />
                        <div style={{ marginTop: 4 }}>{chipPago(n)}</div>
                      </td>
                      <td><select value={e.estado} onChange={(ev) => editar(n.negocio_id, 'estado', ev.target.value)}><option value="activo">Activo</option><option value="suspendido">Suspendido</option></select></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {ediciones[n.negocio_id] ? <button className="btn primary sm" onClick={() => guardarFila(n)}>Guardar</button> : null}
                          <button className="btn wa sm" aria-disabled={!U.normTel(tel(n))} title={tel(n) ? '' : 'Agrega su WhatsApp en Editar'} onClick={() => setModal({ t: 'wa', n })}><IcoWa />WhatsApp</button>
                          <a className="btn sm" href={'/crm?n=' + n.negocio_id} title="Abrir el panel de este negocio">Entrar</a>
                          <button className="btn sm" onClick={() => setModal({ t: 'editar', n })}>Editar</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="credit">Panel maestro · <b>EDAI</b></p>
      </main>

      {modal ? (
        <div className="modal" onMouseDown={(ev) => { if (ev.target === ev.currentTarget) setModal(null); }}>
          <div className="sheet" role="dialog" aria-modal="true" key={modal.t + modal.n.negocio_id}>
            {modal.t === 'editar' ? (
              <EditarNegocio n={modal.n} cerrar={() => setModal(null)} toast={toast} recargar={cargar} abrirWa={() => setModal({ t: 'wa', n: modal.n, tpl: 'gracias' })} />
            ) : (
              <WhatsAppDueno n={modal.n} tpl={modal.tpl} cerrar={() => setModal(null)} />
            )}
          </div>
        </div>
      ) : null}
      <div id="toast" className={msg ? 'show' : ''} role="status" aria-live="polite">{msg}</div>
    </>
  );
}

function EditarNegocio({ n, cerrar, toast, recargar, abrirWa }: any) {
  const [f, setF] = useState({
    nombre: n.nombre || '',
    telefono: n.telefono || n.dueno_telefono || '',
    dueno_nombre: n.dueno_nombre || '',
    plan_edai: n.plan_edai || '',
    vence_edai: n.vence_edai || '',
    estado: n.estado || 'activo',
  });
  const [borrar, setBorrar] = useState(false);
  const [confirmacion, setConfirmacion] = useState('');
  const [enviando, setEnviando] = useState(false);

  const masUnMes = () => {
    const base = f.vence_edai && f.vence_edai > U.hoy() ? f.vence_edai : U.hoy();
    setF({ ...f, vence_edai: U.addMonths(base, 1), estado: 'activo' });
  };
  const guardar = async (yAgradecer = false) => {
    setEnviando(true);
    const r = await actualizarNegocio({ id: n.negocio_id, ...f });
    setEnviando(false);
    if (!r.ok) return toast(r.error || 'Error');
    toast('Negocio actualizado');
    await recargar();
    if (yAgradecer) abrirWa();
    else cerrar();
  };
  const eliminar = async () => {
    setEnviando(true);
    const r = await eliminarNegocio({ id: n.negocio_id });
    setEnviando(false);
    if (!r.ok) return toast(r.error || 'Error');
    toast(`${n.nombre} eliminado`);
    await recargar();
    cerrar();
  };

  if (borrar) {
    return (
      <>
        <h2>¿Eliminar {n.nombre}?</h2>
        <p className="sub">Se borrarán sus clientes, planes, recordatorios y mensajes. Esta acción no se puede deshacer. Las cuentas de usuario de sus personas siguen existiendo, pero ya no podrán entrar a este negocio.</p>
        <label className="field">
          <span>Para confirmar, escribe el nombre del negocio: <b>{n.nombre}</b></span>
          <input value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} autoFocus />
        </label>
        <div className="actions">
          <button className="btn" onClick={() => setBorrar(false)}>Volver</button>
          <button className="btn primary" style={{ background: 'var(--danger)' }} disabled={confirmacion.trim() !== n.nombre.trim() || enviando} onClick={eliminar}>Eliminar definitivamente</button>
        </div>
      </>
    );
  }

  return (
    <>
      <h2>Editar negocio</h2>
      <p className="sub">
        {n.dueno_email ? <>Dueño: {n.dueno_email} · <button className="link" disabled={enviando} onClick={async () => {
          setEnviando(true);
          const r = await reenviarAcceso({ email: n.dueno_email });
          setEnviando(false);
          toast(r.ok ? r.mensaje || 'Acceso reenviado' : r.error || 'Error');
        }}>Reenviar acceso</button></> : 'Este negocio no tiene dueño con acceso.'}
      </p>
      <div className="grid2">
        <label className="field"><span>Nombre del negocio *</span><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></label>
        <label className="field"><span>WhatsApp del dueño</span><input inputMode="tel" placeholder="70012345" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} /></label>
      </div>
      <label className="field"><span>Nombre del dueño</span><input value={f.dueno_nombre} onChange={(e) => setF({ ...f, dueno_nombre: e.target.value })} /></label>
      <div className="grid2">
        <label className="field"><span>Plan EDAI</span><select value={f.plan_edai} onChange={(e) => setF({ ...f, plan_edai: e.target.value })}><option value="">—</option>{PLANES_EDAI.map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="field">
          <span>Pagado hasta</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="date" value={f.vence_edai} onChange={(e) => setF({ ...f, vence_edai: e.target.value })} style={{ flex: 1 }} />
            <button className="btn sm" type="button" onClick={masUnMes} title="Suma un mes desde hoy o desde la fecha actual">+1 mes</button>
          </div>
        </label>
      </div>
      <label className="field"><span>Estado</span><select value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value })}><option value="activo">Activo</option><option value="suspendido">Suspendido (solo lectura)</option></select></label>
      <div className="actions">
        <button className="btn ghost danger left" onClick={() => setBorrar(true)}>Eliminar negocio</button>
        <button className="btn" onClick={cerrar}>Cancelar</button>
        {U.normTel(f.telefono) && f.vence_edai !== (n.vence_edai || '') ? (
          <button className="btn" disabled={enviando} onClick={() => guardar(true)}>Guardar y agradecer</button>
        ) : null}
        <button className="btn primary" disabled={enviando} onClick={() => guardar(false)}>Guardar</button>
      </div>
    </>
  );
}

function WhatsAppDueno({ n, tpl, cerrar }: any) {
  const x = U.dias(n.vence_edai);
  const pref = tpl || (n.estado === 'suspendido' ? 'suspendido' : x != null && x < 0 ? 'vencido' : x != null && x <= 7 ? 'porvencer' : !n.ultima_actividad ? 'bienvenida' : 'porvencer');
  const llenar = (texto: string) => {
    const map: Record<string, string> = {
      dueno: (n.dueno_nombre || '').trim().split(/\s+/)[0] || '',
      negocio: n.nombre || '',
      plan: n.plan_edai || '',
      fecha: n.vence_edai ? U.fmtF(n.vence_edai) : '',
      dias: x == null ? '' : String(Math.abs(x)),
      correo: n.dueno_email || '',
      url: typeof window !== 'undefined' ? window.location.origin : '',
    };
    return texto.replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m)).replace(/ {2,}/g, ' ');
  };
  const [sel, setSel] = useState(pref);
  const [txt, setTxt] = useState(llenar((PLANTILLAS.find((p) => p.id === pref) || PLANTILLAS[0]).texto));
  const telefono = n.telefono || n.dueno_telefono || '';
  const numero = U.normTel(telefono);
  return (
    <>
      <h2>WhatsApp a {n.dueno_nombre || n.nombre}</h2>
      <p className="sub">{numero ? `Se abrirá WhatsApp con ${U.fmtTel(telefono)}. Puedes ajustar el texto antes de enviarlo.` : 'Este negocio no tiene WhatsApp registrado. Agrégalo en Editar.'}</p>
      <label className="field">
        <span>Plantilla</span>
        <select value={sel} onChange={(e) => { setSel(e.target.value); const p = PLANTILLAS.find((y) => y.id === e.target.value); if (p) setTxt(llenar(p.texto)); }}>
          {PLANTILLAS.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </label>
      <label className="field"><span>Mensaje</span><textarea rows={7} value={txt} onChange={(e) => setTxt(e.target.value)} /></label>
      <div className="actions">
        <button className="btn" onClick={cerrar}>Cancelar</button>
        <a className="btn wa" aria-disabled={!numero} target="_blank" rel="noopener noreferrer" href={U.waUrl(telefono, '591', txt)} onClick={() => setTimeout(cerrar, 50)}>
          <IcoWa />Abrir WhatsApp
        </a>
      </div>
    </>
  );
}
