"use client"

import { useState, useEffect, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { Truck, Users, CheckCircle2, XCircle, AlertTriangle, Search, RefreshCw } from 'lucide-react'
import { useSCRHStore } from '@/store'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface ViajeRecord {
  id: string
  noEmpleado: string
  driverName: string
  rfc: string | null
  routeType: string
  cars: string | null
  startDate: string
  endDate: string
  unBustrax: string
  unId: string
}

interface FaltaRecord {
  keyidUn: string
  unidadNegocio: string
  noEmpleado: string
  totalFaltas: string
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────

function KpiCard({
  title, value, sub, color, icon: Icon,
}: {
  title: string; value: number | string; sub: string
  color: string; icon: React.ElementType
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

const UNIDAD_ID = '8'
const UNIDAD_NOMBRE = 'LIPU VDM'

export default function OperadoresPage() {
  const { empleados } = useSCRHStore()

  const hoy = format(new Date(), 'yyyy-MM-dd')
  const hace7 = format(subDays(new Date(), 6), 'yyyy-MM-dd')

  const [fechaini, setFechaini] = useState(hace7)
  const [fechafin, setFechafin] = useState(hoy)
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [viajes, setViajes] = useState<ViajeRecord[]>([])
  const [faltas, setFaltas] = useState<FaltaRecord[]>([])

  async function cargar() {
    setLoading(true)
    setError(null)
    try {
      const [vRes, fRes] = await Promise.all([
        fetch(`/api/bustrax/viajes?unidad=${UNIDAD_ID}&fechaini=${fechaini}&fechafin=${fechafin}`),
        fetch(`/api/bustrax/faltas?unidad=${UNIDAD_ID}&fechaini=${fechaini}&fechafin=${fechafin}`),
      ])
      const [vData, fData] = await Promise.all([vRes.json(), fRes.json()])
      setViajes(Array.isArray(vData) ? vData : [])
      setFaltas(Array.isArray(fData) ? fData : [])
    } catch {
      setError('Error al cargar datos. Verifica la conexión.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  // ── Operadores activos de esta unidad de negocio ───────────────────────────
  const operadoresActivos = useMemo(() =>
    empleados.filter(e => e.st === 1 && e.unidad_negocios !== undefined),
    [empleados]
  )

  // ── Claves únicas que hicieron viaje ──────────────────────────────────────
  const clavesConViaje = useMemo(() =>
    new Set(viajes.map(v => v.noEmpleado)),
    [viajes]
  )

  // ── Claves con faltas ──────────────────────────────────────────────────────
  const faltasMap = useMemo(() => {
    const m: Record<string, number> = {}
    faltas.forEach(f => { m[f.noEmpleado] = parseInt(f.totalFaltas) })
    return m
  }, [faltas])

  // ── Tabla de operadores cruzando viajes con empleados NEXO ────────────────
  const tabla = useMemo(() => {
    // Usar claves de viajes + faltas como fuente de verdad
    const todasClaves = new Set([
      ...Array.from(clavesConViaje),
      ...faltas.map(f => f.noEmpleado),
    ])

    return Array.from(todasClaves)
      .filter(clave => clave) // eliminar nulls
      .map(clave => {
        const emp = empleados.find(e => e.clave === clave)
        const viajesOp = viajes.filter(v => v.noEmpleado === clave)
        const nombreViaje = viajesOp[0]?.driverName ?? ''
        const nombre = emp
          ? `${emp.a_paterno} ${emp.a_materno} ${emp.nombre}`
          : nombreViaje
        return {
          clave,
          nombre: nombre || clave,
          operó: clavesConViaje.has(clave),
          totalViajes: viajesOp.length,
          faltas: faltasMap[clave] ?? 0,
          enNexo: !!emp,
        }
      })
      .filter(r => {
        if (!busqueda) return true
        const q = busqueda.toLowerCase()
        return r.nombre.toLowerCase().includes(q) || r.clave.includes(q)
      })
      .sort((a, b) => {
        if (a.operó !== b.operó) return a.operó ? -1 : 1
        return a.nombre.localeCompare(b.nombre)
      })
  }, [clavesConViaje, faltasMap, faltas, viajes, empleados, busqueda])

  const totalOperaron = clavesConViaje.size
  const totalNoOperaron = faltas.filter(f => !clavesConViaje.has(f.noEmpleado)).length
  const totalFaltas = faltas.reduce((s, f) => s + parseInt(f.totalFaltas), 0)

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-widest">
            {UNIDAD_NOMBRE}
          </span>
          <h1 className="text-xl font-bold text-gray-900 mt-1.5">Operadores — Asistencia por Viajes</h1>
          <p className="text-sm text-gray-400 mt-0.5">HC activo vs operadores que realizaron viaje</p>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-end gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha inicio</label>
          <input
            type="date"
            value={fechaini}
            max={fechafin}
            onChange={e => setFechaini(e.target.value)}
            className="h-9 border border-gray-200 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:border-indigo-400"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha fin</label>
          <input
            type="date"
            value={fechafin}
            min={fechaini}
            max={hoy}
            onChange={e => setFechafin(e.target.value)}
            className="h-9 border border-gray-200 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:border-indigo-400"
          />
        </div>
        <button
          onClick={cargar}
          disabled={loading}
          className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Cargando...' : 'Consultar'}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          title="HC Activo NEXO"
          value={operadoresActivos.length}
          sub="Empleados st=1"
          color="#6366f1"
          icon={Users}
        />
        <KpiCard
          title="Operaron"
          value={totalOperaron}
          sub="Hicieron al menos 1 viaje"
          color="#22c55e"
          icon={CheckCircle2}
        />
        <KpiCard
          title="No operaron"
          value={totalNoOperaron}
          sub="Registraron falta"
          color="#ef4444"
          icon={XCircle}
        />
        <KpiCard
          title="Total faltas"
          value={totalFaltas}
          sub="Días acumulados en el periodo"
          color="#f59e0b"
          icon={AlertTriangle}
        />
      </div>

      {/* ── Tabla ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Detalle por Operador</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{tabla.length} registros</p>
          </div>
          <div className="relative w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar nombre o nómina..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 h-9 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
            />
          </div>
        </div>

        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-gray-400">Cargando datos...</div>
        ) : tabla.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-400">
            <Truck className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            Sin registros para el periodo seleccionado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Nómina', 'Nombre', 'Viajes realizados', 'Faltas', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tabla.map(row => (
                  <tr key={row.clave} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{row.clave}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-gray-800">{row.nombre}</p>
                      {!row.enNexo && (
                        <p className="text-[10px] text-amber-500">No está en NEXO</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 font-medium">{row.totalViajes}</td>
                    <td className="px-4 py-3">
                      {row.faltas > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          {row.faltas} {row.faltas === 1 ? 'falta' : 'faltas'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.operó ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Operó
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 px-2.5 py-1 rounded-full">
                          <XCircle className="w-3 h-3" /> No operó
                        </span>
                      )}
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
