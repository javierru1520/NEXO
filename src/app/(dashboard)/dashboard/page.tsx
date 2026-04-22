"use client"

import { useMemo, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  UserMinus,
  UserPlus,
  HeartPulse,
  CreditCard,
  Bell,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { format, isAfter, isBefore, addDays, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import KpiCard from '@/components/dashboard/kpi-card'
import { useSCRHStore } from '@/store'
import { getEquipoCompleto } from '@/lib/org-tree'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(str: string | undefined): Date | null {
  if (!str) return null
  try { return parseISO(str) } catch { return null }
}

// ─── Donut mock data ───────────────────────────────────────────────────────────

const ausenciasData = [
  { name: 'Incapacidad', value: 38, color: '#ef4444' },
  { name: 'Vacaciones',  value: 28, color: '#6366f1' },
  { name: 'Licencia',    value: 18, color: '#f59e0b' },
  { name: 'Permiso',     value: 10, color: '#22c55e' },
  { name: 'Otro',        value: 6,  color: '#94a3b8' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const {
    empleados,
    altasProvisionales,
    incapacidades,
    licencias,
    departamentos,
    getDepartamentoNombre,
    getPuestoNombre,
    getEmpresaNombre,
  } = useSCRHStore()

  const [rolCode, setRolCode] = useState('')
  const [userNomina, setUserNomina] = useState('')

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('nexo_user') || '{}')
      setRolCode(u.rolCode || '')
      setUserNomina(u.nomina || '')
    } catch {}
  }, [])

  // Base filtrada según jerarquía del usuario
  const baseEmpleados = useMemo(() => {
    if (!rolCode || rolCode === 'ADMIN' || rolCode === 'ADP' || rolCode === 'RL') return empleados
    if (userNomina) return getEquipoCompleto(userNomina, empleados)
    return empleados
  }, [empleados, rolCode, userNomina])

  const today = useMemo(() => new Date(), [])
  const todayStr = format(today, 'yyyy-MM-dd')
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  const in30 = addDays(today, 30)

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const hcActivo = useMemo(
    () => baseEmpleados.filter(e => e.st === 1).length,
    [baseEmpleados],
  )

  const bajasEsteMes = useMemo(
    () =>
      baseEmpleados.filter(e => {
        if (e.st !== 5) return false
        const d = parseDate(e.fecha_baja)
        return d && !isBefore(d, monthStart) && !isAfter(d, monthEnd)
      }).length,
    [baseEmpleados, monthStart, monthEnd],
  )

  const altasEsteMes = useMemo(
    () =>
      baseEmpleados.filter(e => {
        const d = parseDate(e.alta)
        return d && !isBefore(d, monthStart) && !isAfter(d, monthEnd)
      }).length,
    [baseEmpleados, monthStart, monthEnd],
  )

  const incapacidadesActivas = useMemo(
    () =>
      incapacidades.filter(i => {
        const d = parseDate(i.f_final)
        return d && !isBefore(d, today)
      }).length,
    [incapacidades, today],
  )

  const licenciasPorVencer = useMemo(
    () =>
      licencias.filter(l => {
        const d = parseDate(l.vence)
        return d && !isBefore(d, today) && !isAfter(d, in30)
      }).length,
    [licencias, today, in30],
  )

  // ── Alert: altas pendientes ────────────────────────────────────────────────

  const altasPendientes = useMemo(
    () => altasProvisionales.filter(a => a.status === 2),
    [altasProvisionales],
  )

  // ── Dept distribution (activos) ───────────────────────────────────────────

  const deptData = useMemo(() => {
    const counts: Record<number, number> = {}
    baseEmpleados
      .filter(e => e.st === 1)
      .forEach(e => {
        counts[e.depto] = (counts[e.depto] ?? 0) + 1
      })
    return Object.entries(counts)
      .map(([clave, count]) => ({
        name: getDepartamentoNombre(Number(clave)),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [baseEmpleados, getDepartamentoNombre])

  // ── Last 5 bajas ──────────────────────────────────────────────────────────

  const ultimasBajas = useMemo(() => {
    return baseEmpleados
      .filter(e => e.st === 5 && e.fecha_baja)
      .sort((a, b) => (b.fecha_baja ?? '').localeCompare(a.fecha_baja ?? ''))
      .slice(0, 5)
  }, [baseEmpleados])

  // ── Altas provisionales table (max 5) ─────────────────────────────────────

  const altasPendientesTable = altasPendientes.slice(0, 5)

  return (
    <div className="p-6 space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-full uppercase tracking-widest">
            Control Corporativo
          </span>
          <h1 className="text-xl font-bold text-gray-900 mt-1.5">CONTROL CORPORATIVO — RH</h1>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">
            {format(today, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
      </div>

      {/* ── Alert banner ── */}
      {altasPendientes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">
              {altasPendientes.length} alta{altasPendientes.length !== 1 ? 's' : ''} pendiente{altasPendientes.length !== 1 ? 's' : ''} de aprobar
            </p>
            <p className="text-xs text-amber-700">Requieren revisión y aprobación en el módulo de Altas</p>
          </div>
          <Link
            href="/altas"
            className="text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
          >
            Ver altas
          </Link>
        </motion.div>
      )}

      {/* ── KPI Row (5 cards) ── */}
      <div className="grid grid-cols-5 gap-4">
        <KpiCard
          title="HC Activo"
          value={hcActivo}
          subtitle="Empleados st=1"
          color="#6366f1"
          icon={Users}
        />
        <KpiCard
          title="Bajas este mes"
          value={bajasEsteMes}
          subtitle="Dados de baja"
          color="#ef4444"
          icon={UserMinus}
        />
        <KpiCard
          title="Altas este mes"
          value={altasEsteMes}
          subtitle="Nuevos ingresos"
          color="#22c55e"
          icon={UserPlus}
        />
        <KpiCard
          title="Incapacidades activas"
          value={incapacidadesActivas}
          subtitle="Vigentes hoy"
          color="#f59e0b"
          icon={HeartPulse}
        />
        <KpiCard
          title="Licencias por vencer"
          value={licenciasPorVencer}
          subtitle="Próximos 30 días"
          color="#3b82f6"
          icon={CreditCard}
        />
      </div>

      {/* ── Row 2: Bar chart | Donut | Últimas Bajas ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* LEFT: Distribución por Departamento */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Distribución por Departamento</p>
          <p className="text-sm font-bold text-gray-900 mb-4">Empleados activos</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={deptData}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                formatter={(value) => [value, 'Empleados']}
                contentStyle={{ fontSize: 11 }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* CENTER: Motivos de Ausencia */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Motivos de Ausencia</p>
          <p className="text-sm font-bold text-gray-900 mb-2">Distribución general</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={ausenciasData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {ausenciasData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span style={{ fontSize: 10 }}>{value}</span>}
              />
              <Tooltip formatter={(value) => [`${value}%`, 'Proporción']} contentStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* RIGHT: Últimas Bajas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Últimas Bajas</p>
          <p className="text-sm font-bold text-gray-900 mb-4">Últimos 5 registros</p>
          <ul className="space-y-3">
            {ultimasBajas.length === 0 && (
              <li className="text-xs text-gray-400">Sin bajas registradas</li>
            )}
            {ultimasBajas.map((emp) => (
              <li key={emp.clave} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[9px] font-bold text-red-600">
                    {emp.nombre_completo.split(' ').slice(0, 2).map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{emp.nombre_completo}</p>
                  <p className="text-[10px] text-gray-500 truncate">{getDepartamentoNombre(emp.depto)}</p>
                  <p className="text-[10px] text-red-400">{emp.fecha_baja ?? '—'}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Row 3: Altas Provisionales Pendientes ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Altas Provisionales Pendientes</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">
              {altasPendientes.length} registro{altasPendientes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/altas"
            className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium hover:text-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            Ver módulo <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {altasPendientesTable.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            No hay altas provisionales pendientes
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Nombre', 'Empresa', 'Dpto', 'Puesto', 'Sueldo', 'F. Ingreso', 'Acciones'].map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {altasPendientesTable.map((alta) => (
                  <tr key={alta.numero} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-gray-800">{alta.nombre_completo}</p>
                      <p className="text-[10px] text-gray-400">#{alta.numero}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{getEmpresaNombre(alta.empresa)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{getDepartamentoNombre(alta.depto)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{getPuestoNombre(alta.puesto)}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 font-mono">
                      ${alta.sueldo_mensual.toLocaleString('es-MX')}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{alta.fecha_ingreso}</td>
                    <td className="px-4 py-3">
                      <Link
                        href="/altas"
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        Revisar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
