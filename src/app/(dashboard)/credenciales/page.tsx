"use client"

import { useState, useMemo } from 'react'
import { useSCRHStore } from '@/store'
import type { Empleado } from '@/types'
import { Search, X, Printer, RotateCcw } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistorialCredencial {
  id: number
  fecha: string
  usuario: string
  empresa: string
  cantidad: number
  tipo: string
  vigencia_hasta: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#14b8a6','#f97316',
]

function avatarColor(clave: string): string {
  let hash = 0
  for (let i = 0; i < clave.length; i++) hash = clave.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(nombre: string, aPaterno: string): string {
  return `${nombre.charAt(0)}${aPaterno.charAt(0)}`.toUpperCase()
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function addYears(dateStr: string, years: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setFullYear(d.getFullYear() + years)
  return d.toISOString().split('T')[0]
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Mock history ─────────────────────────────────────────────────────────────

const INIT_HISTORIAL: HistorialCredencial[] = [
  { id: 1, fecha: '2024-03-10', usuario: 'ADMIN', empresa: 'Traxion S.A. de C.V.', cantidad: 12, tipo: 'Ambos', vigencia_hasta: '2026-03-10' },
  { id: 2, fecha: '2024-02-14', usuario: 'RRHH01', empresa: 'Autotransportes Traxion', cantidad: 5,  tipo: 'Frente', vigencia_hasta: '2026-02-14' },
  { id: 3, fecha: '2024-01-20', usuario: 'ADMIN', empresa: 'Traxion S.A. de C.V.', cantidad: 8,  tipo: 'Ambos', vigencia_hasta: '2026-01-20' },
  { id: 4, fecha: '2023-12-05', usuario: 'RRHH02', empresa: 'Transportes de Carga', cantidad: 3,  tipo: 'Reverso', vigencia_hasta: '2025-12-05' },
  { id: 5, fecha: '2023-11-15', usuario: 'ADMIN', empresa: 'Traxion S.A. de C.V.', cantidad: 20, tipo: 'Ambos', vigencia_hasta: '2025-11-15' },
]

// ─── Credential Card (preview) ────────────────────────────────────────────────

function CredentialCard({
  emp,
  vigencia,
  empresaNombre,
  side,
}: {
  emp: Empleado
  vigencia: string
  empresaNombre: string
  side: 'Frente' | 'Reverso' | 'Ambos'
}) {
  const color = avatarColor(emp.clave)
  const initials = getInitials(emp.nombre, emp.a_paterno)

  const Front = () => (
    <div className="w-48 bg-white rounded-xl border-2 border-gray-200 shadow overflow-hidden text-center p-3 flex flex-col items-center gap-1.5">
      {/* Logo bar */}
      <div className="w-full bg-amber-500 rounded-lg py-1">
        <p className="text-white font-bold text-xs tracking-widest">TRAXION</p>
      </div>
      {/* Avatar */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm mt-1"
        style={{ backgroundColor: color }}
      >
        {initials}
      </div>
      {/* Name */}
      <p className="font-bold text-gray-900 text-xs leading-tight">{emp.nombre_completo}</p>
      <p className="text-gray-500 text-[10px]">{emp.puesto}</p>
      <div className="w-full border-t border-gray-100 pt-1.5 mt-0.5 space-y-0.5">
        <p className="text-[9px] text-gray-500">Nómina: <span className="font-semibold text-gray-700">{emp.clave}</span></p>
        <p className="text-[9px] text-gray-500 truncate">{empresaNombre}</p>
        <p className="text-[9px] text-gray-500">Vigencia: {fmtDate(vigencia)}</p>
      </div>
    </div>
  )

  const Back = () => (
    <div className="w-48 bg-white rounded-xl border-2 border-gray-200 shadow overflow-hidden p-3 flex flex-col gap-1.5">
      {/* Barcode mock */}
      <div className="w-full bg-gray-100 rounded flex items-center justify-center h-10">
        <div className="flex gap-0.5">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="bg-gray-700 rounded-sm" style={{ width: i % 3 === 0 ? 3 : 2, height: 24 }} />
          ))}
        </div>
      </div>
      <p className="text-[9px] text-center font-mono text-gray-600">{emp.clave}00123</p>
      <div className="text-[9px] text-gray-600 space-y-0.5 mt-1">
        <p>Tipo sanguíneo: <span className="font-bold">{emp.rh || 'O+'}</span></p>
        <p>Emergencias: {emp.tel_contacto || '55-0000-0000'}</p>
        <p>Contacto: {emp.contacto || '—'}</p>
      </div>
      {/* Signature */}
      <div className="mt-auto border-t border-gray-300 pt-2 text-center">
        <div className="h-5 border-b border-gray-400 mx-4" />
        <p className="text-[8px] text-gray-400 mt-0.5">Firma del titular</p>
      </div>
    </div>
  )

  if (side === 'Frente') return <Front />
  if (side === 'Reverso') return <Back />
  return (
    <div className="flex gap-2">
      <Front />
      <Back />
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CredencialesPage() {
  const [tab, setTab] = useState<'generar' | 'historial'>('generar')

  // Store
  const empleados = useSCRHStore(s => s.empleados)
  const empresas  = useSCRHStore(s => s.empresas)
  const deptos    = useSCRHStore(s => s.departamentos)

  const getEmpresa = (c: number) => empresas.find(e => e.clave === c)?.razon_social ?? '—'

  // Form state
  const [empresaSelected, setEmpresaSelected] = useState<number>(empresas[0]?.clave ?? 0)
  const [selectedEmps, setSelectedEmps]         = useState<Empleado[]>([])
  const [empSearch, setEmpSearch]               = useState('')
  const [deptoSelected, setDeptoSelected]       = useState<number>(0)
  const [fechaEmision, setFechaEmision]         = useState(todayStr())
  const [fechaVenc, setFechaVenc]               = useState(addYears(todayStr(), 2))
  const [seccion, setSeccion]                   = useState<'Frente' | 'Reverso' | 'Ambos'>('Ambos')
  const [tamano, setTamano]                     = useState<'CR80 Estándar' | 'A4'>('CR80 Estándar')

  // Historial
  const [historial, setHistorial] = useState<HistorialCredencial[]>(INIT_HISTORIAL)

  // Toast
  const [toast, setToast] = useState<string | null>(null)
  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Employee search results
  const searchResults = useMemo(() => {
    if (empSearch.trim().length < 2) return []
    const q = empSearch.toLowerCase()
    return empleados
      .filter(e => e.st === 1 && !selectedEmps.find(s => s.clave === e.clave))
      .filter(e =>
        e.nombre_completo.toLowerCase().includes(q) ||
        e.clave.toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [empSearch, empleados, selectedEmps])

  const addEmp = (emp: Empleado) => {
    setSelectedEmps(prev => [...prev, emp])
    setEmpSearch('')
  }

  const removeEmp = (clave: string) => {
    setSelectedEmps(prev => prev.filter(e => e.clave !== clave))
  }

  const addByDepto = () => {
    if (!deptoSelected) return
    const toAdd = empleados.filter(
      e => e.st === 1 && e.depto === deptoSelected && !selectedEmps.find(s => s.clave === e.clave)
    )
    setSelectedEmps(prev => [...prev, ...toAdd])
    showToast(`${toAdd.length} empleados agregados del departamento.`)
  }

  const handlePrint = () => {
    if (selectedEmps.length === 0) { showToast('Selecciona al menos un empleado.'); return }
    // Register in history
    const newEntry: HistorialCredencial = {
      id: Math.max(...historial.map(h => h.id)) + 1,
      fecha: todayStr(),
      usuario: 'ADMIN',
      empresa: getEmpresa(empresaSelected),
      cantidad: selectedEmps.length,
      tipo: seccion,
      vigencia_hasta: fechaVenc,
    }
    setHistorial(prev => [newEntry, ...prev])
    showToast('Enviando a impresión...')
    setTimeout(() => window.print(), 500)
  }

  const handleReimprimir = (entry: HistorialCredencial) => {
    showToast(`Reimprimiendo ${entry.cantidad} credenciales de ${entry.empresa}...`)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Credenciales</h1>
        <p className="text-gray-500 text-sm mt-1">Impresión y gestión de credenciales de empleados</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['generar', 'historial'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'generar' ? 'Generar Credenciales' : 'Historial'}
          </button>
        ))}
      </div>

      {/* ── TAB: GENERAR ────────────────────────────────────────────────────── */}
      {tab === 'generar' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-5">
            {/* Empresa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Empresa</label>
              <select
                value={empresaSelected}
                onChange={e => setEmpresaSelected(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {empresas.map(e => (
                  <option key={e.clave} value={e.clave}>{e.razon_social}</option>
                ))}
              </select>
            </div>

            {/* Employee multiselect */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Empleados
              </label>
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o nómina..."
                  value={empSearch}
                  onChange={e => setEmpSearch(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                {/* Dropdown results */}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                    {searchResults.map(emp => (
                      <button
                        key={emp.clave}
                        onClick={() => addEmp(emp)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                      >
                        <span className="font-medium">{emp.nombre_completo}</span>
                        <span className="text-gray-400 ml-2 text-xs">{emp.clave}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Chips */}
              {selectedEmps.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedEmps.map(emp => (
                    <span
                      key={emp.clave}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs"
                    >
                      {emp.nombre}
                      <button onClick={() => removeEmp(emp.clave)}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* By department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Seleccionar por departamento
              </label>
              <div className="flex gap-2">
                <select
                  value={deptoSelected}
                  onChange={e => setDeptoSelected(Number(e.target.value))}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value={0}>— Selecciona departamento —</option>
                  {deptos.filter(d => d.status === 1).map(d => (
                    <option key={d.clave} value={d.clave}>{d.descripcion}</option>
                  ))}
                </select>
                <button
                  onClick={addByDepto}
                  disabled={!deptoSelected}
                  className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 disabled:opacity-40"
                >
                  Agregar
                </button>
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Fecha emisión *
                </label>
                <input
                  type="date"
                  value={fechaEmision}
                  onChange={e => setFechaEmision(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Fecha vencimiento *
                </label>
                <input
                  type="date"
                  value={fechaVenc}
                  onChange={e => setFechaVenc(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>

            {/* Seccion */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Sección a imprimir
              </label>
              <div className="flex gap-3">
                {(['Frente', 'Reverso', 'Ambos'] as const).map(s => (
                  <label key={s} className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="seccion"
                      checked={seccion === s}
                      onChange={() => setSeccion(s)}
                      className="accent-indigo-600"
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            {/* Tamaño */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tamaño</label>
              <div className="flex gap-3">
                {(['CR80 Estándar', 'A4'] as const).map(s => (
                  <label key={s} className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="tamano"
                      checked={tamano === s}
                      onChange={() => setTamano(s)}
                      className="accent-indigo-600"
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            {/* Print button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors w-full justify-center"
            >
              <Printer size={16} /> Imprimir
            </button>
          </div>

          {/* Preview */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Vista previa de credenciales
              {selectedEmps.length > 0 && (
                <span className="ml-2 text-xs text-gray-400">({selectedEmps.length} seleccionados)</span>
              )}
            </p>
            {selectedEmps.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
                Agrega empleados para ver la vista previa.
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {selectedEmps.map(emp => (
                  <div key={emp.clave} className="flex items-start gap-3">
                    <CredentialCard
                      emp={emp}
                      vigencia={fechaVenc}
                      empresaNombre={getEmpresa(empresaSelected)}
                      side={seccion}
                    />
                    <button
                      onClick={() => removeEmp(emp.clave)}
                      className="mt-1 p-1 rounded hover:bg-gray-100 text-gray-400"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: HISTORIAL ──────────────────────────────────────────────────── */}
      {tab === 'historial' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {['Fecha', 'Usuario', 'Empresa', 'Cantidad', 'Tipo', 'Vigencia hasta', 'Acciones'].map(h => (
                  <th key={h} className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pr-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {historial.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 text-gray-700">{fmtDate(entry.fecha)}</td>
                  <td className="py-3 pr-4 text-gray-700">{entry.usuario}</td>
                  <td className="py-3 pr-4 text-gray-700">{entry.empresa}</td>
                  <td className="py-3 pr-4">
                    <span className="font-semibold text-indigo-600">{entry.cantidad}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-700">
                      {entry.tipo}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-700">{fmtDate(entry.vigencia_hasta)}</td>
                  <td className="py-3">
                    <button
                      onClick={() => handleReimprimir(entry)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-700 transition-colors"
                    >
                      <RotateCcw size={12} /> Reimprimir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
