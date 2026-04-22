"use client"

import { useState, useMemo } from 'react'
import { useSCRHStore } from '@/store'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// ─── helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const DOW_COLORS = [
  '#ef4444', // Sunday
  '#6366f1', // Monday
  '#f59e0b', // Tuesday
  '#10b981', // Wednesday
  '#3b82f6', // Thursday
  '#8b5cf6', // Friday
  '#ec4899', // Saturday
]

const AVATAR_COLORS = [
  '#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#14b8a6','#f97316',
]

function getBirthDate(rfc: string): { month: number; day: number; year: number } | null {
  if (!rfc || rfc.length < 10) return null
  const yy = parseInt(rfc.slice(4, 6), 10)
  const mm = parseInt(rfc.slice(6, 8), 10)
  const dd = parseInt(rfc.slice(8, 10), 10)
  if (isNaN(yy) || isNaN(mm) || isNaN(dd)) return null
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
  const currentYY = new Date().getFullYear() % 100
  const year = yy <= currentYY ? 2000 + yy : 1900 + yy
  return { month: mm, day: dd, year }
}

function getInitials(nombre: string, aPaterno: string): string {
  return `${nombre.charAt(0)}${aPaterno.charAt(0)}`.toUpperCase()
}

function avatarColor(clave: string): string {
  let hash = 0
  for (let i = 0; i < clave.length; i++) hash = clave.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CumpleanosPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1) // 1-based

  const empleados = useSCRHStore(s => s.empleados)
  const puestos   = useSCRHStore(s => s.puestos)
  const deptos    = useSCRHStore(s => s.departamentos)
  const empresas  = useSCRHStore(s => s.empresas)

  const getPuesto  = (c: number) => puestos.find(p => p.clave === c)?.descripcion ?? '—'
  const getDepto   = (c: number) => deptos.find(d => d.clave === c)?.descripcion ?? '—'
  const getEmpresa = (c: number) => empresas.find(e => e.clave === c)?.razon_social ?? '—'

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const birthdays = useMemo(() => {
    return empleados
      .filter(e => e.st === 1)
      .flatMap(e => {
        const bd = getBirthDate(e.rfc)
        if (!bd) return []
        if (bd.month !== month) return []
        return [{ emp: e, bd }]
      })
      .sort((a, b) => a.bd.day - b.bd.day)
  }, [empleados, month])

  const todayBirthdays = birthdays.filter(
    ({ bd }) => bd.month === today.getMonth() + 1 && bd.day === today.getDate() && year === today.getFullYear()
  )

  const isToday = (bd: { month: number; day: number }) =>
    year === today.getFullYear() &&
    bd.month === today.getMonth() + 1 &&
    bd.day === today.getDate()

  const isPast = (bd: { month: number; day: number }) => {
    if (year < today.getFullYear()) return true
    if (year > today.getFullYear()) return false
    if (bd.month < today.getMonth() + 1) return true
    if (bd.month === today.getMonth() + 1 && bd.day < today.getDate()) return true
    return false
  }

  const getBorderColor = (bd: { day: number }) => {
    const dow = new Date(year, month - 1, bd.day).getDay()
    return DOW_COLORS[dow]
  }

  const calcAge = (birthYear: number) => year - birthYear

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          🎂 Cumpleaños
        </h1>
        <p className="text-gray-500 text-sm mt-1">Cumpleaños del personal</p>
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

      {/* Today banner */}
      {todayBirthdays.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4 text-yellow-800 font-medium">
          🎉 Hoy es el cumpleaños de:{' '}
          {todayBirthdays.map(({ emp }) => emp.nombre_completo).join(', ')}
        </div>
      )}

      {/* Cards grid */}
      {birthdays.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No hay cumpleaños en {MONTH_NAMES[month - 1]} {year}.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {birthdays.map(({ emp, bd }) => {
            const today_ = isToday(bd)
            const past = isPast(bd)
            const borderColor = getBorderColor(bd)
            const color = avatarColor(emp.clave)
            const initials = getInitials(emp.nombre, emp.a_paterno)
            const age = calcAge(bd.year)

            return (
              <div
                key={emp.clave}
                className={`rounded-xl border bg-white shadow-sm overflow-hidden transition-opacity ${past && !today_ ? 'opacity-50' : ''}`}
                style={{ borderTop: `4px solid ${borderColor}` }}
              >
                <div className="p-4 flex flex-col items-center text-center gap-2">
                  {/* Day number */}
                  <span className="text-4xl font-extrabold text-gray-800 leading-none">
                    {bd.day}
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
                  <p className="text-xs text-gray-500">
                    {getPuesto(emp.puesto)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {getDepto(emp.depto)}
                  </p>

                  {/* Empresa */}
                  <p className="text-xs text-gray-400">
                    {getEmpresa(emp.empresa)}
                  </p>

                  {/* Age */}
                  <p className="text-xs font-medium text-indigo-600">
                    Cumple {age} años
                  </p>

                  {/* Today badge */}
                  {today_ && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                      🎂 ¡Hoy!
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Summary */}
      {birthdays.length > 0 && (
        <p className="mt-6 text-sm text-gray-500">
          Total cumpleaños este mes: <span className="font-semibold text-gray-700">{birthdays.length}</span>
        </p>
      )}
    </div>
  )
}
