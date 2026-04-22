"use client"

import { useState, useMemo, useEffect } from 'react'
import { useSCRHStore } from '@/store'
import { getEquipoCompleto } from '@/lib/org-tree'
import { SolicitudReingreso } from '@/types'
import { formatMXN } from '@/lib/calculations'
import {
  RotateCcw, ClipboardList, Clock, ChevronLeft,
  Plus, Eye, CheckCircle, ThumbsUp,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

type MainTab = 'solicitudes' | 'historial'

function ReingresoStatusBadge({ status }: { status: 1 | 2 | 3 }) {
  if (status === 1)
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
        Aprobado
      </span>
    )
  if (status === 2)
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-700">
        Pendiente
      </span>
    )
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
      Procesando
    </span>
  )
}

interface NuevaSolicitudForm {
  clave: string
  empresa: number
  depto: number
  puesto: number
  ccostos: number
  unidad_negocios: number
  mant_antiq: boolean
  tipo_contrato: 'determinado' | 'indeterminado' | ''
  turno: string
  motivo_reingreso: string
  sueldo_mensual: number
  solicito: string
  observaciones: string
  f_reingreso: string
  f_contrato: string
  // GIRON: reclutado/referido
  fue_reclutado: boolean | null
  empresa_reclutadora: string
  reclutador: string
  clave_ref: string
  nombre_ref: string
}

const EMPTY_FORM: NuevaSolicitudForm = {
  clave: '',
  empresa: 0,
  depto: 0,
  puesto: 0,
  ccostos: 0,
  unidad_negocios: 0,
  mant_antiq: false,
  tipo_contrato: '',
  turno: '',
  motivo_reingreso: '',
  sueldo_mensual: 0,
  solicito: '',
  observaciones: '',
  f_reingreso: '',
  f_contrato: '',
  fue_reclutado: null,
  empresa_reclutadora: '',
  reclutador: '',
  clave_ref: '',
  nombre_ref: '',
}

export default function ReingresosPage() {
  const {
    solicitudesReingreso,
    empleados,
    bajas,
    empresas,
    departamentos,
    puestos,
    centrosCostos,
    unidadesNegocio,
    getEmpresaNombre,
    getDepartamentoNombre,
    getPuestoNombre,
    addReingreso,
    aprobarReingreso,
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

  const baseEmpleados = useMemo(() => {
    if (!rolCode || rolCode === 'ADMIN' || rolCode === 'ADP' || rolCode === 'RL') return empleados
    if (userNomina) return getEquipoCompleto(userNomina, empleados)
    return empleados
  }, [empleados, rolCode, userNomina])

  const [mainTab, setMainTab] = useState<MainTab>('solicitudes')
  const [showNuevoSheet, setShowNuevoSheet] = useState(false)
  const [detalleReingreso, setDetalleReingreso] = useState<SolicitudReingreso | null>(null)
  const [form, setForm] = useState<NuevaSolicitudForm>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState(false)

  // Derived employee lookup for form — restricted to user's team for JT/C roles
  const empleadoBuscado = useMemo(
    () => (form.clave.trim() ? baseEmpleados.find(e => e.clave === form.clave.trim()) : null),
    [form.clave, baseEmpleados],
  )
  const ultimaBaja = useMemo(
    () => (empleadoBuscado ? bajas.find(b => b.clave === empleadoBuscado.clave) : null),
    [empleadoBuscado, bajas],
  )
  const prioresReingresos = useMemo(
    () => (empleadoBuscado ? solicitudesReingreso.filter(s => s.clave === empleadoBuscado.clave && s.status === 1).length : 0),
    [empleadoBuscado, solicitudesReingreso],
  )
  const esNoRecontratable = !!(ultimaBaja && ultimaBaja.recontratable === false)

  const total = solicitudesReingreso.length
  const pendientes = useMemo(() => solicitudesReingreso.filter(s => s.status === 2).length, [solicitudesReingreso])

  const aprobados = useMemo(
    () => solicitudesReingreso.filter(s => s.status === 1),
    [solicitudesReingreso],
  )

  const stats = [
    {
      label: 'Total solicitudes',
      value: total,
      icon: ClipboardList,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
    },
    {
      label: 'Pendientes',
      value: pendientes,
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-100',
    },
  ]

  const setField = <K extends keyof NuevaSolicitudForm>(key: K, value: NuevaSolicitudForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  // Auto-fill cuando se encuentra el empleado
  useEffect(() => {
    if (empleadoBuscado) {
      setForm(prev => ({
        ...prev,
        empresa: empleadoBuscado.empresa || prev.empresa,
        depto: empleadoBuscado.depto || prev.depto,
        puesto: empleadoBuscado.puesto || prev.puesto,
        ccostos: (empleadoBuscado as any).ccostos || prev.ccostos,
        unidad_negocios: (empleadoBuscado as any).unidad_negocios || prev.unidad_negocios,
        sueldo_mensual: empleadoBuscado.sueldo_mensual || prev.sueldo_mensual,
        turno: (empleadoBuscado as any).turno || prev.turno,
      }))
    }
  }, [empleadoBuscado])

  const handleGuardar = () => {
    if (!form.clave.trim()) {
      setFormError('Ingrese el número de nómina')
      return
    }
    if (!form.empresa || !form.depto || !form.puesto || !form.ccostos) {
      setFormError('Complete todos los campos requeridos (*)' )
      return
    }
    if (!form.sueldo_mensual || form.sueldo_mensual <= 0) {
      setFormError('Ingrese un sueldo válido')
      return
    }
    if (!form.f_reingreso) {
      setFormError('Ingrese la fecha de reingreso')
      return
    }
    setFormError('')
    addReingreso({
      clave: form.clave.trim(),
      empresa: form.empresa,
      depto: form.depto,
      puesto: form.puesto,
      ccostos: form.ccostos,
      unidad_negocios: form.unidad_negocios,
      mant_antiq: form.mant_antiq,
      tipo_contrato: form.tipo_contrato || undefined,
      turno: form.turno || undefined,
      motivo_reingreso: form.motivo_reingreso || undefined,
      sueldo_mensual: form.sueldo_mensual,
      solicito: form.solicito,
      observaciones: form.observaciones,
      f_reingreso: form.f_reingreso,
      f_contrato: form.f_contrato,
      fue_reclutado: form.fue_reclutado ?? false,
      empresa_reclutadora: form.fue_reclutado ? form.empresa_reclutadora : undefined,
      reclutador: form.fue_reclutado ? form.reclutador : undefined,
      clave_ref: form.clave_ref || undefined,
      nombre_ref: form.nombre_ref || undefined,
      status: 2,
    })
    setFormSuccess(true)
    setTimeout(() => {
      setFormSuccess(false)
      setShowNuevoSheet(false)
      setForm(EMPTY_FORM)
    }, 1800)
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center">
              <RotateCcw className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
              {showNuevoSheet ? 'Nueva Solicitud de Reingreso' : 'Módulo de Reingresos'}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Reingresos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de recontrataciones de personal</p>
        </div>
        {!showNuevoSheet ? (
          <Button onClick={() => setShowNuevoSheet(true)}
            className="flex items-center gap-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700">
            <Plus className="w-3.5 h-3.5" />
            Nueva Solicitud
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => { setShowNuevoSheet(false); setForm(EMPTY_FORM); setFormError('') }}
            className="flex items-center gap-1.5 text-xs">
            <ChevronLeft className="w-3.5 h-3.5" />
            Volver a lista
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 max-w-md">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className={`bg-white rounded-xl border ${stat.border} shadow-sm p-4 flex items-center gap-3`}>
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── FORM INLINE ── */}
      {showNuevoSheet && (
        <div className="space-y-5">
          {formSuccess ? (
            <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-16 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-base font-bold text-gray-800">Solicitud registrada exitosamente</p>
              <p className="text-sm text-gray-500">El reingreso fue creado con status <span className="font-semibold text-yellow-600">Pendiente</span>.</p>
            </div>
          ) : (
            <>
              {/* Sección 1: Empleado */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Identificación del empleado</p>
                    <p className="text-[11px] text-gray-500">Busca por número de nómina para pre-llenar los datos</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-3 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Número de nómina *</Label>
                      <Input className="h-9 text-sm" placeholder="Ej. 1001"
                        value={form.clave} onChange={e => setField('clave', e.target.value)} />
                    </div>
                    {empleadoBuscado && (
                      <div className={`col-span-2 rounded-xl p-4 border ${esNoRecontratable ? 'bg-red-50 border-red-300' : 'bg-indigo-50 border-indigo-200'}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-base">{esNoRecontratable ? '🚫' : '✅'}</span>
                          <p className={`text-xs font-bold ${esNoRecontratable ? 'text-red-700' : 'text-indigo-700'}`}>
                            {esNoRecontratable ? 'Empleado NO recontratable — rescisión de contrato' : 'Empleado encontrado — datos pre-llenados'}
                          </p>
                        </div>
                        <div className="grid grid-cols-4 gap-x-6 gap-y-1.5 text-xs">
                          <span className="text-gray-500">Nombre</span>
                          <span className="font-semibold col-span-3">{empleadoBuscado.nombre_completo}</span>
                          <span className="text-gray-500">RFC</span>
                          <span className="font-mono col-span-3">{empleadoBuscado.rfc}</span>
                          <span className="text-gray-500">Primer ingreso</span>
                          <span className="font-medium col-span-3">{empleadoBuscado.alta ? new Date(empleadoBuscado.alta).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</span>
                          <span className="text-gray-500">Última empresa</span>
                          <span className="font-medium col-span-3">{getEmpresaNombre(empleadoBuscado.empresa)}</span>
                          <span className="text-gray-500">Sueldo anterior</span>
                          <span className="font-medium col-span-3">{formatMXN(empleadoBuscado.sueldo_mensual)}</span>
                          <span className="text-gray-500">Reingresos prev.</span>
                          <span className="font-medium col-span-3">{prioresReingresos > 0 ? `${prioresReingresos} reingreso${prioresReingresos > 1 ? 's' : ''} aprobado${prioresReingresos > 1 ? 's' : ''}` : 'Sin reingresos previos'}</span>
                          <span className="text-gray-500">Status</span>
                          <span className={`font-semibold col-span-3 ${empleadoBuscado.st === 5 ? 'text-red-600' : 'text-green-600'}`}>
                            {empleadoBuscado.st === 5 ? '🔴 Baja' : '🟢 Activo'}
                          </span>
                        </div>
                        {ultimaBaja && (
                          <div className="mt-3 pt-3 border-t border-indigo-200">
                            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Motivo última baja</p>
                            <p className="text-xs text-gray-700 mt-1">{ultimaBaja.causa_detalle || '—'}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {!empleadoBuscado && form.clave && (
                      <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                        <span className="text-lg">🔍</span>
                        <p className="text-xs text-amber-700 font-medium">No se encontró un empleado con esa nómina</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bloqueo: no recontratable */}
              {esNoRecontratable && (
                <div className="bg-red-50 border border-red-300 rounded-xl px-5 py-4 flex items-start gap-3">
                  <span className="text-xl shrink-0">🚫</span>
                  <div>
                    <p className="text-sm font-bold text-red-700">Este empleado causó baja por rescisión y NO es recontratable</p>
                    <p className="text-xs text-red-600 mt-1">No se puede guardar la solicitud. Consulta con Relaciones Laborales si necesitas una excepción.</p>
                  </div>
                </div>
              )}

              {/* Sección 2: Destino */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Destino organizacional</p>
                    <p className="text-[11px] text-gray-500">Empresa, área y puesto al que regresa</p>
                  </div>
                </div>
                <div className="p-6 grid grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Empresa *</Label>
                    <Select value={form.empresa ? String(form.empresa) : ''} onValueChange={(v) => setField('empresa', parseInt(v || '0'))}>
                      <SelectTrigger className="h-9 text-sm w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>{empresas.map(e => <SelectItem key={e.clave} value={String(e.clave)} className="text-sm">{e.razon_social}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Departamento *</Label>
                    <Select value={form.depto ? String(form.depto) : ''} onValueChange={(v) => setField('depto', parseInt(v || '0'))}>
                      <SelectTrigger className="h-9 text-sm w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>{departamentos.map(d => <SelectItem key={d.clave} value={String(d.clave)} className="text-sm">{d.descripcion}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Puesto *</Label>
                    <Select value={form.puesto ? String(form.puesto) : ''} onValueChange={(v) => setField('puesto', parseInt(v || '0'))}>
                      <SelectTrigger className="h-9 text-sm w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>{puestos.map(p => <SelectItem key={p.clave} value={String(p.clave)} className="text-sm">{p.descripcion}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Centro de costos *</Label>
                    <Select value={form.ccostos ? String(form.ccostos) : ''} onValueChange={(v) => setField('ccostos', parseInt(v || '0'))}>
                      <SelectTrigger className="h-9 text-sm w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>{centrosCostos.map(c => <SelectItem key={c.clave} value={String(c.clave)} className="text-sm">{c.descripcion}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Unidad de negocio</Label>
                    <Select value={form.unidad_negocios ? String(form.unidad_negocios) : ''} onValueChange={(v) => setField('unidad_negocios', parseInt(v || '0'))}>
                      <SelectTrigger className="h-9 text-sm w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>{unidadesNegocio.map(u => <SelectItem key={u.clave} value={String(u.clave)} className="text-sm">{u.descripcion}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Turno</Label>
                    <Select value={form.turno} onValueChange={(v) => setField('turno', v || '')}>
                      <SelectTrigger className="h-9 text-sm w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {['Matutino','Vespertino','Nocturno','Mixto','Especial'].map(t => <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Sección 3: Condiciones */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Condiciones de contratación</p>
                    <p className="text-[11px] text-gray-500">Sueldo, contrato y antigüedad</p>
                  </div>
                </div>
                <div className="p-6 grid grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Sueldo mensual bruto *</Label>
                    <Input type="number" className="h-9 text-sm" placeholder="0.00"
                      value={form.sueldo_mensual || ''} onChange={e => setField('sueldo_mensual', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Tipo de contrato</Label>
                    <div className="flex gap-2 h-9">
                      {(['determinado','indeterminado'] as const).map(val => (
                        <button key={val} type="button" onClick={() => setField('tipo_contrato', val)}
                          className={`flex-1 rounded-lg text-xs font-semibold border transition-colors ${
                            form.tipo_contrato === val
                              ? 'bg-teal-600 text-white border-teal-600'
                              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                          }`}>
                          {val === 'determinado' ? 'Determinado' : 'Indeterminado'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Mantener antigüedad</Label>
                    <div className="flex gap-2 h-9">
                      {([true, false] as const).map(val => (
                        <button key={String(val)} type="button" onClick={() => setField('mant_antiq', val)}
                          className={`flex-1 rounded-lg text-xs font-semibold border transition-colors ${
                            form.mant_antiq === val
                              ? val ? 'bg-green-600 text-white border-green-600' : 'bg-gray-600 text-white border-gray-600'
                              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                          }`}>
                          {val ? 'Sí' : 'No'}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400 leading-tight">Los días laborados anteriores se conservan para liquidación y vacaciones</p>
                  </div>
                </div>
              </div>

              {/* Sección 4: Motivo y fechas */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">4</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Motivo, fechas y solicitante</p>
                  </div>
                </div>
                <div className="p-6 grid grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Motivo de reingreso</Label>
                    <Select value={form.motivo_reingreso} onValueChange={(v) => setField('motivo_reingreso', v || '')}>
                      <SelectTrigger className="h-9 text-sm w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {['Solicitud propia','Recontratación por necesidad operativa','Fin de contrato — renovación','Proyecto especial','Transferencia del grupo','Otro']
                          .map(m => <SelectItem key={m} value={m} className="text-sm">{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Fecha de reingreso *</Label>
                    <Input type="date" className="h-9 text-sm"
                      value={form.f_reingreso} onChange={e => setField('f_reingreso', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Fecha de contrato</Label>
                    <Input type="date" className="h-9 text-sm"
                      value={form.f_contrato} onChange={e => setField('f_contrato', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Solicitó</Label>
                    <Input className="h-9 text-sm" placeholder="Nombre del solicitante"
                      value={form.solicito} onChange={e => setField('solicito', e.target.value)} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs font-semibold">Observaciones</Label>
                    <Input className="h-9 text-sm" placeholder="Notas adicionales..."
                      value={form.observaciones} onChange={e => setField('observaciones', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Sección 5: Reclutamiento */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-500 flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">5</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Reclutamiento y referidos</p>
                    <p className="text-[11px] text-gray-500">Opcional — solo si aplica</p>
                  </div>
                </div>
                <div className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">¿Empleado reclutado?</Label>
                    <div className="flex gap-3">
                      {([true, false] as const).map(val => (
                        <button key={String(val)} type="button" onClick={() => setField('fue_reclutado', val)}
                          className={`px-6 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                            form.fue_reclutado === val
                              ? val ? 'bg-teal-600 text-white border-teal-600' : 'bg-gray-600 text-white border-gray-600'
                              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                          }`}>
                          {val ? 'Sí' : 'No'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {form.fue_reclutado === true && (
                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Empresa reclutadora</Label>
                        <Input className="h-9 text-sm" placeholder="Nombre de la empresa..."
                          value={form.empresa_reclutadora} onChange={e => setField('empresa_reclutadora', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Reclutador</Label>
                        <Input className="h-9 text-sm" placeholder="Nombre del reclutador..."
                          value={form.reclutador} onChange={e => setField('reclutador', e.target.value)} />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Referido por <span className="text-gray-400 font-normal">(opcional)</span></Label>
                    <div className="grid grid-cols-2 gap-5">
                      <Input className="h-9 text-sm" placeholder="N° nómina del referente"
                        value={form.clave_ref} onChange={e => setField('clave_ref', e.target.value)} />
                      <Input className="h-9 text-sm" placeholder="Nombre del referente"
                        value={form.nombre_ref} onChange={e => setField('nombre_ref', e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer acciones */}
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-red-600 font-medium">{formError}</p>
                </div>
              )}
              <div className="flex justify-end gap-3 pb-4">
                <Button variant="outline" onClick={() => { setShowNuevoSheet(false); setForm(EMPTY_FORM); setFormError('') }}>
                  Cancelar
                </Button>
                <Button className="bg-teal-600 hover:bg-teal-700 text-white px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleGuardar} disabled={esNoRecontratable}>
                  Guardar Solicitud
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── LISTA ── */}
      {!showNuevoSheet && (
        <>
          {/* Main tabs */}
          <div className="flex items-center gap-2">
            {([
              { key: 'solicitudes' as MainTab, label: 'Solicitudes' },
              { key: 'historial' as MainTab, label: 'Aprobados (Historial)' },
            ] as { key: MainTab; label: string }[]).map(tab => (
              <button key={tab.key} onClick={() => setMainTab(tab.key)}
                className={`px-4 py-2 text-xs font-semibold rounded-full transition-colors ${
                  mainTab === tab.key ? 'bg-teal-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Solicitudes Tab */}
          {mainTab === 'solicitudes' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['#','Nómina','Nombre','Empresa destino','Puesto','Sueldo','F. Reingreso','Status','Acciones'].map(col => (
                        <th key={col} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {solicitudesReingreso.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center">
                          <p className="text-sm text-gray-400">No hay solicitudes de reingreso</p>
                          <button onClick={() => setShowNuevoSheet(true)} className="mt-3 text-xs font-semibold text-teal-600 hover:underline">+ Nueva Solicitud</button>
                        </td>
                      </tr>
                    ) : (
                      solicitudesReingreso.map((sol, idx) => {
                        const emp = empleados.find(e => e.clave === sol.clave)
                        return (
                          <tr key={sol.numero} className="hover:bg-teal-50/30 transition-colors">
                            <td className="px-4 py-3"><span className="text-xs text-gray-400 font-mono">{idx + 1}</span></td>
                            <td className="px-4 py-3"><span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{sol.clave}</span></td>
                            <td className="px-4 py-3"><p className="text-xs font-semibold text-gray-800">{emp?.nombre_completo ?? sol.clave}</p></td>
                            <td className="px-4 py-3"><span className="text-xs text-gray-600">{getEmpresaNombre(sol.empresa)}</span></td>
                            <td className="px-4 py-3"><span className="text-xs text-gray-600">{getPuestoNombre(sol.puesto)}</span></td>
                            <td className="px-4 py-3"><span className="text-xs font-semibold text-gray-800">{formatMXN(sol.sueldo_mensual)}</span></td>
                            <td className="px-4 py-3"><span className="text-xs text-gray-500">{new Date(sol.f_reingreso).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})}</span></td>
                            <td className="px-4 py-3"><ReingresoStatusBadge status={sol.status} /></td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                {sol.status === 2 && (
                                  <Button size="sm" variant="outline"
                                    className="text-green-600 border-green-200 hover:bg-green-50 text-xs h-7 px-2"
                                    onClick={() => aprobarReingreso(sol.numero)}>
                                    <ThumbsUp className="w-3 h-3 mr-1" />Aprobar
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" className="text-xs h-7 px-2"
                                  onClick={() => setDetalleReingreso(sol)}>
                                  <Eye className="w-3 h-3 mr-1" />Ver
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">{solicitudesReingreso.length} solicitudes en total</span>
              </div>
            </div>
          )}

          {/* Historial Tab */}
          {mainTab === 'historial' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-green-50">
                <p className="text-xs font-bold text-green-700">Reingresos aprobados — {aprobados.length} registros</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['#','Nómina','Nombre','Empresa anterior','Empresa nueva','Sueldo anterior','Sueldo nuevo','F. Reingreso'].map(col => (
                        <th key={col} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {aprobados.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">No hay reingresos aprobados</td></tr>
                    ) : (
                      aprobados.map((sol, idx) => {
                        const emp = empleados.find(e => e.clave === sol.clave)
                        const empresaAnteriorNombre = emp ? getEmpresaNombre(emp.empresa) : '—'
                        const sueldoAnterior = emp?.sueldo_mensual ?? 0
                        return (
                          <tr key={sol.numero} className="hover:bg-green-50/30 transition-colors">
                            <td className="px-4 py-3"><span className="text-xs text-gray-400 font-mono">{idx + 1}</span></td>
                            <td className="px-4 py-3"><span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{sol.clave}</span></td>
                            <td className="px-4 py-3"><p className="text-xs font-semibold text-gray-800">{emp?.nombre_completo ?? sol.clave}</p></td>
                            <td className="px-4 py-3"><span className="text-xs text-gray-500 line-through">{empresaAnteriorNombre}</span></td>
                            <td className="px-4 py-3"><span className="flex items-center gap-1 text-xs text-green-700 font-medium"><ChevronRight className="w-3 h-3" />{getEmpresaNombre(sol.empresa)}</span></td>
                            <td className="px-4 py-3"><span className="text-xs text-gray-500 line-through">{formatMXN(sueldoAnterior)}</span></td>
                            <td className="px-4 py-3"><span className="flex items-center gap-1 text-xs text-green-700 font-medium"><ChevronRight className="w-3 h-3" />{formatMXN(sol.sueldo_mensual)}</span></td>
                            <td className="px-4 py-3"><span className="text-xs text-gray-500">{new Date(sol.f_reingreso).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})}</span></td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detalle Sheet */}
      <Sheet open={!!detalleReingreso} onOpenChange={v => { if (!v) setDetalleReingreso(null) }}>
        <SheetContent side="right" className="w-[420px] sm:max-w-[420px] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Detalle de Solicitud</SheetTitle>
            <SheetDescription>Información del reingreso #{detalleReingreso?.numero}</SheetDescription>
          </SheetHeader>
          {detalleReingreso && (() => {
            const emp = empleados.find(e => e.clave === detalleReingreso.clave)
            return (
              <div className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Empleado</p>
                  <div className="grid grid-cols-2 gap-y-1 text-xs">
                    <span className="text-gray-500">Nómina</span><span className="font-medium">{detalleReingreso.clave}</span>
                    <span className="text-gray-500">Nombre</span><span className="font-medium">{emp?.nombre_completo ?? '—'}</span>
                  </div>
                </div>
                <div className="bg-teal-50 border border-teal-100 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-bold text-teal-700 uppercase tracking-wide">Destino</p>
                  <div className="grid grid-cols-2 gap-y-1 text-xs">
                    <span className="text-gray-500">Empresa</span><span className="font-medium">{getEmpresaNombre(detalleReingreso.empresa)}</span>
                    <span className="text-gray-500">Departamento</span><span className="font-medium">{getDepartamentoNombre(detalleReingreso.depto)}</span>
                    <span className="text-gray-500">Puesto</span><span className="font-medium">{getPuestoNombre(detalleReingreso.puesto)}</span>
                    <span className="text-gray-500">Turno</span><span className="font-medium">{detalleReingreso.turno || '—'}</span>
                    <span className="text-gray-500">Sueldo</span><span className="font-medium">{formatMXN(detalleReingreso.sueldo_mensual)}</span>
                    <span className="text-gray-500">Tipo contrato</span><span className="font-medium capitalize">{detalleReingreso.tipo_contrato || '—'}</span>
                    <span className="text-gray-500">Mantiene antigüedad</span><span className="font-medium">{detalleReingreso.mant_antiq ? 'Sí' : 'No'}</span>
                    <span className="text-gray-500">F. Reingreso</span><span className="font-medium">{detalleReingreso.f_reingreso}</span>
                    <span className="text-gray-500">Motivo</span><span className="font-medium">{detalleReingreso.motivo_reingreso || '—'}</span>
                    <span className="text-gray-500">Status</span>
                    <span className="font-medium">{detalleReingreso.status === 1 ? 'Aprobado' : detalleReingreso.status === 2 ? 'Pendiente' : 'Procesando'}</span>
                  </div>
                </div>
                {detalleReingreso.observaciones && (
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Observaciones</p>
                    <p className="text-xs text-gray-600">{detalleReingreso.observaciones}</p>
                  </div>
                )}
              </div>
            )
          })()}
        </SheetContent>
      </Sheet>
    </div>
  )
}
