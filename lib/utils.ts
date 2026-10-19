export const PERIODOS: Record<number, string> = { 1: 'Mensual', 3: 'Trimestral', 6: 'Semestral', 12: 'Anual' };
export const ESTADOS: Record<string, string> = { activo: 'Activo', pausado: 'Pausado', baja: 'De baja' };

export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const hoy = () => iso(new Date());
export const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export function dias(s?: string | null): number | null {
  if (!s) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((parse(s).getTime() - t.getTime()) / 864e5);
}
export function addMonths(s: string, n: number) {
  const d = parse(s);
  const dia = d.getDate();
  d.setMonth(d.getMonth() + n);
  if (d.getDate() < dia) d.setDate(0);
  return iso(d);
}
export function addDays(s: string, n: number) {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}
export function fmtF(s?: string | null, corto = false) {
  if (!s) return '—';
  return parse(s.slice(0, 10)).toLocaleDateString(
    'es-BO',
    corto ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'long', year: 'numeric' }
  );
}
export const plural = (n: number, s: string, p?: string) => (n === 1 ? s : p || s + 's');

export function normTel(t: any, pais = '591') {
  let d = String(t || '').replace(/\D/g, '');
  if (d && d.length <= 9 && !d.startsWith(pais)) d = pais + d;
  return d;
}
export const fmtTel = (t: any, pais = '591') => {
  const d = normTel(t, pais);
  return d ? '+' + d : '—';
};
export const waUrl = (tel: any, pais: string, txt: string) =>
  `https://wa.me/${normTel(tel, pais)}?text=${encodeURIComponent(txt)}`;

export function num(v: any) {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}
export const money = (n: number) => n.toLocaleString('es-BO', { maximumFractionDigits: 2 });

export function errorTxt(e: any) {
  const m = e?.message || String(e || 'Error');
  if (/row-level security|permission denied/i.test(m)) return 'No tienes permiso para hacer este cambio.';
  return m;
}
