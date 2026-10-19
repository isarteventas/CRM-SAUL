'use client'

import Link from 'next/link'
import { useMemo, useState, type CSSProperties } from 'react'
import { ArrowRight, Camera, Check, ChevronDown, CircleHelp, Code2, Cpu, Film, Layers3, LockKeyhole, MessageCircle, Network, Search, ShieldCheck, Sparkles, Zap } from 'lucide-react'

const services = [
  { name: 'Gemini Ultra', category: 'Modelos de Lenguaje', description: 'Razonamiento multimodal avanzado, ventana de contexto extendida y generación ultra rápida.', tags: ['Multimodal', 'Coding', '2M Context'], status: 'Activo · Entrega inmediata', icon: Sparkles, tone: 'amber' },
  { name: 'ChatGPT Pro / Plus', category: 'Modelos de Lenguaje', description: 'Análisis de datos avanzado, modelos GPT-4o sin restricciones y ejecución de código en tiempo real.', tags: ['GPT-4o', 'Data Analysis', 'DALL-E 3'], status: 'Activo · Cupos limitados', icon: Network, tone: 'emerald' },
  { name: 'Claude 3.5 Sonnet / Opus', category: 'Código', description: 'Arquitectura de software de nivel superior, escritura natural y análisis de documentos extensos.', tags: ['Sonnet 3.5', 'Opus', 'Coding Pro'], status: 'Acceso verificado', icon: Cpu, tone: 'violet' },
  { name: 'Creative Studio Suite', category: 'Generación Visual', description: 'Generación de imagen y video de calidad cinematográfica con las mejores herramientas creativas.', tags: ['Midjourney', 'Runway', 'Kling'], status: 'Alta demanda', icon: Film, tone: 'cyan' },
]

const showcaseRows = [
  {
    direction: 'marquee-left',
    speed: '35s',
    cards: [
      ['Tigre cinematográfico en nieve', 'Midjourney v6', 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?auto=format&fit=crop&w=900&q=85'],
      ['Arquitectura de cristal al amanecer', 'Runway Gen-3', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=85'],
      ['Dispersión de tinta ultravioleta', 'Stable Diffusion XL', 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=900&q=85'],
      ['Tortuga bioluminiscente', 'Midjourney v6', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=85'],
    ],
  },
  {
    direction: 'marquee-right',
    speed: '45s',
    cards: [
      ['Van retro en carretera roja', 'Runway Gen-3', 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=900&q=85'],
      ['Flora de estudio y luz suave', 'DALL·E 3', 'https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=900&q=85'],
      ['Gato editorial con gafas retro', 'Midjourney v6', 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=900&q=85'],
      ['Ciudad nocturna de neón', 'Kling AI', 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=85'],
    ],
  },
  {
    direction: 'marquee-left',
    speed: '40s',
    cards: [
      ['Ciervo en hora dorada', 'Midjourney v6', 'https://images.unsplash.com/photo-1484406566174-9da000fda645?auto=format&fit=crop&w=900&q=85'],
      ['Macro de color y textura', 'Stable Diffusion XL', 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&w=900&q=85'],
      ['Horizonte sintético en azul', 'Runway Gen-3', 'https://images.unsplash.com/photo-1534791547706-9b9b56f2f9f1?auto=format&fit=crop&w=900&q=85'],
      ['Laboratorio de luz volumétrica', 'DALL·E 3', 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=900&q=85'],
    ],
  },
]

const tones = {
  amber: 'border-amber-400/25 bg-amber-400/10 text-amber-300 shadow-[0_0_35px_rgba(245,158,11,.12)]',
  emerald: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300 shadow-[0_0_35px_rgba(16,185,129,.12)]',
  violet: 'border-violet-400/25 bg-violet-400/10 text-violet-300 shadow-[0_0_35px_rgba(139,92,246,.14)]',
  cyan: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-300 shadow-[0_0_35px_rgba(6,182,212,.14)]',
}

function ShowcaseGrid() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[760px] overflow-hidden opacity-80 [mask-image:linear-gradient(to_bottom,black_0%,black_60%,transparent_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_10%,#07090e_82%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#07090e]/55 via-[#07090e]/75 to-[#07090e] backdrop-blur-[2px]" />
      <div className="relative flex flex-col gap-4 pt-28 sm:gap-6 sm:pt-36">
        {showcaseRows.map((row, rowIndex) => {
          const cards = [...row.cards, ...row.cards]
          return (
            <div key={row.direction + rowIndex} className="overflow-hidden">
              <div className={`flex w-max gap-4 sm:gap-6 ${row.direction}`} style={{ '--marquee-duration': row.speed } as React.CSSProperties}>
                {cards.map(([title, model, image], index) => (
                  <div key={`${title}-${index}`} className="showcase-card group relative h-36 w-56 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 sm:h-48 sm:w-72">
                    <img src={image} alt="" className="size-full object-cover opacity-80 transition duration-700 group-hover:scale-105 group-hover:opacity-100" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <span className="absolute bottom-3 left-3 translate-y-2 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[9px] font-medium text-white/90 opacity-0 backdrop-blur-md transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">Generado con {model}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Home() {
  const [filter, setFilter] = useState('Todas')
  const visibleServices = useMemo(() => filter === 'Todas' ? services : services.filter((service) => service.category === filter), [filter])
  const filters = ['Todas', 'Modelos de Lenguaje', 'Generación Visual', 'Código']

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07090e] text-white selection:bg-cyan-300 selection:text-slate-950">
      <ShowcaseGrid />
      <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.035)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="pointer-events-none fixed -left-32 top-0 size-[520px] animate-pulse rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="pointer-events-none fixed right-[-12%] top-40 size-[560px] rounded-full bg-violet-600/10 blur-[140px]" />
      <div className="pointer-events-none fixed bottom-[-20%] left-1/3 size-[480px] rounded-full bg-emerald-500/[.07] blur-[130px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-8">
        <header className="sticky top-4 z-20 mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl sm:px-6">
          <Link href="/" className="flex items-center gap-3"><span className="relative flex size-8 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-300/10"><span className="size-2 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_14px_#67e8f9]" /></span><span className="text-[10px] font-bold tracking-[.2em] text-slate-100 sm:text-xs">NEXUSGATE // CORE</span></Link>
          <nav className="hidden items-center gap-7 text-xs text-slate-400 lg:flex"><a href="#servicios" className="transition hover:text-cyan-200">Servicios</a><a href="#infraestructura" className="transition hover:text-cyan-200">Infraestructura</a><a href="#soporte" className="transition hover:text-cyan-200">Soporte</a><span className="flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[.06] px-3 py-1.5 text-emerald-300"><span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> Servidores en línea · 18ms</span></nav>
          <Link href="/portal" className="group flex items-center gap-2 rounded-xl border border-cyan-300/40 bg-gradient-to-r from-cyan-400/15 to-violet-400/15 px-3 py-2 text-[11px] font-bold text-cyan-100 transition hover:border-cyan-200 hover:shadow-[0_0_20px_rgba(34,211,238,.18)] sm:px-4 sm:text-xs">Portal de suscriptor <ArrowRight className="transition group-hover:translate-x-0.5" size={14} /></Link>
        </header>

        <section className="mx-auto max-w-5xl px-2 pb-24 pt-24 text-center sm:pb-28 sm:pt-32">
          <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/[.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,.08)] sm:text-[11px]"><Zap size={13} /> Plataforma de acceso multi-IA · Infraestructura 2026</div>
          <h1 className="mt-7 text-4xl font-semibold leading-[1.04] tracking-[-.04em] sm:text-6xl lg:text-7xl">Acceso corporativo y <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">licenciamiento seguro</span> a herramientas de IA</h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">Despliega modelos líderes (ChatGPT Pro, Gemini Ultra, Claude 3.5 y Creative Suites) con persistencia de sesión y enrutamiento privado de alta velocidad.</p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/portal" className="group inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-[0_0_30px_rgba(6,182,212,0.5)] transition hover:bg-cyan-200 hover:shadow-[0_0_35px_rgba(0,210,255,.55)]">Acceder a mi licencia <ArrowRight size={17} className="transition group-hover:translate-x-1" /></Link><a href="#servicios" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[.04] px-6 py-3.5 text-sm font-semibold text-slate-200 transition hover:border-white/40 hover:bg-white/[.08]">Explorar herramientas <ChevronDown size={17} /></a></div>
          <div id="infraestructura" className="mx-auto mt-16 max-w-3xl rounded-2xl border border-white/10 bg-slate-900/60 p-3 text-left shadow-2xl shadow-cyan-950/20 backdrop-blur-xl sm:p-4"><div className="rounded-xl border border-cyan-300/10 bg-[#0b111d] p-5 sm:p-7"><div className="flex items-center justify-between border-b border-white/10 pb-4"><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" /><span className="text-xs font-medium text-slate-300">NexusGate Secure Relay</span></div><span className="font-mono text-[10px] text-cyan-300">LIVE / 99.9%</span></div><div className="grid gap-5 pt-6 sm:grid-cols-3"><div><p className="text-[10px] uppercase tracking-[.15em] text-slate-500">Sesión cifrada</p><p className="mt-2 font-mono text-xl text-white">AES-256 <span className="text-emerald-400">✓</span></p></div><div><p className="text-[10px] uppercase tracking-[.15em] text-slate-500">Latencia de red</p><p className="mt-2 font-mono text-xl text-white">18 <span className="text-sm text-cyan-300">ms</span></p></div><div><p className="text-[10px] uppercase tracking-[.15em] text-slate-500">Nodos activos</p><p className="mt-2 font-mono text-xl text-white">24 <span className="text-sm text-emerald-300">online</span></p></div></div></div></div>
        </section>

        <section id="servicios" className="pb-24"><div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">Catálogo de acceso</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Herramientas listas para trabajar</h2><p className="mt-2 text-sm text-slate-500">Selecciona una solución y activa tu espacio privado.</p></div><div className="flex flex-wrap gap-2">{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${filter === item ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-200' : 'border-white/10 bg-white/[.03] text-slate-400 hover:border-white/25 hover:text-white'}`}>{item}</button>)}</div></div>
          <div className="grid gap-4 md:grid-cols-2">{visibleServices.map((service) => { const Icon = service.icon; return <article key={service.name} className="group rounded-2xl border border-slate-800 bg-[#0d1322]/80 p-6 backdrop-blur-md transition duration-300 hover:-translate-y-1.5 hover:border-cyan-500/50 hover:shadow-[0_10px_30px_rgba(0,0,0,.5)]"><div className="flex items-start justify-between gap-4"><div className={`flex size-12 items-center justify-center rounded-xl border ${tones[service.tone as keyof typeof tones]}`}><Icon size={21} /></div><span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/[.07] px-2.5 py-1.5 text-[10px] font-bold text-emerald-300"><span className="size-1.5 rounded-full bg-current" /> {service.status}</span></div><h3 className="mt-6 text-xl font-semibold">{service.name}</h3><p className="mt-2 min-h-14 text-sm leading-6 text-slate-400">{service.description}</p><div className="mt-5 flex flex-wrap gap-2">{service.tags.map((tag) => <span key={tag} className="rounded-md border border-white/10 bg-white/[.04] px-2 py-1 text-[10px] text-slate-300">{tag}</span>)}</div><a href="https://wa.me/" className="mt-7 flex items-center justify-between border-t border-white/10 pt-4 text-xs font-bold text-cyan-300 transition hover:text-cyan-100">Solicitar licencia directa <MessageCircle size={16} className="transition group-hover:scale-110" /></a></article> })}</div>
        </section>

        <section id="soporte" className="mb-12 grid gap-7 rounded-2xl border border-white/10 bg-white/[.03] p-6 backdrop-blur-sm sm:grid-cols-3 sm:p-8"><div className="sm:col-span-2"><p className="text-xs font-bold uppercase tracking-[.18em] text-slate-500">Operación confiable</p><h2 className="mt-2 text-xl font-semibold">Un acceso que trabaja a tu ritmo</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Asignación administrada, conectividad estable y soporte directo para mantener tu operación siempre en movimiento.</p></div><div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3 sm:col-span-3 sm:border-t sm:border-white/10 sm:pt-6"><span className="flex items-center gap-2"><Zap className="text-cyan-300" size={16} /> 99.9% Uptime de sesión</span><span className="flex items-center gap-2"><ShieldCheck className="text-emerald-400" size={16} /> Enrutamiento anti-bloqueo</span><span className="flex items-center gap-2"><Check className="text-violet-300" size={16} /> Activación en 1 clic</span></div></section>
        <footer className="flex flex-col gap-2 border-t border-white/10 py-7 text-xs text-slate-500 sm:flex-row sm:justify-between"><span>NexusGate // Access & License Hub</span><span>© 2026 · Operación segura y transparente</span></footer>
      </div>
    </main>
  )
}
