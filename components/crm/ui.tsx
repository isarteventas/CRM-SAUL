import * as U from '@/lib/utils';

export const IcoWa = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.5L3 21l2-5.5A8.4 8.4 0 1 1 21 11.5z" />
  </svg>
);

export function ChipVenc({ c, ventana }: { c: any; ventana: number }) {
  if (c.estado !== 'activo') return <span className="chip">{U.ESTADOS[c.estado] || c.estado}</span>;
  const x = U.dias(c.vencimiento);
  if (x == null) return <span className="chip">Sin fecha</span>;
  if (x < 0) return <span className="chip danger">Venció hace {-x} {U.plural(-x, 'día')}</span>;
  if (x === 0) return <span className="chip danger">Vence hoy</span>;
  if (x <= ventana) return <span className="chip warn">Vence en {x} {U.plural(x, 'día')}</span>;
  return <span className="chip ok">Hasta {U.fmtF(c.vencimiento, true)}</span>;
}

export function Vacio({ texto, children }: { texto: string; children?: React.ReactNode }) {
  return (
    <div className="list">
      <div className="empty">
        <p>{texto}</p>
        {children}
      </div>
    </div>
  );
}

export function Campo({ label, err, hint, children }: { label: string; err?: boolean; hint?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <label className={'field' + (err ? ' err' : '')}>
      <span>{label}</span>
      {children}
      {hint ? <span className="hint">{hint}</span> : null}
    </label>
  );
}
