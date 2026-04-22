"use client"

import { useState, useMemo } from 'react'
import { useSCRHStore } from '@/store'
import type { HistorialPersonal } from '@/types'
import {
  Users, TrendingUp, TrendingDown, ArrowUpDown, Building2, AlertCircle, Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

// ─── helpers ──────────────────────────────────────────────────────────────────

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function fmtDate(d?: string) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

const PLANTILLA_DEFAULT = 1100

// Mock solicitudes
const MOCK_SOLICITUDES = [
  { id: 1, cc: 'TIJ', puesto: 'Operador', cantidad: 3, fecha: '2026-01-15', solicito: 'Eduardo Jiménez', status: 'Pendiente' },
  { id: 2, cc: 'MTY', puesto: 'Mecánico', cantidad: 1, fecha: '2026-02-03', solicito: 'Roberto Hernández', status: 'Aprobado' },
  { id: 3, cc: 'MXL', puesto: 'Auxiliar Logística', cantidad: 2, fecha: '2026-02-20', solicito: 'Jorge Reyes', status: 'En proceso' },
]

type SolicitudLocal = typeof MOCK_SOLICITUDES[0]

// ─── stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color, bg, border }: {
  label: string; value: number | string; sub: string
  icon: React.ElementType; color: string; bg: string; border: string
}) {
  return (
    <div className={`bg-white rounded-xl border ${border} shadow-sm p-4 flex items-center gap-3`}>
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
        <p className="text-[10px] text-gray-400">{sub}</p>
      </div>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

type TabKey = 'resumen' | 'movimientos' | 'plantilla' | 'reserva' | 'solicitudes'

export default function HCRotacionPage() {
  const {
    empleados, departamentos, centrosCostos, puestos,
    historialPersonal,
    getDepartamentoNombre, getPuestoNombre, getCCostosNombre,
  } = useSCRHStore()

  // ── Period ─────────────────────────────────────────────────────────────────
  const now = new Date()
  const [selYear, setSelYear] = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth())

  // ── Stats ──────────────────────────────────────────────────────────────────
  const hcActivo = useMemo(() => empleados.filter(e => e.st === 1).length, [empleados])

  const altasPeriodo = useMemo(() => empleados.filter(e => {
    const d = new Date(e.alta + 'T00:00:00')
    return d.getFullYear() === selYear && d.getMonth() === selMonth
  }), [empleados, selYear, selMonth])

  const bajasPeriodo = useMemo(() => empleados.filter(e => {
    if (!e.fecha_baja) return false
    const d = new Date(e.fecha_baja + 'T00:00:00')
    return d.getFullYear() === selYear && d.getMonth() === selMonth
  }), [empleados, selYear, selMonth])

  const plantillaRequerida = PLANTILLA_DEFAULT
  const vacantes = Math.max(0, plantillaRequerida - hcActivo)
  const rotacion = hcActivo > 0
    ? ((altasPeriodo.length + bajasPeriodo.length) / hcActivo * 100).toFixed(1)
    : '0.0'

  // ── Tab ────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>('resumen')
  const [movSubTab, setMovSubTab] = useState<'altas' | 'bajas' | 'otros'>('altas')

  // ── Resumen HC por departamento ────────────────────────────────────────────
  const resumenDpto = useMemo(() => {
    return departamentos.map(dpto => {
      const activos = empleados.filter(e => e.st === 1 && e.depto === dpto.clave).length
      const bajas = bajasPeriodo.filter(e => e.depto === dpto.clave).length
      const altas = altasPeriodo.filter(e => e.depto === dpto.clave).length
      const plantilla = Math.ceil(activos * 1.1) // mock approx
      const vacantesD = Math.max(0, plantilla - activos)
      const ocupacion = plantilla > 0 ? Math.round(activos / plantilla * 100) : 100
      return { dpto: dpto.descripcion, activos, bajas, altas, plantilla, vacantes: vacantesD, ocupacion }
    }).filter(r => r.activos > 0 || r.altas > 0)
  }, [empleados, departamentos, altasPeriodo, bajasPeriodo])

  // ── Otros movimientos (historial) ──────────────────────────────────────────
  const otrosMovimientos = useMemo(() => {
    return historialPersonal.filter(h => {
      if (h.movimiento !== 3 && h.movimiento !== 4) return false
      const d = new Date(h.fecha + 'T00:00:00')
      return d.getFullYear() === selYear && d.getMonth() === selMonth
    })
  }, [historialPersonal, selYear, selMonth])

  // ── Plantilla editable ─────────────────────────────────────────────────────
  const [plantillaCC, setPlantillaCC] = useState<Record<number, number>>(() => {
    const init: Record<number, number> = {}
    centrosCostos.forEach(cc => {
      const activos = empleados.filter(e => e.st === 1 && e.ccostos === cc.clave).length
      init[cc.clave] = Math.ceil(activos * 1.15)
    })
    return init
  })

  // ── Reserva operadores ────────────────────────────────────────────────────
  const reservaOperadores = useMemo(() => {
    return empleados.filter(e => e.st === 1 && e.puesto === 1)
  }, [empleados])

  const [reservaDisp, setReservaDisp] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    reservaOperadores.forEach((e, i) => { init[e.clave] = i % 3 !== 0 })
    return init
  })

  // ── Solicitudes ───────────────────────────────────────────────────────────
  const [solicitudes, setSolicitudes] = useState<SolicitudLocal[]>(MOCK_SOLICITUDES)
  const [showSolicitud, setShowSolicitud] = useState(false)
  const [nuevaSol, setNuevaSol] = useState({ cc: '', puesto: '', cantidad: '', solicito: '' })

  function handleAddSolicitud() {
    if (!nuevaSol.cc || !nuevaSol.puesto) return
    setSolicitudes(prev => [...prev, {
      id: prev.length + 1,
      cc: nuevaSol.cc,
      puesto: nuevaSol.puesto,
      cantidad: Number(nuevaSol.cantidad) || 1,
      fecha: new Date().toISOString().split('T')[0],
      solicito: nuevaSol.solicito || 'ADMIN',
      status: 'Pendiente',
    }])
    setShowSolicitud(false)
    setNuevaSol({ cc: '', puesto: '', cantidad: '', solicito: '' })
  }

  // ── Cerrar Período ────────────────────────────────────────────────────────
  const [showCerrar, setShowCerrar] = useState(false)

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'resumen', label: 'Resumen HC' },
    { key: 'movimientos', label: 'Movimientos del Período' },
    { key: 'plantilla', label: 'Plantilla' },
    { key: 'reserva', label: 'Reserva Operadores' },
    { key: 'solicitudes', label: 'Solicitudes de Plantilla' },
  ]

  const statusSolBadge: Record<string, string> = {
    'Pendiente': 'bg-yellow-100 text-yellow-700',
    'Aprobado': 'bg-green-100 text-green-700',
    'En proceso': 'bg-blue-100 text-blue-700',
    'Rechazado': 'bg-red-100 text-red-600',
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <ArrowUpDown className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Módulo HC y Rotación</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">HC y Rotación</h1>
            {/* Period selector */}
            <div className="flex items-center gap-1">
              <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white">
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white">
                {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Período: {MESES[selMonth]} {selYear}
          </p>
        </div>
        <Button size="sm" variant="outline" className="text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
          onClick={() => setShowCerrar(true)}>
          Cerrar Período
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-3">
        <StatCard label="HC Activo" value={hcActivo} sub="Empleados activos (st=1)"
          icon={Users} color="text-indigo-600" bg="bg-indigo-50" border="border-indigo-100" />
        <StatCard label="Plantilla requerida" value={plantillaRequerida.toLocaleString('es-MX')} sub="Posiciones aprobadas"
          icon={Building2} color="text-gray-600" bg="bg-gray-50" border="border-gray-200" />
        <StatCard label="Vacantes" value={vacantes.toLocaleString('es-MX')} sub="Por cubrir"
          icon={AlertCircle} color="text-amber-600" bg="bg-amber-50" border="border-amber-100" />
        <StatCard label="Altas del período" value={altasPeriodo.length} sub={`${MESES[selMonth]} ${selYear}`}
          icon={TrendingUp} color="text-green-600" bg="bg-green-50" border="border-green-100" />
        <StatCard label="Bajas del período" value={bajasPeriodo.length} sub={`${MESES[selMonth]} ${selYear}`}
          icon={TrendingDown} color="text-red-600" bg="bg-red-50" border="border-red-100" />
        <StatCard label="Rotación %" value={`${rotacion}%`} sub="(Altas+Bajas)/HC"
          icon={ArrowUpDown} color="text-violet-600" bg="bg-violet-50" border="border-violet-100" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Resumen HC ── */}
      {activeTab === 'resumen' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Departamento','Activos','Bajas','Altas','Plantilla req.','Vacantes','% Ocupación'].map(col => (
                      <th key={col} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {resumenDpto.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Sin datos</td></tr>
                  ) : resumenDpto.map(r => (
                    <tr key={r.dpto} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs font-medium text-gray-800">{r.dpto}</td>
                      <td className="px-4 py-3 text-xs font-bold text-indigo-700">{r.activos}</td>
                      <td className="px-4 py-3 text-xs text-red-600 font-medium">{r.bajas}</td>
                      <td className="px-4 py-3 text-xs text-green-600 font-medium">{r.altas}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{r.plantilla}</td>
                      <td className="px-4 py-3 text-xs text-amber-600 font-medium">{r.vacantes}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
                            <div className="h-full rounded-full bg-indigo-500"
                              style={{ width: `${Math.min(r.ocupacion, 100)}%` }} />
                          </div>
                          <span className={`text-xs font-semibold ${r.ocupacion >= 90 ? 'text-green-600' : r.ocupacion >= 70 ? 'text-amber-600' : 'text-red-500'}`}>
                            {r.ocupacion}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bar Chart */}
          {resumenDpto.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-xs font-bold text-gray-700 mb-4">Activos vs Plantilla por Departamento</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={resumenDpto} margin={{ top: 0, right: 16, left: 0, bottom: 40 }}>
                  <XAxis dataKey="dpto" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="activos" name="Activos" fill="#6366f1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="plantilla" name="Plantilla req." fill="#e0e7ff" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Movimientos ── */}
      {activeTab === 'movimientos' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['altas', 'bajas', 'otros'] as const).map(sub => (
              <button key={sub} onClick={() => setMovSubTab(sub)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors capitalize ${
                  movSubTab === sub
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                {sub === 'altas' ? `Altas (${altasPeriodo.length})` : sub === 'bajas' ? `Bajas (${bajasPeriodo.length})` : `Otros (${otrosMovimientos.length})`}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {movSubTab === 'altas' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Nómina','Nombre','Puesto','Dpto','C.Costos','Fecha Alta'].map(col => (
                        <th key={col} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {altasPeriodo.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Sin altas en este período</td></tr>
                    ) : altasPeriodo.map(e => (
                      <tr key={e.clave} className="hover:bg-green-50/30">
                        <td className="px-4 py-3"><span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{e.clave}</span></td>
                        <td className="px-4 py-3 text-xs font-medium text-gray-800 whitespace-nowrap">{e.nombre_completo}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{getPuestoNombre(e.puesto)}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{getDepartamentoNombre(e.depto)}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{getCCostosNombre(e.ccostos)}</td>
                        <td className="px-4 py-3 text-xs text-green-700 font-medium whitespace-nowrap">{fmtDate(e.alta)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {movSubTab === 'bajas' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Nómina','Nombre','Puesto','Dpto','C.Costos','Fecha Baja','Motivo'].map(col => (
                        <th key={col} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {bajasPeriodo.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Sin bajas en este período</td></tr>
                    ) : bajasPeriodo.map(e => (
                      <tr key={e.clave} className="hover:bg-red-50/30">
                        <td className="px-4 py-3"><span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{e.clave}</span></td>
                        <td className="px-4 py-3 text-xs font-medium text-gray-800 whitespace-nowrap">{e.nombre_completo}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{getPuestoNombre(e.puesto)}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{getDepartamentoNombre(e.depto)}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{getCCostosNombre(e.ccostos)}</td>
                        <td className="px-4 py-3 text-xs text-red-700 font-medium whitespace-nowrap">{fmtDate(e.fecha_baja)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{e.causas_baja ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {movSubTab === 'otros' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Nómina','Fecha','Tipo','Puesto ant. → nuevo','Sueldo ant. → nuevo','Observaciones'].map(col => (
                        <th key={col} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {otrosMovimientos.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Sin otros movimientos en este período</td></tr>
                    ) : otrosMovimientos.map(h => (
                      <tr key={h.numero} className="hover:bg-gray-50">
                        <td className="px-4 py-3"><span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{h.clave}</span></td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(h.fecha)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${h.movimiento === 3 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                            {h.movimiento === 3 ? 'Cambio puesto' : 'Cambio sueldo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                          {h.movimiento === 3 ? `${getPuestoNombre(h.puesto_inicial)} → ${getPuestoNombre(h.puesto_final)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                          {h.movimiento === 4
                            ? `$${h.sueldo_inicial.toLocaleString('es-MX')} → $${h.sueldo_final.toLocaleString('es-MX')}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{h.observaciones}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: Plantilla ── */}
      {activeTab === 'plantilla' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['CC','Descripción','HC Real','Plantilla Aprobada','Vacantes','% Ocupación'].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {centrosCostos.map(cc => {
                  const hcReal = empleados.filter(e => e.st === 1 && e.ccostos === cc.clave).length
                  const plantillaAprobada = plantillaCC[cc.clave] ?? hcReal
                  const vacantesCC = Math.max(0, plantillaAprobada - hcReal)
                  const occ = plantillaAprobada > 0 ? Math.round(hcReal / plantillaAprobada * 100) : 100
                  return (
                    <tr key={cc.clave} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{cc.desc_corta}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-800">{cc.descripcion}</td>
                      <td className="px-4 py-3 text-xs font-bold text-indigo-700">{hcReal}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number" min={0}
                          value={plantillaCC[cc.clave] ?? hcReal}
                          onChange={e => setPlantillaCC(prev => ({ ...prev, [cc.clave]: Number(e.target.value) }))}
                          className="w-20 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 text-center font-semibold"
                        />
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-amber-600">{vacantesCC}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-500"
                              style={{ width: `${Math.min(occ, 100)}%` }} />
                          </div>
                          <span className={`text-xs font-semibold ${occ >= 90 ? 'text-green-600' : occ >= 70 ? 'text-amber-600' : 'text-red-500'}`}>{occ}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">{centrosCostos.length} centros de costos. Edita la plantilla aprobada directamente.</span>
            <button onClick={() => alert('Cambios guardados localmente')}
              className="text-xs font-medium text-indigo-600 hover:underline">Guardar cambios</button>
          </div>
        </div>
      )}

      {/* ── TAB 4: Reserva Operadores ── */}
      {activeTab === 'reserva' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-700">Reserva de Operadores</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">{reservaOperadores.length} operadores activos (puesto = Operador, st=1)</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Nómina','Nombre','Centro de costos','Disponible','Observaciones'].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reservaOperadores.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Sin operadores en reserva</td></tr>
                ) : reservaOperadores.map(e => (
                  <tr key={e.clave} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{e.clave}</span></td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-800 whitespace-nowrap">{e.nombre_completo}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{getCCostosNombre(e.ccostos)}</td>
                    <td className="px-4 py-3">
                      <Switch size="sm"
                        checked={!!reservaDisp[e.clave]}
                        onCheckedChange={v => setReservaDisp(prev => ({ ...prev, [e.clave]: v }))} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {reservaDisp[e.clave] ? 'Disponible para asignación' : 'No disponible actualmente'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 5: Solicitudes de Plantilla ── */}
      {activeTab === 'solicitudes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="text-xs" onClick={() => setShowSolicitud(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />Nueva Solicitud
            </Button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['#','CC','Puesto','Cantidad','Fecha sol.','Solicitó','Status','Acciones'].map(col => (
                      <th key={col} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {solicitudes.map((sol, idx) => (
                    <tr key={sol.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{idx + 1}</td>
                      <td className="px-4 py-3"><span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{sol.cc}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-700 font-medium">{sol.puesto}</td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-800">{sol.cantidad}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(sol.fecha)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{sol.solicito}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusSolBadge[sol.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {sol.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSolicitudes(prev => prev.map(s =>
                          s.id === sol.id ? { ...s, status: s.status === 'Pendiente' ? 'Aprobado' : s.status } : s
                        ))} className="text-[10px] text-indigo-600 hover:underline px-2 py-1 rounded hover:bg-indigo-50 transition-colors">
                          {sol.status === 'Pendiente' ? 'Aprobar' : 'Ver'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ Dialog: Cerrar Período ══ */}
      <Dialog open={showCerrar} onOpenChange={setShowCerrar}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cerrar período</DialogTitle>
            <DialogDescription>
              ¿Confirmas el cierre del período <strong>{MESES[selMonth]} {selYear}</strong>? Esta acción bloqueará las modificaciones del período seleccionado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-input bg-transparent px-3 py-1.5 text-xs font-medium shadow-xs hover:bg-accent hover:text-accent-foreground">Cancelar</DialogClose>
            <Button size="sm" className="text-xs bg-orange-600 hover:bg-orange-700"
              onClick={() => { alert(`Período ${MESES[selMonth]} ${selYear} cerrado`); setShowCerrar(false) }}>
              Cerrar período
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Dialog: Nueva Solicitud ══ */}
      <Dialog open={showSolicitud} onOpenChange={setShowSolicitud}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Solicitud de Plantilla</DialogTitle>
            <DialogDescription>Registra una nueva solicitud de contratación</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Centro de Costos</Label>
                <Select value={nuevaSol.cc} onValueChange={v => { if (v) setNuevaSol(p => ({ ...p, cc: v })) }}>
                  <SelectTrigger className="text-xs w-full"><SelectValue placeholder="Selecciona CC" /></SelectTrigger>
                  <SelectContent>
                    {centrosCostos.map(cc => (
                      <SelectItem key={cc.clave} value={cc.desc_corta} className="text-xs">{cc.descripcion}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cantidad</Label>
                <Input type="number" min={1} value={nuevaSol.cantidad}
                  onChange={e => setNuevaSol(p => ({ ...p, cantidad: e.target.value }))}
                  placeholder="1" className="text-xs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Puesto</Label>
              <Select value={nuevaSol.puesto} onValueChange={v => { if (v != null) setNuevaSol(p => ({ ...p, puesto: v as string })) }}>
                <SelectTrigger className="text-xs w-full"><SelectValue placeholder="Selecciona puesto" /></SelectTrigger>
                <SelectContent>
                  {puestos.filter(p => p.st === 1).map(p => (
                    <SelectItem key={p.clave} value={p.descripcion} className="text-xs">{p.descripcion}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Solicitó</Label>
              <Input value={nuevaSol.solicito}
                onChange={e => setNuevaSol(p => ({ ...p, solicito: e.target.value }))}
                placeholder="Nombre del solicitante" className="text-xs" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-input bg-transparent px-3 py-1.5 text-xs font-medium shadow-xs hover:bg-accent hover:text-accent-foreground">Cancelar</DialogClose>
            <Button size="sm" className="text-xs" onClick={handleAddSolicitud}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
