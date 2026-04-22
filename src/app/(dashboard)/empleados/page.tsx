"use client"

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSCRHStore } from '@/store'
import { getEquipoCompleto } from '@/lib/org-tree'
import { Empleado } from '@/types'
import {
  Users, UserCheck, UserMinus, TrendingUp, DollarSign,
  Search, MoreHorizontal, FileText, Edit2, UserX, Clock, Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { formatMXN } from '@/lib/calculations'
import BajaDialog from '@/components/empleados/baja-dialog'

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-violet-500', 'bg-sky-500',
  'bg-teal-500', 'bg-orange-500', 'bg-pink-500',
]

function getInitials(nombre: string): string {
  const parts = nombre.split(' ')
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : nombre.slice(0, 2).toUpperCase()
}

function StatusBadge({ st }: { st: 1 | 2 | 5 }) {
  if (st === 1) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Activo</span>
  if (st === 5) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-600">Baja</span>
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-700">Inactivo</span>
}

type FilterTab = 'todos' | 'activos' | 'bajas' | 'inactivos'

export default function EmpleadosPage() {
  const router = useRouter()
  const { empleados, empresas, getPuestoNombre, getDepartamentoNombre, getEmpresaNombre } = useSCRHStore()

  const [rolCode, setRolCode] = useState('')
  const [userNomina, setUserNomina] = useState('')

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('nexo_user') || '{}')
      setRolCode(u.rolCode || '')
      setUserNomina(u.nomina || '')
    } catch {}
  }, [])

  // Base jerárquica: cada quien ve solo su árbol hacia abajo
  const baseEmpleados = useMemo(() => {
    if (!rolCode || rolCode === 'ADMIN' || rolCode === 'ADP' || rolCode === 'RL') return empleados
    if (userNomina) return getEquipoCompleto(userNomina, empleados)
    return empleados
  }, [empleados, rolCode, userNomina])

  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('todos')
  const [bajaEmpleado, setBajaEmpleado] = useState<Empleado | null>(null)

  const activos = useMemo(() => baseEmpleados.filter(e => e.st === 1).length, [baseEmpleados])
  const bajas = useMemo(() => baseEmpleados.filter(e => e.st === 5).length, [baseEmpleados])
  const inactivos = useMemo(() => baseEmpleados.filter(e => e.st === 2).length, [baseEmpleados])

  const now = new Date()
  const mesActual = now.getMonth()
  const anyoActual = now.getFullYear()

  const bajasDelMes = useMemo(() => baseEmpleados.filter(e => {
    if (!e.fecha_baja) return false
    const d = new Date(e.fecha_baja)
    return d.getMonth() === mesActual && d.getFullYear() === anyoActual
  }).length, [baseEmpleados, mesActual, anyoActual])

  const altasDelMes = useMemo(() => baseEmpleados.filter(e => {
    const d = new Date(e.alta)
    return d.getMonth() === mesActual && d.getFullYear() === anyoActual
  }).length, [baseEmpleados, mesActual, anyoActual])

  const promedioSueldo = useMemo(() => {
    const actList = baseEmpleados.filter(e => e.st === 1)
    if (actList.length === 0) return 0
    return actList.reduce((s, e) => s + e.sueldo_mensual, 0) / actList.length
  }, [baseEmpleados])

  const filtered = useMemo(() => {
    let list = baseEmpleados
    if (activeTab === 'activos') list = list.filter(e => e.st === 1)
    else if (activeTab === 'bajas') list = list.filter(e => e.st === 5)
    else if (activeTab === 'inactivos') list = list.filter(e => e.st === 2)

    if (search.trim()) {
      const s = search.toLowerCase()
      list = list.filter(e =>
        e.nombre_completo.toLowerCase().includes(s) ||
        e.clave.includes(s) ||
        getPuestoNombre(e.puesto).toLowerCase().includes(s) ||
        getDepartamentoNombre(e.depto).toLowerCase().includes(s)
      )
    }
    return list
  }, [baseEmpleados, activeTab, search, getPuestoNombre, getDepartamentoNombre])

  const stats = [
    {
      label: 'Activos', value: activos,
      sub: `De ${baseEmpleados.length} totales`,
      icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100',
    },
    {
      label: 'Bajas mes', value: bajasDelMes,
      sub: 'Últimos 30 días',
      icon: UserMinus, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100',
    },
    {
      label: 'Altas mes', value: altasDelMes,
      sub: 'Últimos 30 días',
      icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100',
    },
    {
      label: 'Promedio sueldo', value: promedioSueldo,
      sub: 'Mensual bruto',
      icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100',
      currency: true,
    },
  ]

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'todos', label: 'Todos', count: empleados.length },
    { key: 'activos', label: 'Activos', count: activos },
    { key: 'bajas', label: 'Bajas', count: bajas },
    { key: 'inactivos', label: 'Inactivos', count: inactivos },
  ]

  function exportarCSV() {
    const headers = ['Nómina', 'Nombre', 'Empresa', 'Depto', 'Puesto', 'Sueldo mensual', 'Alta', 'Status']
    const statusLabel = (st: number) => st === 1 ? 'Activo' : st === 5 ? 'Baja' : 'Inactivo'
    const rows = filtered.map(e => [
      e.clave,
      e.nombre_completo,
      getEmpresaNombre(e.empresa),
      getDepartamentoNombre(e.depto),
      getPuestoNombre(e.puesto),
      e.sueldo_mensual,
      e.alta ?? '',
      statusLabel(e.st),
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `empleados_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Módulo de Empleados</span>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Control de Personal</h1>
            <span className="px-2 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-700 rounded-full">
              {empleados.length} empleados
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Administra el directorio completo de personal</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar empleado..."
              className="pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 w-56 bg-white"
            />
          </div>
          <Button
            variant="outline"
            onClick={exportarCSV}
            className="flex items-center gap-1.5 text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className={`bg-white rounded-xl border ${stat.border} shadow-sm p-4 flex items-center gap-3`}>
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                <p className={`text-lg font-bold ${stat.color}`}>
                  {stat.currency
                    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(stat.value)
                    : stat.value.toLocaleString('es-MX')}
                </p>
                <p className="text-[10px] text-gray-400">{stat.sub}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['#', 'Empleado', 'Nómina', 'Puesto', 'Departamento', 'Empresa', 'Sueldo', 'Status', 'Alta', 'Acciones'].map(col => (
                  <th key={col} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-gray-400">
                    No se encontraron empleados
                  </td>
                </tr>
              ) : (
                filtered.map((emp, idx) => {
                  const colorIdx = idx % AVATAR_COLORS.length
                  return (
                    <tr
                      key={emp.clave}
                      onClick={() => router.push(`/empleados/${emp.clave}`)}
                      className="hover:bg-indigo-50/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400 font-mono">{idx + 1}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full ${AVATAR_COLORS[colorIdx]} flex items-center justify-center shrink-0`}>
                            <span className="text-[10px] font-bold text-white">{getInitials(emp.nombre_completo)}</span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-800">{emp.nombre_completo}</p>
                            <p className="text-[10px] text-gray-400">{emp.email_corp ?? emp.email_personal ?? ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {emp.clave}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600">{getPuestoNombre(emp.puesto)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600">{getDepartamentoNombre(emp.depto)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600">{getEmpresaNombre(emp.empresa)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold text-gray-800">
                          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(emp.sueldo_mensual)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge st={emp.st} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500">
                          {new Date(emp.alta).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="p-1 rounded hover:bg-gray-100 transition-colors outline-none">
                            <MoreHorizontal className="w-4 h-4 text-gray-400" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => router.push(`/empleados/${emp.clave}`)}>
                              <FileText className="w-3.5 h-3.5" />
                              Ver expediente
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => router.push(`/empleados/${emp.clave}?tab=laborales`)}>
                              <Edit2 className="w-3.5 h-3.5" />
                              Editar
                            </DropdownMenuItem>
                            {emp.st !== 5 && (
                              <DropdownMenuItem
                                onSelect={() => setBajaEmpleado(emp)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                Baja
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onSelect={() => router.push(`/empleados/${emp.clave}?tab=historial`)}>
                              <Clock className="w-3.5 h-3.5" />
                              Ver historial
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            Mostrando {filtered.length} de {empleados.length} empleados
          </span>
        </div>
      </div>

      {/* Baja Dialog */}
      {bajaEmpleado && (
        <BajaDialog
          empleado={bajaEmpleado}
          open={!!bajaEmpleado}
          onClose={() => setBajaEmpleado(null)}
        />
      )}
    </div>
  )
}
