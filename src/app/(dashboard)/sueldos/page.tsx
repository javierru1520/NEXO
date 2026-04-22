"use client"

import { useState, useMemo } from 'react'
import { useSCRHStore } from '@/store'
import { calcularSalario, formatMXN } from '@/lib/calculations'
import type { Empleado } from '@/types'
import {
  DollarSign, TrendingUp, Users, RefreshCw,
  Search, MoreHorizontal, Calculator, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const BAR_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#3b82f6', '#a855f7', '#ef4444', '#14b8a6', '#f97316']

function getInitials(name: string) {
  const parts = name.trim().split(' ')
  return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase()
}

interface SalaryBreakdown {
  sd: number
  sdi: number
  despensa: number
  asistencia: number
  puntualidad: number
  s_catorcenal: number
  sdo_mensual: number
}

// ── CSP types ──────────────────────────────────────────────────────────────────

type TipoCambio = 'sueldo' | 'puesto'
type TipoIncremento = 'porcentaje' | 'monto' | 'directo'
type CspStatus = 'Pendiente' | 'Autorizado' | 'Rechazado' | 'Aplicado'

interface SolicitudCsp {
  id: number
  clave: string
  nombre: string
  tipo_cambio: TipoCambio[]
  // sueldo
  sueldo_actual: number
  sd_actual: number
  puesto_actual: number
  depto_actual: number
  tipo_incremento?: TipoIncremento
  valor_incremento?: number
  nuevo_sueldo?: number
  nuevo_sd?: number
  // puesto
  nuevo_depto?: number
  nuevo_puesto?: number
  nuevo_ccostos?: number
  // meta
  fecha_efectiva: string
  solicito: string
  fecha_solicitud: string
  observaciones: string
  status: CspStatus
  autorizo?: string
  motivo_rechazo?: string
}

const today = new Date().toISOString().split('T')[0]

function calcNuevoSueldo(
  sueldoActual: number,
  tipo: TipoIncremento,
  valor: number,
): number {
  if (tipo === 'porcentaje') return Math.round(sueldoActual * (1 + valor / 100))
  if (tipo === 'monto') return Math.round(sueldoActual + valor)
  return Math.round(valor) // directo
}

const MOCK_SOLICITUDES_CSP: SolicitudCsp[] = [
  {
    id: 1,
    clave: '1002',
    nombre: 'Martínez Ruiz Ana Sofía',
    tipo_cambio: ['sueldo'],
    sueldo_actual: 14000,
    sd_actual: 459.70,
    puesto_actual: 12,
    depto_actual: 3,
    tipo_incremento: 'porcentaje',
    valor_incremento: 8,
    nuevo_sueldo: 15120,
    nuevo_sd: 496.48,
    fecha_efectiva: '2026-04-01',
    solicito: 'Gerente Capital Humano',
    fecha_solicitud: '2026-03-15',
    observaciones: 'Incremento por buen desempeño en evaluación anual',
    status: 'Pendiente',
  },
  {
    id: 2,
    clave: '1005',
    nombre: 'Ramírez Vega Miguel Ángel',
    tipo_cambio: ['sueldo', 'puesto'],
    sueldo_actual: 18000,
    sd_actual: 591.25,
    puesto_actual: 5,
    depto_actual: 5,
    tipo_incremento: 'monto',
    valor_incremento: 3000,
    nuevo_sueldo: 21000,
    nuevo_sd: 689.35,
    nuevo_depto: 10,
    nuevo_puesto: 10,
    nuevo_ccostos: 8,
    fecha_efectiva: '2026-04-15',
    solicito: 'Director de Tecnología',
    fecha_solicitud: '2026-03-18',
    observaciones: 'Promoción a Director de área',
    status: 'Pendiente',
  },
  {
    id: 3,
    clave: '1008',
    nombre: 'Vargas Cruz Fernando',
    tipo_cambio: ['puesto'],
    sueldo_actual: 15800,
    sd_actual: 519.07,
    puesto_actual: 8,
    depto_actual: 1,
    nuevo_depto: 6,
    nuevo_puesto: 2,
    nuevo_ccostos: 1,
    fecha_efectiva: '2026-04-01',
    solicito: 'Jefe de Operaciones',
    fecha_solicitud: '2026-03-20',
    observaciones: 'Cambio de puesto por reestructura de área',
    status: 'Pendiente',
  },
  {
    id: 4,
    clave: '1015',
    nombre: 'Castañeda Olvera Mariana',
    tipo_cambio: ['sueldo'],
    sueldo_actual: 12000,
    sd_actual: 394.00,
    puesto_actual: 4,
    depto_actual: 2,
    tipo_incremento: 'directo',
    valor_incremento: 13500,
    nuevo_sueldo: 13500,
    nuevo_sd: 443.30,
    fecha_efectiva: '2026-03-01',
    solicito: 'Coordinador Administrativo',
    fecha_solicitud: '2026-02-20',
    observaciones: 'Ajuste salarial por encuesta de mercado',
    status: 'Autorizado',
    autorizo: 'Director General',
  },
]

// ── Main component ─────────────────────────────────────────────────────────────

export default function SueldosPage() {
  const {
    empleados, empresas, departamentos, puestos, centrosCostos,
    updateEmpleado, addHistorial, historialPersonal,
    getPuestoNombre, getDepartamentoNombre, getEmpresaNombre, getCCostosNombre,
  } = useSCRHStore()

  // ── Tab 1 state ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [filterEmpresa, setFilterEmpresa] = useState<number | ''>('')
  const [filterDepto, setFilterDepto] = useState<number | ''>('')

  // Edit dialog
  const [editEmp, setEditEmp] = useState<Empleado | null>(null)
  const [editSueldo, setEditSueldo] = useState('')
  const [editBreakdown, setEditBreakdown] = useState<SalaryBreakdown | null>(null)

  // ── Tab 2 state ───────────────────────────────────────────────────────────
  const [incTipo, setIncTipo] = useState<'pct' | 'monto'>('pct')
  const [incValor, setIncValor] = useState('')
  const [incEmpresas, setIncEmpresas] = useState<number[]>([])
  const [incDeptos, setIncDeptos] = useState<number[]>([])
  const [incPuestos, setIncPuestos] = useState<number[]>([])
  const [incFecha, setIncFecha] = useState('')
  const [incAutorizo, setIncAutorizo] = useState('')
  const [incObs, setIncObs] = useState('')
  const [incPreview, setIncPreview] = useState<{ emp: Empleado; nuevo: number }[] | null>(null)

  // ── Tab 3 — CSP state ─────────────────────────────────────────────────────
  const [cspSubTab, setCspSubTab] = useState<'nueva' | 'pendientes' | 'historial'>('nueva')
  const [solicitudesCsp, setSolicitudesCsp] = useState<SolicitudCsp[]>(MOCK_SOLICITUDES_CSP)

  // Nueva solicitud form
  const [cspNomina, setCspNomina] = useState('')
  const [cspEmpLookup, setCspEmpLookup] = useState<Empleado | null>(null)
  const [cspTipoCambio, setCspTipoCambio] = useState<{ sueldo: boolean; puesto: boolean }>({ sueldo: false, puesto: false })
  const [cspTipoInc, setCspTipoInc] = useState<TipoIncremento>('porcentaje')
  const [cspValorInc, setCspValorInc] = useState('')
  const [cspNuevoDepto, setCspNuevoDepto] = useState('')
  const [cspNuevoPuesto, setCspNuevoPuesto] = useState('')
  const [cspNuevoCcostos, setCspNuevoCcostos] = useState('')
  const [cspFechaEfectiva, setCspFechaEfectiva] = useState('')
  const [cspSolicito, setCspSolicito] = useState('')
  const [cspFechaSolicitud, setCspFechaSolicitud] = useState(today)
  const [cspObs, setCspObs] = useState('')

  // Authorize/reject dialogs
  const [authDialog, setAuthDialog] = useState<SolicitudCsp | null>(null)
  const [authName, setAuthName] = useState('')
  const [rejectDialog, setRejectDialog] = useState<SolicitudCsp | null>(null)
  const [rejectMotivo, setRejectMotivo] = useState('')
  const [detailDialog, setDetailDialog] = useState<SolicitudCsp | null>(null)

  // CSP historial filters
  const [cspHistSearch, setCspHistSearch] = useState('')
  const [cspHistStatus, setCspHistStatus] = useState<CspStatus | ''>('')

  // ── Tab 4 state ───────────────────────────────────────────────────────────
  const [calcSueldo, setCalcSueldo] = useState('')
  const [calcPeriodo, setCalcPeriodo] = useState<'catorcenal' | 'semanal'>('catorcenal')
  const [calcResult, setCalcResult] = useState<SalaryBreakdown | null>(null)

  // ── Derivados ─────────────────────────────────────────────────────────────
  const activos = useMemo(() => empleados.filter(e => e.st === 1), [empleados])

  const nominaTotal = useMemo(
    () => activos.reduce((sum, e) => sum + e.sdo_mensual, 0),
    [activos],
  )
  const promedioSueldo = activos.length
    ? activos.reduce((sum, e) => sum + e.sueldo_mensual, 0) / activos.length
    : 0
  const conSueldoMaximo = activos.filter(e => e.sueldo_mensual > 40000).length

  const filteredEmps = useMemo(() => {
    return activos.filter(e => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        e.nombre_completo.toLowerCase().includes(q) ||
        e.clave.includes(q)
      const matchEmpresa = filterEmpresa === '' || e.empresa === filterEmpresa
      const matchDepto = filterDepto === '' || e.depto === filterDepto
      return matchSearch && matchEmpresa && matchDepto
    })
  }, [activos, search, filterEmpresa, filterDepto])

  // ── Chart data ────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    return departamentos
      .map(d => {
        const emps = activos.filter(e => e.depto === d.clave)
        const avg = emps.length
          ? emps.reduce((s, e) => s + e.sueldo_mensual, 0) / emps.length
          : 0
        return { depto: d.descripcion.slice(0, 8), promedio: Math.round(avg), count: emps.length }
      })
      .filter(d => d.count > 0)
  }, [activos, departamentos])

  // ── Edit handlers ─────────────────────────────────────────────────────────
  function openEdit(emp: Empleado) {
    setEditEmp(emp)
    setEditSueldo(String(emp.sueldo_mensual))
    setEditBreakdown(null)
  }

  function handleCalcular() {
    if (!editEmp) return
    const val = parseFloat(editSueldo)
    if (isNaN(val) || val <= 0) return
    const empresa = empresas.find(e => e.clave === editEmp.empresa)
    const result = calcularSalario(val, empresa?.periodo_pago ?? 'catorcenal')
    setEditBreakdown(result as SalaryBreakdown)
  }

  function handleGuardarSueldo() {
    if (!editEmp || !editBreakdown) return
    const nuevoSueldo = parseFloat(editSueldo)
    updateEmpleado(editEmp.clave, {
      sueldo_mensual: nuevoSueldo,
      sdo_mensual: editBreakdown.sdo_mensual,
      sd: editBreakdown.sd,
      sdi: editBreakdown.sdi,
      despensa: editBreakdown.despensa,
      asistencia: editBreakdown.asistencia,
      puntualidad: editBreakdown.puntualidad,
      s_catorcenal: editBreakdown.s_catorcenal,
    })
    addHistorial({
      clave: editEmp.clave,
      fecha: new Date().toISOString().split('T')[0],
      movimiento: 4,
      sueldo_inicial: editEmp.sueldo_mensual,
      sueldo_final: nuevoSueldo,
      puesto_inicial: editEmp.puesto,
      puesto_final: editEmp.puesto,
      depto_inicial: editEmp.depto,
      depto_final: editEmp.depto,
      observaciones: 'Actualización de sueldo vía módulo Sueldos',
      usuario: 'ADMIN',
    })
    setEditEmp(null)
    setEditBreakdown(null)
  }

  // ── Incremento global ─────────────────────────────────────────────────────
  function getIncrementoTargets() {
    return activos.filter(e => {
      const matchEmp = incEmpresas.length === 0 || incEmpresas.includes(e.empresa)
      const matchDep = incDeptos.length === 0 || incDeptos.includes(e.depto)
      const matchPto = incPuestos.length === 0 || incPuestos.includes(e.puesto)
      return matchEmp && matchDep && matchPto
    })
  }

  function handleCalcularImpacto() {
    const valor = parseFloat(incValor)
    if (isNaN(valor) || valor <= 0) return
    const targets = getIncrementoTargets()
    const preview = targets.map(emp => {
      const nuevo =
        incTipo === 'pct'
          ? Math.round(emp.sueldo_mensual * (1 + valor / 100))
          : Math.round(emp.sueldo_mensual + valor)
      return { emp, nuevo }
    })
    setIncPreview(preview)
  }

  function handleAplicarIncremento() {
    if (!incPreview) return
    const fecha = incFecha || new Date().toISOString().split('T')[0]
    incPreview.forEach(({ emp, nuevo }) => {
      const empresa = empresas.find(e => e.clave === emp.empresa)
      const salary = calcularSalario(nuevo, empresa?.periodo_pago ?? 'catorcenal')
      updateEmpleado(emp.clave, {
        sueldo_mensual: nuevo,
        sdo_mensual: salary.sdo_mensual,
        sd: salary.sd,
        sdi: salary.sdi,
        despensa: salary.despensa,
        asistencia: salary.asistencia,
        puntualidad: salary.puntualidad,
        s_catorcenal: salary.s_catorcenal,
      })
      addHistorial({
        clave: emp.clave,
        fecha,
        movimiento: 4,
        sueldo_inicial: emp.sueldo_mensual,
        sueldo_final: nuevo,
        puesto_inicial: emp.puesto,
        puesto_final: emp.puesto,
        depto_inicial: emp.depto,
        depto_final: emp.depto,
        observaciones: `Incremento global. Autorizó: ${incAutorizo}. ${incObs}`,
        usuario: 'ADMIN',
      })
    })
    setIncPreview(null)
    setIncValor('')
    setIncAutorizo('')
    setIncObs('')
  }

  function toggleArr<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
  }

  // ── Calculadora ───────────────────────────────────────────────────────────
  function handleCalculadora() {
    const val = parseFloat(calcSueldo)
    if (isNaN(val) || val <= 0) return
    const result = calcularSalario(val, calcPeriodo)
    setCalcResult(result as SalaryBreakdown)
  }

  const calcChartData = calcResult
    ? [
        { label: 'Despensa', valor: calcResult.despensa },
        { label: 'Asistencia', valor: calcResult.asistencia },
        { label: 'Puntualidad', valor: calcResult.puntualidad },
        { label: 'Sueldo base', valor: parseFloat(calcSueldo) || 0 },
      ]
    : []

  // ── CSP handlers ──────────────────────────────────────────────────────────

  function handleCspLookup() {
    const emp = empleados.find(e => e.clave === cspNomina.trim() && e.st === 1)
    setCspEmpLookup(emp ?? null)
  }

  const cspNuevoSueldoCalc = useMemo(() => {
    if (!cspEmpLookup || !cspTipoCambio.sueldo) return null
    const val = parseFloat(cspValorInc)
    if (isNaN(val) || val <= 0) return null
    return calcNuevoSueldo(cspEmpLookup.sueldo_mensual, cspTipoInc, val)
  }, [cspEmpLookup, cspTipoCambio.sueldo, cspTipoInc, cspValorInc])

  const cspNuevoSdCalc = useMemo(() => {
    if (!cspNuevoSueldoCalc || !cspEmpLookup) return null
    const empresa = empresas.find(e => e.clave === cspEmpLookup.empresa)
    const sal = calcularSalario(cspNuevoSueldoCalc, empresa?.periodo_pago ?? 'catorcenal')
    return sal.sd
  }, [cspNuevoSueldoCalc, cspEmpLookup, empresas])

  function handleEnviarSolicitud() {
    if (!cspEmpLookup || !cspFechaEfectiva || !cspSolicito) return
    if (!cspTipoCambio.sueldo && !cspTipoCambio.puesto) return

    const tipos: TipoCambio[] = []
    if (cspTipoCambio.sueldo) tipos.push('sueldo')
    if (cspTipoCambio.puesto) tipos.push('puesto')

    const newSol: SolicitudCsp = {
      id: Math.max(0, ...solicitudesCsp.map(s => s.id)) + 1,
      clave: cspEmpLookup.clave,
      nombre: cspEmpLookup.nombre_completo,
      tipo_cambio: tipos,
      sueldo_actual: cspEmpLookup.sueldo_mensual,
      sd_actual: cspEmpLookup.sd,
      puesto_actual: cspEmpLookup.puesto,
      depto_actual: cspEmpLookup.depto,
      ...(cspTipoCambio.sueldo && cspNuevoSueldoCalc != null
        ? {
            tipo_incremento: cspTipoInc,
            valor_incremento: parseFloat(cspValorInc),
            nuevo_sueldo: cspNuevoSueldoCalc,
            nuevo_sd: cspNuevoSdCalc ?? undefined,
          }
        : {}),
      ...(cspTipoCambio.puesto && cspNuevoDepto
        ? {
            nuevo_depto: Number(cspNuevoDepto),
            nuevo_puesto: cspNuevoPuesto ? Number(cspNuevoPuesto) : undefined,
            nuevo_ccostos: cspNuevoCcostos ? Number(cspNuevoCcostos) : undefined,
          }
        : {}),
      fecha_efectiva: cspFechaEfectiva,
      solicito: cspSolicito,
      fecha_solicitud: cspFechaSolicitud || today,
      observaciones: cspObs,
      status: 'Pendiente',
    }
    setSolicitudesCsp(prev => [newSol, ...prev])

    // Reset form
    setCspNomina('')
    setCspEmpLookup(null)
    setCspTipoCambio({ sueldo: false, puesto: false })
    setCspTipoInc('porcentaje')
    setCspValorInc('')
    setCspNuevoDepto('')
    setCspNuevoPuesto('')
    setCspNuevoCcostos('')
    setCspFechaEfectiva('')
    setCspSolicito('')
    setCspFechaSolicitud(today)
    setCspObs('')
    setCspSubTab('pendientes')
  }

  function handleAutorizar() {
    if (!authDialog || !authName.trim()) return
    setSolicitudesCsp(prev =>
      prev.map(s =>
        s.id === authDialog.id
          ? { ...s, status: 'Autorizado', autorizo: authName }
          : s,
      ),
    )
    // Apply to store
    const s = authDialog
    if (s.tipo_cambio.includes('sueldo') && s.nuevo_sueldo) {
      const emp = empleados.find(e => e.clave === s.clave)
      const empresa = empresas.find(e => e.clave === emp?.empresa)
      const salary = calcularSalario(s.nuevo_sueldo, empresa?.periodo_pago ?? 'catorcenal')
      updateEmpleado(s.clave, {
        sueldo_mensual: s.nuevo_sueldo,
        sdo_mensual: salary.sdo_mensual,
        sd: salary.sd,
        sdi: salary.sdi,
        despensa: salary.despensa,
        asistencia: salary.asistencia,
        puntualidad: salary.puntualidad,
        s_catorcenal: salary.s_catorcenal,
      })
      addHistorial({
        clave: s.clave,
        fecha: s.fecha_efectiva,
        movimiento: 4,
        sueldo_inicial: s.sueldo_actual,
        sueldo_final: s.nuevo_sueldo,
        puesto_inicial: s.puesto_actual,
        puesto_final: s.nuevo_puesto ?? s.puesto_actual,
        depto_inicial: s.depto_actual,
        depto_final: s.nuevo_depto ?? s.depto_actual,
        observaciones: `CSP autorizado por ${authName}. ${s.observaciones}`,
        usuario: 'ADMIN',
      })
    }
    if (s.tipo_cambio.includes('puesto') && s.nuevo_puesto) {
      updateEmpleado(s.clave, {
        puesto: s.nuevo_puesto,
        depto: s.nuevo_depto ?? s.depto_actual,
        ccostos: s.nuevo_ccostos ?? undefined,
      })
    }
    setAuthDialog(null)
    setAuthName('')
  }

  function handleRechazar() {
    if (!rejectDialog) return
    setSolicitudesCsp(prev =>
      prev.map(s =>
        s.id === rejectDialog.id
          ? { ...s, status: 'Rechazado', motivo_rechazo: rejectMotivo }
          : s,
      ),
    )
    setRejectDialog(null)
    setRejectMotivo('')
  }

  const pendientesCsp = useMemo(
    () => solicitudesCsp.filter(s => s.status === 'Pendiente'),
    [solicitudesCsp],
  )

  const historialCsp = useMemo(() => {
    let list = solicitudesCsp
    if (cspHistStatus) list = list.filter(s => s.status === cspHistStatus)
    if (cspHistSearch.trim()) {
      const q = cspHistSearch.toLowerCase()
      list = list.filter(
        s => s.nombre.toLowerCase().includes(q) || s.clave.includes(q),
      )
    }
    return list
  }, [solicitudesCsp, cspHistStatus, cspHistSearch])

  function cspStatusBadge(status: CspStatus) {
    const map: Record<CspStatus, string> = {
      Pendiente: 'bg-yellow-100 text-yellow-700',
      Autorizado: 'bg-green-100 text-green-700',
      Rechazado: 'bg-red-100 text-red-600',
      Aplicado: 'bg-blue-100 text-blue-700',
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[status]}`}>
        {status}
      </span>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
            <DollarSign className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Módulo de Sueldos</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Control de Sueldos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Percepciones y compensaciones</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: 'Nómina total mensual',
            value: formatMXN(nominaTotal),
            sub: `${activos.length} empleados activos`,
            color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100',
            icon: DollarSign,
          },
          {
            label: 'Promedio sueldo bruto',
            value: formatMXN(promedioSueldo),
            sub: 'Mensual',
            color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100',
            icon: TrendingUp,
          },
          {
            label: 'Sueldo máximo (>$40k)',
            value: String(conSueldoMaximo),
            sub: 'Empleados sobre $40,000',
            color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100',
            icon: Users,
          },
          {
            label: 'CSP Pendientes',
            value: String(pendientesCsp.length),
            sub: 'Solicitudes por autorizar',
            color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100',
            icon: RefreshCw,
          },
        ].map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className={`bg-white rounded-xl border ${stat.border} shadow-sm p-4 flex items-center gap-3`}>
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-gray-400">{stat.sub}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="percepciones">
        <TabsList className="mb-4">
          <TabsTrigger value="percepciones">Percepciones por Empleado</TabsTrigger>
          <TabsTrigger value="incremento">Incremento Global</TabsTrigger>
          <TabsTrigger value="csp">Solicitudes de Cambio (CSP)</TabsTrigger>
          <TabsTrigger value="calculadora">Calculadora Salarial</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Percepciones ─────────────────────────────────────────── */}
        <TabsContent value="percepciones">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Filters */}
            <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input
                  placeholder="Buscar empleado o nómina..."
                  className="pl-9 h-8 text-xs"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select
                className="h-8 px-3 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white"
                value={filterEmpresa}
                onChange={e => setFilterEmpresa(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">Todas las empresas</option>
                {empresas.map(emp => (
                  <option key={emp.clave} value={emp.clave}>{emp.razon_social}</option>
                ))}
              </select>
              <select
                className="h-8 px-3 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white"
                value={filterDepto}
                onChange={e => setFilterDepto(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">Todos los deptos</option>
                {departamentos.map(d => (
                  <option key={d.clave} value={d.clave}>{d.descripcion}</option>
                ))}
              </select>
              <span className="text-xs text-gray-500">{filteredEmps.length} empleados</span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Nómina', 'Nombre', 'Puesto', 'Empresa', 'Sueldo Bruto', 'SD', 'SDI', 'Despensa', 'Asistencia', 'Puntualidad', 'Total', 'Acciones'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredEmps.map((emp, i) => (
                    <tr key={emp.clave} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2.5 text-xs font-mono text-gray-500">{emp.clave}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                            style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}>
                            {getInitials(emp.nombre_completo)}
                          </div>
                          <span className="text-xs font-medium text-gray-800 whitespace-nowrap">{emp.nombre_completo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{getPuestoNombre(emp.puesto)}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{getEmpresaNombre(emp.empresa)}</td>
                      <td className="px-4 py-2.5 text-xs font-semibold text-gray-800">{formatMXN(emp.sueldo_mensual)}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{formatMXN(emp.sd)}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{formatMXN(emp.sdi)}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{formatMXN(emp.despensa)}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{formatMXN(emp.asistencia)}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{formatMXN(emp.puntualidad)}</td>
                      <td className="px-4 py-2.5 text-xs font-bold text-emerald-700">{formatMXN(emp.sdo_mensual)}</td>
                      <td className="px-4 py-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-7 w-7 p-0 text-gray-500 hover:bg-gray-100 transition-colors outline-none">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(emp)}>
                              Editar sueldo
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(emp)}>
                              Ver cálculo
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                  {filteredEmps.length === 0 && (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-sm text-gray-400">
                        No se encontraron empleados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── Tab 2: Incremento Global ────────────────────────────────────── */}
        <TabsContent value="incremento">
          <div className="grid grid-cols-3 gap-5">
            {/* Form */}
            <div className="col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-bold text-gray-800">Parámetros del incremento</h3>

              {/* Tipo */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Tipo de incremento</label>
                <div className="flex gap-3">
                  {(['pct', 'monto'] as const).map(t => (
                    <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={incTipo === t}
                        onChange={() => setIncTipo(t)}
                        className="accent-indigo-600"
                      />
                      <span className="text-xs text-gray-700">
                        {t === 'pct' ? 'Por porcentaje' : 'Por monto fijo'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Valor */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {incTipo === 'pct' ? 'Porcentaje (%)' : 'Monto fijo ($)'}
                </label>
                <Input
                  type="number"
                  placeholder={incTipo === 'pct' ? 'Ej: 5' : 'Ej: 500'}
                  value={incValor}
                  onChange={e => setIncValor(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              {/* Filtros */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Empresas</label>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {empresas.map(emp => (
                    <label key={emp.clave} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={incEmpresas.includes(emp.clave)}
                        onChange={() => setIncEmpresas(prev => toggleArr(prev, emp.clave))}
                        className="accent-indigo-600"
                      />
                      <span className="text-xs text-gray-700">{emp.razon_social}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Departamentos</label>
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {departamentos.map(d => (
                    <label key={d.clave} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={incDeptos.includes(d.clave)}
                        onChange={() => setIncDeptos(prev => toggleArr(prev, d.clave))}
                        className="accent-indigo-600"
                      />
                      <span className="text-xs text-gray-700">{d.descripcion}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Puestos</label>
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {puestos.map(p => (
                    <label key={p.clave} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={incPuestos.includes(p.clave)}
                        onChange={() => setIncPuestos(prev => toggleArr(prev, p.clave))}
                        className="accent-indigo-600"
                      />
                      <span className="text-xs text-gray-700">{p.descripcion}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha de aplicación</label>
                <Input
                  type="date"
                  value={incFecha}
                  onChange={e => setIncFecha(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Autorizó</label>
                <Input
                  placeholder="Nombre del autorizante"
                  value={incAutorizo}
                  onChange={e => setIncAutorizo(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Observaciones</label>
                <Textarea
                  placeholder="Notas adicionales..."
                  value={incObs}
                  onChange={e => setIncObs(e.target.value)}
                  className="text-xs resize-none"
                  rows={2}
                />
              </div>

              <Button size="sm" className="w-full text-xs" onClick={handleCalcularImpacto}>
                Calcular impacto
              </Button>
            </div>

            {/* Preview */}
            <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-800">Vista previa del incremento</p>
                  <p className="text-xs text-gray-500">
                    {incPreview ? `${incPreview.length} empleados afectados` : 'Calcule el impacto primero'}
                  </p>
                </div>
                {incPreview && incPreview.length > 0 && (
                  <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700" onClick={handleAplicarIncremento}>
                    Aplicar incremento
                  </Button>
                )}
              </div>

              {incPreview && incPreview.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {['Nombre', 'Sueldo actual', 'Nuevo sueldo', 'Diferencia'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {incPreview.map(({ emp, nuevo }) => {
                        const diff = nuevo - emp.sueldo_mensual
                        return (
                          <tr key={emp.clave} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2.5 text-xs text-gray-800">{emp.nombre_completo}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-600">{formatMXN(emp.sueldo_mensual)}</td>
                            <td className="px-4 py-2.5 text-xs font-semibold text-emerald-700">{formatMXN(nuevo)}</td>
                            <td className="px-4 py-2.5 text-xs font-semibold text-indigo-600">+{formatMXN(diff)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-20 text-center text-sm text-gray-400">
                  Configure los parámetros y haga clic en &quot;Calcular impacto&quot;
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Tab 3: CSP ──────────────────────────────────────────────────── */}
        <TabsContent value="csp">
          {/* CSP sub-tabs */}
          <div className="flex items-center gap-2 mb-5">
            {(
              [
                { key: 'nueva' as const, label: 'Nueva Solicitud' },
                { key: 'pendientes' as const, label: `Pendientes de Autorizar${pendientesCsp.length > 0 ? ` (${pendientesCsp.length})` : ''}` },
                { key: 'historial' as const, label: 'Historial' },
              ]
            ).map(sub => (
              <button
                key={sub.key}
                onClick={() => setCspSubTab(sub.key)}
                className={`px-4 py-2 text-xs font-semibold rounded-full transition-colors ${
                  cspSubTab === sub.key
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* CSP Sub-tab 1: Nueva Solicitud */}
          {cspSubTab === 'nueva' && (
            <div className="grid grid-cols-3 gap-5">
              {/* Form */}
              <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
                <h3 className="text-sm font-bold text-gray-800">Nueva Solicitud CSP</h3>

                {/* Nómina lookup */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Número de nómina <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={cspNomina}
                      onChange={e => { setCspNomina(e.target.value); setCspEmpLookup(null) }}
                      placeholder="Ej: 1001"
                      className="h-8 text-xs w-32"
                    />
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleCspLookup}>
                      Buscar
                    </Button>
                    {cspNomina && !cspEmpLookup && (
                      <span className="text-xs text-red-500">Empleado no encontrado o no activo</span>
                    )}
                  </div>
                </div>

                {/* Employee readonly info */}
                {cspEmpLookup && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                    <div className="grid grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-0.5">Nombre</p>
                        <p className="font-semibold text-gray-800">{cspEmpLookup.nombre_completo}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-0.5">Puesto actual</p>
                        <p className="font-medium text-gray-700">{getPuestoNombre(cspEmpLookup.puesto)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-0.5">Dpto actual</p>
                        <p className="font-medium text-gray-700">{getDepartamentoNombre(cspEmpLookup.depto)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-0.5">Sueldo actual</p>
                        <p className="font-bold text-emerald-700">{formatMXN(cspEmpLookup.sueldo_mensual)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-0.5">SD actual</p>
                        <p className="font-medium text-gray-700">{formatMXN(cspEmpLookup.sd)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tipo de cambio checkboxes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Tipo de cambio</label>
                  <div className="flex gap-5">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cspTipoCambio.sueldo}
                        onChange={e => setCspTipoCambio(f => ({ ...f, sueldo: e.target.checked }))}
                        className="accent-emerald-600 w-3.5 h-3.5"
                      />
                      <span className="text-xs text-gray-700">Cambio de sueldo</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cspTipoCambio.puesto}
                        onChange={e => setCspTipoCambio(f => ({ ...f, puesto: e.target.checked }))}
                        className="accent-emerald-600 w-3.5 h-3.5"
                      />
                      <span className="text-xs text-gray-700">Cambio de puesto</span>
                    </label>
                  </div>
                </div>

                {/* Cambio de sueldo fields */}
                {cspTipoCambio.sueldo && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-100">
                    <p className="text-xs font-bold text-gray-700">Cambio de sueldo</p>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de incremento</label>
                      <div className="flex gap-4">
                        {([
                          { v: 'porcentaje' as TipoIncremento, label: 'Porcentaje' },
                          { v: 'monto' as TipoIncremento, label: 'Monto fijo' },
                          { v: 'directo' as TipoIncremento, label: 'Nuevo sueldo directo' },
                        ]).map(opt => (
                          <label key={opt.v} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              checked={cspTipoInc === opt.v}
                              onChange={() => { setCspTipoInc(opt.v); setCspValorInc('') }}
                              className="accent-emerald-600"
                            />
                            <span className="text-xs text-gray-700">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3 items-end">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          {cspTipoInc === 'porcentaje' ? 'Porcentaje (%)' : cspTipoInc === 'monto' ? 'Monto fijo ($)' : 'Nuevo sueldo ($)'}
                        </label>
                        <Input
                          type="number"
                          value={cspValorInc}
                          onChange={e => setCspValorInc(e.target.value)}
                          placeholder="0"
                          className="h-8 text-xs w-36"
                        />
                      </div>
                      {cspNuevoSueldoCalc != null && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs text-gray-500">Nuevo sueldo:</span>
                            <span className="text-xs font-bold text-emerald-700">{formatMXN(cspNuevoSueldoCalc)}</span>
                          </div>
                          {cspNuevoSdCalc != null && (
                            <div className="flex items-center gap-2 pl-5">
                              <span className="text-xs text-gray-500">Nuevo SD:</span>
                              <span className="text-xs font-semibold text-gray-700">{formatMXN(cspNuevoSdCalc)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Cambio de puesto fields */}
                {cspTipoCambio.puesto && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-100">
                    <p className="text-xs font-bold text-gray-700">Cambio de puesto</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Nuevo departamento</label>
                        <select
                          value={cspNuevoDepto}
                          onChange={e => setCspNuevoDepto(e.target.value)}
                          className="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        >
                          <option value="">— Selecciona —</option>
                          {departamentos.map(d => (
                            <option key={d.clave} value={d.clave}>{d.descripcion}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Nuevo puesto</label>
                        <select
                          value={cspNuevoPuesto}
                          onChange={e => setCspNuevoPuesto(e.target.value)}
                          className="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        >
                          <option value="">— Selecciona —</option>
                          {puestos.map(p => (
                            <option key={p.clave} value={p.clave}>{p.descripcion}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Nuevo centro de costos</label>
                        <select
                          value={cspNuevoCcostos}
                          onChange={e => setCspNuevoCcostos(e.target.value)}
                          className="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        >
                          <option value="">— Selecciona —</option>
                          {centrosCostos.map(c => (
                            <option key={c.clave} value={c.clave}>{c.descripcion}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Meta */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Fecha efectiva <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={cspFechaEfectiva}
                      onChange={e => setCspFechaEfectiva(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Solicitó <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={cspSolicito}
                      onChange={e => setCspSolicito(e.target.value)}
                      placeholder="Nombre de quien solicita"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha solicitud</label>
                    <Input
                      type="date"
                      value={cspFechaSolicitud}
                      onChange={e => setCspFechaSolicitud(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Observaciones</label>
                  <Textarea
                    value={cspObs}
                    onChange={e => setCspObs(e.target.value)}
                    placeholder="Motivo del cambio..."
                    rows={2}
                    className="text-xs resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                    disabled={
                      !cspEmpLookup ||
                      !cspFechaEfectiva ||
                      !cspSolicito ||
                      (!cspTipoCambio.sueldo && !cspTipoCambio.puesto)
                    }
                    onClick={handleEnviarSolicitud}
                  >
                    Enviar Solicitud
                  </Button>
                </div>
              </div>

              {/* Help panel */}
              <div className="col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">¿Cómo funciona?</h3>
                <div className="space-y-3 text-xs text-gray-600">
                  <div className="flex gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">1</span>
                    <p>Ingresa el número de nómina y haz clic en <strong>Buscar</strong> para cargar los datos actuales del empleado.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">2</span>
                    <p>Selecciona uno o ambos tipos de cambio: sueldo y/o puesto.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">3</span>
                    <p>La solicitud queda en status <strong>Pendiente</strong> hasta que sea autorizada en la pestaña correspondiente.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">4</span>
                    <p>Al autorizar, los cambios se aplican automáticamente al expediente del empleado.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CSP Sub-tab 2: Pendientes de Autorizar */}
          {cspSubTab === 'pendientes' && (
            <div className="space-y-3">
              {pendientesCsp.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center text-sm text-gray-400">
                  No hay solicitudes pendientes de autorización
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <p className="text-sm font-bold text-gray-800">{pendientesCsp.length} solicitudes pendientes</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          {['#', 'Nómina', 'Nombre', 'Tipo cambio', 'Sueldo actual → Nuevo', 'Puesto actual → Nuevo', 'F. Efectiva', 'Solicitó', 'F. Solicitud', 'Acciones'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {pendientesCsp.map((s, i) => (
                          <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{s.clave}</span>
                            </td>
                            <td className="px-4 py-3 text-xs font-medium text-gray-800 whitespace-nowrap">{s.nombre}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1 flex-wrap">
                                {s.tipo_cambio.includes('sueldo') && (
                                  <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700 font-medium">Sueldo</span>
                                )}
                                {s.tipo_cambio.includes('puesto') && (
                                  <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-700 font-medium">Puesto</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                              {s.tipo_cambio.includes('sueldo') && s.nuevo_sueldo
                                ? <span>{formatMXN(s.sueldo_actual)} <span className="text-emerald-600 font-semibold">→ {formatMXN(s.nuevo_sueldo)}</span></span>
                                : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                              {s.tipo_cambio.includes('puesto')
                                ? <span>{getPuestoNombre(s.puesto_actual)} <span className="text-indigo-600 font-semibold">→ {s.nuevo_puesto ? getPuestoNombre(s.nuevo_puesto) : '—'}</span></span>
                                : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">{s.fecha_efectiva}</td>
                            <td className="px-4 py-3 text-xs text-gray-600">{s.solicito}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">{s.fecha_solicitud}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => { setAuthDialog(s); setAuthName('') }}
                                  className="text-[10px] font-semibold text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded transition-colors"
                                >
                                  Autorizar
                                </button>
                                <button
                                  onClick={() => { setRejectDialog(s); setRejectMotivo('') }}
                                  className="text-[10px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors"
                                >
                                  Rechazar
                                </button>
                                <button
                                  onClick={() => setDetailDialog(s)}
                                  className="text-[10px] text-indigo-600 hover:underline ml-1"
                                >
                                  Ver detalle
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CSP Sub-tab 3: Historial */}
          {cspSubTab === 'historial' && (
            <div className="space-y-3">
              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    value={cspHistSearch}
                    onChange={e => setCspHistSearch(e.target.value)}
                    placeholder="Buscar por nómina o nombre..."
                    className="pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 w-56 bg-white"
                  />
                </div>
                <select
                  value={cspHistStatus}
                  onChange={e => setCspHistStatus(e.target.value as CspStatus | '')}
                  className="h-8 px-3 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="">Todos los status</option>
                  {(['Pendiente', 'Autorizado', 'Rechazado', 'Aplicado'] as CspStatus[]).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <span className="text-xs text-gray-500">{historialCsp.length} registros</span>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {['#', 'Nómina', 'Nombre', 'Tipo cambio', 'Sueldo actual → Nuevo', 'Puesto actual → Nuevo', 'F. Efectiva', 'Solicitó', 'F. Solicitud', 'Status', 'Acciones'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {historialCsp.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-12 text-center text-sm text-gray-400">
                            No hay registros
                          </td>
                        </tr>
                      ) : (
                        historialCsp.map((s, i) => (
                          <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{s.clave}</span>
                            </td>
                            <td className="px-4 py-3 text-xs font-medium text-gray-800 whitespace-nowrap">{s.nombre}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1 flex-wrap">
                                {s.tipo_cambio.includes('sueldo') && (
                                  <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700 font-medium">Sueldo</span>
                                )}
                                {s.tipo_cambio.includes('puesto') && (
                                  <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-700 font-medium">Puesto</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                              {s.tipo_cambio.includes('sueldo') && s.nuevo_sueldo
                                ? <span>{formatMXN(s.sueldo_actual)} → <span className="font-semibold text-emerald-700">{formatMXN(s.nuevo_sueldo)}</span></span>
                                : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                              {s.tipo_cambio.includes('puesto')
                                ? <span>{getPuestoNombre(s.puesto_actual)} → <span className="font-semibold text-indigo-700">{s.nuevo_puesto ? getPuestoNombre(s.nuevo_puesto) : '—'}</span></span>
                                : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">{s.fecha_efectiva}</td>
                            <td className="px-4 py-3 text-xs text-gray-600">{s.solicito}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">{s.fecha_solicitud}</td>
                            <td className="px-4 py-3">{cspStatusBadge(s.status)}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setDetailDialog(s)}
                                className="text-[10px] text-indigo-600 hover:underline"
                              >
                                Ver detalle
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Authorize dialog */}
          <Dialog open={!!authDialog} onOpenChange={open => { if (!open) { setAuthDialog(null); setAuthName('') } }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Autorizar solicitud CSP</DialogTitle>
              </DialogHeader>
              {authDialog && (
                <div className="space-y-3 py-1 text-xs">
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Empleado</span>
                      <span className="font-medium">{authDialog.nombre}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tipo cambio</span>
                      <span className="font-medium">{authDialog.tipo_cambio.join(' + ')}</span>
                    </div>
                    {authDialog.tipo_cambio.includes('sueldo') && authDialog.nuevo_sueldo && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Sueldo</span>
                        <span>{formatMXN(authDialog.sueldo_actual)} → <span className="text-emerald-700 font-bold">{formatMXN(authDialog.nuevo_sueldo)}</span></span>
                      </div>
                    )}
                    {authDialog.tipo_cambio.includes('puesto') && authDialog.nuevo_puesto && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Puesto</span>
                        <span>{getPuestoNombre(authDialog.puesto_actual)} → <span className="text-indigo-700 font-bold">{getPuestoNombre(authDialog.nuevo_puesto)}</span></span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">F. Efectiva</span>
                      <span className="font-medium">{authDialog.fecha_efectiva}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Autorizó <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={authName}
                      onChange={e => setAuthName(e.target.value)}
                      placeholder="Nombre del autorizante"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <DialogClose render={<Button variant="outline" size="sm" />}>Cancelar</DialogClose>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!authName.trim()}
                  onClick={handleAutorizar}
                >
                  Confirmar autorización
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Reject dialog */}
          <Dialog open={!!rejectDialog} onOpenChange={open => { if (!open) { setRejectDialog(null); setRejectMotivo('') } }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Rechazar solicitud CSP</DialogTitle>
              </DialogHeader>
              {rejectDialog && (
                <div className="space-y-3 py-1 text-xs">
                  <p className="text-gray-600">
                    ¿Seguro que deseas rechazar la solicitud de <strong>{rejectDialog.nombre}</strong>?
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Motivo de rechazo</label>
                    <Textarea
                      value={rejectMotivo}
                      onChange={e => setRejectMotivo(e.target.value)}
                      placeholder="Describe el motivo..."
                      rows={3}
                      className="text-xs resize-none"
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <DialogClose render={<Button variant="outline" size="sm" />}>Cancelar</DialogClose>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={handleRechazar}
                >
                  Confirmar rechazo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Detail dialog */}
          <Dialog open={!!detailDialog} onOpenChange={open => { if (!open) setDetailDialog(null) }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Detalle de solicitud CSP</DialogTitle>
              </DialogHeader>
              {detailDialog && (
                <div className="space-y-3 py-1 text-xs">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {[
                      ['Nómina', detailDialog.clave],
                      ['Empleado', detailDialog.nombre],
                      ['Tipo cambio', detailDialog.tipo_cambio.join(' + ')],
                      ['Status', detailDialog.status],
                      ['Solicitó', detailDialog.solicito],
                      ['F. Solicitud', detailDialog.fecha_solicitud],
                      ['F. Efectiva', detailDialog.fecha_efectiva],
                      ['Autorizó', detailDialog.autorizo ?? '—'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{k}</span>
                        <span className="font-medium text-gray-800">{v}</span>
                      </div>
                    ))}
                  </div>
                  {detailDialog.tipo_cambio.includes('sueldo') && (
                    <div className="bg-emerald-50 rounded-lg p-3 space-y-1">
                      <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Cambio de sueldo</p>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Sueldo actual</span>
                        <span>{formatMXN(detailDialog.sueldo_actual)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Nuevo sueldo</span>
                        <span className="font-bold text-emerald-700">{detailDialog.nuevo_sueldo ? formatMXN(detailDialog.nuevo_sueldo) : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tipo incremento</span>
                        <span>{detailDialog.tipo_incremento ?? '—'}</span>
                      </div>
                    </div>
                  )}
                  {detailDialog.tipo_cambio.includes('puesto') && (
                    <div className="bg-indigo-50 rounded-lg p-3 space-y-1">
                      <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide">Cambio de puesto</p>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Puesto actual</span>
                        <span>{getPuestoNombre(detailDialog.puesto_actual)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Nuevo puesto</span>
                        <span className="font-bold text-indigo-700">{detailDialog.nuevo_puesto ? getPuestoNombre(detailDialog.nuevo_puesto) : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Nuevo depto</span>
                        <span>{detailDialog.nuevo_depto ? getDepartamentoNombre(detailDialog.nuevo_depto) : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Nuevo CC</span>
                        <span>{detailDialog.nuevo_ccostos ? getCCostosNombre(detailDialog.nuevo_ccostos) : '—'}</span>
                      </div>
                    </div>
                  )}
                  {detailDialog.observaciones && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Observaciones</p>
                      <p className="text-gray-700 leading-relaxed">{detailDialog.observaciones}</p>
                    </div>
                  )}
                  {detailDialog.motivo_rechazo && (
                    <div className="bg-red-50 rounded-lg p-3">
                      <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide mb-1">Motivo de rechazo</p>
                      <p className="text-gray-700">{detailDialog.motivo_rechazo}</p>
                    </div>
                  )}
                </div>
              )}
              <DialogFooter>
                <DialogClose render={<Button variant="outline" size="sm" />}>Cerrar</DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── Tab 4: Calculadora ──────────────────────────────────────────── */}
        <TabsContent value="calculadora">
          <div className="grid grid-cols-2 gap-5">
            {/* Input */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-600" />
                Calculadora Salarial
              </h3>
              <p className="text-xs text-gray-500">Calcula todos los componentes de nómina sin necesidad de un empleado registrado.</p>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Sueldo bruto mensual ($)</label>
                <Input
                  type="number"
                  placeholder="Ej: 15000"
                  value={calcSueldo}
                  onChange={e => setCalcSueldo(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Periodo de pago</label>
                <select
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white"
                  value={calcPeriodo}
                  onChange={e => setCalcPeriodo(e.target.value as 'catorcenal' | 'semanal')}
                >
                  <option value="catorcenal">Catorcenal</option>
                  <option value="semanal">Semanal</option>
                </select>
              </div>
              <Button className="w-full" onClick={handleCalculadora}>
                Calcular
              </Button>

              {calcResult && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 mt-2">
                  {[
                    { label: 'Salario Diario (SD)', value: formatMXN(calcResult.sd) },
                    { label: 'SDI (con integración)', value: formatMXN(calcResult.sdi) },
                    { label: 'Despensa', value: formatMXN(calcResult.despensa) },
                    { label: 'Asistencia', value: formatMXN(calcResult.asistencia) },
                    { label: 'Puntualidad', value: formatMXN(calcResult.puntualidad) },
                    { label: calcPeriodo === 'catorcenal' ? 'Sueldo catorcenal' : 'Sueldo semanal', value: formatMXN(calcResult.s_catorcenal) },
                    { label: 'Total percepciones', value: formatMXN(calcResult.sdo_mensual), bold: true },
                    { label: 'Costo empresa est. (+36% IMSS)', value: formatMXN(calcResult.sdo_mensual * 1.36), bold: true },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className={`text-xs ${row.bold ? 'font-bold text-gray-800' : 'text-gray-600'}`}>{row.label}</span>
                      <span className={`text-xs font-semibold ${row.bold ? 'text-emerald-700' : 'text-gray-700'}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-1">Distribución de percepciones</h3>
              <p className="text-xs text-gray-500 mb-4">Desglose visual por componente</p>
              {calcResult ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={calcChartData} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <YAxis
                      tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 10, fill: '#6b7280' }}
                    />
                    <Tooltip
                      formatter={(value) => [formatMXN(Number(value)), 'Monto']}
                      contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e5e7eb' }}
                    />
                    <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                      {calcChartData.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                  Ingrese un sueldo y haga clic en Calcular
                </div>
              )}

              {/* Also show dept chart when no calc */}
              {!calcResult && (
                <>
                  <h3 className="text-sm font-bold text-gray-800 mb-1">Promedio salarial por departamento</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="depto" tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <YAxis
                        tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 10, fill: '#6b7280' }}
                      />
                      <Tooltip
                        formatter={(value) => [formatMXN(Number(value)), 'Promedio']}
                        contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e5e7eb' }}
                      />
                      <Bar dataKey="promedio" radius={[4, 4, 0, 0]}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Edit Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={!!editEmp} onOpenChange={open => { if (!open) { setEditEmp(null); setEditBreakdown(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Sueldo</DialogTitle>
          </DialogHeader>
          {editEmp && (
            <div className="space-y-4 py-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Empleado</label>
                <p className="text-sm font-medium text-gray-800">{editEmp.nombre_completo} — Nómina {editEmp.clave}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Sueldo mensual bruto ($)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={editSueldo}
                    onChange={e => { setEditSueldo(e.target.value); setEditBreakdown(null) }}
                    className="h-9"
                  />
                  <Button size="sm" variant="outline" onClick={handleCalcular} className="shrink-0">
                    Calcular
                  </Button>
                </div>
              </div>

              {editBreakdown && (
                <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Concepto</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-600">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[
                        ['SD', formatMXN(editBreakdown.sd)],
                        ['SDI', formatMXN(editBreakdown.sdi)],
                        ['Despensa', formatMXN(editBreakdown.despensa)],
                        ['Asistencia', formatMXN(editBreakdown.asistencia)],
                        ['Puntualidad', formatMXN(editBreakdown.puntualidad)],
                        ['S. Catorcenal', formatMXN(editBreakdown.s_catorcenal)],
                        ['Total percepciones', formatMXN(editBreakdown.sdo_mensual)],
                      ].map(([k, v]) => (
                        <tr key={k}>
                          <td className="px-3 py-1.5 text-gray-600">{k}</td>
                          <td className={`px-3 py-1.5 text-right font-semibold ${k === 'Total percepciones' ? 'text-emerald-700' : 'text-gray-700'}`}>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" />}>Cancelar</DialogClose>
            <Button
              size="sm"
              disabled={!editBreakdown}
              onClick={handleGuardarSueldo}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
