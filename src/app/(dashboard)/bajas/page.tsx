"use client"

import { useState, useMemo, useEffect } from 'react'
import { useSCRHStore } from '@/store'
import { Empleado, Baja, ProspectoBaja } from '@/types'
import { formatMXN } from '@/lib/calculations'
import { getEquipoCompleto } from '@/lib/org-tree'
import {
  UserX, Users, Calendar, RotateCcw, TrendingDown,
  Search, Download, CheckCircle, XCircle, AlertTriangle, Edit2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import BajaDialog from '@/components/empleados/baja-dialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'

type MainTab = 'registro' | 'historial' | 'prospectos' | 'correccion'

const TIPOS_PROSPECTO = [
  'Falta grave',
  'Tardanza reiterada',
  'Conducta inapropiada',
  'Bajo rendimiento',
  'Ausentismo',
  'Otro',
]

const CAUSAS_PROSPECTO = [
  'Baja voluntaria probable',
  'Rescisión probable',
  'Abandono probable',
  'Desconocida',
]


// ── Helpers ──────────────────────────────────────────────────────────────────

function CheckItem({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
      <span className="text-gray-600">{label}</span>
      {value ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : (
        <XCircle className="w-4 h-4 text-red-400" />
      )}
    </div>
  )
}

function calcularAntiguedad(alta: string): string {
  const now = new Date()
  const start = new Date(alta)
  const diffMs = now.getTime() - start.getTime()
  const years = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000))
  const months = Math.floor((diffMs % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000))
  if (years > 0) return `${years}a ${months}m`
  return `${months} meses`
}

const today = new Date().toISOString().split('T')[0]

// ── Main component ────────────────────────────────────────────────────────────

export default function BajasPage() {
  const {
    empleados,
    bajas,
    prospectosBaja,
    addProspectoBaja,
    updateProspectoBaja,
    deleteProspectoBaja,
    updateBaja,
    tiposBaja,
    motivosBaja,
    causasBaja,
    causasIMSS,
    getEmpresaNombre,
    getDepartamentoNombre,
    getPuestoNombre,
    updateEmpleado,
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

  // Hierarchy filter
  const baseEmpleados = useMemo(() => {
    if (!rolCode || rolCode === 'ADMIN' || rolCode === 'ADP' || rolCode === 'RL') return empleados
    if (userNomina) return getEquipoCompleto(userNomina, empleados)
    return empleados
  }, [empleados, rolCode, userNomina])

  const [mainTab, setMainTab] = useState<MainTab>('registro')
  const [search, setSearch] = useState('')
  const [filterEmpresa, setFilterEmpresa] = useState(0)
  const [filterDepto, setFilterDepto] = useState(0)
  const [bajaEmpleado, setBajaEmpleado] = useState<Empleado | null>(null)
  const [selectedBaja, setSelectedBaja] = useState<Baja | null>(null)

  // ── Prospectos state ─────────────────────────────────────────────────────
  const [showProspectoDialog, setShowProspectoDialog] = useState(false)
  const [viewNotasProspecto, setViewNotasProspecto] = useState<ProspectoBaja | null>(null)
  const [prospForm, setProspForm] = useState({
    clave: '',
    reporto: '',
    tipo: TIPOS_PROSPECTO[0],
    causa_probable: CAUSAS_PROSPECTO[0],
    notas: '',
    status: 'Pendiente' as 'Pendiente' | 'Revisado',
    fecha: today,
  })

  // ── Corrección state ─────────────────────────────────────────────────────
  const [corrSearch, setCorrSearch] = useState('')
  const [corrSelected, setCorrSelected] = useState<Empleado | null>(null)
  const [corrForm, setCorrForm] = useState({
    tipo_baja: '',
    motivo_baja: '',
    causa_baja: '',
    tipo_rotacion: 'No aplica',
    firmorenuncia: 'N',
    recontratable: 'N',
    causaimss: '',
    observaciones: '',
  })
  const [corrSuccess, setCorrSuccess] = useState(false)

  const now = new Date()
  const mesActual = now.getMonth()
  const anyoActual = now.getFullYear()

  // Stats
  const totalBajas = useMemo(() => baseEmpleados.filter(e => e.st === 5).length, [baseEmpleados])
  const bajasEsteMes = useMemo(
    () =>
      bajas.filter(b => {
        const d = new Date(b.fecha_baja)
        return d.getMonth() === mesActual && d.getFullYear() === anyoActual
      }).length,
    [bajas, mesActual, anyoActual],
  )
  const recontratable = useMemo(() => bajas.filter(b => b.recontratable).length, [bajas])
  const totalActivos = useMemo(() => baseEmpleados.filter(e => e.st === 1).length, [baseEmpleados])
  const tasaRotacion = useMemo(
    () => (totalActivos > 0 ? ((bajasEsteMes / totalActivos) * 100).toFixed(1) : '0.0'),
    [bajasEsteMes, totalActivos],
  )

  // Active employees for registro tab
  const activos = useMemo(() => {
    let list = baseEmpleados.filter(e => e.st === 1)
    if (filterEmpresa) list = list.filter(e => e.empresa === filterEmpresa)
    if (filterDepto) list = list.filter(e => e.depto === filterDepto)
    if (search.trim()) {
      const s = search.toLowerCase()
      list = list.filter(
        e =>
          e.nombre_completo.toLowerCase().includes(s) ||
          e.clave.includes(s),
      )
    }
    return list
  }, [baseEmpleados, search, filterEmpresa, filterDepto])

  // Employees with st=5 for historial tab
  const historialEmpleados = useMemo(
    () => baseEmpleados.filter(e => e.st === 5),
    [baseEmpleados],
  )

  // Terminated employees filtered by corrSearch
  const corrResults = useMemo(() => {
    if (!corrSearch.trim()) return []
    const s = corrSearch.toLowerCase()
    return historialEmpleados.filter(
      e =>
        e.nombre_completo.toLowerCase().includes(s) ||
        e.clave.includes(s),
    )
  }, [historialEmpleados, corrSearch])

  // Find baja record for selected employee in side panel
  const selectedEmpleado = useMemo(
    () => (selectedBaja ? empleados.find(e => e.clave === selectedBaja.clave) : null),
    [selectedBaja, empleados],
  )

  const empresasUnique = useMemo(
    () => [...new Set(baseEmpleados.map(e => e.empresa))],
    [baseEmpleados],
  )
  const deptosUnique = useMemo(
    () => [...new Set(baseEmpleados.map(e => e.depto))],
    [baseEmpleados],
  )

  // Lookup nombre for prospectos form
  const prospNombre = useMemo(() => {
    if (!prospForm.clave.trim()) return ''
    const emp = baseEmpleados.find(e => e.clave === prospForm.clave.trim())
    return emp ? emp.nombre_completo : '— No encontrado —'
  }, [prospForm.clave, baseEmpleados])

  const stats = [
    {
      label: 'Total bajas históricas',
      value: totalBajas,
      icon: UserX,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-100',
      display: String(totalBajas),
    },
    {
      label: 'Bajas este mes',
      value: bajasEsteMes,
      icon: Calendar,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-100',
      display: String(bajasEsteMes),
    },
    {
      label: 'Recontratable',
      value: recontratable,
      icon: RotateCcw,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      display: String(recontratable),
    },
    {
      label: 'Tasa de rotación',
      value: 0,
      icon: TrendingDown,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-100',
      display: `${tasaRotacion}%`,
    },
  ]

  // ── Prospectos handlers ──────────────────────────────────────────────────

  function handleGuardarProspecto() {
    if (!prospForm.clave.trim() || !prospForm.reporto.trim() || !prospForm.notas.trim()) return
    addProspectoBaja({
      clave: prospForm.clave.trim(),
      reporto: prospForm.reporto,
      tipo: prospForm.tipo,
      causa_probable: prospForm.causa_probable,
      notas: prospForm.notas,
      status: prospForm.status,
      fecha: prospForm.fecha || today,
      usuario: 'ADMIN',
    })
    setShowProspectoDialog(false)
    setProspForm({
      clave: '',
      reporto: '',
      tipo: TIPOS_PROSPECTO[0],
      causa_probable: CAUSAS_PROSPECTO[0],
      notas: '',
      status: 'Pendiente',
      fecha: today,
    })
  }

  function marcarRevisado(id: number) {
    updateProspectoBaja(id, { status: 'Revisado' })
  }

  function eliminarProspecto(id: number) {
    if (!confirm('¿Eliminar este prospecto de baja?')) return
    deleteProspectoBaja(id)
  }

  // ── Corrección handlers ──────────────────────────────────────────────────

  function handleSeleccionarCorrEmp(emp: Empleado) {
    setCorrSelected(emp)
    const bajaRecord = bajas.find(b => b.clave === emp.clave)
    setCorrForm({
      tipo_baja: bajaRecord ? String(bajaRecord.tipo_baja) : '',
      motivo_baja: bajaRecord ? String(bajaRecord.motivo_baja) : '',
      causa_baja: bajaRecord ? String(bajaRecord.causa_baja) : '',
      tipo_rotacion: 'No aplica',
      firmorenuncia: bajaRecord?.firmorenuncia ? 'S' : 'N',
      recontratable: bajaRecord?.recontratable ? 'S' : 'N',
      causaimss: bajaRecord ? String(bajaRecord.causaimss) : '',
      observaciones: '',
    })
    setCorrSuccess(false)
    setCorrSearch('')
  }

  function handleGuardarCorreccion() {
    if (!corrSelected) return
    const bajaRecord = bajas.find(b => b.clave === corrSelected.clave)
    if (bajaRecord) {
      updateBaja(bajaRecord.numero, {
        tipo_baja: corrForm.tipo_baja ? Number(corrForm.tipo_baja) : bajaRecord.tipo_baja,
        motivo_baja: corrForm.motivo_baja ? Number(corrForm.motivo_baja) : bajaRecord.motivo_baja,
        causa_baja: corrForm.causa_baja ? Number(corrForm.causa_baja) : bajaRecord.causa_baja,
        tipo_rotacion: corrForm.tipo_rotacion || bajaRecord.tipo_rotacion,
        firmorenuncia: corrForm.firmorenuncia === 'S',
        recontratable: corrForm.recontratable === 'S',
        causaimss: corrForm.causaimss ? Number(corrForm.causaimss) : bajaRecord.causaimss,
      })
    }
    if (corrForm.observaciones) {
      updateEmpleado(corrSelected.clave, { causas_baja: corrForm.observaciones })
    }
    setCorrSuccess(true)
  }

  function exportarBajasCSV() {
    const headers = ['Nómina', 'Nombre', 'Empresa', 'Depto', 'Puesto', 'Fecha Baja', 'Tipo', 'Motivo', 'Recontratable']
    const rows = historialEmpleados.map(e => {
      const b = bajas.find(b => b.clave === e.clave)
      return [
        e.clave,
        e.nombre_completo,
        getEmpresaNombre(e.empresa),
        getDepartamentoNombre(e.depto),
        getPuestoNombre(e.puesto),
        e.fecha_baja ?? '',
        b ? String(b.tipo_baja) : '',
        b ? String(b.motivo_baja) : '',
        b?.recontratable ? 'Sí' : 'No',
      ]
    })
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bajas_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center">
              <UserX className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
              Módulo de Bajas
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Bajas de Personal</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registro y control de separaciones laborales</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className={`bg-white rounded-xl border ${stat.border} shadow-sm p-4 flex items-center gap-3`}
            >
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.display}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(
          [
            { key: 'registro' as MainTab, label: 'Registro de Bajas' },
            { key: 'historial' as MainTab, label: 'Historial de Bajas' },
            { key: 'prospectos' as MainTab, label: 'Prospectos de Baja' },
            { key: 'correccion' as MainTab, label: 'Corrección de Baja' },
          ] as { key: MainTab; label: string }[]
        ).map(tab => (
          <button
            key={tab.key}
            onClick={() => setMainTab(tab.key)}
            className={`px-4 py-2 text-xs font-semibold rounded-full transition-colors ${
              mainTab === tab.key
                ? 'bg-red-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Registro de Bajas Tab ─────────────────────────────────────────────── */}
      {mainTab === 'registro' && (
        <div className="flex gap-5">
          {/* Table side */}
          <div className="flex-1 space-y-3">

            {/* Quick lookup by nómina */}
            <div className="bg-white rounded-xl border border-red-100 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                <UserX className="w-3.5 h-3.5 text-red-500" />
                Acceso rápido — Buscar por N° de nómina
              </p>
              <div className="flex items-center gap-2">
                <Input
                  className="h-8 text-xs w-40 font-mono"
                  placeholder="Ej. 1001"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search.trim() && (() => {
                  const emp = activos.find(e => e.clave === search.trim())
                  return emp ? (
                    <div className="flex items-center gap-3 flex-1 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                      <div className="flex-1">
                        <span className="text-xs font-bold text-gray-800">{emp.nombre_completo}</span>
                        <span className="text-[10px] text-gray-500 ml-2">{getPuestoNombre(emp.puesto)} • {getDepartamentoNombre(emp.depto)}</span>
                      </div>
                      <Button
                        size="sm"
                        className="h-6 text-[11px] px-2 bg-red-600 hover:bg-red-700 text-white font-bold"
                        onClick={() => setBajaEmpleado(emp)}
                      >
                        <UserX className="w-3 h-3 mr-1" />
                        Dar de baja
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">No encontrado en activos</span>
                  )
                })()}
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar nómina o nombre..."
                  className="pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 w-56 bg-white"
                />
              </div>
              <select
                value={filterEmpresa}
                onChange={e => setFilterEmpresa(Number(e.target.value))}
                className="h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
              >
                <option value={0}>Todas las empresas</option>
                {empresasUnique.map(c => (
                  <option key={c} value={c}>
                    {getEmpresaNombre(c)}
                  </option>
                ))}
              </select>
              <select
                value={filterDepto}
                onChange={e => setFilterDepto(Number(e.target.value))}
                className="h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
              >
                <option value={0}>Todos los departamentos</option>
                {deptosUnique.map(c => (
                  <option key={c} value={c}>
                    {getDepartamentoNombre(c)}
                  </option>
                ))}
              </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Nómina', 'Nombre', 'Empresa', 'Dpto', 'Puesto', 'F. Alta', 'Antigüedad', 'Acciones'].map(
                        col => (
                          <th
                            key={col}
                            className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                          >
                            {col}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {activos.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                          No se encontraron empleados activos
                        </td>
                      </tr>
                    ) : (
                      activos.map(emp => (
                        <tr key={emp.clave} className="hover:bg-red-50/30 transition-colors">
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                              {emp.clave}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-xs font-semibold text-gray-800">{emp.nombre_completo}</p>
                              <p className="text-[10px] text-gray-400">{emp.rfc}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-600">{getEmpresaNombre(emp.empresa)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-600">{getDepartamentoNombre(emp.depto)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-600">{getPuestoNombre(emp.puesto)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-500">
                              {new Date(emp.alta).toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-600">{calcularAntiguedad(emp.alta)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 text-xs h-7 px-2"
                              onClick={() => setBajaEmpleado(emp)}
                            >
                              <UserX className="w-3 h-3 mr-1" />
                              Registrar Baja
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  {activos.length} empleados activos
                </span>
              </div>
            </div>
          </div>

          {/* Side panel */}
          {selectedBaja && selectedEmpleado && (
            <div className="w-72 shrink-0">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden sticky top-6">
                <div className="bg-red-50 border-b border-red-100 px-4 py-3">
                  <p className="text-xs font-bold text-red-700">Detalle de baja</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">
                    {selectedEmpleado.nombre_completo}
                  </p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Nómina</span>
                      <span className="font-mono font-medium text-indigo-600">{selectedEmpleado.clave}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Empresa</span>
                      <span className="font-medium text-right">{getEmpresaNombre(selectedEmpleado.empresa)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">F. Baja</span>
                      <span className="font-medium">{selectedBaja.fecha_baja}</span>
                    </div>
                    {selectedBaja.jefe_actual && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Jefe actual</span>
                        <span className="font-medium text-right text-[11px]">{selectedBaja.jefe_actual}</span>
                      </div>
                    )}
                    {selectedBaja.categoria && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Categoría</span>
                        <span className="font-medium">{selectedBaja.categoria}</span>
                      </div>
                    )}
                    {selectedBaja.tipo_rotacion && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tipo rotación</span>
                        <span className="font-medium">{selectedBaja.tipo_rotacion}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Sueldo</span>
                      <span className="font-medium">{formatMXN(selectedEmpleado.sueldo_mensual)}</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-gray-100">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Checklist</p>
                    <CheckItem label="Rotación controlable" value={selectedBaja.rotacion_controlable} />
                    <CheckItem label="Firmó renuncia" value={selectedBaja.firmorenuncia} />
                    <CheckItem label="Recontratable" value={selectedBaja.recontratable} />
                    <CheckItem label="Préstamos pendientes" value={selectedBaja.prestamo_pdt} />
                    <CheckItem label="Devolvió uniforme" value={selectedBaja.dev_uniforme} />
                    <CheckItem label="Devolvió radio/equipo" value={selectedBaja.dev_radio} />
                    <CheckItem label="V.B. Jefe" value={selectedBaja.vb_jefe} />
                    <CheckItem label="Baja negociada" value={selectedBaja.baja_negociada} />
                  </div>

                  {selectedBaja.dev_radio && (selectedBaja.marca_radio || selectedBaja.serie_radio) && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Datos del equipo</p>
                      <div className="space-y-1 text-xs">
                        {selectedBaja.marca_radio && <div className="flex justify-between"><span className="text-gray-500">Marca</span><span className="font-medium">{selectedBaja.marca_radio}</span></div>}
                        {selectedBaja.serie_radio && <div className="flex justify-between"><span className="text-gray-500">Serie</span><span className="font-mono font-medium">{selectedBaja.serie_radio}</span></div>}
                      </div>
                    </div>
                  )}

                  {selectedBaja.baja_negociada && (selectedBaja.negocio || selectedBaja.monto_negociado) && (
                    <div className="pt-2 border-t border-amber-100">
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-2">Baja Negociada</p>
                      <div className="space-y-1 text-xs">
                        {selectedBaja.negocio && <div className="flex justify-between"><span className="text-gray-500">Negocio</span><span className="font-medium">{selectedBaja.negocio}</span></div>}
                        {selectedBaja.autorizo_neg && <div className="flex justify-between"><span className="text-gray-500">Autorizó</span><span className="font-medium">{selectedBaja.autorizo_neg}</span></div>}
                        {!!selectedBaja.monto_negociado && <div className="flex justify-between"><span className="text-gray-500">Monto</span><span className="font-medium">{formatMXN(selectedBaja.monto_negociado)}</span></div>}
                        {selectedBaja.det_negociacion && <p className="text-gray-600 mt-1 text-[11px]">{selectedBaja.det_negociacion}</p>}
                      </div>
                    </div>
                  )}

                  {selectedBaja.servicio && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Servicio / Unidad</p>
                      <p className="text-xs text-gray-600">{selectedBaja.servicio}</p>
                    </div>
                  )}

                  {selectedBaja.observaciones && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Observaciones</p>
                      <p className="text-xs text-gray-600">{selectedBaja.observaciones}</p>
                    </div>
                  )}
                </div>
                <div className="px-4 pb-3">
                  <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setSelectedBaja(null)}>
                    Cerrar panel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Historial de Bajas Tab ────────────────────────────────────────────── */}
      {mainTab === 'historial' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={exportarBajasCSV}
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </Button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {[
                      'Nómina',
                      'Nombre',
                      'Empresa',
                      'Dpto',
                      'Puesto',
                      'Fecha Baja',
                      'Tipo Baja',
                      'Recontratable',
                      'Registrado por',
                      'Detalle',
                    ].map(col => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {historialEmpleados.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-sm text-gray-400">
                        No hay bajas registradas
                      </td>
                    </tr>
                  ) : (
                    historialEmpleados.map(emp => {
                      const bajaRecord = bajas.find(b => b.clave === emp.clave)
                      return (
                        <tr
                          key={emp.clave}
                          className="hover:bg-red-50/30 transition-colors cursor-pointer"
                          onClick={() => bajaRecord && setSelectedBaja(bajaRecord)}
                        >
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                              {emp.clave}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold text-gray-800">{emp.nombre_completo}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-600">{getEmpresaNombre(emp.empresa)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-600">{getDepartamentoNombre(emp.depto)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-600">{getPuestoNombre(emp.puesto)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-500">
                              {emp.fecha_baja
                                ? new Date(emp.fecha_baja).toLocaleDateString('es-MX', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-600">
                              {bajaRecord
                                ? tiposBaja.find(t => t.clave === bajaRecord.tipo_baja)?.descripcion ?? '—'
                                : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {bajaRecord?.recontratable ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                                Sí
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-600">
                                No
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-500">{bajaRecord?.usuario ?? '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            {bajaRecord && (
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  setSelectedBaja(bajaRecord)
                                }}
                                className="text-xs text-indigo-600 hover:underline"
                              >
                                Ver
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">{historialEmpleados.length} bajas registradas</span>
            </div>
          </div>

          {/* Side panel for historial */}
          {selectedBaja && selectedEmpleado && (
            <div className="fixed right-6 top-24 w-72 z-40">
              <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="bg-red-50 border-b border-red-100 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-red-700">Detalle de baja</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">
                      {selectedEmpleado.nombre_completo}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedBaja(null)}
                    className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Empresa</span>
                      <span className="font-medium text-right">{getEmpresaNombre(selectedEmpleado.empresa)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Puesto</span>
                      <span className="font-medium text-right">{getPuestoNombre(selectedEmpleado.puesto)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">F. Baja</span>
                      <span className="font-medium">{selectedBaja.fecha_baja}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tipo baja</span>
                      <span className="font-medium">
                        {tiposBaja.find(t => t.clave === selectedBaja.tipo_baja)?.descripcion ?? '—'}
                      </span>
                    </div>
                    {selectedBaja.jefe_actual && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Jefe actual</span>
                        <span className="font-medium text-right text-[11px]">{selectedBaja.jefe_actual}</span>
                      </div>
                    )}
                    {selectedBaja.categoria && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Categoría</span>
                        <span className="font-medium">{selectedBaja.categoria}</span>
                      </div>
                    )}
                    {selectedBaja.tipo_rotacion && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tipo rotación</span>
                        <span className="font-medium">{selectedBaja.tipo_rotacion}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Sueldo</span>
                      <span className="font-medium">{formatMXN(selectedEmpleado.sueldo_mensual)}</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-gray-100">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Checklist</p>
                    <CheckItem label="Rotación controlable" value={selectedBaja.rotacion_controlable} />
                    <CheckItem label="Firmó renuncia" value={selectedBaja.firmorenuncia} />
                    <CheckItem label="Recontratable" value={selectedBaja.recontratable} />
                    <CheckItem label="Préstamos pendientes" value={selectedBaja.prestamo_pdt} />
                    <CheckItem label="Devolvió uniforme" value={selectedBaja.dev_uniforme} />
                    <CheckItem label="Devolvió radio/equipo" value={selectedBaja.dev_radio} />
                    <CheckItem label="V.B. Jefe" value={selectedBaja.vb_jefe} />
                    <CheckItem label="Baja negociada" value={selectedBaja.baja_negociada} />
                  </div>

                  {selectedBaja.dev_radio && (selectedBaja.marca_radio || selectedBaja.serie_radio) && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Datos del equipo</p>
                      <div className="space-y-1 text-xs">
                        {selectedBaja.marca_radio && <div className="flex justify-between"><span className="text-gray-500">Marca</span><span className="font-medium">{selectedBaja.marca_radio}</span></div>}
                        {selectedBaja.serie_radio && <div className="flex justify-between"><span className="text-gray-500">Serie</span><span className="font-mono font-medium">{selectedBaja.serie_radio}</span></div>}
                      </div>
                    </div>
                  )}

                  {selectedBaja.baja_negociada && (selectedBaja.negocio || selectedBaja.monto_negociado) && (
                    <div className="pt-2 border-t border-amber-100">
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-2">Baja Negociada</p>
                      <div className="space-y-1 text-xs">
                        {selectedBaja.negocio && <div className="flex justify-between"><span className="text-gray-500">Negocio</span><span className="font-medium">{selectedBaja.negocio}</span></div>}
                        {selectedBaja.autorizo_neg && <div className="flex justify-between"><span className="text-gray-500">Autorizó</span><span className="font-medium">{selectedBaja.autorizo_neg}</span></div>}
                        {!!selectedBaja.monto_negociado && <div className="flex justify-between"><span className="text-gray-500">Monto</span><span className="font-medium">{formatMXN(selectedBaja.monto_negociado)}</span></div>}
                        {selectedBaja.det_negociacion && <p className="text-gray-600 mt-1 text-[11px]">{selectedBaja.det_negociacion}</p>}
                      </div>
                    </div>
                  )}

                  {selectedBaja.observaciones && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Observaciones</p>
                      <p className="text-xs text-gray-600">{selectedBaja.observaciones}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Prospectos de Baja Tab ────────────────────────────────────────────── */}
      {mainTab === 'prospectos' && (
        <div className="space-y-4">
          {/* Alert */}
          <div className="flex items-start gap-2.5 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-800">
              <strong>Nota informativa:</strong> Los prospectos de baja son notas informativas, no generan baja automáticamente.
            </p>
          </div>

          {/* Header + action */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">
              {prospectosBaja.length} nota{prospectosBaja.length !== 1 ? 's' : ''} registrada{prospectosBaja.length !== 1 ? 's' : ''}
            </p>
            <Button
              size="sm"
              className="text-xs bg-yellow-600 hover:bg-yellow-700"
              onClick={() => setShowProspectoDialog(true)}
            >
              + Nueva Nota
            </Button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['#', 'Nómina', 'Nombre empleado', 'Tipo', 'Causa probable', 'Reportó', 'Fecha', 'Status', 'Acciones'].map(
                      col => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {prospectosBaja.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">
                        No hay prospectos registrados
                      </td>
                    </tr>
                  ) : (
                    prospectosBaja.map((p, i) => {
                      const emp = baseEmpleados.find(e => e.clave === p.clave)
                      return (
                        <tr key={p.id} className="hover:bg-yellow-50/30 transition-colors">
                          <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                              {p.clave}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold text-gray-800">
                              {emp?.nombre_completo ?? p.clave}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-700">{p.tipo}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-600">{p.causa_probable}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-600">{p.reporto}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-500">
                              {new Date(p.fecha).toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {p.status === 'Revisado' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                                Revisado
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-700">
                                Pendiente
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setViewNotasProspecto(p)}
                                className="text-[10px] text-indigo-600 hover:underline whitespace-nowrap"
                              >
                                Ver notas
                              </button>
                              {p.status === 'Pendiente' && (
                                <button
                                  onClick={() => marcarRevisado(p.id)}
                                  className="text-[10px] text-green-600 hover:underline whitespace-nowrap ml-2"
                                >
                                  Marcar revisado
                                </button>
                              )}
                              <button
                                onClick={() => eliminarProspecto(p.id)}
                                className="text-[10px] text-red-500 hover:underline ml-2 whitespace-nowrap"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ver notas dialog */}
          <Dialog open={!!viewNotasProspecto} onOpenChange={open => { if (!open) setViewNotasProspecto(null) }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Notas del prospecto</DialogTitle>
              </DialogHeader>
              {viewNotasProspecto && (
                <div className="space-y-3 text-xs py-1">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <span className="text-gray-500 font-medium">Nómina:</span>
                    <span className="font-mono text-indigo-600">{viewNotasProspecto.clave}</span>
                    <span className="text-gray-500 font-medium">Empleado:</span>
                    <span>{empleados.find(e => e.clave === viewNotasProspecto.clave)?.nombre_completo ?? viewNotasProspecto.clave}</span>
                    <span className="text-gray-500 font-medium">Tipo:</span>
                    <span>{viewNotasProspecto.tipo}</span>
                    <span className="text-gray-500 font-medium">Causa probable:</span>
                    <span>{viewNotasProspecto.causa_probable}</span>
                    <span className="text-gray-500 font-medium">Reportó:</span>
                    <span>{viewNotasProspecto.reporto}</span>
                    <span className="text-gray-500 font-medium">Fecha:</span>
                    <span>{viewNotasProspecto.fecha}</span>
                    <span className="text-gray-500 font-medium">Status:</span>
                    <span>{viewNotasProspecto.status}</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 mt-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Notas</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{viewNotasProspecto.notas}</p>
                  </div>
                </div>
              )}
              <DialogFooter>
                <DialogClose render={<Button variant="outline" size="sm" />}>Cerrar</DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Nueva nota dialog */}
          <Dialog open={showProspectoDialog} onOpenChange={open => { if (!open) setShowProspectoDialog(false) }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nueva nota — Prospecto de baja</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-1">
                {/* Nómina + lookup */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Número de nómina <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={prospForm.clave}
                      onChange={e => setProspForm(f => ({ ...f, clave: e.target.value }))}
                      placeholder="Ej: 1003"
                      className="h-8 text-xs w-32"
                    />
                    {prospNombre && (
                      <span className={`text-xs ${prospNombre.startsWith('—') ? 'text-red-500' : 'text-emerald-700 font-medium'}`}>
                        {prospNombre}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reportó */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Reportó <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={prospForm.reporto}
                    onChange={e => setProspForm(f => ({ ...f, reporto: e.target.value }))}
                    placeholder="Nombre de quien reporta"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Tipo */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Tipo <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={prospForm.tipo}
                      onChange={e => setProspForm(f => ({ ...f, tipo: e.target.value }))}
                      className="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500/30"
                    >
                      {TIPOS_PROSPECTO.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>

                  {/* Causa probable */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Causa probable</label>
                    <select
                      value={prospForm.causa_probable}
                      onChange={e => setProspForm(f => ({ ...f, causa_probable: e.target.value }))}
                      className="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500/30"
                    >
                      {CAUSAS_PROSPECTO.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Notas */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Notas <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={prospForm.notas}
                    onChange={e => setProspForm(f => ({ ...f, notas: e.target.value }))}
                    placeholder="Describe la situación con detalle..."
                    rows={3}
                    className="text-xs resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Status */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                    <div className="flex gap-3 pt-1">
                      {(['Pendiente', 'Revisado'] as const).map(s => (
                        <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            checked={prospForm.status === s}
                            onChange={() => setProspForm(f => ({ ...f, status: s }))}
                            className="accent-yellow-600"
                          />
                          <span className="text-xs text-gray-700">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Fecha */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha</label>
                    <Input
                      type="date"
                      value={prospForm.fecha}
                      onChange={e => setProspForm(f => ({ ...f, fecha: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" size="sm" />}>Cancelar</DialogClose>
                <Button
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700"
                  disabled={!prospForm.clave.trim() || !prospForm.reporto.trim() || !prospForm.notas.trim()}
                  onClick={handleGuardarProspecto}
                >
                  Guardar nota
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ── Corrección de Baja Tab ────────────────────────────────────────────── */}
      {mainTab === 'correccion' && (
        <div className="space-y-4">
          {/* Note */}
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <Edit2 className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              <strong>Acceso restringido:</strong> Solo personal autorizado puede realizar correcciones a datos de baja.
            </p>
          </div>

          {/* Search */}
          {!corrSelected && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4 max-w-lg">
              <h3 className="text-sm font-bold text-gray-800">Buscar empleado dado de baja</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={corrSearch}
                  onChange={e => setCorrSearch(e.target.value)}
                  placeholder="Buscar por nómina o nombre..."
                  className="pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 w-full bg-white"
                />
              </div>
              {corrSearch.trim() && (
                <div className="space-y-1">
                  {corrResults.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">No se encontraron empleados con st=Baja</p>
                  ) : (
                    corrResults.map(emp => (
                      <button
                        key={emp.clave}
                        onClick={() => handleSeleccionarCorrEmp(emp)}
                        className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-100 hover:bg-amber-50 hover:border-amber-200 transition-colors"
                      >
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{emp.nombre_completo}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            Baja: {emp.fecha_baja ?? '—'} · {getEmpresaNombre(emp.empresa)}
                          </p>
                        </div>
                        <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {emp.clave}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Correction form */}
          {corrSelected && (
            <div className="grid grid-cols-3 gap-5">
              {/* Read-only card */}
              <div className="col-span-1">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="bg-red-50 border-b border-red-100 px-4 py-3">
                    <p className="text-[10px] font-bold text-red-700 uppercase tracking-wide">Datos actuales</p>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">{corrSelected.nombre_completo}</p>
                  </div>
                  <div className="p-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Nómina</span>
                      <span className="font-mono text-indigo-600">{corrSelected.clave}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Empresa</span>
                      <span className="text-right font-medium">{getEmpresaNombre(corrSelected.empresa)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Depto</span>
                      <span className="text-right font-medium">{getDepartamentoNombre(corrSelected.depto)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Puesto</span>
                      <span className="text-right font-medium">{getPuestoNombre(corrSelected.puesto)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">F. Baja</span>
                      <span className="font-medium">{corrSelected.fecha_baja ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tipo baja actual</span>
                      <span className="font-medium">
                        {(() => {
                          const br = bajas.find(b => b.clave === corrSelected.clave)
                          return br ? (tiposBaja.find(t => t.clave === br.tipo_baja)?.descripcion ?? '—') : '—'
                        })()}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Motivo actual</p>
                      <p className="text-gray-700 leading-relaxed">{corrSelected.causas_baja ?? '—'}</p>
                    </div>
                  </div>
                  <div className="px-4 pb-3">
                    <button
                      onClick={() => { setCorrSelected(null); setCorrSuccess(false) }}
                      className="text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      Cambiar empleado
                    </button>
                  </div>
                </div>
              </div>

              {/* Editable form */}
              <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-800">Corrección de datos de baja</h3>

                {corrSuccess && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                    <p className="text-xs text-green-800 font-medium">Corrección guardada correctamente.</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Tipo de baja */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de baja</label>
                    <select
                      value={corrForm.tipo_baja}
                      onChange={e => setCorrForm(f => ({ ...f, tipo_baja: e.target.value }))}
                      className="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    >
                      <option value="">— Selecciona —</option>
                      {tiposBaja.map(t => (
                        <option key={t.clave} value={t.clave}>{t.descripcion}</option>
                      ))}
                    </select>
                  </div>

                  {/* Motivo de rescisión */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Motivo de rescisión</label>
                    <select
                      value={corrForm.motivo_baja}
                      onChange={e => setCorrForm(f => ({ ...f, motivo_baja: e.target.value }))}
                      className="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    >
                      <option value="">— Selecciona —</option>
                      {motivosBaja.map(m => (
                        <option key={m.clave} value={m.clave}>{m.descripcion}</option>
                      ))}
                    </select>
                  </div>

                  {/* Causa de baja */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Causa de baja</label>
                    <select
                      value={corrForm.causa_baja}
                      onChange={e => setCorrForm(f => ({ ...f, causa_baja: e.target.value }))}
                      className="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    >
                      <option value="">— Selecciona —</option>
                      {causasBaja.map(c => (
                        <option key={c.clave} value={c.clave}>{c.descripcion}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tipo rotación */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de rotación</label>
                    <select
                      value={corrForm.tipo_rotacion}
                      onChange={e => setCorrForm(f => ({ ...f, tipo_rotacion: e.target.value }))}
                      className="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    >
                      <option>Controlable</option>
                      <option>No controlable</option>
                      <option>No aplica</option>
                    </select>
                  </div>

                  {/* Causa IMSS */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Causa IMSS</label>
                    <select
                      value={corrForm.causaimss}
                      onChange={e => setCorrForm(f => ({ ...f, causaimss: e.target.value }))}
                      className="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    >
                      <option value="">— Selecciona —</option>
                      {causasIMSS.map(c => (
                        <option key={c.clave} value={c.clave}>{c.descripcion}</option>
                      ))}
                    </select>
                  </div>

                  {/* Firmó renuncia */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Firmó renuncia</label>
                    <div className="flex gap-4 pt-1">
                      {(['S', 'N'] as const).map(v => (
                        <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            checked={corrForm.firmorenuncia === v}
                            onChange={() => setCorrForm(f => ({ ...f, firmorenuncia: v }))}
                            className="accent-amber-600"
                          />
                          <span className="text-xs text-gray-700">{v === 'S' ? 'Sí' : 'No'}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Recontratable */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Recontratable</label>
                    <div className="flex gap-4 pt-1">
                      {(['S', 'N'] as const).map(v => (
                        <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            checked={corrForm.recontratable === v}
                            onChange={() => setCorrForm(f => ({ ...f, recontratable: v }))}
                            className="accent-amber-600"
                          />
                          <span className="text-xs text-gray-700">{v === 'S' ? 'Sí' : 'No'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Observaciones */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Observaciones de corrección</label>
                  <Textarea
                    value={corrForm.observaciones}
                    onChange={e => setCorrForm(f => ({ ...f, observaciones: e.target.value }))}
                    placeholder="Describe el motivo de la corrección..."
                    rows={3}
                    className="text-xs resize-none"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-xs"
                    onClick={handleGuardarCorreccion}
                  >
                    Guardar Corrección
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
