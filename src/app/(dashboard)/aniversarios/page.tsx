"use client"

import { useState, useMemo } from 'react'
import { useSCRHStore } from '@/store'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// ─── helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const AVATAR_COLORS = [
  '#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#14b8a6','#f97316',
]

function getInitials(nombre: string, aPaterno: string): string {
  return `${nombre.charAt(0)}${aPaterno.charAt(0)}`.toUpperCase()
}

function avatarColor(clave: string): string {
  let hash = 0
  for (let i = 0; i < clave.length; i++) hash = clave.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function seniorityColor(years: number): string {
  if (years >= 20) return '#f59e0b'   // gold
  if (years >= 15) return '#8b5cf6'   // purple
  if (years >= 10) return '#f97316'   // orange
  if (years >= 5)  return '#10b981'   // green
  return '#3b82f6'                    // blue
}

function isMilestone(years: number): boolean {
  return years > 0 && years % 5 === 0
}

function parseAlta(alta: string): { year: number; month: number; day: number } | null {
  if (!alta) return null
  const d = new Date(alta + 'T00:00:00')
  if (isNaN(d.getTime())) return null
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AniversariosPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)

  const empleados = useSCRHStore(s => s.empleados)
  const puestos   = useSCRHStore(s => s.puestos)
  const deptos    = useSCRHStore(s => s.departamentos)

  const getPuesto = (c: number) => puestos.find(p => p.clave === c)?.descripcion ?? '—'
  const getDepto  = (c: number) => deptos.find(d => d.clave === c)?.descripcion ?? '—'

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const anniversaries = useMemo(() => {
    return empleados
      .filter(e => e.st === 1)
      .flatMap(e => {
        const a = parseAlta(e.alta)
        if (!a) return []
        if (a.month !== month) return []
        const years = year - a.year
        if (years <= 0) return []
        return [{ emp: e, alta: a, years }]
      })
      .sort((a, b) => a.alta.day - b.alta.day)
  }, [empleados, month, year])

  const milestoneItems = anniversaries.filter(({ years }) => isMilestone(years))

  // Stats
  const allActive = empleados.filter(e => e.st === 1)
  const allWithAlta = allActive.flatMap(e => {
    const a = parseAlta(e.alta)
    if (!a) return []
    const years = today.getFullYear() - a.year
    if (years < 0) return []
    return [{ emp: e, years }]
  })

  const avgSeniority = allWithAlta.length > 0
    ? Math.round(allWithAlta.reduce((s, { years }) => s + years, 0) / allWithAlta.length)
    : 0

  const maxItem = allWithAlta.reduce<{ emp: (typeof allWithAlta)[0]['emp']; years: number } | null>(
    (best, cur) => (!best || cur.years > best.years ? cur : best),
    null
  )

  const fivePlus  = allWithAlta.filter(({ years }) => years >= 5).length
  const tenPlus   = allWithAlta.filter(({ years }) => years >= 10).length

  const fmtAlta = (a: { year: number; month: number; day: number }) =>
    `${String(a.day).padStart(2, '0')}/${String(a.month).padStart(2, '0')}/${a.year}`

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          🏆 Aniversarios
        </h1>
        <p className="text-gray-500 text-sm mt-1">Aniversarios laborales del personal</p>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-base font-semibold text-gray-800 min-w-[140px] text-center">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Milestone banner */}
      {milestoneItems.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-amber-800 font-medium">
          ⭐ Este mes celebramos hitos especiales:{' '}
          {milestoneItems.map(({ emp, years }) => `${emp.nombre_completo} (${years} años)`).join(', ')}
        </div>
      )}

      {/* Cards grid */}
      {anniversaries.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No hay aniversarios en {MONTH_NAMES[month - 1]} {year}.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          {anniversaries.map(({ emp, alta, years }) => {
            const color   = avatarColor(emp.clave)
            const initials = getInitials(emp.nombre, emp.a_paterno)
            const yColor  = seniorityColor(years)
            const milestone = isMilestone(years)

            return (
              <div
                key={emp.clave}
                className="rounded-xl border bg-white shadow-sm overflow-hidden"
                style={{ borderTop: `4px solid ${yColor}` }}
              >
                <div className="p-4 flex flex-col items-center text-center gap-2">
                  {/* Milestone badge */}
                  {milestone && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: years >= 10 ? '#fef3c7' : '#f0fdf4',
                        color: years >= 10 ? '#92400e' : '#166534',
                      }}
                    >
                      {years >= 10 ? '⭐ Hito Oro' : '🌟 Hito Plata'}
                    </span>
                  )}

                  {/* Day number */}
                  <span className="text-4xl font-extrabold text-gray-800 leading-none">
                    {alta.day}
                  </span>

                  {/* Avatar */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: color }}
                  >
                    {initials}
                  </div>

                  {/* Name */}
                  <p className="font-semibold text-gray-900 text-sm leading-tight">
                    {emp.nombre_completo}
                  </p>

                  {/* Puesto / Depto */}
                  <p className="text-xs text-gray-500">{getPuesto(emp.puesto)}</p>
                  <p className="text-xs text-gray-400">{getDepto(emp.depto)}</p>

                  {/* Years */}
                  <p className="text-2xl font-extrabold" style={{ color: yColor }}>
                    {years}
                  </p>
                  <p className="text-xs text-gray-500 -mt-1">años de antigüedad</p>

                  {/* Hire date */}
                  <p className="text-xs text-gray-400">
                    Ingreso: {fmtAlta(alta)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">{avgSeniority}</p>
          <p className="text-xs text-gray-500 mt-1">Promedio antigüedad (años)</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-sm font-bold text-gray-800 leading-tight">
            {maxItem ? maxItem.emp.nombre_completo : '—'}
          </p>
          <p className="text-2xl font-bold text-amber-600">{maxItem ? maxItem.years : 0}</p>
          <p className="text-xs text-gray-500 mt-1">Mayor antigüedad (años)</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{fivePlus}</p>
          <p className="text-xs text-gray-500 mt-1">Aniversarios 5+ personas</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{tenPlus}</p>
          <p className="text-xs text-gray-500 mt-1">Aniversarios 10+ personas</p>
        </div>
      </div>
    </div>
  )
}
