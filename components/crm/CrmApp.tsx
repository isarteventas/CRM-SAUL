'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import * as U from '@/lib/utils';
import { IcoWa, ChipVenc, Vacio } from './ui';
import Modales from './Modales';

const VACIO: any = { usuarios: [], planes: [], clientes: [], recordatorios: [], plantillas: [] };
const porVenc = (a: any, b: any) => (a.vencimiento || '9999').localeCompare(b.vencimiento || '9999');

const ico = (d: React.ReactNode) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const NAV: [string, string, React.ReactNode, boolean][] = [
  ['panel', 'Panel', ico(<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>), false],
  ['clientes', 'Clientes', ico(<><circle cx="9" cy="8" r="4" /><path d="M2 21c0-4 3-6 7-6s7 2 7 6M17 4a4 4 0 0 1 0 8M22 21c0-3-1.5-5-4-5.7" /></>), false],
  ['planes', 'Planes', ico(<><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" /></>), false],
  ['recordatorios', 'Recordatorios', ico(<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4" />), false],
  ['vendedores', 'Vendedores', ico(<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" /></>), true],
  ['mensajes', 'Mensajes', ico(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />), false],
];

export default function CrmApp({ negocioInicial, yo, comoAdmin = false }: { negocioInicial: any; yo: any; comoAdmin?: boolean }) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();
  const [negocio, setNegocio] = useState<any>(negocioInicial);
  const [d, setD] = useState<any>(VACIO);
  const [cargado, setCargado] = useState(false);
  const [vista, setVista] = useState('panel');
  const [vend, setVend] = useState('');
  const [ventana, setVentana] = useState<number>(negocioInicial.dias_aviso || 7);
  const [panelF, setPanelF] = useState('porvencer');
  const [q, setQ] = useState('');
  const [estadoF, setEstadoF] = useState('');
  const [tplCli, setTplCli] = useState('');
  const [modal, setModal] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const tRef = useRef<any>(null);

  const esDueno = yo.rol === 'dueno';
  const puede = negocio.estado === 'activo' && (!negocio.vence_edai || (U.dias(negocio.vence_edai) ?? 0) >= -5);

  const toast = useCallback((t: string) => {
    setMsg(t);
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setMsg(''), 2800);
  }, []);

  const cargar = useCallback(async () => {
    const n = negocio.id;
    const desde = U.addDays(U.hoy(), -30);
    const res: any[] = await Promise.all([
      sb.from('crm_usuarios').select('*').eq('negocio_id', n).order('nombre'),
      sb.from('crm_planes').select('*').eq('negocio_id', n).order('nombre'),
      sb.from('crm_clientes').select('*').eq('negocio_id', n).order('nombre'),
      sb.from('crm_recordatorios').select('*').eq('negocio_id', n).or(`hecho.eq.false,hecho_el.gte.${desde}`).order('fecha'),
      sb.from('crm_plantillas').select('*').eq('negocio_id', n).order('created_at'),
    ]);
    const conError = res.find((r) => r.error);
    if (conError) toast('No se pudieron cargar los datos: ' + conError.error.message);
    setD({
      usuarios: res[0].data || [],
      planes: res[1].data || [],
      clientes: res[2].data || [],
      recordatorios: res[3].data || [],
      plantillas: res[4].data || [],
    });
    setCargado(true);
  }, [sb, negocio.id, toast]);

  useEffect(() => {
    cargar();
    const f = () => cargar();
    window.addEventListener('focus', f);
    return () => window.removeEventListener('focus', f);
  }, [cargar]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModal(null);
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);

  /* ---------- ayudas ---------- */
  const cli = (id: string) => d.clientes.find((c: any) => c.id === id);
  const planDe = (c: any) => d.planes.find((p: any) => p.id === c?.plan_id);
  const planNombre = (c: any) => planDe(c)?.nombre || '';
  const usuario = (id: string) => d.usuarios.find((u: any) => u.id === id);
  const miembros = (c: any) => (c?.id ? d.clientes.filter((x: any) => x.titular_id === c.id) : []);
  const titularDe = (c: any) => (c?.titular_id ? cli(c.titular_id) : null);
  const personas = (p: any) => (p ? Math.max(1, Number(p.personas) || 1) : 1);
  const tel = (c: any) => U.normTel(c?.telefono, negocio.pais_codigo);
  const abrir = (t: string, props: any = {}) => setModal({ t, ...props });
  const cerrar = () => setModal(null);

  const fill = (txt: string, c: any) => {
    const v = usuario(c.vendedor_id) || {};
    const x = U.dias(c.vencimiento);
    const p = planDe(c);
    const map: Record<string, string> = {
      nombre: (c.nombre || '').trim().split(/\s+/)[0],
      nombre_completo: c.nombre || '',
      plan: planNombre(c),
      fecha: c.vencimiento ? U.fmtF(c.vencimiento) : '',
      dias: x == null ? '' : String(Math.abs(x)),
      monto: String(c.monto ?? p?.precio ?? ''),
      moneda: negocio.moneda || 'Bs.',
      vendedor: v.nombre || 'el equipo',
      empresa: v.empresa || negocio.nombre,
    };
    return String(txt || '').replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));
  };

  const ejecutar = async (consulta: any, ok?: string) => {
    const { error } = await consulta;
    if (error) {
      toast(U.errorTxt(error));
      return false;
    }
    if (ok) toast(ok);
    await cargar();
    return true;
  };
  const log = (cliente_id: string, tipo: string, detalle: string) =>
    sb.from('crm_actividad').insert({ negocio_id: negocio.id, cliente_id, tipo, detalle });

  const renovar = async (id: string) => {
    let c = cli(id);
    if (!c) return;
    const t = titularDe(c);
    if (t) c = t;
    const p = planDe(c);
    if (p && p.periodo_meses > 0) {
      const antes = { vencimiento: c.vencimiento, estado: c.estado };
      const { data, error } = await sb.rpc('crm_renovar', { p_cliente: c.id });
      if (error) return toast(U.errorTxt(error));
      await cargar();
      const m = p.periodo_meses;
      abrir('renovado', {
        id: c.id,
        nueva: data,
        antes,
        detalle: `${m === 1 ? '1 mes más' : m + ' meses más'} por su plan ${(U.PERIODOS[m] || '').toLowerCase()}`,
      });
    } else abrir('renovarFecha', { id: c.id });
  };

  const reactivar = async (id: string) => {
    const c = cli(id);
    if (!c) return;
    if (c.estado !== 'activo' && c.vencimiento && (U.dias(c.vencimiento) ?? -1) >= 0) {
      await ejecutar(sb.from('crm_clientes').update({ estado: 'activo' }).eq('id', c.id), `${c.nombre} reactivado hasta el ${U.fmtF(c.vencimiento)}`);
      return;
    }
    renovar(id);
  };

  const cambiarVenc = async (c: any, v: string) => {
    if (!v || v < '2000-01-01' || v === c.vencimiento) return;
    const ok = await ejecutar(sb.from('crm_clientes').update({ vencimiento: v }).eq('id', c.id), 'Nuevo vencimiento: ' + U.fmtF(v));
    if (ok) await log(c.id, 'vencimiento', 'Vencimiento cambiado a ' + U.fmtF(v));
  };

  const salir = async () => {
    await sb.auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  /* ---------- listas derivadas ---------- */
  const visibles = vend ? d.clientes.filter((c: any) => c.vendedor_id === vend) : d.clientes;
  const activos = visibles.filter((c: any) => c.estado === 'activo');
  const vencidos = activos.filter((c: any) => { const x = U.dias(c.vencimiento); return x != null && x < 0; }).sort(porVenc);
  const porVencer = activos.filter((c: any) => { const x = U.dias(c.vencimiento); return x != null && x >= 0 && x <= ventana; }).sort(porVenc);
  const alDia = activos.filter((c: any) => { const x = U.dias(c.vencimiento); return x == null || x > ventana; }).sort(porVenc);
  const inact = visibles.filter((c: any) => c.estado !== 'activo');
  const recsVis = d.recordatorios.filter((r: any) => { const c = cli(r.cliente_id); return c && (!vend || c.vendedor_id === vend); });
  const recsPend = recsVis.filter((r: any) => !r.hecho && r.fecha <= U.hoy());
  const badge = cargado ? vencidos.length + porVencer.length + recsPend.length : 0;

  const ctx = {
    sb, d, negocio, setNegocio, yo, esDueno, puede, ventana, vend, modal, abrir, cerrar, toast, cargar, ejecutar, log,
    cli, planDe, planNombre, usuario, miembros, titularDe, personas, tel, fill, renovar, reactivar, cambiarVenc, salir,
  };

  /* ---------- filas ---------- */
  const subFila = (c: any) => {
    const t = titularDe(c);
    const ms = miembros(c);
    const v = usuario(c.vendedor_id);
    return (
      <span className="row-sub">
        <span>{planNombre(c) || 'Sin plan'}</span>
        {t ? <span>Grupo de {t.nombre}</span> : ms.length ? <span>Grupo de {ms.length + 1} personas</span> : null}
        {v && esDueno ? <span>{v.nombre}</span> : null}
        {c.ultimo_contacto ? <span>Último mensaje {U.fmtF(c.ultimo_contacto, true)}</span> : null}
      </span>
    );
  };
  const botonWa = (c: any, recId?: string) => (
    <button className="btn wa sm" aria-disabled={!tel(c)} onClick={() => abrir('wa', { id: c.id, recId })}>
      <IcoWa />WhatsApp
    </button>
  );
  const filaCliente = (c: any) => (
    <div className="row" key={c.id}>
      <button className="row-main" onClick={() => abrir('ficha', { id: c.id })}>
        <span className="row-name">{c.nombre}</span>
        {subFila(c)}
      </button>
      <div className="row-chip"><ChipVenc c={c} ventana={ventana} /></div>
      <div className="row-act">
        {botonWa(c)}
        {c.vencimiento && !titularDe(c) && puede ? <button className="btn sm" onClick={() => renovar(c.id)}>Renovar</button> : null}
      </div>
    </div>
  );
  const filaPanel = (c: any) => {
    const t = titularDe(c);
    const inactivo = c.estado !== 'activo';
    const x = U.dias(c.vencimiento);
    const reac = inactivo || (x != null && x < 0);
    return (
      <div className="row" key={c.id}>
        <button className="row-main" onClick={() => abrir('ficha', { id: c.id })}>
          <span className="row-name">{c.nombre}</span>
          {subFila(c)}
        </button>
        <div className="row-chip">
          <label className="venc-edit">
            <span>Vence</span>
            <input
              type="date"
              key={c.id + (c.vencimiento || '')}
              defaultValue={c.vencimiento || ''}
              disabled={!!t || !puede}
              title={t ? 'Sigue la fecha del titular' : undefined}
              aria-label={'Fecha de vencimiento de ' + c.nombre}
              onChange={(e) => cambiarVenc(c, e.target.value)}
            />
          </label>
          <ChipVenc c={c} ventana={ventana} />
        </div>
        <div className="row-act">
          {botonWa(c)}
          {!t && puede ? (
            <button className={'btn sm' + (reac ? ' primary' : '')} onClick={() => (inactivo ? reactivar(c.id) : renovar(c.id))}>
              {reac ? 'Reactivar' : 'Renovar'}
            </button>
          ) : null}
        </div>
      </div>
    );
  };
  const filaRec = (r: any) => {
    const c = cli(r.cliente_id);
    const x = U.dias(r.fecha) ?? 0;
    const chip = r.hecho ? <span className="chip ok">Hecho</span>
      : x < 0 ? <span className="chip danger">Atrasado {-x} {U.plural(-x, 'día')}</span>
      : x === 0 ? <span className="chip warn">Hoy</span>
      : <span className="chip">{U.fmtF(r.fecha, true)}</span>;
    const posponer = () => {
      const base = r.fecha < U.hoy() ? U.hoy() : r.fecha;
      const nueva = U.addDays(base, 1);
      ejecutar(sb.from('crm_recordatorios').update({ fecha: nueva }).eq('id', r.id), 'Pospuesto a ' + U.fmtF(nueva, true));
    };
    return (
      <div className={'row' + (r.hecho ? ' done' : '')} key={r.id}>
        <button className="row-main" onClick={() => c && abrir('ficha', { id: c.id })}>
          <span className="row-name">{r.nota || 'Contactar'}</span>
          <span className="row-sub"><span>{c ? c.nombre : 'Cliente eliminado'}</span><span>{U.fmtF(r.fecha, true)}</span></span>
        </button>
        <div className="row-chip">{chip}</div>
        <div className="row-act">
          {c && !r.hecho ? botonWa(c, r.id) : null}
          {puede ? (
            r.hecho ? (
              <button className="btn ghost sm" onClick={() => ejecutar(sb.from('crm_recordatorios').update({ hecho: false, hecho_el: null }).eq('id', r.id))}>Reabrir</button>
            ) : (
              <>
                <button className="btn sm" onClick={() => ejecutar(sb.from('crm_recordatorios').update({ hecho: true, hecho_el: U.hoy() }).eq('id', r.id), 'Recordatorio hecho')}>Hecho</button>
                <button className="btn ghost sm" title="Pasar a mañana" onClick={posponer}>+1 día</button>
              </>
            )
          ) : null}
        </div>
      </div>
    );
  };

  const selVend =
    esDueno && d.usuarios.length > 1 ? (
      <select className="sel" value={vend} onChange={(e) => setVend(e.target.value)} aria-label="Filtrar por vendedor">
        <option value="">Todos los vendedores</option>
        {d.usuarios.map((u: any) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
      </select>
    ) : null;
  const botonNuevo = (
    <button className="btn primary" disabled={!puede} onClick={() => abrir('cliente')}>Agregar cliente</button>
  );

  /* ---------- vistas ---------- */
  const vistaPanel = () => {
    const suma = (a: any[]) => a.filter((c) => !c.titular_id).reduce((t, c) => t + U.num(c.monto ?? planDe(c)?.precio), 0);
    const cobrar = (n: number) => (n ? `${negocio.moneda} ${U.money(n)} por cobrar` : '');
    const K: [string, string, any[], string, string][] = [
      ['porvencer', 'Por vencer', porVencer, 'w', cobrar(suma(porVencer)) || `Próximos ${ventana} días`],
      ['vencidos', 'Vencidos', vencidos, 'd', cobrar(suma(vencidos))],
      ['activos', 'Al día', alDia, 'o', 'Con suscripción vigente'],
      ['inactivos', 'Pausados o de baja', inact, '', 'Se pueden reactivar'],
    ];
    const sel = K.find((k) => k[0] === panelF) || K[0];
    const vacioTxt: Record<string, string> = {
      porvencer: 'Ninguna suscripción vence en este periodo.',
      vencidos: 'No hay suscripciones vencidas.',
      activos: 'No hay clientes al día.',
      inactivos: 'No hay clientes pausados ni de baja.',
    };
    const f = new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' });
    return (
      <>
        <div className="topbar">
          <div>
            <h1>Panel</h1>
            <p className="lead">{f.charAt(0).toUpperCase() + f.slice(1)}{d.clientes.length ? ` · ${visibles.length} ${U.plural(visibles.length, 'cliente')}` : ''}</p>
          </div>
          <div className="tools">
            {selVend}
            <select className="sel" value={ventana} onChange={(e) => setVentana(Number(e.target.value))} aria-label="Avisar con anticipación">
              {[3, 7, 15, 30].map((n) => <option key={n} value={n}>Avisar {n} días antes</option>)}
            </select>
          </div>
        </div>
        {!d.clientes.length ? (
          <Vacio texto="Todavía no hay clientes. Agrega el primero y aquí verás cuántos están por vencer y vencidos.">{botonNuevo}</Vacio>
        ) : (
          <>
            <div className="kpis">
              {K.map(([k, t, a, cls, sub]) => (
                <button key={k} className={`kpi ${cls} ${panelF === k ? 'on' : ''}`} aria-pressed={panelF === k} onClick={() => setPanelF(k)}>
                  <span>{t}</span><b>{a.length}</b><small>{sub}</small>
                </button>
              ))}
            </div>
            <h2>{sel[1]} <span className="count">{sel[2].length}</span></h2>
            {sel[2].length ? <div className="list">{sel[2].map(filaPanel)}</div> : <Vacio texto={vacioTxt[sel[0]]} />}
            <h2>Recordatorios pendientes <span className="count">{recsPend.length}</span></h2>
            {recsPend.length ? <div className="list">{recsPend.map(filaRec)}</div> : <Vacio texto="Sin recordatorios para hoy." />}
          </>
        )}
      </>
    );
  };

  const vistaClientes = () => {
    const t = q.trim().toLowerCase();
    let a = visibles.filter((c: any) => !t || [c.nombre, c.telefono, planNombre(c)].some((x) => String(x || '').toLowerCase().includes(t)));
    if (estadoF === 'porvencer') a = a.filter((c: any) => porVencer.includes(c));
    else if (estadoF === 'vencido') a = a.filter((c: any) => vencidos.includes(c));
    else if (estadoF) a = a.filter((c: any) => c.estado === estadoF);
    a = [...a].sort(porVenc);
    return (
      <>
        <div className="topbar">
          <div><h1>Clientes</h1><p className="lead">{visibles.length} {U.plural(visibles.length, 'cliente')}</p></div>
          {botonNuevo}
        </div>
        <div className="tools" style={{ marginBottom: 14 }}>
          <input className="inp search" type="search" placeholder="Buscar por nombre, teléfono o plan" value={q} onChange={(e) => setQ(e.target.value)} />
          {selVend}
          <select className="sel" value={estadoF} onChange={(e) => setEstadoF(e.target.value)} aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            <option value="porvencer">Por vencer</option>
            <option value="vencido">Vencidos</option>
            {Object.entries(U.ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {!d.clientes.length ? <Vacio texto="Todavía no hay clientes.">{botonNuevo}</Vacio>
          : a.length ? <div className="list">{a.map(filaCliente)}</div>
          : <Vacio texto="Ningún cliente coincide con el filtro." />}
      </>
    );
  };

  const vistaPlanes = () => (
    <>
      <div className="topbar">
        <div><h1>Planes y productos</h1><p className="lead">Lo que vendes por suscripción. Al asignar un plan se completan el monto, el periodo y el vencimiento.</p></div>
        {esDueno ? <button className="btn primary" disabled={!puede} onClick={() => abrir('plan')}>Agregar plan</button> : null}
      </div>
      {!d.planes.length ? <Vacio texto={esDueno ? 'Todavía no hay planes. Agrega tu primer plan o producto.' : 'El dueño todavía no creó planes.'} /> : (
        <div className="cards">
          {d.planes.map((p: any) => {
            const n = d.clientes.filter((c: any) => c.plan_id === p.id && c.estado === 'activo').length;
            return (
              <div className="card" key={p.id}>
                <h3>{p.nombre}</h3>
                <div className="meta">
                  {p.precio != null ? `${negocio.moneda} ${p.precio} ` : ''}{(U.PERIODOS[p.periodo_meses] || 'sin periodo fijo').toLowerCase()}
                  {personas(p) > 1 ? <> · <b>grupal {p.personas} personas</b></> : null}
                </div>
                {p.descripcion ? <p className="tpl-text">{p.descripcion}</p> : null}
                <div className="stats"><div><b>{n}</b>clientes activos</div></div>
                {esDueno && puede ? (
                  <div className="foot">
                    <button className="btn sm" onClick={() => abrir('plan', { id: p.id })}>Editar</button>
                    <button className="btn ghost sm danger" onClick={() => abrir('confirmar', {
                      texto: `¿Eliminar el plan ${p.nombre}?`, detalle: 'Los clientes con este plan quedarán sin plan asignado.', boton: 'Eliminar',
                      accion: () => ejecutar(sb.from('crm_planes').delete().eq('id', p.id), 'Plan eliminado'),
                    })}>Eliminar</button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  const vistaRecordatorios = () => {
    const h = U.hoy();
    const pend = recsVis.filter((r: any) => !r.hecho && r.fecha <= h);
    const prox = recsVis.filter((r: any) => !r.hecho && r.fecha > h);
    const hech = recsVis.filter((r: any) => r.hecho).sort((a: any, b: any) => (b.hecho_el || '').localeCompare(a.hecho_el || '')).slice(0, 15);
    return (
      <>
        <div className="topbar">
          <div><h1>Recordatorios</h1><p className="lead">Seguimientos programados para tus clientes.</p></div>
          <div className="tools">{selVend}<button className="btn primary" disabled={!puede || !d.clientes.length} onClick={() => abrir('rec')}>Nuevo recordatorio</button></div>
        </div>
        {!recsVis.length ? <Vacio texto={d.clientes.length ? 'No hay recordatorios. Crea uno para no olvidar un seguimiento.' : 'Primero agrega un cliente.'} /> : (
          <>
            <h2>Para hoy y atrasados <span className="count">{pend.length}</span></h2>
            {pend.length ? <div className="list">{pend.map(filaRec)}</div> : <Vacio texto="Nada pendiente." />}
            <h2>Próximos <span className="count">{prox.length}</span></h2>
            {prox.length ? <div className="list">{prox.map(filaRec)}</div> : <Vacio texto="No hay recordatorios futuros." />}
            {hech.length ? <><h2>Hechos recientemente</h2><div className="list">{hech.map(filaRec)}</div></> : null}
          </>
        )}
      </>
    );
  };

  const vistaVendedores = () => (
    <>
      <div className="topbar">
        <div><h1>Vendedores</h1><p className="lead">Tu equipo. Cada vendedor ve y gestiona solo sus clientes.</p></div>
        <button className="btn primary" disabled={!puede} onClick={() => abrir('vendedor')}>Agregar vendedor</button>
      </div>
      <div className="cards">
        {d.usuarios.map((u: any) => {
          const cs = d.clientes.filter((c: any) => c.vendedor_id === u.id && c.estado === 'activo');
          const pv = cs.filter((c: any) => { const x = U.dias(c.vencimiento); return x != null && x >= 0 && x <= ventana; }).length;
          const vc = cs.filter((c: any) => { const x = U.dias(c.vencimiento); return x != null && x < 0; }).length;
          return (
            <div className="card" key={u.id}>
              <h3>{u.nombre} {u.rol === 'dueno' ? <span className="chip ok" style={{ marginLeft: 6 }}>Dueño</span> : null}</h3>
              <div className="meta">{u.empresa || negocio.nombre}{u.telefono ? ' · ' + U.fmtTel(u.telefono, negocio.pais_codigo) : ''}</div>
              <div className="meta">{u.user_id ? `Con acceso · ${u.email || ''}` : 'Sin acceso al sistema'}</div>
              <div className="stats"><div><b>{cs.length}</b>activos</div><div><b>{pv}</b>por vencer</div><div><b>{vc}</b>vencidos</div></div>
              <div className="foot">
                <button className="btn sm" onClick={() => { setVend(u.id); setVista('clientes'); }}>Ver cartera</button>
                {puede ? <button className="btn ghost sm" onClick={() => abrir('vendedor', { id: u.id })}>Editar</button> : null}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  const vistaMensajes = () => {
    const c = cli(tplCli);
    return (
      <>
        <div className="topbar">
          <div><h1>Mensajes de WhatsApp</h1><p className="lead">{c ? `Así le llegarán los mensajes a ${c.nombre}.` : 'Elige un cliente para ver los mensajes con sus datos.'}</p></div>
          {esDueno ? <button className="btn primary" disabled={!puede} onClick={() => abrir('plantilla')}>Nueva plantilla</button> : null}
        </div>
        <div className="tools" style={{ marginBottom: 14 }}>
          <select className="sel" value={tplCli} onChange={(e) => setTplCli(e.target.value)} aria-label="Ver mensajes para el cliente">
            <option value="">Sin cliente (ver variables)</option>
            {visibles.map((x: any) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
          </select>
        </div>
        <p className="vars">Variables: {['nombre', 'nombre_completo', 'plan', 'fecha', 'dias', 'monto', 'moneda', 'vendedor', 'empresa'].map((v) => <code key={v} style={{ marginRight: 4 }}>{'{' + v + '}'}</code>)}</p>
        <div className="cards">
          {d.plantillas.map((t: any) => (
            <div className="card" key={t.id}>
              <h3>{t.nombre}</h3>
              <p className="tpl-text">{c ? fill(t.texto, c) : t.texto}</p>
              <div className="foot">
                {c ? <button className="btn wa sm" aria-disabled={!tel(c)} onClick={() => abrir('wa', { id: c.id, tplId: t.id })}><IcoWa />Enviar</button> : null}
                {esDueno && puede ? (
                  <>
                    <button className="btn sm" onClick={() => abrir('plantilla', { id: t.id })}>Editar</button>
                    <button className="btn ghost sm danger" onClick={() => abrir('confirmar', {
                      texto: `¿Eliminar la plantilla ${t.nombre}?`, boton: 'Eliminar',
                      accion: () => ejecutar(sb.from('crm_plantillas').delete().eq('id', t.id), 'Plantilla eliminada'),
                    })}>Eliminar</button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <h2>Tu cuenta</h2>
        <div className="card">
          <div className="meta">{yo.nombre} · {esDueno ? 'Dueño' : 'Vendedor'} de {negocio.nombre}</div>
          <div className="foot">
            {esDueno && puede ? <button className="btn sm" onClick={() => abrir('ajustes')}>Datos del negocio</button> : null}
            <button className="btn ghost sm" onClick={salir}>Cerrar sesión</button>
          </div>
        </div>
      </>
    );
  };

  const vistas: Record<string, () => React.ReactNode> = {
    panel: vistaPanel, clientes: vistaClientes, planes: vistaPlanes, recordatorios: vistaRecordatorios,
    vendedores: vistaVendedores, mensajes: vistaMensajes,
  };

  return (
    <>
      <div className="app">
        <nav className="nav" aria-label="Secciones">
          <div className="brand">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3.2-6.9" /><path d="M21 4v5h-5" /></svg>
            <span><span>{negocio.nombre}</span><small>CRM por EDAI</small></span>
          </div>
          {NAV.filter(([, , , soloDueno]) => !soloDueno || esDueno).map(([k, label, icono]) => (
            <button key={k} className="nav-btn" aria-current={vista === k ? 'page' : undefined} onClick={() => { setVista(k); window.scrollTo(0, 0); }}>
              {icono}{label}
              {k === 'panel' && badge ? <span className="badge">{badge}</span> : null}
            </button>
          ))}
          <div className="navfoot">
            <span className="mode">{yo.nombre} · {esDueno ? 'Dueño' : 'Vendedor'}</span>
            <button className="btn ghost sm" onClick={salir}>Cerrar sesión</button>
          </div>
        </nav>
        <main>
          {comoAdmin ? (
            <div className="note" style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span>Estás viendo el panel de <b>{negocio.nombre}</b> como EDAI. Los cambios que hagas se guardan en su cuenta.</span>
              <a className="btn sm" href="/admin">Volver al panel maestro</a>
            </div>
          ) : null}
          {!puede ? (
            <div className="note">
              {negocio.estado !== 'activo'
                ? 'Tu cuenta está suspendida: puedes ver tus datos, pero no hacer cambios. Comunícate con EDAI para reactivarla.'
                : 'Tu suscripción a EDAI venció: puedes ver tus datos, pero no hacer cambios. Comunícate con EDAI para renovarla.'}
            </div>
          ) : null}
          {!cargado ? <p className="loading">Cargando datos…</p> : vistas[vista]()}
          <p className="credit">CRM de seguimiento desarrollado por <b>EDAI</b></p>
        </main>
      </div>
      <Modales ctx={ctx} />
      <div id="toast" className={msg ? 'show' : ''} role="status" aria-live="polite">{msg}</div>
    </>
  );
}
