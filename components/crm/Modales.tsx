'use client';
import { useEffect, useState } from 'react';
import * as U from '@/lib/utils';
import { IcoWa, ChipVenc, Campo } from './ui';
import { darAccesoUsuario } from '@/app/actions';

const recalc = (b: any) => {
  const m = Number(b.periodo_meses);
  return m > 0 && b.inicio ? { ...b, vencimiento: U.addMonths(b.inicio, m) } : b;
};
const OpcionesPeriodo = () => (
  <>
    {Object.entries(U.PERIODOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    <option value="0">Sin periodo fijo</option>
  </>
);
const etiquetaPlan = (p: any, moneda: string) =>
  `${p.nombre}${p.precio != null ? ` – ${moneda} ${p.precio}` : ''}${(p.personas || 1) > 1 ? ` (grupal ${p.personas} personas)` : ''}`;
const numONulo = (v: any) => (v === '' || v == null ? null : U.num(v));

export default function Modales({ ctx }: { ctx: any }) {
  const m = ctx.modal;
  if (!m) return null;
  const vistas: Record<string, React.ReactNode> = {
    cliente: <FormCliente ctx={ctx} id={m.id} />,
    ficha: <Ficha ctx={ctx} id={m.id} />,
    miembro: <FormMiembro ctx={ctx} id={m.id} />,
    wa: <ModalWA ctx={ctx} id={m.id} recId={m.recId} tpl={m.tpl} tplId={m.tplId} />,
    renovarFecha: <RenovarFecha ctx={ctx} id={m.id} />,
    renovado: <Renovado ctx={ctx} {...m} />,
    cambiarPlan: <CambiarPlan ctx={ctx} id={m.id} />,
    plan: <FormPlan ctx={ctx} id={m.id} />,
    rec: <FormRec ctx={ctx} clienteId={m.clienteId} />,
    vendedor: <FormVendedor ctx={ctx} id={m.id} />,
    plantilla: <FormPlantilla ctx={ctx} id={m.id} />,
    confirmar: <Confirmar ctx={ctx} {...m} />,
    ajustes: <Ajustes ctx={ctx} />,
  };
  return (
    <div className="modal" onMouseDown={(e) => { if (e.target === e.currentTarget) ctx.cerrar(); }}>
      <div className="sheet" role="dialog" aria-modal="true" key={m.t + (m.id || '')}>
        {vistas[m.t] || null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function FormCliente({ ctx, id }: any) {
  const c = id ? ctx.cli(id) : null;
  const nuevo = !c;
  const { d, negocio } = ctx;
  const [f, setF] = useState<any>(() => {
    const b = {
      nombre: c?.nombre || '',
      telefono: c?.telefono || '',
      plan_id: c?.plan_id || '',
      vendedor_id: c?.vendedor_id || (ctx.esDueno ? ctx.vend || '' : ctx.yo.id),
      monto: c?.monto ?? '',
      periodo_meses: String(c?.periodo_meses ?? 1),
      inicio: c?.inicio || U.hoy(),
      vencimiento: c?.vencimiento || '',
      estado: c?.estado || 'activo',
      notas: c?.notas || '',
    };
    return nuevo ? recalc(b) : b;
  });
  const [errs, setErrs] = useState<any>({});
  const [np, setNp] = useState<any>(null);
  const [extra, setExtra] = useState<any[]>([]);
  const [rol, setRol] = useState('titular');
  const [tit, setTit] = useState('');
  const [manual, setManual] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const planes = [...d.planes, ...extra.filter((x) => !d.planes.some((p: any) => p.id === x.id))];
  const plan = planes.find((p: any) => p.id === f.plan_id);
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const setR = (k: string, v: any) => { setF((x: any) => recalc({ ...x, [k]: v })); setManual(false); };
  const aplicarPlan = (p: any) => {
    setF((x: any) => recalc({ ...x, plan_id: p.id, monto: p.precio ?? x.monto, periodo_meses: String(p.periodo_meses) }));
    setManual(false);
  };
  const elegir = (v: string) => {
    if (v === '__nuevo') return setNp({ nombre: '', precio: '', periodo_meses: '1', personas: '1' });
    setNp(null);
    const p = planes.find((x: any) => x.id === v);
    if (p) aplicarPlan(p);
    else set('plan_id', '');
  };
  const titulares = plan && ctx.personas(plan) > 1 && !ctx.miembros(c).length
    ? d.clientes.filter((x: any) => x.plan_id === plan.id && !x.titular_id && x.id !== c?.id && ctx.miembros(x).length + 1 < ctx.personas(plan))
    : [];
  const per = Number(f.periodo_meses);

  const guardarPlan = async () => {
    if (!np.nombre.trim()) return ctx.toast('Escribe el nombre del plan');
    const { data, error } = await ctx.sb.from('crm_planes').insert({
      negocio_id: negocio.id, nombre: np.nombre.trim(), precio: numONulo(np.precio),
      periodo_meses: Number(np.periodo_meses), personas: Math.max(1, parseInt(np.personas) || 1),
    }).select('*').single();
    if (error) return ctx.toast(U.errorTxt(error));
    setNp(null);
    setExtra((x) => [...x, data]);
    aplicarPlan(data);
    ctx.cargar();
    ctx.toast('Plan creado y asignado');
  };

  const guardar = async () => {
    const e = { nombre: !f.nombre.trim(), telefono: !f.telefono.trim() };
    setErrs(e);
    if (e.nombre || e.telefono) return ctx.toast('Completa los campos marcados');
    if (np) return ctx.toast('Guarda el plan nuevo o elige otro');
    const fila: any = {
      negocio_id: negocio.id,
      nombre: f.nombre.trim(),
      telefono: f.telefono.trim(),
      plan_id: f.plan_id || null,
      vendedor_id: (ctx.esDueno ? f.vendedor_id : ctx.yo.id) || null,
      monto: numONulo(f.monto),
      periodo_meses: Number(f.periodo_meses) || 0,
      inicio: f.inicio || null,
      vencimiento: f.vencimiento || null,
      estado: f.estado,
      notas: f.notas || null,
    };
    const titular = titulares.length && rol === 'integrante' ? titulares.find((x: any) => x.id === tit) || titulares[0] : null;
    if (titular) fila.titular_id = titular.id;
    setGuardando(true);
    if (nuevo) {
      const { data, error } = await ctx.sb.from('crm_clientes').insert(fila).select('id').single();
      setGuardando(false);
      if (error) return ctx.toast(U.errorTxt(error));
      ctx.cerrar();
      await ctx.cargar();
      if (titular) ctx.toast(`${fila.nombre} se agregó al grupo de ${titular.nombre}`);
      else {
        ctx.toast('Cliente agregado');
        if (plan && ctx.personas(plan) > 1) ctx.abrir('ficha', { id: data.id });
      }
    } else {
      const ok = await ctx.ejecutar(ctx.sb.from('crm_clientes').update(fila).eq('id', c.id), 'Cliente actualizado');
      setGuardando(false);
      if (ok) ctx.cerrar();
    }
  };

  const hintPlan = plan
    ? `${plan.precio != null ? negocio.moneda + ' ' + plan.precio + ' · ' : ''}${(U.PERIODOS[plan.periodo_meses] || 'sin periodo fijo').toLowerCase()}${ctx.personas(plan) > 1 ? ` · grupal ${plan.personas} personas` : ''}`
    : null;

  return (
    <>
      <h2>{nuevo ? 'Nuevo cliente' : 'Editar cliente'}</h2>
      <p className="sub">El teléfono se usa para abrir WhatsApp. Si no tiene código de país se agrega +{negocio.pais_codigo}.</p>
      <div className="grid2">
        <Campo label="Cliente o negocio *" err={errs.nombre}>
          <input value={f.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Nombre del cliente o de su negocio" autoFocus />
        </Campo>
        <Campo label="Teléfono WhatsApp *" err={errs.telefono}>
          <input value={f.telefono} inputMode="tel" onChange={(e) => set('telefono', e.target.value)} placeholder="70012345" />
        </Campo>
      </div>
      <div className="grid2">
        <Campo label="Plan o producto" hint={hintPlan}>
          <select value={np ? '__nuevo' : f.plan_id} onChange={(e) => elegir(e.target.value)}>
            <option value="">Sin plan</option>
            {planes.map((p: any) => <option key={p.id} value={p.id}>{etiquetaPlan(p, negocio.moneda)}</option>)}
            {ctx.esDueno ? <option value="__nuevo">+ Crear nuevo plan o producto</option> : null}
          </select>
        </Campo>
        <Campo label="Vendedor">
          <select value={f.vendedor_id} disabled={!ctx.esDueno} onChange={(e) => set('vendedor_id', e.target.value)}>
            <option value="">Sin asignar</option>
            {d.usuarios.map((u: any) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        </Campo>
      </div>

      {titulares.length ? (
        <div className="newplan" style={{ borderStyle: 'solid' }}>
          <div className="sec" style={{ marginTop: 0 }}>Plan grupal: este cliente es…</div>
          <label className="check"><input type="radio" checked={rol === 'titular'} onChange={() => setRol('titular')} /> El titular: paga el plan y arma su grupo</label>
          <label className="check" style={{ flexWrap: 'wrap' }}>
            <input type="radio" checked={rol === 'integrante'} onChange={() => setRol('integrante')} /> Integrante del grupo de
            <select className="sel" style={{ minHeight: 32, padding: '4px 8px' }} value={tit || titulares[0].id} onChange={(e) => { setTit(e.target.value); setRol('integrante'); }}>
              {titulares.map((x: any) => <option key={x.id} value={x.id}>{x.nombre} ({ctx.miembros(x).length + 1} de {ctx.personas(plan)})</option>)}
            </select>
          </label>
          <span className="hint" style={{ color: 'var(--muted)', fontWeight: 500 }}>Si es integrante, el plan y el vencimiento se toman del titular.</span>
        </div>
      ) : null}

      {np ? (
        <div className="newplan">
          <div className="sec" style={{ marginTop: 0 }}>Nuevo plan o producto</div>
          <div className="inline">
            <input className="inp" placeholder="Nombre del plan o producto" value={np.nombre} onChange={(e) => setNp({ ...np, nombre: e.target.value })} autoFocus />
            <input className="inp" inputMode="decimal" placeholder={'Precio ' + negocio.moneda} style={{ flex: '0 1 120px' }} value={np.precio} onChange={(e) => setNp({ ...np, precio: e.target.value })} />
          </div>
          <div className="inline">
            <select className="sel" value={np.periodo_meses} onChange={(e) => setNp({ ...np, periodo_meses: e.target.value })} aria-label="Periodo"><OpcionesPeriodo /></select>
            <input className="inp" type="number" min={1} max={50} style={{ flex: '0 1 150px' }} aria-label="Personas incluidas" value={np.personas} onChange={(e) => setNp({ ...np, personas: e.target.value })} />
            <span className="hint" style={{ color: 'var(--muted)', fontWeight: 500, alignSelf: 'center' }}>personas</span>
          </div>
          <div className="actions" style={{ marginTop: 6 }}>
            <button className="btn sm" onClick={() => setNp(null)}>Cancelar</button>
            <button className="btn primary sm" onClick={guardarPlan}>Guardar plan</button>
          </div>
        </div>
      ) : null}

      <div className="grid2">
        <Campo label={`Monto (${negocio.moneda})`}>
          <input inputMode="decimal" value={f.monto ?? ''} onChange={(e) => set('monto', e.target.value)} />
        </Campo>
        <Campo label="Periodo">
          <select value={f.periodo_meses} onChange={(e) => setR('periodo_meses', e.target.value)}><OpcionesPeriodo /></select>
        </Campo>
      </div>
      <div className="grid2">
        <Campo label="Empieza el">
          <input type="date" value={f.inicio} onChange={(e) => setR('inicio', e.target.value)} />
        </Campo>
        <label className="field">
          <span>Vence el</span>
          <input type="date" value={f.vencimiento} onChange={(e) => { set('vencimiento', e.target.value); setManual(true); }} />
          <span className="hint" style={{ color: 'var(--muted)', fontWeight: 500 }}>
            {manual ? 'Fecha editada a mano' : per > 0 ? `Calculada: ${(U.PERIODOS[per] || '').toLowerCase()} desde el inicio. Puedes cambiarla.` : 'Sin periodo fijo: elige la fecha.'}
          </span>
        </label>
      </div>
      <Campo label="Estado">
        <select value={f.estado} onChange={(e) => set('estado', e.target.value)}>
          {Object.entries(U.ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Campo>
      <Campo label="Notas">
        <textarea rows={2} value={f.notas} onChange={(e) => set('notas', e.target.value)} />
      </Campo>
      <div className="actions">
        <button className="btn" onClick={ctx.cerrar}>Cancelar</button>
        <button className="btn primary" onClick={guardar} disabled={guardando}>{nuevo ? 'Agregar cliente' : 'Guardar cambios'}</button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
function Ficha({ ctx, id }: any) {
  const c = ctx.cli(id);
  const [act, setAct] = useState<any[]>([]);
  const [gN, setGN] = useState('');
  const [gT, setGT] = useState('');
  const [rF, setRF] = useState(U.addDays(U.hoy(), 3));
  const [rN, setRN] = useState('');

  useEffect(() => {
    let vivo = true;
    ctx.sb.from('crm_actividad').select('*').eq('cliente_id', id).order('created_at', { ascending: false }).limit(8)
      .then(({ data }: any) => { if (vivo) setAct(data || []); });
    return () => { vivo = false; };
  }, [id, c?.vencimiento, c?.plan_id, c?.ultimo_contacto, ctx.sb]);

  if (!c) {
    return (
      <>
        <h2>Cliente no encontrado</h2>
        <div className="actions"><button className="btn" onClick={ctx.cerrar}>Cerrar</button></div>
      </>
    );
  }
  const { d, negocio, puede } = ctx;
  const v = ctx.usuario(c.vendedor_id);
  const tit = ctx.titularDe(c);
  const ms = ctx.miembros(c);
  const cap = ctx.personas(ctx.planDe(c));
  const libres = d.clientes.filter((x: any) => x.id !== c.id && !x.titular_id && !ctx.miembros(x).length);
  const recs = d.recordatorios.filter((r: any) => r.cliente_id === c.id)
    .sort((a: any, b: any) => Number(a.hecho) - Number(b.hecho) || a.fecha.localeCompare(b.fecha));

  const agregarMiembro = async () => {
    if (!gN.trim()) { ctx.toast('Escribe el nombre del integrante'); return false; }
    const ok = await ctx.ejecutar(ctx.sb.from('crm_clientes').insert({
      negocio_id: negocio.id, nombre: gN.trim(), telefono: gT.trim(), titular_id: c.id, vendedor_id: c.vendedor_id,
    }), 'Integrante agregado');
    if (ok) { setGN(''); setGT(''); await ctx.log(c.id, 'grupo', 'Se agregó a ' + gN.trim()); }
    return ok;
  };
  const agregarRec = async () => {
    if (!rF) { ctx.toast('Elige una fecha'); return false; }
    const ok = await ctx.ejecutar(ctx.sb.from('crm_recordatorios').insert({
      negocio_id: negocio.id, cliente_id: c.id, fecha: rF, nota: rN.trim() || null,
    }), 'Recordatorio agregado');
    if (ok) setRN('');
    return ok;
  };
  const aceptar = async () => {
    if (gN.trim()) { if (!(await agregarMiembro())) return; }
    if (rN.trim()) { if (!(await agregarRec())) return; }
    ctx.cerrar();
  };

  return (
    <>
      <h2>{c.nombre}</h2>
      <p className="sub"><ChipVenc c={c} ventana={ctx.ventana} /></p>
      <dl className="info">
        <dt>Teléfono</dt><dd>{U.fmtTel(c.telefono, negocio.pais_codigo)}</dd>
        <dt>Plan</dt><dd>{ctx.planNombre(c) || '—'}{c.monto != null ? ` · ${negocio.moneda} ${c.monto}` : ''} ({(U.PERIODOS[c.periodo_meses] || 'sin periodo fijo').toLowerCase()})</dd>
        <dt>Vence</dt>
        <dd>
          {tit || !puede ? <>{U.fmtF(c.vencimiento)}{tit ? ' (sigue al titular)' : ''}</> : (
            <input type="date" key={c.vencimiento || ''} defaultValue={c.vencimiento || ''} aria-label="Fecha de vencimiento" onChange={(e) => ctx.cambiarVenc(c, e.target.value)} />
          )}
        </dd>
        {tit ? (
          <>
            <dt>Grupo</dt>
            <dd>Integrante del grupo de <button className="link" onClick={() => ctx.abrir('ficha', { id: tit.id })}>{tit.nombre}</button></dd>
          </>
        ) : null}
        <dt>Vendedor</dt><dd>{v ? `${v.nombre}${v.empresa ? ' – ' + v.empresa : ''}` : 'Sin asignar'}</dd>
        {c.notas ? <><dt>Notas</dt><dd>{c.notas}</dd></> : null}
      </dl>

      <div className="actions" style={{ justifyContent: 'flex-start', margin: '0 0 6px' }}>
        <button className="btn wa" aria-disabled={!ctx.tel(c)} onClick={() => ctx.abrir('wa', { id: c.id })}><IcoWa />Enviar WhatsApp</button>
        {puede && c.vencimiento && !tit ? <button className="btn" onClick={() => (c.estado !== 'activo' ? ctx.reactivar(c.id) : ctx.renovar(c.id))}>{c.estado !== 'activo' || (U.dias(c.vencimiento) ?? 0) < 0 ? 'Reactivar' : 'Renovar'}</button> : null}
        {puede && !tit ? <button className="btn" onClick={() => ctx.abrir('cambiarPlan', { id: c.id })}>Cambiar plan</button> : null}
        {puede ? <button className="btn" onClick={() => ctx.abrir(tit ? 'miembro' : 'cliente', { id: c.id })}>Editar</button> : null}
      </div>

      {!tit && (cap > 1 || ms.length) ? (
        <>
          <div className="sec">Grupo · {ms.length + 1} de {cap} {U.plural(cap, 'persona')}</div>
          <ul className="minilist">
            <li><span className="grow"><b>{c.nombre}</b> · titular, paga el plan</span></li>
            {ms.map((m: any) => (
              <li key={m.id}>
                <span className="grow">{m.nombre}</span>
                <span className="when">{U.fmtTel(m.telefono, negocio.pais_codigo)}</span>
                <button className="btn ghost sm" onClick={() => ctx.abrir('ficha', { id: m.id })}>Ver</button>
                {puede ? <button className="btn ghost sm danger" onClick={async () => {
                  const ok = await ctx.ejecutar(ctx.sb.from('crm_clientes').update({ titular_id: null }).eq('id', m.id), m.nombre + ' salió del grupo');
                  if (ok) await ctx.log(c.id, 'grupo', m.nombre + ' salió del grupo');
                }}>Quitar</button> : null}
              </li>
            ))}
          </ul>
          {puede && ms.length + 1 < cap ? (
            <>
              <div className="inline">
                <input className="inp" placeholder="Nombre del integrante" aria-label="Nombre del integrante" value={gN} onChange={(e) => setGN(e.target.value)} />
                <input className="inp" inputMode="tel" placeholder="Teléfono" aria-label="Teléfono del integrante" style={{ flex: '0 1 140px' }} value={gT} onChange={(e) => setGT(e.target.value)} />
                <button className="btn sm" onClick={agregarMiembro}>Agregar</button>
              </div>
              {libres.length ? (
                <div className="inline">
                  <select className="sel" style={{ flex: 1 }} value="" aria-label="Unir cliente existente" onChange={async (e) => {
                    const x = ctx.cli(e.target.value);
                    if (!x) return;
                    const ok = await ctx.ejecutar(ctx.sb.from('crm_clientes').update({ titular_id: c.id }).eq('id', x.id), x.nombre + ' se unió al grupo');
                    if (ok) await ctx.log(c.id, 'grupo', 'Se unió ' + x.nombre);
                  }}>
                    <option value="">o unir un cliente que ya existe…</option>
                    {libres.map((x: any) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                  </select>
                </div>
              ) : null}
            </>
          ) : (
            <p className="sub" style={{ margin: 0 }}>{cap > 1 ? 'El grupo está completo.' : 'Su plan actual es individual. Cambia a un plan grupal para sumar integrantes.'}</p>
          )}
        </>
      ) : null}

      <div className="sec">Recordatorios</div>
      <ul className="minilist">
        {recs.length ? recs.map((r: any) => (
          <li key={r.id}>
            <span className="when">{U.fmtF(r.fecha, true)}</span>
            <span className="grow" style={r.hecho ? { textDecoration: 'line-through', color: 'var(--muted)' } : undefined}>{r.nota || 'Contactar'}</span>
            {puede && !r.hecho ? <button className="btn ghost sm" onClick={() => ctx.ejecutar(ctx.sb.from('crm_recordatorios').update({ hecho: true, hecho_el: U.hoy() }).eq('id', r.id), 'Recordatorio hecho')}>Hecho</button> : null}
            {puede ? <button className="btn ghost sm danger" aria-label="Eliminar recordatorio" onClick={() => ctx.ejecutar(ctx.sb.from('crm_recordatorios').delete().eq('id', r.id))}>✕</button> : null}
          </li>
        )) : <li style={{ color: 'var(--muted)' }}>Sin recordatorios.</li>}
      </ul>
      {puede ? (
        <div className="inline">
          <input className="inp" type="date" aria-label="Fecha" value={rF} onChange={(e) => setRF(e.target.value)} />
          <input className="inp" placeholder="Ej.: confirmar pago de renovación" aria-label="Nota" value={rN} onChange={(e) => setRN(e.target.value)} />
          <button className="btn sm" onClick={agregarRec}>Agregar</button>
        </div>
      ) : null}

      {act.length ? (
        <>
          <div className="sec">Actividad</div>
          <ul className="minilist">
            {act.map((a: any) => (
              <li key={a.id}><span className="when">{U.fmtF(String(a.created_at).slice(0, 10), true)}</span><span className="grow">{a.detalle || a.tipo}</span></li>
            ))}
          </ul>
        </>
      ) : null}

      <div className="actions">
        {puede && ctx.esDueno ? (
          <button className="btn ghost danger left" onClick={() => ctx.abrir('confirmar', {
            texto: `¿Eliminar a ${c.nombre}?`,
            detalle: ms.length ? 'Los integrantes de su grupo quedarán como clientes individuales.' : undefined,
            boton: 'Eliminar',
            accion: () => ctx.ejecutar(ctx.sb.from('crm_clientes').delete().eq('id', c.id), 'Cliente eliminado'),
          })}>Eliminar cliente</button>
        ) : null}
        <button className="btn" onClick={ctx.cerrar}>Cancelar</button>
        <button className="btn primary" onClick={aceptar}>Aceptar</button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
function FormMiembro({ ctx, id }: any) {
  const c = ctx.cli(id);
  const t = ctx.titularDe(c);
  const [f, setF] = useState({ nombre: c?.nombre || '', telefono: c?.telefono || '', notas: c?.notas || '' });
  if (!c) return null;
  const guardar = async () => {
    if (!f.nombre.trim()) return ctx.toast('Escribe el nombre');
    const ok = await ctx.ejecutar(ctx.sb.from('crm_clientes').update({ nombre: f.nombre.trim(), telefono: f.telefono.trim(), notas: f.notas || null }).eq('id', c.id), 'Integrante actualizado');
    if (ok) ctx.cerrar();
  };
  const quitar = async () => {
    const ok = await ctx.ejecutar(ctx.sb.from('crm_clientes').update({ titular_id: null }).eq('id', c.id), c.nombre + ' ahora es un cliente individual');
    if (ok) ctx.cerrar();
  };
  return (
    <>
      <h2>Editar integrante</h2>
      <p className="sub">Es parte del grupo de <b>{t?.nombre}</b>. El plan y el vencimiento siguen al titular.</p>
      <div className="grid2">
        <Campo label="Nombre *"><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} autoFocus /></Campo>
        <Campo label="Teléfono WhatsApp"><input inputMode="tel" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} /></Campo>
      </div>
      <Campo label="Notas"><textarea rows={2} value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} /></Campo>
      <div className="actions">
        <button className="btn ghost danger left" onClick={quitar}>Quitar del grupo</button>
        <button className="btn" onClick={ctx.cerrar}>Cancelar</button>
        <button className="btn primary" onClick={guardar}>Guardar</button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
function ModalWA({ ctx, id, recId, tpl, tplId }: any) {
  const c = ctx.cli(id);
  const tpls = ctx.d.plantillas;
  const x = U.dias(c?.vencimiento);
  const pref = tpl || (x != null && x < 0 ? 'Suscripción vencida' : x != null && x <= ctx.ventana ? 'Suscripción por vencer' : 'Seguimiento');
  const inicial = tpls.find((t: any) => t.id === tplId) || tpls.find((t: any) => t.nombre === pref) || tpls[0];
  const [sel, setSel] = useState(inicial?.id || '');
  const [txt, setTxt] = useState(inicial && c ? ctx.fill(inicial.texto, c) : '');
  const [marcar, setMarcar] = useState(true);
  const [nuevoRec, setNuevoRec] = useState(false);
  if (!c) return null;
  const tel = ctx.tel(c);
  const registrar = () => {
    const nombreTpl = tpls.find((t: any) => t.id === sel)?.nombre || 'Mensaje';
    setTimeout(async () => {
      ctx.cerrar();
      if (!ctx.puede) return;
      await ctx.sb.from('crm_clientes').update({ ultimo_contacto: U.hoy() }).eq('id', c.id);
      await ctx.log(c.id, 'mensaje', 'WhatsApp: ' + nombreTpl);
      if (recId && marcar) await ctx.sb.from('crm_recordatorios').update({ hecho: true, hecho_el: U.hoy() }).eq('id', recId);
      if (nuevoRec) await ctx.sb.from('crm_recordatorios').insert({ negocio_id: ctx.negocio.id, cliente_id: c.id, fecha: U.addDays(U.hoy(), 3), nota: 'Seguimiento: ' + nombreTpl });
      await ctx.cargar();
      ctx.toast('Mensaje registrado');
    }, 50);
  };
  return (
    <>
      <h2>Mensaje para {c.nombre}</h2>
      <p className="sub">{tel ? `Se abrirá WhatsApp con ${U.fmtTel(c.telefono, ctx.negocio.pais_codigo)}. Puedes ajustar el texto antes de enviarlo.` : 'Este cliente no tiene teléfono. Agrégalo en Editar.'}</p>
      {tpls.length ? (
        <Campo label="Plantilla">
          <select value={sel} onChange={(e) => { setSel(e.target.value); const t = tpls.find((y: any) => y.id === e.target.value); if (t) setTxt(ctx.fill(t.texto, c)); }}>
            {tpls.map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </Campo>
      ) : null}
      <Campo label="Mensaje"><textarea rows={7} value={txt} onChange={(e) => setTxt(e.target.value)} /></Campo>
      {recId ? <label className="check"><input type="checkbox" checked={marcar} onChange={(e) => setMarcar(e.target.checked)} /> Marcar el recordatorio como hecho</label> : null}
      <label className="check"><input type="checkbox" checked={nuevoRec} onChange={(e) => setNuevoRec(e.target.checked)} /> Crear recordatorio para volver a escribir en 3 días</label>
      <div className="actions">
        <button className="btn" onClick={ctx.cerrar}>Cancelar</button>
        <a className="btn wa" aria-disabled={!tel} target="_blank" rel="noopener noreferrer" href={U.waUrl(c.telefono, ctx.negocio.pais_codigo, txt)} onClick={registrar}>
          <IcoWa />Abrir WhatsApp
        </a>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
function RenovarFecha({ ctx, id }: any) {
  const c = ctx.cli(id);
  const base = c?.vencimiento && c.vencimiento > U.hoy() ? c.vencimiento : U.hoy();
  const [fecha, setFecha] = useState(U.addMonths(base, Number(c?.periodo_meses) || 1));
  if (!c) return null;
  const p = ctx.planDe(c);
  const ok = async () => {
    if (!fecha) return ctx.toast('Elige una fecha');
    if (c.vencimiento && fecha <= c.vencimiento) return ctx.toast('La nueva fecha debe ser posterior al vencimiento actual');
    const antes = { vencimiento: c.vencimiento, estado: c.estado };
    const { data, error } = await ctx.sb.rpc('crm_renovar', { p_cliente: c.id, p_hasta: fecha });
    if (error) return ctx.toast(U.errorTxt(error));
    await ctx.cargar();
    ctx.abrir('renovado', { id: c.id, nueva: data, antes, detalle: '' });
  };
  return (
    <>
      <h2>Renovar a {c.nombre}</h2>
      <p className="sub">{p ? `${p.nombre} no tiene un periodo fijo,` : 'Este cliente no tiene un plan con periodo,'} así que elige hasta cuándo se renueva. Vence actualmente el {U.fmtF(c.vencimiento)}.</p>
      <Campo label="Nueva fecha de vencimiento"><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Campo>
      <div className="actions">
        <button className="btn" onClick={ctx.cerrar}>Cancelar</button>
        <button className="btn primary" onClick={ok}>Renovar</button>
      </div>
    </>
  );
}

function Renovado({ ctx, id, nueva, antes, detalle }: any) {
  const c = ctx.cli(id);
  if (!c) return null;
  const nm = ctx.miembros(c).length;
  const deshacer = async () => {
    const ok = await ctx.ejecutar(ctx.sb.from('crm_clientes').update({ vencimiento: antes.vencimiento, estado: antes.estado }).eq('id', c.id), 'Renovación deshecha');
    if (ok) { await ctx.log(c.id, 'renovacion', 'Renovación deshecha'); ctx.cerrar(); }
  };
  return (
    <>
      <h2>Renovado</h2>
      <p className="sub">
        {c.nombre} queda activo hasta el <b>{U.fmtF(nueva)}</b>.
        {nm ? <><br />También se renovó a {nm} {U.plural(nm, 'integrante')} de su grupo.</> : null}
        {detalle ? <><br />{detalle.charAt(0).toUpperCase() + detalle.slice(1)}.</> : null}
      </p>
      <div className="actions">
        <button className="btn ghost left" onClick={deshacer}>Deshacer</button>
        <button className="btn" onClick={ctx.cerrar}>Listo</button>
        {ctx.tel(c) ? <button className="btn wa" onClick={() => ctx.abrir('wa', { id: c.id, tpl: 'Gracias por renovar' })}><IcoWa />Enviar agradecimiento</button> : null}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
function CambiarPlan({ ctx, id }: any) {
  const c = ctx.cli(id);
  const otros = ctx.d.planes.filter((p: any) => p.id !== c?.plan_id);
  const [pid, setPid] = useState(otros[0]?.id || '');
  const [desde, setDesde] = useState('hoy');
  if (!c) return null;
  if (!otros.length) {
    return (
      <>
        <h2>Cambiar plan</h2>
        <p className="sub">No hay otros planes. {ctx.esDueno ? 'Crea uno nuevo en la pestaña Planes.' : 'Pide al dueño que cree más planes.'}</p>
        <div className="actions"><button className="btn" onClick={ctx.cerrar}>Cerrar</button></div>
      </>
    );
  }
  const p = otros.find((x: any) => x.id === pid) || otros[0];
  const per = Number(p.periodo_meses) || 0;
  const venc = desde === 'hoy' && per > 0 ? U.addMonths(U.hoy(), per) : c.vencimiento;
  const sobran = Math.max(0, ctx.miembros(c).length + 1 - ctx.personas(p));
  const ok = async () => {
    const listo = await ctx.ejecutar(ctx.sb.from('crm_clientes').update({
      plan_id: p.id, monto: p.precio ?? c.monto ?? null, periodo_meses: per,
      inicio: desde === 'hoy' ? U.hoy() : c.inicio, vencimiento: venc || null, estado: 'activo',
    }).eq('id', c.id), 'Plan cambiado a ' + p.nombre);
    if (!listo) return;
    await ctx.log(c.id, 'cambio_plan', `Cambio de plan: ${ctx.planNombre(c) || 'sin plan'} → ${p.nombre}`);
    ctx.abrir('ficha', { id: c.id });
  };
  return (
    <>
      <h2>Cambiar plan de {c.nombre}</h2>
      <p className="sub">Plan actual: <b>{ctx.planNombre(c) || 'Sin plan'}</b>, vence el {U.fmtF(c.vencimiento)}.</p>
      <Campo label="Nuevo plan">
        <select value={p.id} onChange={(e) => setPid(e.target.value)}>
          {otros.map((x: any) => <option key={x.id} value={x.id}>{etiquetaPlan(x, ctx.negocio.moneda)}</option>)}
        </select>
      </Campo>
      <div className="field">
        <span>¿Desde cuándo?</span>
        <label className="check"><input type="radio" checked={desde === 'hoy'} onChange={() => setDesde('hoy')} /> Desde hoy: empieza un periodo nuevo</label>
        <label className="check"><input type="radio" checked={desde === 'mantener'} onChange={() => setDesde('mantener')} /> Mantener la fecha de vencimiento actual</label>
      </div>
      <p className="note" style={{ marginBottom: 8 }}>
        Nuevo vencimiento: <b>{U.fmtF(venc)}</b>{p.precio != null ? ` · monto ${ctx.negocio.moneda} ${p.precio}` : ''}
        {sobran ? <><br />El nuevo plan es para {ctx.personas(p)} {U.plural(ctx.personas(p), 'persona')}: {sobran} {U.plural(sobran, 'integrante')} saldrán del grupo y quedarán como clientes individuales.</> : null}
      </p>
      <div className="actions">
        <button className="btn" onClick={ctx.cerrar}>Cancelar</button>
        <button className="btn primary" onClick={ok}>Cambiar plan</button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
function FormPlan({ ctx, id }: any) {
  const p = id ? ctx.d.planes.find((x: any) => x.id === id) : null;
  const [f, setF] = useState({
    nombre: p?.nombre || '', precio: p?.precio ?? '', periodo_meses: String(p?.periodo_meses ?? 1),
    personas: String(p?.personas ?? 1), descripcion: p?.descripcion || '',
  });
  const [err, setErr] = useState(false);
  const guardar = async () => {
    if (!f.nombre.trim()) { setErr(true); return ctx.toast('Escribe el nombre del plan'); }
    const fila = {
      negocio_id: ctx.negocio.id, nombre: f.nombre.trim(), precio: numONulo(f.precio),
      periodo_meses: Number(f.periodo_meses), personas: Math.max(1, parseInt(f.personas) || 1), descripcion: f.descripcion || null,
    };
    const q = p ? ctx.sb.from('crm_planes').update(fila).eq('id', p.id) : ctx.sb.from('crm_planes').insert(fila);
    if (await ctx.ejecutar(q, p ? 'Plan actualizado' : 'Plan agregado')) ctx.cerrar();
  };
  return (
    <>
      <h2>{p ? 'Editar plan' : 'Nuevo plan o producto'}</h2>
      <p className="sub">Con un periodo definido, al renovar se suma automáticamente (por ejemplo, un mes más). Sin periodo fijo, eliges la fecha en cada renovación.</p>
      <Campo label="Nombre *" err={err}><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Plan Premium" autoFocus /></Campo>
      <div className="grid2">
        <Campo label={`Precio (${ctx.negocio.moneda})`}><input inputMode="decimal" value={f.precio} onChange={(e) => setF({ ...f, precio: e.target.value })} /></Campo>
        <Campo label="Periodo"><select value={f.periodo_meses} onChange={(e) => setF({ ...f, periodo_meses: e.target.value })}><OpcionesPeriodo /></select></Campo>
      </div>
      <label className="field">
        <span>Personas incluidas</span>
        <input type="number" min={1} max={50} value={f.personas} onChange={(e) => setF({ ...f, personas: e.target.value })} />
        <span className="hint" style={{ color: 'var(--muted)', fontWeight: 500 }}>1 = individual. 2 o más = plan grupal: pagan un solo precio y comparten la misma fecha de vencimiento (ej. 2x1).</span>
      </label>
      <Campo label="Descripción"><textarea rows={2} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></Campo>
      <div className="actions">
        <button className="btn" onClick={ctx.cerrar}>Cancelar</button>
        <button className="btn primary" onClick={guardar}>{p ? 'Guardar cambios' : 'Agregar plan'}</button>
      </div>
    </>
  );
}

function FormRec({ ctx, clienteId }: any) {
  const cs = (ctx.vend ? ctx.d.clientes.filter((c: any) => c.vendedor_id === ctx.vend) : ctx.d.clientes);
  const [f, setF] = useState({ cliente_id: clienteId || '', fecha: U.addDays(U.hoy(), 1), nota: '' });
  const guardar = async () => {
    if (!f.cliente_id || !f.fecha) return ctx.toast('Elige el cliente y la fecha');
    if (await ctx.ejecutar(ctx.sb.from('crm_recordatorios').insert({ negocio_id: ctx.negocio.id, cliente_id: f.cliente_id, fecha: f.fecha, nota: f.nota || null }), 'Recordatorio creado')) ctx.cerrar();
  };
  return (
    <>
      <h2>Nuevo recordatorio</h2>
      <p className="sub">Aparecerá en el Panel cuando llegue la fecha.</p>
      <Campo label="Cliente *">
        <select value={f.cliente_id} onChange={(e) => setF({ ...f, cliente_id: e.target.value })}>
          <option value="">Elige un cliente</option>
          {cs.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </Campo>
      <Campo label="Fecha *"><input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></Campo>
      <Campo label="Qué hacer"><input value={f.nota} onChange={(e) => setF({ ...f, nota: e.target.value })} placeholder="Ej.: ofrecer plan anual" /></Campo>
      <div className="actions">
        <button className="btn" onClick={ctx.cerrar}>Cancelar</button>
        <button className="btn primary" onClick={guardar}>Crear recordatorio</button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
function FormVendedor({ ctx, id }: any) {
  const u = id ? ctx.d.usuarios.find((x: any) => x.id === id) : null;
  const [f, setF] = useState({ nombre: u?.nombre || '', empresa: u?.empresa || '', telefono: u?.telefono || '', email: u?.email || '' });
  const [invitar, setInvitar] = useState(!u);
  const [enviando, setEnviando] = useState(false);
  const esYo = u?.user_id && u.id === ctx.yo.id;

  const guardar = async () => {
    if (!f.nombre.trim()) return ctx.toast('Escribe el nombre');
    setEnviando(true);
    try {
      if (!u && invitar && f.email.trim()) {
        const r = await darAccesoUsuario({ negocioId: ctx.negocio.id, nombre: f.nombre.trim(), empresa: f.empresa, telefono: f.telefono, email: f.email });
        if (!r.ok) return ctx.toast(r.error);
        ctx.toast(r.mensaje || 'Invitación enviada');
        await ctx.cargar();
        return ctx.cerrar();
      }
      const fila = { nombre: f.nombre.trim(), empresa: f.empresa || null, telefono: f.telefono || null, email: f.email.trim().toLowerCase() || null };
      const q = u
        ? ctx.sb.from('crm_usuarios').update(fila).eq('id', u.id)
        : ctx.sb.from('crm_usuarios').insert({ ...fila, negocio_id: ctx.negocio.id, rol: 'vendedor' });
      if (await ctx.ejecutar(q, u ? 'Vendedor actualizado' : 'Vendedor agregado')) ctx.cerrar();
    } finally {
      setEnviando(false);
    }
  };
  const darAcceso = async () => {
    if (!f.email.trim()) return ctx.toast('Escribe su correo primero');
    setEnviando(true);
    const r = await darAccesoUsuario({ negocioId: ctx.negocio.id, usuarioId: u.id, nombre: f.nombre, email: f.email });
    setEnviando(false);
    if (!r.ok) return ctx.toast(r.error);
    ctx.toast(r.mensaje || 'Acceso enviado');
    await ctx.cargar();
    ctx.cerrar();
  };

  return (
    <>
      <h2>{u ? 'Editar vendedor' : 'Nuevo vendedor'}</h2>
      <p className="sub">El nombre y la empresa se usan en los mensajes ({'{vendedor}'}, {'{empresa}'}).</p>
      <Campo label="Nombre *"><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} autoFocus /></Campo>
      <div className="grid2">
        <Campo label="Empresa"><input value={f.empresa} placeholder={ctx.negocio.nombre} onChange={(e) => setF({ ...f, empresa: e.target.value })} /></Campo>
        <Campo label="Teléfono"><input inputMode="tel" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} /></Campo>
      </div>
      <Campo label="Correo"><input type="email" value={f.email} disabled={!!u?.user_id} onChange={(e) => setF({ ...f, email: e.target.value })} /></Campo>
      {!u ? (
        <label className="check"><input type="checkbox" checked={invitar} onChange={(e) => setInvitar(e.target.checked)} /> Enviarle una invitación para que entre con su usuario y contraseña</label>
      ) : !u.user_id ? (
        <p className="sub">No tiene acceso al sistema. <button className="link" onClick={darAcceso} disabled={enviando}>Enviar invitación</button></p>
      ) : (
        <p className="sub">Tiene acceso con {u.email}.</p>
      )}
      <div className="actions">
        {u && !esYo && u.rol !== 'dueno' ? (
          <button className="btn ghost danger left" onClick={() => ctx.abrir('confirmar', {
            texto: `¿Quitar a ${u.nombre}?`, detalle: 'Perderá el acceso y sus clientes quedarán sin vendedor asignado.', boton: 'Quitar',
            accion: () => ctx.ejecutar(ctx.sb.from('crm_usuarios').delete().eq('id', u.id), 'Vendedor quitado'),
          })}>Quitar</button>
        ) : null}
        <button className="btn" onClick={ctx.cerrar}>Cancelar</button>
        <button className="btn primary" onClick={guardar} disabled={enviando}>{enviando ? 'Enviando…' : u ? 'Guardar cambios' : 'Agregar vendedor'}</button>
      </div>
    </>
  );
}

function FormPlantilla({ ctx, id }: any) {
  const t = id ? ctx.d.plantillas.find((x: any) => x.id === id) : null;
  const [f, setF] = useState({ nombre: t?.nombre || '', texto: t?.texto || '' });
  const guardar = async () => {
    if (!f.nombre.trim() || !f.texto.trim()) return ctx.toast('Completa el nombre y el mensaje');
    const fila = { negocio_id: ctx.negocio.id, nombre: f.nombre.trim(), texto: f.texto };
    const q = t ? ctx.sb.from('crm_plantillas').update(fila).eq('id', t.id) : ctx.sb.from('crm_plantillas').insert(fila);
    if (await ctx.ejecutar(q, 'Plantilla guardada')) ctx.cerrar();
  };
  return (
    <>
      <h2>{t ? 'Editar plantilla' : 'Nueva plantilla'}</h2>
      <p className="vars">Puedes usar {['nombre', 'plan', 'fecha', 'dias', 'monto', 'moneda', 'vendedor', 'empresa'].map((v) => <code key={v} style={{ marginRight: 4 }}>{'{' + v + '}'}</code>)}</p>
      <Campo label="Nombre *"><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} autoFocus /></Campo>
      <Campo label="Mensaje *"><textarea rows={7} value={f.texto} onChange={(e) => setF({ ...f, texto: e.target.value })} /></Campo>
      <div className="actions">
        <button className="btn" onClick={ctx.cerrar}>Cancelar</button>
        <button className="btn primary" onClick={guardar}>Guardar plantilla</button>
      </div>
    </>
  );
}

function Confirmar({ ctx, texto, detalle, boton, accion }: any) {
  return (
    <>
      <h2>{texto}</h2>
      <p className="sub">{detalle || 'Esta acción no se puede deshacer.'}</p>
      <div className="actions">
        <button className="btn" onClick={ctx.cerrar}>Cancelar</button>
        <button className="btn primary" onClick={async () => { ctx.cerrar(); await accion(); }}>{boton || 'Confirmar'}</button>
      </div>
    </>
  );
}

function Ajustes({ ctx }: any) {
  const n = ctx.negocio;
  const [f, setF] = useState({ nombre: n.nombre || '', telefono: n.telefono || '', dias_aviso: String(n.dias_aviso || 7), moneda: n.moneda || 'Bs.', pais_codigo: n.pais_codigo || '591' });
  const guardar = async () => {
    if (!f.nombre.trim()) return ctx.toast('Escribe el nombre del negocio');
    const { data, error } = await ctx.sb.from('crm_negocios').update({
      nombre: f.nombre.trim(), telefono: f.telefono || null, dias_aviso: Math.min(60, Math.max(1, parseInt(f.dias_aviso) || 7)),
      moneda: f.moneda || 'Bs.', pais_codigo: (f.pais_codigo || '591').replace(/\D/g, ''),
    }).eq('id', n.id).select('*').single();
    if (error) return ctx.toast(U.errorTxt(error));
    ctx.setNegocio(data);
    ctx.toast('Datos guardados');
    ctx.cerrar();
  };
  return (
    <>
      <h2>Datos del negocio</h2>
      <p className="sub">El nombre aparece en el menú y en {'{empresa}'} cuando el vendedor no tiene una empresa.</p>
      <div className="grid2">
        <Campo label="Nombre del negocio *"><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Campo>
        <Campo label="Teléfono"><input inputMode="tel" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} /></Campo>
      </div>
      <div className="grid2">
        <Campo label="Avisar con (días de anticipación)"><input type="number" min={1} max={60} value={f.dias_aviso} onChange={(e) => setF({ ...f, dias_aviso: e.target.value })} /></Campo>
        <Campo label="Moneda"><input value={f.moneda} onChange={(e) => setF({ ...f, moneda: e.target.value })} /></Campo>
      </div>
      <Campo label="Código de país para WhatsApp"><input inputMode="numeric" value={f.pais_codigo} onChange={(e) => setF({ ...f, pais_codigo: e.target.value })} /></Campo>
      <div className="actions">
        <button className="btn" onClick={ctx.cerrar}>Cancelar</button>
        <button className="btn primary" onClick={guardar}>Guardar</button>
      </div>
    </>
  );
}
