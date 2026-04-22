"use client"

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSCRHStore } from '@/store'
import { calcularSalario, formatMXN } from '@/lib/calculations'
import {
  ArrowRightLeft, RefreshCcw, Users, FileSpreadsheet, Building2, UserCheck,
  CheckCircle, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

// ── Helper components ──────────────────────────────────────────────────────────

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-5 bg-indigo-500 rounded-full" />
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{children}</h3>
    </div>
  )
}

interface OperationCardProps {
  icon: React.ElementType
  title: string
  description: string
  buttonLabel: string
  onAction: () => void
  color?: string
}

function OperationCard({ icon: Icon, title, description, buttonLabel, onAction, color = 'bg-indigo-500' }: OperationCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
      </div>
      <Button variant="outline" className="w-full" onClick={onAction}>
        {buttonLabel}
      </Button>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ControlInternoPage() {
  const router = useRouter()
  const {
    empleados, empresas, departamentos, puestos, centrosCostos,
    getEmpleado, getEmpresaNombre, getDepartamentoNombre, getPuestoNombre, getCCostosNombre,
    updateEmpleado, addHistorial,
  } = useSCRHStore()

  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // ── Sheet / Dialog state ─────────────────────────────────────────────────────
  const [openConfianza, setOpenConfianza] = useState(false)
  const [openNormalizacion, setOpenNormalizacion] = useState(false)
  const [openPrenomina, setOpenPrenomina] = useState(false)
  const [openIMSS, setOpenIMSS] = useState(false)
  const [openReactivacion, setOpenReactivacion] = useState(false)
  const [openPrenominaResult, setOpenPrenominaResult] = useState(false)

  // ── Confianza a Base form ────────────────────────────────────────────────────
  const [cbNomina, setCbNomina] = useState('')
  const [cbEmpleado, setCbEmpleado] = useState<ReturnType<typeof getEmpleado>>(undefined)
  const [cbNotFound, setCbNotFound] = useState(false)
  const [cbEmpresaDest, setCbEmpresaDest] = useState(0)
  const [cbDeptoDest, setCbDeptoDest] = useState(0)
  const [cbPuestoDest, setCbPuestoDest] = useState(0)
  const [cbCcostos, setCbCcostos] = useState(0)
  const [cbSueldo, setCbSueldo] = useState(0)
  const [cbFechaContrato, setCbFechaContrato] = useState('')
  const [cbMantAntiq, setCbMantAntiq] = useState<'S' | 'N'>('S')
  const [cbObs, setCbObs] = useState('')

  // ── Normalización form ───────────────────────────────────────────────────────
  const [normArchivo, setNormArchivo] = useState('Datos laborales')
  const [normCampo, setNormCampo] = useState('')
  const [normValorCapturado, setNormValorCapturado] = useState('')
  const [normValorCorrecto, setNormValorCorrecto] = useState('')

  // ── Pre-nómina form ──────────────────────────────────────────────────────────
  const [pnFechaInicio, setPnFechaInicio] = useState('')
  const [pnFechaFin, setPnFechaFin] = useState('')
  const [pnTipoPago, setPnTipoPago] = useState('Todos')

  // ── Reactivación ─────────────────────────────────────────────────────────────
  const [reactivarId, setReactivarId] = useState<string | null>(null)

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  // ── Confianza a Base ─────────────────────────────────────────────────────────
  function buscarCbEmpleado() {
    const emp = getEmpleado(cbNomina.trim())
    if (emp && emp.st === 1) {
      setCbEmpleado(emp)
      setCbSueldo(emp.sueldo_mensual)
      setCbNotFound(false)
    } else {
      setCbEmpleado(undefined)
      setCbNotFound(true)
    }
  }

  function aplicarCambioConfianza() {
    if (!cbEmpleado) return
    if (!cbEmpresaDest || !cbDeptoDest || !cbPuestoDest || !cbCcostos || !cbSueldo || !cbFechaContrato) {
      showToast('error', 'Complete todos los campos obligatorios')
      return
    }
    const empresa = empresas.find(e => e.clave === cbEmpresaDest)
    const salary = calcularSalario(cbSueldo, empresa?.periodo_pago ?? 'catorcenal')

    updateEmpleado(cbEmpleado.clave, {
      empresa: cbEmpresaDest,
      depto: cbDeptoDest,
      puesto: cbPuestoDest,
      ccostos: cbCcostos,
      fecha_contrato: cbFechaContrato,
      ...salary,
    })

    addHistorial({
      clave: cbEmpleado.clave,
      fecha: cbFechaContrato,
      movimiento: 3,
      sueldo_inicial: cbEmpleado.sueldo_mensual,
      sueldo_final: cbSueldo,
      puesto_inicial: cbEmpleado.puesto,
      puesto_final: cbPuestoDest,
      depto_inicial: cbEmpleado.depto,
      depto_final: cbDeptoDest,
      observaciones: cbObs || `Cambio Confianza a Base. Mantener antigüedad: ${cbMantAntiq}`,
      usuario: 'ADMIN',
    })

    setOpenConfianza(false)
    showToast('success', `Cambio aplicado correctamente para ${cbEmpleado.nombre_completo}`)
    setCbNomina(''); setCbEmpleado(undefined); setCbEmpresaDest(0); setCbDeptoDest(0)
    setCbPuestoDest(0); setCbCcostos(0); setCbSueldo(0); setCbFechaContrato(''); setCbObs('')
  }

  // ── Normalización ─────────────────────────────────────────────────────────────
  const normAfectados = useMemo(() => {
    if (!normValorCapturado) return 0
    return Math.floor(Math.random() * 20) + 1
  }, [normValorCapturado])

  function aplicarNormalizacion() {
    if (!normCampo || !normValorCapturado || !normValorCorrecto) {
      showToast('error', 'Complete todos los campos')
      return
    }
    setOpenNormalizacion(false)
    showToast('success', `Normalización aplicada a ${normAfectados} registros`)
    setNormCampo(''); setNormValorCapturado(''); setNormValorCorrecto('')
  }

  // ── Pre-nómina ────────────────────────────────────────────────────────────────
  const prenominaData = useMemo(() => {
    return empleados
      .filter(e => pnTipoPago === 'Activos únicamente' ? e.st === 1 : pnTipoPago === 'Con bajas en periodo' ? e.st === 5 : true)
      .slice(0, 15)
      .map(e => ({
        clave: e.clave,
        nombre: e.nombre_completo,
        empresa: getEmpresaNombre(e.empresa),
        puesto: getPuestoNombre(e.puesto),
        sueldo: e.sueldo_mensual,
        sd: e.sd,
        status: e.st === 1 ? 'Activo' : e.st === 5 ? 'Baja' : 'Inactivo',
      }))
  }, [empleados, pnTipoPago, getEmpresaNombre, getPuestoNombre])

  function generarPrenomina() {
    if (!pnFechaInicio || !pnFechaFin) {
      showToast('error', 'Seleccione el rango de fechas')
      return
    }
    setOpenPrenomina(false)
    setOpenPrenominaResult(true)
  }

  // ── IMSS mock data ─────────────────────────────────────────────────────────────
  const imssData = useMemo(() => {
    const now = new Date()
    const mes = now.getMonth()
    const anyo = now.getFullYear()
    return empleados
      .filter(e => {
        if (e.st === 1) {
          const d = new Date(e.alta)
          return d.getMonth() === mes && d.getFullYear() === anyo
        }
        if (e.st === 5 && e.fecha_baja) {
          const d = new Date(e.fecha_baja)
          return d.getMonth() === mes && d.getFullYear() === anyo
        }
        return false
      })
      .slice(0, 10)
      .map(e => ({
        clave: e.clave,
        nombre: e.nombre_completo,
        imss: e.imss || '—',
        tipo: e.st === 1 ? 'Alta' : 'Baja',
        fecha: e.st === 1 ? e.alta : (e.fecha_baja ?? '—'),
        sd: e.sd,
      }))
  }, [empleados])

  // ── Inactivos para reactivación ───────────────────────────────────────────────
  const inactivos = useMemo(() => empleados.filter(e => e.st === 2), [empleados])

  function handleReactivar() {
    if (!reactivarId) return
    updateEmpleado(reactivarId, { st: 1 })
    setReactivarId(null)
    showToast('success', 'Empleado reactivado correctamente')
  }

  // ── Render ────────────────────────────────────────────────────────────────────
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
        <h1 className="text-2xl font-bold text-gray-900">Control Interno RH</h1>
        <p className="text-sm text-gray-500 mt-1">Operaciones administrativas especiales</p>
      </div>

      {/* Operation cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <OperationCard
          icon={ArrowRightLeft}
          title="Confianza a Base"
          description="Transferir empleado de régimen de confianza a base"
          buttonLabel="Ir a Confianza a Base"
          onAction={() => setOpenConfianza(true)}
          color="bg-indigo-500"
        />
        <OperationCard
          icon={RefreshCcw}
          title="Normalización de Datos"
          description="Corregir valores de catálogos en registros existentes"
          buttonLabel="Ir a Normalización"
          onAction={() => setOpenNormalizacion(true)}
          color="bg-teal-500"
        />
        <OperationCard
          icon={Users}
          title="Usuarios del Sistema"
          description="Gestión de accesos y permisos"
          buttonLabel="Ir a Accesos"
          onAction={() => router.push('/accesos')}
          color="bg-violet-500"
        />
        <OperationCard
          icon={FileSpreadsheet}
          title="Pre-nómina"
          description="Generar lista pre-nómina en Excel"
          buttonLabel="Generar Pre-nómina"
          onAction={() => setOpenPrenomina(true)}
          color="bg-amber-500"
        />
        <OperationCard
          icon={Building2}
          title="Envío Cuentas IMSS"
          description="Reportar altas/bajas de cuentas al IMSS"
          buttonLabel="Generar reporte"
          onAction={() => setOpenIMSS(true)}
          color="bg-sky-500"
        />
        <OperationCard
          icon={UserCheck}
          title="Activación de Empleados"
          description="Reactivar empleados inactivos (st=2)"
          buttonLabel="Ver inactivos"
          onAction={() => setOpenReactivacion(true)}
          color="bg-emerald-500"
        />
      </div>

      {/* ── Sheet: Confianza a Base ── */}
      <Sheet open={openConfianza} onOpenChange={setOpenConfianza}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Confianza a Base</SheetTitle>
            <SheetDescription>Transferir empleado de régimen de confianza a base.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-5">
            <div>
              <Label>Número de nómina *</Label>
              <div className="flex gap-2 mt-1">
                <Input placeholder="Ingrese nómina" value={cbNomina} onChange={e => setCbNomina(e.target.value)} />
                <Button variant="outline" onClick={buscarCbEmpleado} type="button">Buscar</Button>
              </div>
              {cbNotFound && <p className="mt-1 text-xs text-red-600">Empleado no encontrado o no está activo.</p>}
            </div>

            {cbEmpleado && (
              <>
                <div>
                  <SectionTitle>Datos actuales</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <ReadonlyField label="Empresa actual" value={getEmpresaNombre(cbEmpleado.empresa)} />
                    <ReadonlyField label="Depto actual" value={getDepartamentoNombre(cbEmpleado.depto)} />
                    <ReadonlyField label="Puesto actual" value={getPuestoNombre(cbEmpleado.puesto)} />
                    <ReadonlyField label="Sueldo actual" value={formatMXN(cbEmpleado.sueldo_mensual)} />
                  </div>
                </div>

                <div>
                  <SectionTitle>Nueva asignación</SectionTitle>
                  <div className="space-y-3">
                    <div>
                      <Label>Empresa destino *</Label>
                      <select
                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-md"
                        value={cbEmpresaDest}
                        onChange={e => setCbEmpresaDest(Number(e.target.value))}
                      >
                        <option value={0}>Seleccione empresa</option>
                        {empresas.map(e => <option key={e.clave} value={e.clave}>{e.razon_social}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Departamento destino *</Label>
                      <select
                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-md"
                        value={cbDeptoDest}
                        onChange={e => setCbDeptoDest(Number(e.target.value))}
                      >
                        <option value={0}>Seleccione departamento</option>
                        {departamentos.filter(d => d.status === 1).map(d => <option key={d.clave} value={d.clave}>{d.descripcion}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Puesto destino *</Label>
                      <select
                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-md"
                        value={cbPuestoDest}
                        onChange={e => setCbPuestoDest(Number(e.target.value))}
                      >
                        <option value={0}>Seleccione puesto</option>
                        {puestos.map(p => <option key={p.clave} value={p.clave}>{p.descripcion}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Centro de costos</Label>
                      <select
                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-md"
                        value={cbCcostos}
                        onChange={e => setCbCcostos(Number(e.target.value))}
                      >
                        <option value={0}>Seleccione CC</option>
                        {centrosCostos.map(c => <option key={c.clave} value={c.clave}>{c.descripcion}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Sueldo nuevo *</Label>
                      <Input
                        type="number"
                        className="mt-1"
                        value={cbSueldo || ''}
                        onChange={e => setCbSueldo(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Fecha de contrato *</Label>
                      <input
                        type="date"
                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-md"
                        value={cbFechaContrato}
                        onChange={e => setCbFechaContrato(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Mantener antigüedad</Label>
                      <div className="flex gap-4 mt-2">
                        {(['S', 'N'] as const).map(v => (
                          <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="radio"
                              name="mantAntiq"
                              value={v}
                              checked={cbMantAntiq === v}
                              onChange={() => setCbMantAntiq(v)}
                            />
                            {v === 'S' ? 'Sí' : 'No'}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Observaciones</Label>
                      <Textarea className="mt-1" rows={3} value={cbObs} onChange={e => setCbObs(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setOpenConfianza(false)}>Cancelar</Button>
                  <Button onClick={aplicarCambioConfianza}>Aplicar Cambio</Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Sheet: Normalización ── */}
      <Sheet open={openNormalizacion} onOpenChange={setOpenNormalizacion}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Normalización de Datos</SheetTitle>
            <SheetDescription>Corregir valores de catálogos en registros existentes.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <Label>Archivo</Label>
              <select
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-md"
                value={normArchivo}
                onChange={e => setNormArchivo(e.target.value)}
              >
                <option>Datos laborales</option>
                <option>Datos sociales</option>
                <option>Datos confidenciales</option>
              </select>
            </div>
            <div>
              <Label>Campo</Label>
              <Input className="mt-1" placeholder="ej. tipo_contrato" value={normCampo} onChange={e => setNormCampo(e.target.value)} />
            </div>
            <div>
              <Label>Valor capturado</Label>
              <Input className="mt-1" placeholder="Valor tal como está guardado" value={normValorCapturado} onChange={e => setNormValorCapturado(e.target.value)} />
            </div>
            <div>
              <Label>Valor correcto</Label>
              <Input className="mt-1" placeholder="Valor de reemplazo" value={normValorCorrecto} onChange={e => setNormValorCorrecto(e.target.value)} />
            </div>
            {normValorCapturado && (
              <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                Preview: <strong>{normAfectados} registros</strong> serán afectados.
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setOpenNormalizacion(false)}>Cancelar</Button>
              <Button onClick={aplicarNormalizacion}>Aplicar normalización</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Dialog: Pre-nómina configuración ── */}
      <Dialog open={openPrenomina} onOpenChange={setOpenPrenomina}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar Pre-nómina</DialogTitle>
            <DialogDescription>Configure el rango y tipo de empleados para la pre-nómina.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Fecha inicio *</Label>
              <input
                type="date"
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-md"
                value={pnFechaInicio}
                onChange={e => setPnFechaInicio(e.target.value)}
              />
            </div>
            <div>
              <Label>Fecha fin *</Label>
              <input
                type="date"
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-md"
                value={pnFechaFin}
                onChange={e => setPnFechaFin(e.target.value)}
              />
            </div>
            <div>
              <Label>Tipo de pago</Label>
              <select
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-md"
                value={pnTipoPago}
                onChange={e => setPnTipoPago(e.target.value)}
              >
                <option>Todos</option>
                <option>Activos únicamente</option>
                <option>Con bajas en periodo</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPrenomina(false)}>Cancelar</Button>
            <Button onClick={generarPrenomina}>Generar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Pre-nómina resultado ── */}
      <Dialog open={openPrenominaResult} onOpenChange={setOpenPrenominaResult}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pre-nómina generada</DialogTitle>
            <DialogDescription>
              Período {pnFechaInicio} — {pnFechaFin} · {prenominaData.length} registros
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Nómina', 'Nombre', 'Empresa', 'Puesto', 'Sueldo', 'SD', 'Status'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prenominaData.map(r => (
                  <tr key={r.clave} className="border-b border-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">{r.clave}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{r.nombre}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{r.empresa}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{r.puesto}</td>
                    <td className="px-3 py-2 text-gray-700">{formatMXN(r.sueldo)}</td>
                    <td className="px-3 py-2 text-gray-700">{formatMXN(r.sd)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        r.status === 'Activo' ? 'bg-green-100 text-green-700' : r.status === 'Baja' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                      }`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpenPrenominaResult(false)}>Cerrar</Button>
            <Button onClick={() => { showToast('success', 'Descargando prenómina.xlsx...'); setOpenPrenominaResult(false) }}>
              Descargar Excel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: IMSS ── */}
      <Dialog open={openIMSS} onOpenChange={setOpenIMSS}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Envío Cuentas IMSS</DialogTitle>
            <DialogDescription>Altas y bajas del mes actual para reporte IDSE.</DialogDescription>
          </DialogHeader>
          {imssData.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No hay movimientos en el mes actual.</p>
          ) : (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Nómina', 'Nombre', 'IMSS', 'Tipo', 'Fecha', 'SD'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {imssData.map(r => (
                    <tr key={r.clave} className="border-b border-gray-50">
                      <td className="px-3 py-2 font-mono text-xs">{r.clave}</td>
                      <td className="px-3 py-2 font-medium">{r.nombre}</td>
                      <td className="px-3 py-2 text-gray-500 font-mono text-xs">{r.imss}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          r.tipo === 'Alta' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>{r.tipo}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{r.fecha}</td>
                      <td className="px-3 py-2 text-gray-700">{formatMXN(r.sd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpenIMSS(false)}>Cerrar</Button>
            <Button onClick={() => { showToast('success', 'Archivo IDSE generado'); setOpenIMSS(false) }}>
              Generar archivo IMSS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Sheet: Reactivación ── */}
      <Sheet open={openReactivacion} onOpenChange={setOpenReactivacion}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Activación de Empleados</SheetTitle>
            <SheetDescription>Reactivar empleados con status inactivo (st=2).</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {inactivos.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No hay empleados inactivos.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Nómina</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Empresa</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Dpto</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">F.Baja</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inactivos.map(e => (
                      <tr key={e.clave} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-3 py-2 font-mono text-xs text-gray-600">{e.clave}</td>
                        <td className="px-3 py-2 font-medium text-gray-900">{e.nombre_completo}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{getEmpresaNombre(e.empresa)}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{getDepartamentoNombre(e.depto)}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{e.fecha_baja ?? '—'}</td>
                        <td className="px-3 py-2">
                          <Button size="sm" variant="outline" onClick={() => setReactivarId(e.clave)}>
                            Reactivar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Dialog: Confirmar reactivación ── */}
      <Dialog open={reactivarId !== null} onOpenChange={open => !open && setReactivarId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar reactivación</DialogTitle>
            <DialogDescription>
              ¿Confirma que desea reactivar a este empleado? Su status cambiará a Activo (st=1).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReactivarId(null)}>Cancelar</Button>
            <Button onClick={handleReactivar}>Reactivar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
