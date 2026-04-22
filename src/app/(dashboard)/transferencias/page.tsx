"use client"

import { useState, useMemo } from 'react'
import { useSCRHStore } from '@/store'
import { calcularSalario, formatMXN } from '@/lib/calculations'
import {
  ArrowRightLeft, Building2, Users, Search, Download,
  CheckCircle, AlertCircle, Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

// ── Tabs ──────────────────────────────────────────────────────────────────────
type MainTab = 'nueva' | 'historial'

// ── Helpers ───────────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
        active
          ? 'border-indigo-600 text-indigo-700 bg-white'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-5 bg-indigo-500 rounded-full" />
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{children}</h3>
    </div>
  )
}

function ReadonlyField({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <Label className="text-xs text-gray-500">{label}</Label>
      <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
        {value || '—'}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TransferenciasPage() {
  const {
    empleados, historialPersonal, empresas, departamentos, puestos,
    centrosCostos, tiposBaja, causasBaja,
    getEmpleado, getEmpresaNombre, getDepartamentoNombre, getPuestoNombre, getCCostosNombre,
    updateEmpleado, addHistorial,
  } = useSCRHStore()

  const [tab, setTab] = useState<MainTab>('nueva')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // ── Form state ──────────────────────────────────────────────────────────────
  const [busquedaNomina, setBusquedaNomina] = useState('')
  const [empleadoOrigen, setEmpleadoOrigen] = useState<ReturnType<typeof getEmpleado>>(undefined)
  const [notFound, setNotFound] = useState(false)

  const [fechaBajaOrigen, setFechaBajaOrigen] = useState('')
  const [causaBajaId, setCausaBajaId] = useState(0)

  const [empresaDestino, setEmpresaDestino] = useState(0)
  const [deptoDestino, setDeptoDestino] = useState(0)
  const [puestoDestino, setPuestoDestino] = useState(0)
  const [ccostosDestino, setCcostosDestino] = useState(0)
  const [fechaIngresoDestino, setFechaIngresoDestino] = useState('')
  const [sueldoNuevo, setSueldoNuevo] = useState(0)

  const [solicito, setSolicito] = useState('')
  const [autorizo, setAutorizo] = useState('')
  const [observaciones, setObservaciones] = useState('')

  const [previewVisible, setPreviewVisible] = useState(false)

  // ── Historial filters ───────────────────────────────────────────────────────
  const [histSearch, setHistSearch] = useState('')
  const [histFrom, setHistFrom] = useState('')
  const [histTo, setHistTo] = useState('')

  // ── Stats ───────────────────────────────────────────────────────────────────
  const now = new Date()
  const mesActual = now.getMonth()
  const anyoActual = now.getFullYear()

  const transferencias = useMemo(() => historialPersonal.filter(h => h.movimiento === 3), [historialPersonal])

  const transfersMes = useMemo(() => transferencias.filter(h => {
    const d = new Date(h.fecha)
    return d.getMonth() === mesActual && d.getFullYear() === anyoActual
  }).length, [transferencias, mesActual, anyoActual])

  const transfersAnyo = useMemo(() => transferencias.filter(h => {
    return new Date(h.fecha).getFullYear() === anyoActual
  }).length, [transferencias, anyoActual])

  const empresasInvolucradas = useMemo(() => {
    const set = new Set<number>()
    transferencias.forEach(h => {
      const emp = empleados.find(e => e.clave === h.clave)
      if (emp) {
        set.add(emp.empresa)
        if (h.depto_final) set.add(h.depto_final) // reuse for empresa via depto context
      }
    })
    return set.size
  }, [transferencias, empleados])

  // ── Search employee ─────────────────────────────────────────────────────────
  function buscarEmpleado() {
    const found = getEmpleado(busquedaNomina.trim())
    if (found && found.st === 1) {
      setEmpleadoOrigen(found)
      setSueldoNuevo(found.sueldo_mensual)
      setNotFound(false)
    } else {
      setEmpleadoOrigen(undefined)
      setNotFound(true)
    }
  }

  // ── Calculated salary day ───────────────────────────────────────────────────
  const sdNuevo = useMemo(() => {
    if (!sueldoNuevo) return 0
    const empresa = empresas.find(e => e.clave === empresaDestino)
    const factor = empresa?.periodo_pago === 'semanal' ? 30 : 30.42
    return parseFloat((sueldoNuevo / factor).toFixed(2))
  }, [sueldoNuevo, empresaDestino, empresas])

  // ── Validation ──────────────────────────────────────────────────────────────
  const formValid = useMemo(() => {
    return (
      empleadoOrigen &&
      fechaBajaOrigen &&
      empresaDestino > 0 &&
      empresaDestino !== empleadoOrigen?.empresa &&
      deptoDestino > 0 &&
      puestoDestino > 0 &&
      ccostosDestino > 0 &&
      fechaIngresoDestino &&
      fechaIngresoDestino >= fechaBajaOrigen &&
      sueldoNuevo > 0
    )
  }, [empleadoOrigen, fechaBajaOrigen, empresaDestino, deptoDestino, puestoDestino, ccostosDestino, fechaIngresoDestino, sueldoNuevo])

  // ── Apply transfer ──────────────────────────────────────────────────────────
  function aplicarTransferencia() {
    if (!empleadoOrigen || !formValid) return

    const empresa = empresas.find(e => e.clave === empresaDestino)
    const salary = calcularSalario(sueldoNuevo, empresa?.periodo_pago ?? 'catorcenal')

    addHistorial({
      clave: empleadoOrigen.clave,
      fecha: fechaBajaOrigen,
      movimiento: 3,
      sueldo_inicial: empleadoOrigen.sueldo_mensual,
      sueldo_final: sueldoNuevo,
      puesto_inicial: empleadoOrigen.puesto,
      puesto_final: puestoDestino,
      depto_inicial: empleadoOrigen.depto,
      depto_final: deptoDestino,
      observaciones: observaciones || `Transferencia a ${getEmpresaNombre(empresaDestino)}. Solicitó: ${solicito}. Autorizó: ${autorizo}`,
      usuario: 'ADMIN',
    })

    updateEmpleado(empleadoOrigen.clave, {
      empresa: empresaDestino,
      depto: deptoDestino,
      puesto: puestoDestino,
      ccostos: ccostosDestino,
      fecha_contrato: fechaIngresoDestino,
      ...salary,
    })

    showToast('success', `Transferencia aplicada correctamente para ${empleadoOrigen.nombre_completo}`)
    resetForm()
  }

  function resetForm() {
    setBusquedaNomina('')
    setEmpleadoOrigen(undefined)
    setFechaBajaOrigen('')
    setCausaBajaId(0)
    setEmpresaDestino(0)
    setDeptoDestino(0)
    setPuestoDestino(0)
    setCcostosDestino(0)
    setFechaIngresoDestino('')
    setSueldoNuevo(0)
    setSolicito('')
    setAutorizo('')
    setObservaciones('')
    setPreviewVisible(false)
  }

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  // ── Historial filtered ──────────────────────────────────────────────────────
  const historialFiltrado = useMemo(() => {
    return transferencias.filter(h => {
      const emp = empleados.find(e => e.clave === h.clave)
      const nombre = emp?.nombre_completo ?? ''
      if (histSearch && !nombre.toLowerCase().includes(histSearch.toLowerCase()) && !h.clave.includes(histSearch)) return false
      if (histFrom && h.fecha < histFrom) return false
      if (histTo && h.fecha > histTo) return false
      return true
    })
  }, [transferencias, empleados, histSearch, histFrom, histTo])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transferencias de Personal</h1>
        <p className="text-sm text-gray-500 mt-1">Movimiento entre unidades de negocio</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={ArrowRightLeft} label="Transferencias este mes" value={transfersMes} color="bg-indigo-500" />
        <StatCard icon={Users} label="Activas este año" value={transfersAnyo} color="bg-emerald-500" />
        <StatCard icon={Building2} label="Empresas involucradas" value={empresasInvolucradas || empresas.length} color="bg-amber-500" />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex border-b border-gray-200 px-4 pt-2 gap-1">
          <TabBtn active={tab === 'nueva'} onClick={() => setTab('nueva')}>Nueva Transferencia</TabBtn>
          <TabBtn active={tab === 'historial'} onClick={() => setTab('historial')}>Historial de Transferencias</TabBtn>
        </div>

        {/* ── Tab: Nueva Transferencia ── */}
        {tab === 'nueva' && (
          <div className="p-6 space-y-6">

            {/* ORIGEN */}
            <div>
              <SectionTitle>Origen</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Número de nómina *</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={busquedaNomina}
                      onChange={e => setBusquedaNomina(e.target.value)}
                      placeholder="Ej: 1001"
                      onKeyDown={e => e.key === 'Enter' && buscarEmpleado()}
                    />
                    <Button variant="outline" size="sm" onClick={buscarEmpleado}>
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                  {notFound && (
                    <p className="text-xs text-red-500 mt-1">Empleado no encontrado o no está activo.</p>
                  )}
                </div>
              </div>

              {empleadoOrigen && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                  <ReadonlyField label="Nombre completo" value={empleadoOrigen.nombre_completo} />
                  <ReadonlyField label="Empresa actual" value={getEmpresaNombre(empleadoOrigen.empresa)} />
                  <ReadonlyField label="Departamento actual" value={getDepartamentoNombre(empleadoOrigen.depto)} />
                  <ReadonlyField label="Puesto actual" value={getPuestoNombre(empleadoOrigen.puesto)} />
                  <ReadonlyField label="Sueldo bruto actual" value={formatMXN(empleadoOrigen.sueldo_mensual)} />
                  <ReadonlyField label="Salario diario" value={formatMXN(empleadoOrigen.sd)} />
                  <ReadonlyField label="Centro de costos" value={getCCostosNombre(empleadoOrigen.ccostos)} />
                </div>
              )}

              {empleadoOrigen && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Fecha de baja origen *</Label>
                    <Input
                      type="date"
                      value={fechaBajaOrigen}
                      onChange={e => setFechaBajaOrigen(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Causa de baja</Label>
                    <select
                      value={causaBajaId}
                      onChange={e => setCausaBajaId(Number(e.target.value))}
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value={0}>— Seleccionar —</option>
                      {causasBaja.filter(c => c.status === 1).map(c => (
                        <option key={c.clave} value={c.clave}>{c.descripcion}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* DESTINO */}
            {empleadoOrigen && (
              <div>
                <SectionTitle>Destino</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Empresa destino *</Label>
                    <select
                      value={empresaDestino}
                      onChange={e => setEmpresaDestino(Number(e.target.value))}
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value={0}>— Seleccionar —</option>
                      {empresas
                        .filter(e => e.status === 1 && e.clave !== empleadoOrigen.empresa)
                        .map(e => (
                          <option key={e.clave} value={e.clave}>{e.razon_social}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Departamento destino *</Label>
                    <select
                      value={deptoDestino}
                      onChange={e => setDeptoDestino(Number(e.target.value))}
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value={0}>— Seleccionar —</option>
                      {departamentos.filter(d => d.status === 1).map(d => (
                        <option key={d.clave} value={d.clave}>{d.descripcion}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Puesto destino *</Label>
                    <select
                      value={puestoDestino}
                      onChange={e => setPuestoDestino(Number(e.target.value))}
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value={0}>— Seleccionar —</option>
                      {puestos.filter(p => p.st === 1).map(p => (
                        <option key={p.clave} value={p.clave}>{p.descripcion}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Centro de costos destino *</Label>
                    <select
                      value={ccostosDestino}
                      onChange={e => setCcostosDestino(Number(e.target.value))}
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value={0}>— Seleccionar —</option>
                      {centrosCostos.map(c => (
                        <option key={c.clave} value={c.clave}>{c.descripcion} ({c.desc_corta})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Fecha de ingreso destino *</Label>
                    <Input
                      type="date"
                      value={fechaIngresoDestino}
                      min={fechaBajaOrigen}
                      onChange={e => setFechaIngresoDestino(e.target.value)}
                      className="mt-1"
                    />
                    {fechaIngresoDestino && fechaBajaOrigen && fechaIngresoDestino < fechaBajaOrigen && (
                      <p className="text-xs text-red-500 mt-1">Debe ser igual o posterior a la fecha de baja origen.</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Sueldo nuevo *</Label>
                    <Input
                      type="number"
                      value={sueldoNuevo || ''}
                      onChange={e => setSueldoNuevo(Number(e.target.value))}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Salario diario nuevo (calculado)</Label>
                    <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                      {formatMXN(sdNuevo)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AUTORIZACIÓN */}
            {empleadoOrigen && (
              <div>
                <SectionTitle>Autorización</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Solicitó</Label>
                    <Input value={solicito} onChange={e => setSolicito(e.target.value)} className="mt-1" placeholder="Nombre del solicitante" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Autorizó</Label>
                    <Input value={autorizo} onChange={e => setAutorizo(e.target.value)} className="mt-1" placeholder="Nombre del autorizador" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium">Observaciones</Label>
                    <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} className="mt-1" rows={3} placeholder="Notas adicionales..." />
                  </div>
                </div>
              </div>
            )}

            {/* Preview & Actions */}
            {empleadoOrigen && formValid && (
              <div>
                {previewVisible && (
                  <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm space-y-2">
                    <h4 className="font-semibold text-gray-800 mb-3">Vista previa de la transferencia</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-gray-500">Empleado:</span> <span className="font-medium">{empleadoOrigen.nombre_completo}</span></div>
                      <div><span className="text-gray-500">Nómina:</span> <span className="font-medium">{empleadoOrigen.clave}</span></div>
                      <div><span className="text-gray-500">Empresa origen:</span> <span className="font-medium">{getEmpresaNombre(empleadoOrigen.empresa)}</span></div>
                      <div><span className="text-gray-500">Empresa destino:</span> <span className="font-medium text-indigo-700">{getEmpresaNombre(empresaDestino)}</span></div>
                      <div><span className="text-gray-500">Puesto anterior:</span> <span className="font-medium">{getPuestoNombre(empleadoOrigen.puesto)}</span></div>
                      <div><span className="text-gray-500">Puesto nuevo:</span> <span className="font-medium text-indigo-700">{getPuestoNombre(puestoDestino)}</span></div>
                      <div><span className="text-gray-500">Sueldo anterior:</span> <span className="font-medium">{formatMXN(empleadoOrigen.sueldo_mensual)}</span></div>
                      <div><span className="text-gray-500">Sueldo nuevo:</span> <span className={`font-medium ${sueldoNuevo > empleadoOrigen.sueldo_mensual ? 'text-green-700' : 'text-red-700'}`}>{formatMXN(sueldoNuevo)}</span></div>
                      <div><span className="text-gray-500">Fecha baja origen:</span> <span className="font-medium">{fechaBajaOrigen}</span></div>
                      <div><span className="text-gray-500">Fecha ingreso destino:</span> <span className="font-medium">{fechaIngresoDestino}</span></div>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setPreviewVisible(v => !v)}>
                    <Eye className="w-4 h-4 mr-2" />
                    {previewVisible ? 'Ocultar vista previa' : 'Vista previa'}
                  </Button>
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={aplicarTransferencia}
                  >
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    Aplicar Transferencia
                  </Button>
                </div>
              </div>
            )}

            {!empleadoOrigen && (
              <div className="text-center py-12 text-gray-400">
                <ArrowRightLeft className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Ingresa un número de nómina para comenzar</p>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Historial ── */}
        {tab === 'historial' && (
          <div className="p-6">
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex-1 min-w-[180px]">
                <Input
                  placeholder="Buscar por nombre o nómina..."
                  value={histSearch}
                  onChange={e => setHistSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Del:</span>
                <Input type="date" value={histFrom} onChange={e => setHistFrom(e.target.value)} className="w-36" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Al:</span>
                <Input type="date" value={histTo} onChange={e => setHistTo(e.target.value)} className="w-36" />
              </div>
              <Button variant="outline" size="sm" onClick={() => showToast('success', `Exportando ${historialFiltrado.length} registros...`)}>
                <Download className="w-4 h-4 mr-1" /> Exportar
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    {['Fecha', 'Nómina', 'Nombre', 'Puesto anterior', 'Puesto nuevo', 'Empresa ant.', 'Empresa nueva', 'Sueldo ant.', 'Sueldo nuevo', 'Usuario'].map(h => (
                      <th key={h} className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historialFiltrado.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-gray-400 text-sm">Sin transferencias registradas</td>
                    </tr>
                  ) : historialFiltrado.map(h => {
                    const emp = empleados.find(e => e.clave === h.clave)
                    return (
                      <tr key={h.numero} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 whitespace-nowrap">{h.fecha}</td>
                        <td className="py-2 px-3 font-mono">{h.clave}</td>
                        <td className="py-2 px-3 whitespace-nowrap">{emp?.nombre_completo ?? '—'}</td>
                        <td className="py-2 px-3 whitespace-nowrap">{getPuestoNombre(h.puesto_inicial)}</td>
                        <td className="py-2 px-3 whitespace-nowrap text-indigo-700">{getPuestoNombre(h.puesto_final)}</td>
                        <td className="py-2 px-3 whitespace-nowrap">{emp ? getEmpresaNombre(emp.empresa) : '—'}</td>
                        <td className="py-2 px-3 whitespace-nowrap text-indigo-700">{h.depto_final ? getDepartamentoNombre(h.depto_final) : '—'}</td>
                        <td className="py-2 px-3 whitespace-nowrap">{formatMXN(h.sueldo_inicial)}</td>
                        <td className="py-2 px-3 whitespace-nowrap">{formatMXN(h.sueldo_final)}</td>
                        <td className="py-2 px-3 text-gray-500">{h.usuario}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-3">{historialFiltrado.length} registro(s)</p>
          </div>
        )}
      </div>
    </div>
  )
}
