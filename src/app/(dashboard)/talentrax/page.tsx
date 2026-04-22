"use client"

import { useState, useMemo } from 'react'
import { useSCRHStore } from '@/store'
import {
  Zap, CheckCircle2, Clock, AlertTriangle, XCircle, RefreshCw,
  Search, Filter, ChevronRight, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// ── Types ──────────────────────────────────────────────────────────────────────

type TxStatus = 'ok' | 'standby' | 'pendiente' | 'warning' | 'error'
type TxTipo   = 'Alta' | 'Baja' | 'Reingreso' | 'Cambio'

interface TalentraxProcess {
  id: number
  tipo: TxTipo
  status: TxStatus
  clave_emp: string
  rfc: string
  fecha_alta?: string
  fecha_baja?: string
  database: string
  empresa_rh: string
  fecha_recibido: string
  fecha_procesado?: string
  clave_rh?: string
  error_msg?: string
}

// ── Mock data ──────────────────────────────────────────────────────────────────

const INITIAL_PROCESSES: TalentraxProcess[] = [
  { id:1,  tipo:'Alta',     status:'ok',       clave_emp:'E001', rfc:'RAMJ850315AB1', fecha_alta:'2024-03-10', database:'LIPU_PROD',   empresa_rh:'Transportes LIPU',    fecha_recibido:'2024-03-10 08:00', fecha_procesado:'2024-03-10 08:05', clave_rh:'TRX-0001' },
  { id:2,  tipo:'Alta',     status:'ok',       clave_emp:'E002', rfc:'LOPH900420CD2', fecha_alta:'2024-03-11', database:'LIPU_PROD',   empresa_rh:'Transportes LIPU',    fecha_recibido:'2024-03-11 09:00', fecha_procesado:'2024-03-11 09:03', clave_rh:'TRX-0002' },
  { id:3,  tipo:'Baja',     status:'ok',       clave_emp:'E045', rfc:'MERC780601EF3', fecha_baja:'2024-03-12', database:'ETEP_PROD',   empresa_rh:'ETEP Transportes',    fecha_recibido:'2024-03-12 10:00', fecha_procesado:'2024-03-12 10:08', clave_rh:'TRX-0045' },
  { id:4,  tipo:'Cambio',   status:'standby',  clave_emp:'E023', rfc:'GUTPA850901GH4', database:'LIPU_PROD',   empresa_rh:'Transportes LIPU',    fecha_recibido:'2024-03-13 11:30' },
  { id:5,  tipo:'Reingreso',status:'standby',  clave_emp:'E078', rfc:'SANRC750215IJ5', fecha_alta:'2024-03-14', database:'MMM_PROD',   empresa_rh:'Servicios MMM',       fecha_recibido:'2024-03-14 07:45' },
  { id:6,  tipo:'Alta',     status:'pendiente', clave_emp:'E099', rfc:'MARTFL890910KL6', fecha_alta:'2024-03-15', database:'LIPU_PROD', empresa_rh:'Transportes LIPU',   fecha_recibido:'2024-03-15 06:00' },
  { id:7,  tipo:'Alta',     status:'pendiente', clave_emp:'E100', rfc:'TORVMX920305MN7', fecha_alta:'2024-03-15', database:'ETEP_PROD', empresa_rh:'ETEP Transportes',   fecha_recibido:'2024-03-15 06:15' },
  { id:8,  tipo:'Baja',     status:'warning',   clave_emp:'E055', rfc:'RIOPM800720OP8', fecha_baja:'2024-03-15', database:'MMM_PROD',  empresa_rh:'Servicios MMM',       fecha_recibido:'2024-03-15 08:30' },
  { id:9,  tipo:'Cambio',   status:'error',     clave_emp:'E031', rfc:'HERFX770430QR9', database:'LIPU_PROD',   empresa_rh:'Transportes LIPU',    fecha_recibido:'2024-03-14 14:00', error_msg:'RFC no encontrado en base de datos Talentrax. Verificar RFC o clave de empleado.' },
  { id:10, tipo:'Alta',     status:'error',     clave_emp:'E101', rfc:'DIAZST011225ST0', fecha_alta:'2024-03-15', database:'ETEP_PROD', empresa_rh:'ETEP Transportes',   fecha_recibido:'2024-03-15 09:00', error_msg:'Empresa destino no configurada en Talentrax. Código empresa RH: ETEP-02.' },
  { id:11, tipo:'Reingreso',status:'ok',        clave_emp:'E012', rfc:'CERRM830615UV1', fecha_alta:'2024-03-08', database:'LIPU_PROD', empresa_rh:'Transportes LIPU',    fecha_recibido:'2024-03-08 10:00', fecha_procesado:'2024-03-08 10:12', clave_rh:'TRX-0012' },
  { id:12, tipo:'Cambio',   status:'ok',        clave_emp:'E067', rfc:'VEGAJM910210WX2', database:'MMM_PROD',   empresa_rh:'Servicios MMM',       fecha_recibido:'2024-03-09 15:00', fecha_procesado:'2024-03-09 15:06', clave_rh:'TRX-0067' },
  { id:13, tipo:'Alta',     status:'standby',   clave_emp:'E102', rfc:'FLORF001120YZ3', fecha_alta:'2024-03-15', database:'LIPU_PROD', empresa_rh:'Transportes LIPU',    fecha_recibido:'2024-03-15 10:00' },
  { id:14, tipo:'Baja',     status:'pendiente', clave_emp:'E088', rfc:'SALMN860425AB4', fecha_baja:'2024-03-15', database:'ETEP_PROD', empresa_rh:'ETEP Transportes',    fecha_recibido:'2024-03-15 10:30' },
  { id:15, tipo:'Cambio',   status:'warning',   clave_emp:'E041', rfc:'CASTPX940802CD5', database:'LIPU_PROD',  empresa_rh:'Transportes LIPU',    fecha_recibido:'2024-03-15 11:00' },
]

// ── Style maps ──────────────────────────────────────────────────────────────────

const STATUS_ROW: Record<TxStatus, string> = {
  ok:       'bg-green-50',
  standby:  'bg-yellow-50',
  pendiente:'bg-gray-50',
  warning:  'bg-blue-50',
  error:    'bg-red-50',
}
const STATUS_BADGE: Record<TxStatus, string> = {
  ok:       'bg-green-100 text-green-700',
  standby:  'bg-yellow-100 text-yellow-800',
  pendiente:'bg-gray-100 text-gray-600',
  warning:  'bg-blue-100 text-blue-700',
  error:    'bg-red-100 text-red-700',
}
const STATUS_LABEL: Record<TxStatus, string> = {
  ok:'OK', standby:'En espera', pendiente:'Pendiente', warning:'Atención', error:'Error',
}
const STATUS_ICON: Record<TxStatus, React.ElementType> = {
  ok: CheckCircle2, standby: Clock, pendiente: Clock, warning: AlertTriangle, error: XCircle,
}
const TIPO_COLOR: Record<TxTipo, string> = {
  Alta:'bg-green-100 text-green-700', Baja:'bg-red-100 text-red-700',
  Reingreso:'bg-blue-100 text-blue-700', Cambio:'bg-yellow-100 text-yellow-700',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function TalentraxPage() {
  const { getEmpleadoNombre } = useSCRHStore()

  const [processes, setProcesses] = useState<TalentraxProcess[]>(INITIAL_PROCESSES)
  const [selected, setSelected] = useState<TalentraxProcess | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Filters
  const [filterStatus, setFilterStatus] = useState<TxStatus[]>([])
  const [filterTipo, setFilterTipo] = useState('')
  const [filterEmpresa, setFilterEmpresa] = useState('')

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    processes.length,
    ok:       processes.filter(p => p.status === 'ok').length,
    standby:  processes.filter(p => p.status === 'standby').length,
    pendiente:processes.filter(p => p.status === 'pendiente').length,
    error:    processes.filter(p => p.status === 'error').length,
  }), [processes])

  // ── Helpers ──────────────────────────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  function handleSync() {
    setSyncing(true)
    setTimeout(() => {
      const newItems: TalentraxProcess[] = [
        { id: processes.length + 1, tipo:'Alta',   status:'pendiente', clave_emp:'E200', rfc:'NEWRFC010101AA1', fecha_alta:'2024-03-15', database:'LIPU_PROD', empresa_rh:'Transportes LIPU', fecha_recibido:'2024-03-15 12:00' },
        { id: processes.length + 2, tipo:'Cambio', status:'standby',   clave_emp:'E201', rfc:'NEWRFC020202BB2', database:'ETEP_PROD',   empresa_rh:'ETEP Transportes',  fecha_recibido:'2024-03-15 12:01' },
        { id: processes.length + 3, tipo:'Baja',   status:'pendiente', clave_emp:'E202', rfc:'NEWRFC030303CC3', fecha_baja:'2024-03-15', database:'MMM_PROD', empresa_rh:'Servicios MMM', fecha_recibido:'2024-03-15 12:02' },
      ]
      setProcesses(prev => [...newItems, ...prev])
      setSyncing(false)
      showToast('3 nuevos procesos recibidos')
    }, 2000)
  }

  function procesarAhora(id: number) {
    setProcesses(prev => prev.map(p => p.id === id ? { ...p, status: 'ok', fecha_procesado: new Date().toISOString().slice(0, 16).replace('T', ' '), clave_rh: `TRX-AUTO-${id}` } : p))
    setSelected(prev => prev ? { ...prev, status: 'ok', fecha_procesado: new Date().toISOString().slice(0, 16).replace('T', ' '), clave_rh: `TRX-AUTO-${id}` } : prev)
    showToast('Proceso ejecutado correctamente')
  }

  function cambiarEstado(id: number, status: TxStatus) {
    setProcesses(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    setSelected(prev => prev ? { ...prev, status } : prev)
  }

  function toggleStatusFilter(s: TxStatus) {
    setFilterStatus(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return processes.filter(p => {
      if (filterStatus.length > 0 && !filterStatus.includes(p.status)) return false
      if (filterTipo && p.tipo !== filterTipo) return false
      if (filterEmpresa && p.empresa_rh !== filterEmpresa) return false
      return true
    })
  }, [processes, filterStatus, filterTipo, filterEmpresa])

  const empresasList = useMemo(() => [...new Set(processes.map(p => p.empresa_rh))], [processes])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium bg-green-50 border border-green-200 text-green-800">
          <CheckCircle2 className="w-4 h-4" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-yellow-500">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Flujo de Datos Talentrax</h1>
            <p className="text-sm text-gray-500">Cola de procesos de integración</p>
          </div>
        </div>
        <Button onClick={handleSync} disabled={syncing} className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-white">
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={Zap}           label="Total procesos" value={stats.total}    color="bg-gray-500" />
        <StatCard icon={CheckCircle2}  label="OK"             value={stats.ok}       color="bg-green-500" />
        <StatCard icon={Clock}         label="En espera"      value={stats.standby}  color="bg-yellow-500" />
        <StatCard icon={Clock}         label="Pendiente"      value={stats.pendiente}color="bg-gray-400" />
        <StatCard icon={XCircle}       label="Error"          value={stats.error}    color="bg-red-500" />
      </div>

      {/* Main layout: filters + table + detail */}
      <div className="flex gap-4">
        {/* Filters sidebar */}
        <div className="w-48 shrink-0 bg-white rounded-xl border border-gray-200 p-4 space-y-4 h-fit">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Estado</p>
            <div className="space-y-1.5">
              {(['ok','standby','pendiente','warning','error'] as TxStatus[]).map(s => (
                <label key={s} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterStatus.includes(s)}
                    onChange={() => toggleStatusFilter(s)}
                    className="rounded"
                  />
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_BADGE[s]}`}>
                    {STATUS_LABEL[s]}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Tipo</p>
            <select
              value={filterTipo}
              onChange={e => setFilterTipo(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="">Todos</option>
              {(['Alta','Baja','Reingreso','Cambio'] as TxTipo[]).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Empresa</p>
            <select
              value={filterEmpresa}
              onChange={e => setFilterEmpresa(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="">Todas</option>
              {empresasList.map(emp => <option key={emp} value={emp}>{emp}</option>)}
            </select>
          </div>
          {(filterStatus.length > 0 || filterTipo || filterEmpresa) && (
            <button
              onClick={() => { setFilterStatus([]); setFilterTipo(''); setFilterEmpresa('') }}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Limpiar filtros
            </button>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide bg-gray-50">
                  <th className="text-left py-2.5 px-3">ID</th>
                  <th className="text-left py-2.5 px-3">Tipo</th>
                  <th className="text-left py-2.5 px-3">RFC</th>
                  <th className="text-left py-2.5 px-3">Empleado</th>
                  <th className="text-left py-2.5 px-3">Empresa RH</th>
                  <th className="text-left py-2.5 px-3">BD</th>
                  <th className="text-left py-2.5 px-3">F.Recibido</th>
                  <th className="text-left py-2.5 px-3">F.Procesado</th>
                  <th className="text-left py-2.5 px-3">Status</th>
                  <th className="text-left py-2.5 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const StatusIcon = STATUS_ICON[p.status]
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className={`border-b border-gray-100 cursor-pointer hover:brightness-95 transition-all ${STATUS_ROW[p.status]} ${selected?.id === p.id ? 'ring-2 ring-inset ring-yellow-400' : ''}`}
                    >
                      <td className="py-2 px-3 font-mono text-xs text-gray-600">#{p.id}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${TIPO_COLOR[p.tipo]}`}>{p.tipo}</span>
                      </td>
                      <td className="py-2 px-3 font-mono text-xs text-gray-700">{p.rfc}</td>
                      <td className="py-2 px-3 text-xs text-gray-700">{getEmpleadoNombre(p.clave_emp)}</td>
                      <td className="py-2 px-3 text-xs text-gray-600">{p.empresa_rh}</td>
                      <td className="py-2 px-3 font-mono text-[10px] text-gray-500">{p.database}</td>
                      <td className="py-2 px-3 text-[10px] text-gray-500 whitespace-nowrap">{p.fecha_recibido}</td>
                      <td className="py-2 px-3 text-[10px] text-gray-500 whitespace-nowrap">{p.fecha_procesado ?? '—'}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_BADGE[p.status]}`}>
                          <StatusIcon className="w-2.5 h-2.5" />
                          {STATUS_LABEL[p.status]}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-72 shrink-0 bg-white rounded-xl border border-gray-200 p-4 space-y-4 h-fit">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">Detalle proceso #{selected.id}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {[
                ['Tipo', <span key="tipo" className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${TIPO_COLOR[selected.tipo]}`}>{selected.tipo}</span>],
                ['RFC', <span key="rfc" className="font-mono">{selected.rfc}</span>],
                ['Clave emp.', selected.clave_emp],
                ['Empresa RH', selected.empresa_rh],
                ['Base de datos', <span key="db" className="font-mono">{selected.database}</span>],
                ['Clave RH', selected.clave_rh ?? '—'],
                ['F. Recibido', selected.fecha_recibido],
                ['F. Procesado', selected.fecha_procesado ?? '—'],
                selected.fecha_alta ? ['Fecha alta', selected.fecha_alta] : null,
                selected.fecha_baja ? ['Fecha baja', selected.fecha_baja] : null,
              ].filter(Boolean).map((row, i) => {
                const [label, val] = row as [string, React.ReactNode]
                return (
                  <div key={i} className="flex justify-between items-start gap-2">
                    <span className="text-gray-400 shrink-0">{label}</span>
                    <span className="text-gray-700 font-medium text-right">{val}</span>
                  </div>
                )
              })}
            </div>

            {/* Error message */}
            {selected.error_msg && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-700 mb-1">Error</p>
                <p className="text-xs text-red-600">{selected.error_msg}</p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-1">
              {selected.status === 'standby' && (
                <Button
                  size="sm"
                  className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => procesarAhora(selected.id)}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Procesar ahora
                </Button>
              )}
              <div>
                <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide font-semibold">Cambiar estado</p>
                <select
                  value={selected.status}
                  onChange={e => cambiarEstado(selected.id, e.target.value as TxStatus)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="ok">OK</option>
                  <option value="standby">En espera</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="warning">Atención</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
