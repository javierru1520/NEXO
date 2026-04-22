"use client"

import { useState, useMemo, useRef } from 'react'
import { useSCRHStore } from '@/store'
import { AltaProvisional } from '@/types'
import { formatMXN, calcularSalario } from '@/lib/calculations'
import { mensajeRFC } from '@/lib/validations'
import { PUESTO_ASIGNACION } from '@/lib/mock-data'
import {
  UserPlus, ClipboardList, CheckCircle, Clock, Plus, MoreHorizontal,
  Eye, Edit, ChevronLeft, FileText, Stethoscope, FileCheck,
  Receipt, Brain, Camera, AlertTriangle, Info, Check, X,
  Building2, User, Briefcase, DollarSign, Home, Star,
  Car, Shield, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'

// ─── TYPES ────────────────────────────────────────────────────────────────────

type FilterTab = 'todas' | 'pendientes' | 'aprobadas' | 'procesando'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function calcStepCompletion(alta: AltaProvisional, puestoNombre: string) {
  const isOperador = puestoNombre.toLowerCase().includes('operador')
  return {
    step1: !!(alta.rfc && alta.rfc.length >= 12 && alta.f_nacimiento),
    step2: !!(alta.altura && alta.peso),
    step3: !!(alta.empresa && alta.depto && alta.puesto && alta.tipo_empleado),
    step4: !!(alta.sueldo_mensual > 0),
    step5: !!(alta.tipo_vivienda && alta.nivel_estudios_alta),
    step6: alta.fue_recomendado !== undefined,
    step7: isOperador
      ? !!(alta.tiene_licencia && alta.num_licencia)
      : true,
    step8: !!(
      alta.doc_apto_medico === 'cargado' &&
      alta.doc_socioeconomico === 'cargado' &&
      alta.doc_carta_oferta === 'cargado' &&
      alta.doc_csf === 'cargado' &&
      alta.doc_psicometrico === 'cargado' &&
      alta.doc_foto === 'cargado'
    ),
  }
}

function countCompletedSteps(alta: AltaProvisional, puestoNombre: string): number {
  const c = calcStepCompletion(alta, puestoNombre)
  return [c.step1, c.step2, c.step3, c.step4, c.step5, c.step6, c.step7, c.step8].filter(Boolean).length
}

function allStepsComplete(alta: AltaProvisional, puestoNombre: string): boolean {
  return countCompletedSteps(alta, puestoNombre) === 8
}

function countDocsUploaded(alta: AltaProvisional): number {
  return [
    alta.doc_apto_medico === 'cargado',
    alta.doc_socioeconomico === 'cargado',
    alta.doc_carta_oferta === 'cargado',
    alta.doc_csf === 'cargado',
    alta.doc_psicometrico === 'cargado',
    alta.doc_foto === 'cargado',
  ].filter(Boolean).length
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

function AltaStatusBadge({ status }: { status: 1 | 2 | 3 }) {
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

function TipoEmpleadoBadge({ tipo }: { tipo?: 'Sindicalizado' | 'Confianza' }) {
  if (!tipo) return <span className="text-xs text-gray-400">—</span>
  if (tipo === 'Sindicalizado')
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700">
        Sindicalizado
      </span>
    )
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
      Confianza
    </span>
  )
}

// ─── TOAST ───────────────────────────────────────────────────────────────────

function SavedToast({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-green-600 text-white px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-in slide-in-from-bottom-2">
      <Check className="w-4 h-4" />
      Datos guardados correctamente
    </div>
  )
}

// ─── NUEVA ALTA FORM ──────────────────────────────────────────────────────────

function FW({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function SecLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-1 pb-0.5 border-b border-gray-100">
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{children}</span>
    </div>
  )
}

function NuevaAltaForm({ onClose }: { onClose: () => void }) {
  const { addAltaProvisional, empresas, departamentos, puestos, centrosCostos, unidadesNegocio } = useSCRHStore()

  const [form, setForm] = useState({
    a_paterno: '', a_materno: '', nombre: '',
    rfc: '', curp: '', imss: '',
    f_nacimiento: '', sexo: 'M' as 'M' | 'F',
    empresa: 0, depto: 0, puesto: 0, ccostos: 0, unidad_negocios: 0,
    grado_salarial: '', tipo_costo: '', nivel_puesto: '',
    tipo_empleado: '' as 'Sindicalizado' | 'Confianza' | '',
    jefe_inmed: '',
    fecha_ingreso: '', fecha_contrato: '',
    sueldo_mensual: '', solicito: '', autorizo: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [rfcError, setRfcError] = useState('')

  const f = (key: keyof typeof form, val: string | number) => {
    setForm(p => ({ ...p, [key]: val }))
    setErrors(p => { const n = { ...p }; delete n[key as string]; return n })
  }

  const handleRfcBlur = () => {
    const rfc = form.rfc.toUpperCase().trim()
    const msg = mensajeRFC(rfc)
    setRfcError(msg ?? '')
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.a_paterno.trim())  e.a_paterno = 'Requerido'
    if (!form.nombre.trim())     e.nombre = 'Requerido'
    const rfcMsg = mensajeRFC(form.rfc.toUpperCase().trim())
    if (!form.rfc.trim())        e.rfc = 'Requerido'
    else if (rfcMsg)             e.rfc = rfcMsg
    if (form.imss && !/^[0-9]{11}$/.test(form.imss)) e.imss = 'Debe tener 11 dígitos'
    if (!form.f_nacimiento)      e.f_nacimiento = 'Requerida'
    else if (new Date(form.f_nacimiento) > new Date()) e.f_nacimiento = 'No puede ser futura'
    if (!form.empresa)           e.empresa = 'Requerido'
    if (!form.depto)             e.depto = 'Requerido'
    if (!form.puesto)            e.puesto = 'Requerido'
    if (!form.ccostos)           e.ccostos = 'Requerido'
    if (!form.tipo_empleado)     e.tipo_empleado = 'Requerido'
    if (!form.fecha_ingreso)     e.fecha_ingreso = 'Requerida'
    if (!form.sueldo_mensual || isNaN(Number(form.sueldo_mensual)) || Number(form.sueldo_mensual) < 100)
      e.sueldo_mensual = 'Monto inválido (mín. $100)'
    if (!form.solicito.trim())   e.solicito = 'Requerido'
    return e
  }

  const handleSave = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    const nombre_completo = [form.a_paterno, form.a_materno, form.nombre].filter(Boolean).join(' ')
    const err = addAltaProvisional({
      clave:           '',
      nombre_completo,
      a_paterno:       form.a_paterno,
      a_materno:       form.a_materno,
      nombre:          form.nombre,
      rfc:             form.rfc.toUpperCase().trim(),
      curp:            form.curp.toUpperCase().trim(),
      imss:            form.imss,
      f_nacimiento:    form.f_nacimiento,
      sexo:            form.sexo,
      empresa:         Number(form.empresa),
      depto:           Number(form.depto),
      puesto:          Number(form.puesto),
      ccostos:         Number(form.ccostos),
      unidad_negocios: Number(form.unidad_negocios) || 0,
      grado_salarial:  form.grado_salarial || undefined,
      tipo_costo:      form.tipo_costo || undefined,
      nivel_puesto:    form.nivel_puesto || undefined,
      jefe_inmediato:  form.jefe_inmed,
      tipo_empleado:   form.tipo_empleado as 'Sindicalizado' | 'Confianza',
      tipo_contrato:   'Indefinido',
      sueldo_mensual:  Number(form.sueldo_mensual),
      ayuda_mensual:   0,
      fecha_ingreso:   form.fecha_ingreso,
      fecha_contrato:  form.fecha_contrato || form.fecha_ingreso,
      solicito:        form.solicito,
      autorizo:        form.autorizo,
      observaciones:   '',
      status:          2,
      paso_actual:     1,
    })
    if (err) { setErrors({ rfc: err }); return }
    onClose()
  }

  const nombrePreview = [form.a_paterno, form.a_materno, form.nombre].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6 space-y-6">

        <SecLabel>Identificación</SecLabel>
        <div className="grid grid-cols-3 gap-4">
          <FW label="Apellido paterno *" error={errors.a_paterno}>
            <Input className="h-9" value={form.a_paterno} onChange={e => f('a_paterno', e.target.value)} />
          </FW>
          <FW label="Apellido materno">
            <Input className="h-9" value={form.a_materno} onChange={e => f('a_materno', e.target.value)} />
          </FW>
          <FW label="Nombre(s) *" error={errors.nombre}>
            <Input className="h-9" value={form.nombre} onChange={e => f('nombre', e.target.value)} />
          </FW>
        </div>

        {nombrePreview && (
          <FW label="Nombre completo (auto)">
            <Input className="h-9 bg-gray-50 text-gray-500" value={nombrePreview} readOnly />
          </FW>
        )}

        <div className="grid grid-cols-4 gap-4">
          <FW label="RFC *" error={errors.rfc || rfcError}>
            <Input
              className="h-9 uppercase"
              maxLength={14}
              placeholder="GOAM850101ABC"
              value={form.rfc}
              onChange={e => { f('rfc', e.target.value.toUpperCase()); setRfcError('') }}
              onBlur={handleRfcBlur}
            />
          </FW>
          <FW label="CURP">
            <Input className="h-9 uppercase" maxLength={18} value={form.curp} onChange={e => f('curp', e.target.value.toUpperCase())} />
          </FW>
          <FW label="NSS / IMSS" error={errors.imss}>
            <Input className="h-9 font-mono" maxLength={11} placeholder="00000000000" value={form.imss} onChange={e => f('imss', e.target.value)} />
          </FW>
          <FW label="Fecha de nacimiento *" error={errors.f_nacimiento}>
            <Input type="date" className="h-9" value={form.f_nacimiento} onChange={e => f('f_nacimiento', e.target.value)} />
          </FW>
        </div>

        <FW label="Sexo *">
          <div className="flex gap-3 pt-1">
            {(['M', 'F'] as const).map(s => (
              <button key={s} type="button" onClick={() => f('sexo', s)}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg border text-sm font-medium transition-all ${
                  form.sexo === s ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                {s === 'M' ? 'Masculino' : 'Femenino'}
              </button>
            ))}
          </div>
        </FW>

        <SecLabel>Asignación organizacional</SecLabel>
        <div className="grid grid-cols-3 gap-4">
          <FW label="Empresa *" error={errors.empresa}>
            <Select onValueChange={(v: string | null) => { if (v) f('empresa', parseInt(v)) }}>
              <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>{empresas.map(e => <SelectItem key={e.clave} value={String(e.clave)}>{e.razon_social}</SelectItem>)}</SelectContent>
            </Select>
          </FW>
          <FW label="Puesto *" error={errors.puesto}>
            <Select
              value={form.puesto ? String(form.puesto) : null}
              itemToStringLabel={(v) => puestos.find(p => String(p.clave) === v)?.descripcion ?? String(v)}
              onValueChange={(v: string | null) => {
                if (!v) return
                const puestoId = parseInt(v)
                f('puesto', puestoId)
                const asign = PUESTO_ASIGNACION[puestoId]
                if (asign) {
                  f('depto', asign.depto)
                  f('ccostos', asign.ccostos)
                  f('unidad_negocios', asign.unidad)
                  f('grado_salarial', asign.grado)
                  f('tipo_costo', asign.tipoCosto)
                  f('nivel_puesto', asign.nivel)
                }
              }}
            >
              <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Seleccionar puesto..." /></SelectTrigger>
              <SelectContent>{puestos.map(p => <SelectItem key={p.clave} value={String(p.clave)}>{p.descripcion}</SelectItem>)}</SelectContent>
            </Select>
          </FW>
          <FW label="Departamento *" error={errors.depto}>
            <div className={`h-9 w-full flex items-center px-3 rounded-lg border text-sm ${form.depto ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-medium' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
              {form.depto ? departamentos.find(d => d.clave === form.depto)?.descripcion : 'Se llena automáticamente'}
            </div>
          </FW>
          <FW label="Centro de costos *" error={errors.ccostos}>
            <div className={`h-9 w-full flex items-center px-3 rounded-lg border text-sm ${form.ccostos ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-medium' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
              {form.ccostos ? centrosCostos.find(c => c.clave === form.ccostos)?.descripcion : 'Se llena automáticamente'}
            </div>
          </FW>
          <FW label="Área funcional (Talentrax)">
            <div className={`h-9 w-full flex items-center px-3 rounded-lg border text-sm ${form.unidad_negocios ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-medium' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
              {form.unidad_negocios ? unidadesNegocio.find(u => u.clave === form.unidad_negocios)?.descripcion : 'Se llena automáticamente'}
            </div>
          </FW>
          <FW label="Grado salarial">
            <div className={`h-9 w-full flex items-center px-3 rounded-lg border text-sm ${form.grado_salarial ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-medium' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
              {form.grado_salarial || 'Se llena automáticamente'}
            </div>
          </FW>
          <FW label="Tipo de costo">
            <div className={`h-9 w-full flex items-center px-3 rounded-lg border text-sm ${form.tipo_costo ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-medium' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
              {form.tipo_costo || 'Se llena automáticamente'}
            </div>
          </FW>
          <FW label="Nivel de puesto">
            <div className={`h-9 w-full flex items-center px-3 rounded-lg border text-sm ${form.nivel_puesto ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-medium' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
              {form.nivel_puesto || 'Se llena automáticamente'}
            </div>
          </FW>
          <FW label="Jefe inmediato (nómina)">
            <Input className="h-9 font-mono" placeholder="15100002" value={form.jefe_inmed} onChange={e => f('jefe_inmed', e.target.value)} />
          </FW>
        </div>

        <FW label="Tipo de empleado *" error={errors.tipo_empleado}>
          <div className="grid grid-cols-2 gap-4 pt-1">
            {(['Sindicalizado', 'Confianza'] as const).map(tipo => (
              <button key={tipo} type="button" onClick={() => f('tipo_empleado', tipo)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  form.tipo_empleado === tipo
                    ? tipo === 'Sindicalizado' ? 'border-purple-500 bg-purple-50' : 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  form.tipo_empleado === tipo
                    ? tipo === 'Sindicalizado' ? 'border-purple-500' : 'border-blue-500'
                    : 'border-gray-300'
                }`}>
                  {form.tipo_empleado === tipo && (
                    <div className={`w-2 h-2 rounded-full ${tipo === 'Sindicalizado' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                  )}
                </div>
                <span className="text-sm font-medium">{tipo}</span>
              </button>
            ))}
          </div>
        </FW>

        <SecLabel>Contratación y sueldo</SecLabel>
        <div className="grid grid-cols-3 gap-4">
          <FW label="Fecha de ingreso *" error={errors.fecha_ingreso}>
            <Input type="date" className="h-9" value={form.fecha_ingreso} onChange={e => f('fecha_ingreso', e.target.value)} />
          </FW>
          <FW label="Fecha de contrato">
            <Input type="date" className="h-9" value={form.fecha_contrato} onChange={e => f('fecha_contrato', e.target.value)} />
          </FW>
          <FW label="Sueldo mensual bruto *" error={errors.sueldo_mensual}>
            <Input type="number" className="h-9" placeholder="Ej: 8500" value={form.sueldo_mensual} onChange={e => f('sueldo_mensual', e.target.value)} />
          </FW>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FW label="Solicitó *" error={errors.solicito}>
            <Input className="h-9" value={form.solicito} onChange={e => f('solicito', e.target.value)} />
          </FW>
          <FW label="Autorizó">
            <Input className="h-9" value={form.autorizo} onChange={e => f('autorizo', e.target.value)} />
          </FW>
        </div>

      </div>

      <div className="border-t border-gray-100 px-8 py-4 flex justify-end gap-3 shrink-0 bg-white">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={handleSave}>
          <UserPlus className="w-4 h-4" /> Crear Alta Provisional
        </Button>
      </div>
    </div>
  )
}

// ─── STEP 1: DATOS GENERALES ──────────────────────────────────────────────────

function Step1DatosGenerales({ alta, onSave }: { alta: AltaProvisional; onSave: (data: Partial<AltaProvisional>) => void }) {
  const [form, setForm] = useState({
    a_paterno: alta.a_paterno || '',
    a_materno: alta.a_materno || '',
    nombre: alta.nombre || '',
    rfc: alta.rfc || '',
    curp: alta.curp || '',
    imss: alta.imss || '',
    f_nacimiento: alta.f_nacimiento || '',
    sexo: alta.sexo || 'M' as 'M' | 'F',
    grupo_sanguineo: alta.grupo_sanguineo || '',
    estado_civil: alta.estado_civil || '',
    telefono: alta.telefono || '',
    celular: alta.celular || '',
    email_personal: alta.email_personal || '',
    calle: alta.calle || '',
    colonia: alta.colonia || '',
    cp: alta.cp || '',
    ciudad: alta.ciudad || '',
    estado: alta.estado || '',
    contacto_emergencia: alta.contacto_emergencia || '',
    tel_emergencia: alta.tel_emergencia || '',
  })
  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-500" />
          Identificación Personal
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Apellido Paterno *</Label>
            <Input className="h-8 text-xs" value={form.a_paterno} onChange={e => f('a_paterno', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Apellido Materno</Label>
            <Input className="h-8 text-xs" value={form.a_materno} onChange={e => f('a_materno', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nombre(s) *</Label>
            <Input className="h-8 text-xs" value={form.nombre} onChange={e => f('nombre', e.target.value)} />
          </div>
        </div>
        <div className="mt-2 space-y-1">
          <Label className="text-xs text-gray-500">Nombre Completo (generado)</Label>
          <div className="h-8 px-3 flex items-center bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-600">
            {[form.a_paterno, form.a_materno, form.nombre].filter(Boolean).join(' ') || '—'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">RFC * (14 chars)</Label>
          <Input className="h-8 text-xs uppercase" maxLength={14} value={form.rfc} onChange={e => f('rfc', e.target.value.toUpperCase())} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">CURP (18 chars)</Label>
          <Input className="h-8 text-xs uppercase" maxLength={18} value={form.curp} onChange={e => f('curp', e.target.value.toUpperCase())} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">N° IMSS (11 chars)</Label>
          <Input className="h-8 text-xs" maxLength={11} value={form.imss} onChange={e => f('imss', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Fecha de Nacimiento *</Label>
          <Input type="date" className="h-8 text-xs" value={form.f_nacimiento} onChange={e => f('f_nacimiento', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Sexo *</Label>
          <div className="flex gap-2 h-8 items-center">
            {(['M', 'F'] as const).map(s => (
              <button key={s} type="button" onClick={() => setForm(p => ({ ...p, sexo: s }))}
                className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                  form.sexo === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 text-gray-600'
                }`}>
                {s === 'M' ? 'Masculino' : 'Femenino'}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Grupo Sanguíneo</Label>
          <select className="h-8 w-full border border-gray-200 rounded-md px-2 text-xs bg-white" value={form.grupo_sanguineo} onChange={e => f('grupo_sanguineo', e.target.value)}>
            <option value="">Seleccionar...</option>
            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Estado Civil</Label>
          <select className="h-8 w-full border border-gray-200 rounded-md px-2 text-xs bg-white" value={form.estado_civil} onChange={e => f('estado_civil', e.target.value)}>
            <option value="">Seleccionar...</option>
            {['Soltero','Casado','Divorciado','Viudo','Unión libre'].map(ec => <option key={ec} value={ec}>{ec}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Email Personal</Label>
          <Input type="email" className="h-8 text-xs" value={form.email_personal} onChange={e => f('email_personal', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Teléfono</Label>
          <Input className="h-8 text-xs" value={form.telefono} onChange={e => f('telefono', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Celular</Label>
          <Input className="h-8 text-xs" value={form.celular} onChange={e => f('celular', e.target.value)} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Home className="w-4 h-4 text-indigo-500" />
          Domicilio
        </h3>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Calle y Número *</Label>
            <Input className="h-8 text-xs" value={form.calle} onChange={e => f('calle', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Colonia</Label>
              <Input className="h-8 text-xs" value={form.colonia} onChange={e => f('colonia', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Código Postal</Label>
              <Input className="h-8 text-xs" maxLength={5} value={form.cp} onChange={e => f('cp', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ciudad/Localidad</Label>
              <Input className="h-8 text-xs" value={form.ciudad} onChange={e => f('ciudad', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Estado</Label>
            <Input className="h-8 text-xs" value={form.estado} onChange={e => f('estado', e.target.value)} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-500" />
          Contacto de Emergencia
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Nombre</Label>
            <Input className="h-8 text-xs" value={form.contacto_emergencia} onChange={e => f('contacto_emergencia', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Teléfono</Label>
            <Input className="h-8 text-xs" value={form.tel_emergencia} onChange={e => f('tel_emergencia', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <Button onClick={() => onSave({ ...form, nombre_completo: [form.a_paterno, form.a_materno, form.nombre].filter(Boolean).join(' ') })}
          className="bg-indigo-600 hover:bg-indigo-700 text-white">
          Guardar Datos Generales
        </Button>
      </div>
    </div>
  )
}

// ─── STEP 2: DATOS FÍSICOS ────────────────────────────────────────────────────

function Step2DatosFisicos({ alta, onSave }: { alta: AltaProvisional; onSave: (data: Partial<AltaProvisional>) => void }) {
  const [form, setForm] = useState({
    altura: alta.altura || '',
    peso: alta.peso || '',
    complexion: alta.complexion || '',
    color_cabello: alta.color_cabello || '',
    color_ojos: alta.color_ojos || '',
    talla_ropa: alta.talla_ropa || '',
    talla_zapato: alta.talla_zapato || '',
    senas_particulares: alta.senas_particulares || '',
  })
  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Los datos físicos son utilizados para la elaboración de credenciales y registros oficiales.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Altura (ej. 1.75)</Label>
          <Input className="h-8 text-xs" placeholder="1.75" value={form.altura} onChange={e => f('altura', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Peso en kg (ej. 75)</Label>
          <Input className="h-8 text-xs" placeholder="75" value={form.peso} onChange={e => f('peso', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Complexión</Label>
          <select className="h-8 w-full border border-gray-200 rounded-md px-2 text-xs bg-white" value={form.complexion} onChange={e => f('complexion', e.target.value)}>
            <option value="">Seleccionar...</option>
            {['Delgado','Mediano','Robusto','Corpulento'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Color de Cabello</Label>
          <select className="h-8 w-full border border-gray-200 rounded-md px-2 text-xs bg-white" value={form.color_cabello} onChange={e => f('color_cabello', e.target.value)}>
            <option value="">Seleccionar...</option>
            {['Negro','Castaño','Rubio','Rojo','Gris','Blanco'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Color de Ojos</Label>
          <select className="h-8 w-full border border-gray-200 rounded-md px-2 text-xs bg-white" value={form.color_ojos} onChange={e => f('color_ojos', e.target.value)}>
            <option value="">Seleccionar...</option>
            {['Negros','Cafés','Verdes','Azules','Grises','Miel'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Talla de Ropa</Label>
          <select className="h-8 w-full border border-gray-200 rounded-md px-2 text-xs bg-white" value={form.talla_ropa} onChange={e => f('talla_ropa', e.target.value)}>
            <option value="">Seleccionar...</option>
            {['CH','M','G','XG','XXG','XXXG'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Talla de Zapato</Label>
          <Input className="h-8 text-xs" placeholder="27" value={form.talla_zapato} onChange={e => f('talla_zapato', e.target.value)} />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Señas Particulares</Label>
        <textarea
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-xs resize-none h-20 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          placeholder="Cicatrices, tatuajes, lunares (nota: algunas empresas prohíben tatuajes visibles)"
          value={form.senas_particulares}
          onChange={e => f('senas_particulares', e.target.value)}
        />
      </div>

      <div className="pt-2 flex justify-end">
        <Button onClick={() => onSave(form)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          Guardar Datos Físicos
        </Button>
      </div>
    </div>
  )
}

// ─── STEP 3: DATOS LABORALES ──────────────────────────────────────────────────

function Step3DatosLaborales({ alta, onSave }: { alta: AltaProvisional; onSave: (data: Partial<AltaProvisional>) => void }) {
  const { empresas, departamentos, puestos, centrosCostos, unidadesNegocio } = useSCRHStore()
  const [form, setForm] = useState({
    empresa: alta.empresa || 0,
    depto: alta.depto || 0,
    puesto: alta.puesto || 0,
    ccostos: alta.ccostos || 0,
    unidad_negocios: alta.unidad_negocios || 0,
    grado_salarial: alta.grado_salarial || '',
    tipo_costo: alta.tipo_costo || '',
    nivel_puesto: alta.nivel_puesto || '',
    tipo_empleado: alta.tipo_empleado || '' as 'Sindicalizado' | 'Confianza' | '',
    jefe_inmediato: alta.jefe_inmediato || '',
    fecha_ingreso: alta.fecha_ingreso || '',
    fecha_contrato: alta.fecha_contrato || '',
    tipo_contrato: alta.tipo_contrato || '',
    horario: alta.horario || '',
    solicito: alta.solicito || '',
    autorizo: alta.autorizo || '',
    observaciones: alta.observaciones || '',
  })
  const f = (k: keyof typeof form, v: string | number) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Empresa *</Label>
          <select className="h-8 w-full border border-gray-200 rounded-md px-2 text-xs bg-white" value={form.empresa} onChange={e => f('empresa', Number(e.target.value))}>
            <option value={0}>Seleccionar...</option>
            {empresas.map(emp => <option key={emp.clave} value={emp.clave}>{emp.razon_social}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Puesto *</Label>
          <select className="h-8 w-full border border-gray-200 rounded-md px-2 text-xs bg-white" value={form.puesto} onChange={e => {
            const puestoId = Number(e.target.value)
            f('puesto', puestoId)
            const asign = PUESTO_ASIGNACION[puestoId]
            if (asign) {
              f('depto', asign.depto)
              f('ccostos', asign.ccostos)
              f('unidad_negocios', asign.unidad)
              f('grado_salarial', asign.grado)
              f('tipo_costo', asign.tipoCosto)
              f('nivel_puesto', asign.nivel)
            }
          }}>
            <option value={0}>Seleccionar...</option>
            {puestos.map(p => <option key={p.clave} value={p.clave}>{p.descripcion}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Departamento *</Label>
          <div className={`h-8 w-full flex items-center px-2 rounded-md border text-xs ${form.depto ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-medium' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
            {form.depto ? departamentos.find(d => d.clave === form.depto)?.descripcion : 'Autofill'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Centro de Costos</Label>
          <div className={`h-8 w-full flex items-center px-2 rounded-md border text-xs ${form.ccostos ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-medium' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
            {form.ccostos ? centrosCostos.find(c => c.clave === form.ccostos)?.descripcion : 'Autofill'}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Área funcional (Talentrax)</Label>
          <div className={`h-8 w-full flex items-center px-2 rounded-md border text-xs ${form.unidad_negocios ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-medium' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
            {form.unidad_negocios ? unidadesNegocio.find(u => u.clave === form.unidad_negocios)?.descripcion : 'Autofill'}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Grado Salarial</Label>
          <div className={`h-8 w-full flex items-center px-2 rounded-md border text-xs ${form.grado_salarial ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-medium' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
            {form.grado_salarial || 'Autofill'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Tipo de Costo</Label>
          <div className={`h-8 w-full flex items-center px-2 rounded-md border text-xs ${form.tipo_costo ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-medium' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
            {form.tipo_costo || 'Autofill'}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nivel de Puesto</Label>
          <div className={`h-8 w-full flex items-center px-2 rounded-md border text-xs ${form.nivel_puesto ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-medium' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
            {form.nivel_puesto || 'Autofill'}
          </div>
        </div>
      </div>

      <div>
        <Label className="text-xs font-bold text-gray-700 block mb-2">Tipo de Empleado *</Label>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setForm(p => ({ ...p, tipo_empleado: 'Sindicalizado' }))}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              form.tipo_empleado === 'Sindicalizado' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.tipo_empleado === 'Sindicalizado' ? 'border-purple-500' : 'border-gray-300'}`}>
                {form.tipo_empleado === 'Sindicalizado' && <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />}
              </div>
              <span className={`text-sm font-bold ${form.tipo_empleado === 'Sindicalizado' ? 'text-purple-700' : 'text-gray-700'}`}>Sindicalizado</span>
            </div>
            <p className="text-[10px] text-gray-500 ml-6">Pertenece al sindicato, aplican cláusulas del contrato colectivo</p>
          </button>
          <button type="button" onClick={() => setForm(p => ({ ...p, tipo_empleado: 'Confianza' }))}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              form.tipo_empleado === 'Confianza' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.tipo_empleado === 'Confianza' ? 'border-blue-500' : 'border-gray-300'}`}>
                {form.tipo_empleado === 'Confianza' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
              </div>
              <span className={`text-sm font-bold ${form.tipo_empleado === 'Confianza' ? 'text-blue-700' : 'text-gray-700'}`}>De Confianza</span>
            </div>
            <p className="text-[10px] text-gray-500 ml-6">Personal de confianza, no aplican cláusulas sindicales</p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Jefe Inmediato</Label>
          <Input className="h-8 text-xs" value={form.jefe_inmediato} onChange={e => f('jefe_inmediato', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Horario</Label>
          <select className="h-8 w-full border border-gray-200 rounded-md px-2 text-xs bg-white" value={form.horario} onChange={e => f('horario', e.target.value)}>
            <option value="">Seleccionar...</option>
            {['Matutino','Vespertino','Nocturno','Mixto'].map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Fecha de Ingreso *</Label>
          <Input type="date" className="h-8 text-xs" value={form.fecha_ingreso} onChange={e => f('fecha_ingreso', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Fecha de Contrato *</Label>
          <Input type="date" className="h-8 text-xs" value={form.fecha_contrato} onChange={e => f('fecha_contrato', e.target.value)} />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Tipo de Contrato</Label>
        <select className="h-8 w-full border border-gray-200 rounded-md px-2 text-xs bg-white" value={form.tipo_contrato} onChange={e => f('tipo_contrato', e.target.value)}>
          <option value="">Seleccionar...</option>
          {['Por tiempo indeterminado','Por tiempo determinado','Por obra','Por temporada'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Solicitó *</Label>
          <Input className="h-8 text-xs" value={form.solicito} onChange={e => f('solicito', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Autorizó</Label>
          <Input className="h-8 text-xs" value={form.autorizo} onChange={e => f('autorizo', e.target.value)} />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Observaciones</Label>
        <textarea className="w-full border border-gray-200 rounded-md px-3 py-2 text-xs resize-none h-20 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          value={form.observaciones} onChange={e => f('observaciones', e.target.value)} />
      </div>

      <div className="pt-2 flex justify-end">
        <Button onClick={() => onSave({ ...form, tipo_empleado: form.tipo_empleado as 'Sindicalizado' | 'Confianza' | undefined })}
          className="bg-indigo-600 hover:bg-indigo-700 text-white">
          Guardar Datos Laborales
        </Button>
      </div>
    </div>
  )
}

// ─── STEP 4: PERCEPCIÓN ───────────────────────────────────────────────────────

function Step4Percepcion({ alta, onSave }: { alta: AltaProvisional; onSave: (data: Partial<AltaProvisional>) => void }) {
  const { empresas } = useSCRHStore()
  const [sueldo, setSueldo] = useState(String(alta.sueldo_mensual || ''))
  const [banco, setBanco] = useState(alta.ayuda_mensual ? 'BBVA' : '')
  const [cuenta, setCuenta] = useState('')
  const [clabe, setClabe] = useState('')
  const [beneficiario, setBeneficiario] = useState('')
  const [calculo, setCalculo] = useState<ReturnType<typeof calcularSalario> | null>(null)

  const handleCalcular = () => {
    const monto = Number(sueldo)
    if (!monto || isNaN(monto)) return
    const empresa = empresas.find(e => e.clave === alta.empresa)
    const result = calcularSalario(monto, empresa?.periodo_pago ?? 'catorcenal')
    setCalculo(result)
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs font-bold text-gray-700">Sueldo Mensual Bruto *</Label>
        <div className="flex gap-2">
          <Input type="number" className="h-9 text-sm flex-1" placeholder="Ej. 18000" value={sueldo} onChange={e => setSueldo(e.target.value)} />
          <Button type="button" variant="outline" onClick={handleCalcular} className="text-xs whitespace-nowrap">
            Calcular
          </Button>
        </div>
      </div>

      {calculo && (
        <div className="rounded-xl border border-indigo-100 overflow-hidden">
          <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100">
            <p className="text-xs font-bold text-indigo-700">Desglose Salarial</p>
          </div>
          <table className="w-full text-xs">
            <tbody>
              {[
                ['Salario Diario (SD)', formatMXN(calculo.sd)],
                ['SDI (con integración)', formatMXN(calculo.sdi)],
                ['Despensa', formatMXN(calculo.despensa)],
                ['Asistencia', formatMXN(calculo.asistencia)],
                ['Puntualidad', formatMXN(calculo.puntualidad)],
                ['Sueldo Proporcional (catorcenal)', formatMXN(calculo.s_catorcenal)],
              ].map(([concepto, monto]) => (
                <tr key={concepto} className="border-b border-gray-50">
                  <td className="px-4 py-2 text-gray-600">{concepto}</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-800">{monto}</td>
                </tr>
              ))}
              <tr className="bg-green-50">
                <td className="px-4 py-2 font-bold text-green-700">Total Percepciones</td>
                <td className="px-4 py-2 text-right font-bold text-green-700">{formatMXN(calculo.sdo_mensual)}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-4 py-2 text-gray-500 text-[11px]">Costo Empresa (aprox. +36% IMSS patronal)</td>
                <td className="px-4 py-2 text-right text-gray-500 text-[11px]">{formatMXN(calculo.sdo_mensual * 1.36)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-400 mb-3">El cálculo del salario se realiza conforme a la LFT y las tablas UMA vigentes.</p>
        <h3 className="text-sm font-bold text-gray-800 mb-3">Datos Bancarios</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Banco</Label>
            <select className="h-8 w-full border border-gray-200 rounded-md px-2 text-xs bg-white" value={banco} onChange={e => setBanco(e.target.value)}>
              <option value="">Seleccionar...</option>
              {['BBVA','BANAMEX','BANORTE','HSBC','SANTANDER','SCOTIABANK','OTRO'].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Número de Cuenta</Label>
            <Input className="h-8 text-xs" value={cuenta} onChange={e => setCuenta(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="space-y-1">
            <Label className="text-xs">CLABE Interbancaria (18 dígitos)</Label>
            <Input className="h-8 text-xs" maxLength={18} value={clabe} onChange={e => setClabe(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Beneficiario de Cuenta</Label>
            <Input className="h-8 text-xs" value={beneficiario} onChange={e => setBeneficiario(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <Button onClick={() => onSave({ sueldo_mensual: Number(sueldo), ayuda_mensual: 0 })}
          className="bg-indigo-600 hover:bg-indigo-700 text-white">
          Guardar Percepción
        </Button>
      </div>
    </div>
  )
}

// ─── STEP 5: DATOS SOCIOECONÓMICOS ────────────────────────────────────────────

function Step5DatosSocioeconomicos({ alta, onSave }: { alta: AltaProvisional; onSave: (data: Partial<AltaProvisional>) => void }) {
  const [tipoVivienda, setTipoVivienda] = useState(alta.tipo_vivienda || '')
  const [numDependientes, setNumDependientes] = useState(String(alta.num_dependientes ?? ''))
  const [estadoCivil, setEstadoCivil] = useState(alta.estado_civil || '')
  const [nivelEstudios, setNivelEstudios] = useState(alta.nivel_estudios_alta || '')
  const [nombreEscuela, setNombreEscuela] = useState(alta.nombre_escuela || '')
  const [promedio, setPromedio] = useState(alta.promedio || '')
  const [tieneVehiculo, setTieneVehiculo] = useState(alta.tiene_vehiculo ?? false)
  const [marcaVehiculo, setMarcaVehiculo] = useState(alta.marca_vehiculo || '')
  const [ocupacion, setOcupacion] = useState(alta.ocupacion_anterior || '')

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Home className="w-4 h-4 text-indigo-500" /> Vivienda
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {['Propia','Rentada','Familiar','Otro'].map(t => (
            <button key={t} type="button" onClick={() => setTipoVivienda(t)}
              className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                tipoVivienda === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-500" /> Familia
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Estado Civil</Label>
            <select className="h-8 w-full border border-gray-200 rounded-md px-2 text-xs bg-white" value={estadoCivil} onChange={e => setEstadoCivil(e.target.value)}>
              <option value="">Seleccionar...</option>
              {['Soltero','Casado','Divorciado','Viudo','Unión libre'].map(ec => <option key={ec} value={ec}>{ec}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Número de Dependientes Económicos</Label>
            <Input type="number" min={0} className="h-8 text-xs" value={numDependientes} onChange={e => setNumDependientes(e.target.value)} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-indigo-500" /> Educación
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Último Nivel de Estudios</Label>
            <select className="h-8 w-full border border-gray-200 rounded-md px-2 text-xs bg-white" value={nivelEstudios} onChange={e => setNivelEstudios(e.target.value)}>
              <option value="">Seleccionar...</option>
              {['Primaria','Secundaria','Preparatoria/Bachillerato','Carrera técnica','Licenciatura','Posgrado'].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nombre de la Escuela</Label>
            <Input className="h-8 text-xs" value={nombreEscuela} onChange={e => setNombreEscuela(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <Label className="text-xs">Promedio</Label>
          <Input className="h-8 text-xs w-32" placeholder="8.5" value={promedio} onChange={e => setPromedio(e.target.value)} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Car className="w-4 h-4 text-indigo-500" /> Vehículo
        </h3>
        <div className="flex gap-3 mb-3">
          {[true, false].map(v => (
            <button key={String(v)} type="button" onClick={() => setTieneVehiculo(v)}
              className={`px-4 py-2 rounded-lg border text-xs font-medium transition-colors ${
                tieneVehiculo === v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {v ? 'Sí tiene vehículo' : 'No tiene vehículo'}
            </button>
          ))}
        </div>
        {tieneVehiculo && (
          <div className="space-y-1">
            <Label className="text-xs">Marca del Vehículo</Label>
            <Input className="h-8 text-xs w-48" value={marcaVehiculo} onChange={e => setMarcaVehiculo(e.target.value)} />
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-indigo-500" /> Empleo Anterior
        </h3>
        <div className="space-y-1">
          <Label className="text-xs">Ocupación / Empresa Anterior</Label>
          <Input className="h-8 text-xs" value={ocupacion} onChange={e => setOcupacion(e.target.value)} />
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <Button onClick={() => onSave({
          tipo_vivienda: tipoVivienda,
          num_dependientes: Number(numDependientes) || 0,
          estado_civil: estadoCivil,
          nivel_estudios_alta: nivelEstudios,
          nombre_escuela: nombreEscuela,
          promedio,
          tiene_vehiculo: tieneVehiculo,
          marca_vehiculo: marcaVehiculo,
          ocupacion_anterior: ocupacion,
        })} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          Guardar Datos Socioeconómicos
        </Button>
      </div>
    </div>
  )
}

// ─── STEP 6: RECOMENDACIÓN ────────────────────────────────────────────────────

function Step6Recomendacion({ alta, onSave }: { alta: AltaProvisional; onSave: (data: Partial<AltaProvisional>) => void }) {
  const [fueRecomendado, setFueRecomendado] = useState<boolean | undefined>(alta.fue_recomendado)
  const [recomendadoPor, setRecomendadoPor] = useState(alta.recomendado_por || '')
  const [relacion, setRelacion] = useState(alta.relacion_recomendador || '')
  const [canal, setCanal] = useState('')

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-bold text-gray-800 block mb-3">¿El colaborador fue recomendado?</Label>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setFueRecomendado(true)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              fueRecomendado === true ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}>
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${fueRecomendado === true ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                {fueRecomendado === true && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className={`text-sm font-bold ${fueRecomendado === true ? 'text-green-700' : 'text-gray-600'}`}>
                Sí, fue recomendado
              </span>
            </div>
          </button>
          <button type="button" onClick={() => setFueRecomendado(false)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              fueRecomendado === false ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}>
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${fueRecomendado === false ? 'border-red-400 bg-red-400' : 'border-gray-300'}`}>
                {fueRecomendado === false && <X className="w-3 h-3 text-white" />}
              </div>
              <span className={`text-sm font-bold ${fueRecomendado === false ? 'text-red-700' : 'text-gray-600'}`}>
                No fue recomendado
              </span>
            </div>
          </button>
        </div>
      </div>

      {fueRecomendado === true && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">Las recomendaciones internas son parte del expediente oficial del colaborador.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nombre de quien recomienda *</Label>
              <Input className="h-8 text-xs" value={recomendadoPor} onChange={e => setRecomendadoPor(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Relación con el recomendador</Label>
              <select className="h-8 w-full border border-gray-200 rounded-md px-2 text-xs bg-white" value={relacion} onChange={e => setRelacion(e.target.value)}>
                <option value="">Seleccionar...</option>
                {['Familiar directo','Amigo personal','Conocido','Ex-compañero de trabajo','Otro'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {fueRecomendado === false && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">¿Cómo se enteró de la vacante?</Label>
            <select className="h-8 w-full border border-gray-200 rounded-md px-2 text-xs bg-white" value={canal} onChange={e => setCanal(e.target.value)}>
              <option value="">Seleccionar...</option>
              {['Bolsa de trabajo','Redes sociales','Periódico/Anuncio','Pasó a preguntar','Feria de empleo','Otro'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="pt-2 flex justify-end">
        <Button onClick={() => onSave({
          fue_recomendado: fueRecomendado,
          recomendado_por: fueRecomendado ? recomendadoPor : undefined,
          relacion_recomendador: fueRecomendado ? relacion : undefined,
        })} disabled={fueRecomendado === undefined}
          className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
          Guardar Recomendación
        </Button>
      </div>
    </div>
  )
}

// ─── STEP 7: LICENCIA ─────────────────────────────────────────────────────────

function Step7Licencia({ alta, puestoNombre, onSave }: { alta: AltaProvisional; puestoNombre: string; onSave: (data: Partial<AltaProvisional>) => void }) {
  const isOperador = puestoNombre.toLowerCase().includes('operador')
  const [tieneLicencia, setTieneLicencia] = useState(alta.tiene_licencia ?? false)
  const [tipoLicencia, setTipoLicencia] = useState(alta.tipo_licencia || '')
  const [numLicencia, setNumLicencia] = useState(alta.num_licencia || '')
  const [venceLicencia, setVenceLicencia] = useState(alta.vence_licencia || '')
  const [licFederal, setLicFederal] = useState(alta.licencia_federal ?? false)

  return (
    <div className="space-y-5">
      {isOperador ? (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-red-700">Este puesto REQUIERE licencia de manejo federal vigente.</p>
            <p className="text-[11px] text-red-600 mt-0.5">Paso obligatorio para continuar con el proceso de alta.</p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Este colaborador no requiere licencia de manejo para su puesto. Puede registrarse como opcional.
          </p>
        </div>
      )}

      <div>
        <Label className="text-sm font-bold text-gray-800 block mb-2">¿Tiene licencia de manejo?</Label>
        <div className="flex gap-3">
          {[true, false].map(v => (
            <button key={String(v)} type="button" onClick={() => setTieneLicencia(v)}
              className={`px-4 py-2 rounded-lg border text-xs font-medium transition-colors ${
                tieneLicencia === v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {v ? 'Sí' : 'No'}
            </button>
          ))}
        </div>
      </div>

      {tieneLicencia && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo de Licencia *</Label>
              <select className="h-8 w-full border border-gray-200 rounded-md px-2 text-xs bg-white" value={tipoLicencia} onChange={e => setTipoLicencia(e.target.value)}>
                <option value="">Seleccionar...</option>
                {['Federal','Estatal A','Estatal B','Particular'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Número de Licencia *</Label>
              <Input className="h-8 text-xs uppercase" value={numLicencia} onChange={e => setNumLicencia(e.target.value.toUpperCase())} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Fecha de Vencimiento *</Label>
              <Input type="date" className="h-8 text-xs" value={venceLicencia} onChange={e => setVenceLicencia(e.target.value)} />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={licFederal} onChange={e => setLicFederal(e.target.checked)} className="rounded" />
                <span className="text-xs text-gray-700">Es licencia federal</span>
              </label>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg p-3">
            <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700">La licencia federal es obligatoria para operadores de transporte de carga.</p>
          </div>
        </div>
      )}

      <div className="pt-2 flex justify-end">
        <Button onClick={() => onSave({
          tiene_licencia: tieneLicencia,
          tipo_licencia: tieneLicencia ? tipoLicencia : undefined,
          num_licencia: tieneLicencia ? numLicencia : undefined,
          vence_licencia: tieneLicencia ? venceLicencia : undefined,
          licencia_federal: tieneLicencia ? licFederal : undefined,
        })} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          Guardar Licencia
        </Button>
      </div>
    </div>
  )
}

// ─── STEP 8: DOCUMENTOS ───────────────────────────────────────────────────────

type DocStatus = 'pendiente' | 'cargado' | undefined

function Step8Documentos({ alta, onSave }: { alta: AltaProvisional; onSave: (data: Partial<AltaProvisional>) => void }) {
  const [docs, setDocs] = useState({
    doc_apto_medico: alta.doc_apto_medico as DocStatus,
    doc_socioeconomico: alta.doc_socioeconomico as DocStatus,
    doc_carta_oferta: alta.doc_carta_oferta as DocStatus,
    doc_csf: alta.doc_csf as DocStatus,
    doc_psicometrico: alta.doc_psicometrico as DocStatus,
    doc_foto: alta.doc_foto as DocStatus,
  })

  const fileRefs = {
    doc_apto_medico: useRef<HTMLInputElement>(null),
    doc_socioeconomico: useRef<HTMLInputElement>(null),
    doc_carta_oferta: useRef<HTMLInputElement>(null),
    doc_csf: useRef<HTMLInputElement>(null),
    doc_psicometrico: useRef<HTMLInputElement>(null),
    doc_foto: useRef<HTMLInputElement>(null),
  }

  const handleFileChange = (key: keyof typeof docs) => {
    setDocs(p => ({ ...p, [key]: 'cargado' }))
  }

  const docDefs = [
    { key: 'doc_apto_medico' as const, icon: Stethoscope, name: 'Apto Médico', desc: 'Certificado médico de aptitud física. Debe incluir firma y sello del médico.' },
    { key: 'doc_socioeconomico' as const, icon: ClipboardList, name: 'Evaluación Socioeconómica', desc: 'Estudio socioeconómico del colaborador realizado por empresa certificada.' },
    { key: 'doc_carta_oferta' as const, icon: FileCheck, name: 'Carta Oferta', desc: 'Carta oferta de empleo firmada por ambas partes con condiciones laborales.' },
    { key: 'doc_csf' as const, icon: Receipt, name: 'Constancia de Situación Fiscal', desc: 'CSF emitida por el SAT. No debe tener más de 3 meses de antigüedad.' },
    { key: 'doc_psicometrico' as const, icon: Brain, name: 'Psicométrico', desc: 'Resultado de evaluación psicométrica aplicada al candidato.' },
    { key: 'doc_foto' as const, icon: Camera, name: 'Fotografía', desc: 'Fotografía reciente del colaborador, fondo blanco, sin lentes.' },
  ]

  const uploaded = Object.values(docs).filter(d => d === 'cargado').length

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {docDefs.map(doc => {
          const status = docs[doc.key]
          const Icon = doc.icon
          return (
            <div key={doc.key} className={`rounded-xl border p-4 flex flex-col gap-3 ${
              status === 'cargado' ? 'border-green-200 bg-green-50' :
              status === 'pendiente' ? 'border-yellow-200 bg-yellow-50' :
              'border-gray-200 bg-white'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  status === 'cargado' ? 'bg-green-100' :
                  status === 'pendiente' ? 'bg-yellow-100' :
                  'bg-gray-100'
                }`}>
                  <Icon className={`w-4.5 h-4.5 ${
                    status === 'cargado' ? 'text-green-600' :
                    status === 'pendiente' ? 'text-yellow-600' :
                    'text-gray-500'
                  } w-[18px] h-[18px]`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800">{doc.name}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{doc.desc}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  status === 'cargado' ? 'bg-green-100 text-green-700' :
                  status === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {status === 'cargado' ? '✓ Cargado' : status === 'pendiente' ? 'Pendiente' : 'Sin cargar'}
                </span>
                {doc.key === 'doc_csf' && !status && (
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 flex items-center gap-0.5">
                    <AlertTriangle className="w-2.5 h-2.5" /> Máx. 3 meses
                  </span>
                )}
              </div>

              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                ref={fileRefs[doc.key]}
                onChange={() => handleFileChange(doc.key)}
              />
              <button
                type="button"
                onClick={() => fileRefs[doc.key].current?.click()}
                className={`w-full py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  status === 'cargado'
                    ? 'border-green-300 text-green-700 bg-white hover:bg-green-50'
                    : 'border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                }`}>
                {status === 'cargado' ? '✓ Cargado — Reemplazar' : 'Subir documento'}
              </button>
            </div>
          )
        })}
      </div>

      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-700">{uploaded} de 6 documentos cargados</span>
          <span className="text-xs text-gray-500">{Math.round((uploaded / 6) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(uploaded / 6) * 100}%` }} />
        </div>
        <p className="text-[10px] text-gray-400 mt-2">Todos los documentos son requeridos para la autorización del alta.</p>
      </div>

      <div className="pt-2 flex justify-end">
        <Button onClick={() => onSave(docs)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          Guardar Documentos
        </Button>
      </div>
    </div>
  )
}

// ─── STEP 9: VALIDACIÓN FINAL ─────────────────────────────────────────────────

function Step9ValidacionFinal({
  alta,
  puestoNombre,
  empresaNombre,
  deptNombre,
  onAutorizar,
}: {
  alta: AltaProvisional
  puestoNombre: string
  empresaNombre: string
  deptNombre: string
  onAutorizar: () => void
}) {
  const completion = calcStepCompletion(alta, puestoNombre)
  const allComplete = Object.values(completion).every(Boolean)
  const docsCount = countDocsUploaded(alta)

  const sections = [
    {
      title: 'Datos Generales',
      icon: User,
      complete: completion.step1,
      items: [
        { label: 'RFC', value: alta.rfc || '—' },
        { label: 'CURP', value: alta.curp || '—' },
        { label: 'F. Nacimiento', value: alta.f_nacimiento || '—' },
        { label: 'Sexo', value: alta.sexo === 'M' ? 'Masculino' : alta.sexo === 'F' ? 'Femenino' : '—' },
        { label: 'Estado Civil', value: alta.estado_civil || '—' },
      ],
    },
    {
      title: 'Datos Físicos',
      icon: User,
      complete: completion.step2,
      items: [
        { label: 'Altura', value: alta.altura ? `${alta.altura} m` : '—' },
        { label: 'Peso', value: alta.peso ? `${alta.peso} kg` : '—' },
        { label: 'Complexión', value: alta.complexion || '—' },
        { label: 'Talla Ropa', value: alta.talla_ropa || '—' },
      ],
    },
    {
      title: 'Datos Laborales',
      icon: Briefcase,
      complete: completion.step3,
      items: [
        { label: 'Empresa', value: empresaNombre },
        { label: 'Departamento', value: deptNombre },
        { label: 'Puesto', value: puestoNombre },
        { label: 'Tipo', value: alta.tipo_empleado || '—' },
        { label: 'F. Ingreso', value: alta.fecha_ingreso || '—' },
      ],
    },
    {
      title: 'Percepción',
      icon: DollarSign,
      complete: completion.step4,
      items: [
        { label: 'Sueldo Mensual', value: alta.sueldo_mensual ? formatMXN(alta.sueldo_mensual) : '—' },
      ],
    },
    {
      title: 'Datos Socioeconómicos',
      icon: Home,
      complete: completion.step5,
      items: [
        { label: 'Tipo Vivienda', value: alta.tipo_vivienda || '—' },
        { label: 'Nivel Estudios', value: alta.nivel_estudios_alta || '—' },
        { label: 'Dependientes', value: alta.num_dependientes !== undefined ? String(alta.num_dependientes) : '—' },
      ],
    },
    {
      title: 'Recomendación',
      icon: Star,
      complete: completion.step6,
      items: [
        { label: 'Fue recomendado', value: alta.fue_recomendado === true ? 'Sí' : alta.fue_recomendado === false ? 'No' : '—' },
        ...(alta.fue_recomendado ? [{ label: 'Por', value: alta.recomendado_por || '—' }] : []),
      ],
    },
    {
      title: 'Licencia de Manejo',
      icon: Car,
      complete: completion.step7,
      items: [
        { label: 'Requerida', value: puestoNombre.toLowerCase().includes('operador') ? 'Sí' : 'No' },
        { label: 'Tiene licencia', value: alta.tiene_licencia === true ? 'Sí' : alta.tiene_licencia === false ? 'No' : '—' },
        ...(alta.tiene_licencia ? [
          { label: 'Tipo', value: alta.tipo_licencia || '—' },
          { label: 'N°', value: alta.num_licencia || '—' },
          { label: 'Vence', value: alta.vence_licencia || '—' },
        ] : []),
      ],
    },
    {
      title: 'Documentos',
      icon: FileText,
      complete: completion.step8,
      items: [
        { label: 'Apto Médico', value: alta.doc_apto_medico === 'cargado' ? '✓ Cargado' : '✗ Pendiente' },
        { label: 'Evaluación Socioeconómica', value: alta.doc_socioeconomico === 'cargado' ? '✓ Cargado' : '✗ Pendiente' },
        { label: 'Carta Oferta', value: alta.doc_carta_oferta === 'cargado' ? '✓ Cargado' : '✗ Pendiente' },
        { label: 'CSF', value: alta.doc_csf === 'cargado' ? '✓ Cargado' : '✗ Pendiente' },
        { label: 'Psicométrico', value: alta.doc_psicometrico === 'cargado' ? '✓ Cargado' : '✗ Pendiente' },
        { label: 'Fotografía', value: alta.doc_foto === 'cargado' ? '✓ Cargado' : '✗ Pendiente' },
      ],
    },
  ]

  const incompleteSections = sections.filter(s => !s.complete).map(s => s.title)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`flex-1 p-3 rounded-xl border-2 flex items-center gap-3 ${allComplete ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50'}`}>
          {allComplete
            ? <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            : <X className="w-5 h-5 text-red-500 shrink-0" />
          }
          <div>
            <p className={`text-sm font-bold ${allComplete ? 'text-green-700' : 'text-red-700'}`}>
              {allComplete
                ? 'Expediente completo — El colaborador puede ser autorizado'
                : `Expediente incompleto — Completar ${incompleteSections.length} sección(es) antes de autorizar`
              }
            </p>
            {!allComplete && (
              <p className="text-[11px] text-red-600 mt-0.5">
                Pendiente: {incompleteSections.join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map(section => {
          const Icon = section.icon
          return (
            <div key={section.title} className={`rounded-xl border p-4 ${section.complete ? 'border-green-100 bg-white' : 'border-red-100 bg-red-50/30'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${section.complete ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Icon className={`w-3.5 h-3.5 ${section.complete ? 'text-green-600' : 'text-red-500'}`} />
                </div>
                <span className="text-xs font-bold text-gray-800">{section.title}</span>
                <div className="ml-auto">
                  {section.complete
                    ? <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">✓ Completo</span>
                    : <span className="text-[10px] font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">✗ Incompleto</span>
                  }
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-9">
                {section.items.map(item => (
                  <div key={item.label} className="flex justify-between">
                    <span className="text-[11px] text-gray-500">{item.label}</span>
                    <span className={`text-[11px] font-medium ${
                      item.value.startsWith('✓') ? 'text-green-600' :
                      item.value.startsWith('✗') ? 'text-red-500' :
                      'text-gray-800'
                    }`}>{item.value}</span>
                  </div>
                ))}
              </div>
              {section.title === 'Documentos' && (
                <div className="mt-2 pl-9">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full">
                      <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(docsCount / 6) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-500">{docsCount}/6</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="pt-4">
        <Button
          onClick={onAutorizar}
          disabled={!allComplete}
          className={`w-full py-3 text-sm font-bold rounded-xl transition-all ${
            allComplete
              ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {allComplete ? (
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              AUTORIZAR ALTA
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <X className="w-4 h-4" />
              Complete todos los pasos primero
            </span>
          )}
        </Button>
        {!allComplete && (
          <p className="text-[10px] text-center text-gray-400 mt-2">
            Faltan {8 - countCompletedSteps(alta, puestoNombre)} de 8 secciones
          </p>
        )}
      </div>
    </div>
  )
}

// ─── DETAIL VIEW ──────────────────────────────────────────────────────────────

const STEP_LABELS = [
  { num: 1, label: 'Datos Generales', icon: User },
  { num: 2, label: 'Datos Físicos', icon: User },
  { num: 3, label: 'Datos Laborales', icon: Briefcase },
  { num: 4, label: 'Percepción', icon: DollarSign },
  { num: 5, label: 'Datos Socioeconómicos', icon: Home },
  { num: 6, label: 'Recomendación', icon: Star },
  { num: 7, label: 'Licencia de Manejo', icon: Car },
  { num: 8, label: 'Documentos', icon: FileText },
  { num: 9, label: 'Validación Final', icon: CheckCircle },
]

function DetailView({
  altaNumero,
  onBack,
}: {
  altaNumero: number
  onBack: () => void
}) {
  const {
    altasProvisionales, updateAltaProvisional, aprobarAlta,
    getEmpresaNombre, getDepartamentoNombre, getPuestoNombre,
  } = useSCRHStore()

  const alta = altasProvisionales.find(a => a.numero === altaNumero)!
  const [selectedStep, setSelectedStep] = useState(1)
  const [showToast, setShowToast] = useState(false)
  const [showAutorizarDialog, setShowAutorizarDialog] = useState(false)
  const [autorizoInput, setAutorizoInput] = useState('')
  const [rfcConfirm, setRfcConfirm] = useState(alta.rfc || '')
  const [autorizarSuccess, setAutorizarSuccess] = useState(false)
  const [newClave, setNewClave] = useState('')

  const puestoNombre = getPuestoNombre(alta.puesto)
  const empresaNombre = getEmpresaNombre(alta.empresa)
  const deptNombre = getDepartamentoNombre(alta.depto)
  const completion = calcStepCompletion(alta, puestoNombre)
  const allComplete = Object.values(completion).every(Boolean)
  const completedCount = countCompletedSteps(alta, puestoNombre)

  const stepStatus = [
    completion.step1, completion.step2, completion.step3, completion.step4,
    completion.step5, completion.step6, completion.step7, completion.step8,
  ]

  const handleSave = (data: Partial<AltaProvisional>) => {
    updateAltaProvisional(alta.numero, { ...data, paso_actual: Math.max(alta.paso_actual || 1, selectedStep) })
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2500)
  }

  const handleConfirmAutorizar = () => {
    if (!autorizoInput.trim() || !rfcConfirm.trim()) return
    aprobarAlta(alta.numero)
    const updatedAltas = useSCRHStore.getState().altasProvisionales
    const updated = updatedAltas.find(a => a.numero === altaNumero)
    setNewClave(updated?.clave || '(asignado)')
    setAutorizarSuccess(true)
  }

  if (autorizarSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-800">¡Alta Autorizada!</p>
          <p className="text-sm text-gray-500 mt-2">
            {alta.nombre_completo} ha sido registrado como empleado activo con nómina <strong className="text-indigo-600">{newClave}</strong>
          </p>
        </div>
        <div className="w-full max-w-sm bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="grid grid-cols-2 gap-y-2 text-xs">
            <span className="text-gray-500">Nombre</span><span className="font-medium">{alta.nombre_completo}</span>
            <span className="text-gray-500">Empresa</span><span className="font-medium">{empresaNombre}</span>
            <span className="text-gray-500">Puesto</span><span className="font-medium">{puestoNombre}</span>
            <span className="text-gray-500">Nómina</span><span className="font-medium text-indigo-600">{newClave}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
            Volver a la lista
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <SavedToast show={showToast} />

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Regresar a la lista
        </button>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-gray-800">{alta.nombre_completo}</p>
            <p className="text-xs text-gray-500">{puestoNombre} • {empresaNombre}</p>
          </div>
          <AltaStatusBadge status={alta.status} />
          <Button
            size="sm"
            disabled={!allComplete || alta.status === 1}
            onClick={() => setShowAutorizarDialog(true)}
            className={`text-xs font-bold ${allComplete && alta.status !== 1 ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
          >
            {alta.status === 1 ? '✓ Ya autorizado' : 'Autorizar Alta'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-56 border-r border-gray-100 bg-gray-50 overflow-y-auto shrink-0 py-4">
          <div className="px-4 mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Progreso</span>
              <span className="text-[10px] font-bold text-indigo-600">{completedCount}/8</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${(completedCount / 8) * 100}%` }} />
            </div>
          </div>

          <nav className="space-y-0.5 px-2">
            {STEP_LABELS.map(step => {
              const isComplete = step.num <= 8 ? stepStatus[step.num - 1] : allComplete
              const isSelected = selectedStep === step.num
              const Icon = step.icon

              return (
                <button
                  key={step.num}
                  onClick={() => setSelectedStep(step.num)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'hover:bg-white text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                    isSelected ? 'bg-white/20 text-white' :
                    isComplete ? 'bg-green-100 text-green-700' :
                    step.num <= 8 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {step.num <= 8 ? (isComplete ? <Check className="w-3 h-3" /> : step.num) : <CheckCircle className="w-3 h-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-medium leading-tight ${isSelected ? 'text-white' : ''}`}>{step.label}</p>
                    {step.num === 8 && !isSelected && (
                      <p className="text-[9px] text-gray-400">{countDocsUploaded(alta)}/6 docs</p>
                    )}
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-6">
            <div className="mb-6">
              <h2 className="text-base font-bold text-gray-900">
                {STEP_LABELS.find(s => s.num === selectedStep)?.label}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                {selectedStep <= 8 && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    stepStatus[selectedStep - 1]
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {stepStatus[selectedStep - 1] ? '✓ Completo' : '⏳ Pendiente'}
                  </span>
                )}
                <span className="text-xs text-gray-400">Paso {selectedStep} de 9</span>
              </div>
            </div>

            {selectedStep === 1 && <Step1DatosGenerales alta={alta} onSave={handleSave} />}
            {selectedStep === 2 && <Step2DatosFisicos alta={alta} onSave={handleSave} />}
            {selectedStep === 3 && <Step3DatosLaborales alta={alta} onSave={handleSave} />}
            {selectedStep === 4 && <Step4Percepcion alta={alta} onSave={handleSave} />}
            {selectedStep === 5 && <Step5DatosSocioeconomicos alta={alta} onSave={handleSave} />}
            {selectedStep === 6 && <Step6Recomendacion alta={alta} onSave={handleSave} />}
            {selectedStep === 7 && <Step7Licencia alta={alta} puestoNombre={puestoNombre} onSave={handleSave} />}
            {selectedStep === 8 && <Step8Documentos alta={alta} onSave={handleSave} />}
            {selectedStep === 9 && (
              <Step9ValidacionFinal
                alta={alta}
                puestoNombre={puestoNombre}
                empresaNombre={empresaNombre}
                deptNombre={deptNombre}
                onAutorizar={() => setShowAutorizarDialog(true)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Autorizar Dialog */}
      <Dialog open={showAutorizarDialog} onOpenChange={v => { if (!v) setShowAutorizarDialog(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              ¿Confirmar autorización del alta?
            </DialogTitle>
            <DialogDescription>
              Esta acción creará el empleado en el sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Resumen</p>
              <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                <span className="text-gray-500">Nombre</span><span className="font-medium">{alta.nombre_completo}</span>
                <span className="text-gray-500">Empresa</span><span className="font-medium">{empresaNombre}</span>
                <span className="text-gray-500">Puesto</span><span className="font-medium">{puestoNombre}</span>
                <span className="text-gray-500">Sueldo</span><span className="font-medium">{formatMXN(alta.sueldo_mensual)}</span>
                <span className="text-gray-500">F. Ingreso</span><span className="font-medium">{alta.fecha_ingreso}</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Autorizó *</Label>
              <Input className="h-8 text-xs" value={autorizoInput} onChange={e => setAutorizoInput(e.target.value)} placeholder="Nombre del autorizador" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">RFC del Colaborador (confirmación) *</Label>
              <Input className="h-8 text-xs uppercase" maxLength={14} value={rfcConfirm} onChange={e => setRfcConfirm(e.target.value.toUpperCase())} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAutorizarDialog(false)}>Cancelar</Button>
            <Button
              size="sm"
              disabled={!autorizoInput.trim() || !rfcConfirm.trim()}
              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
              onClick={handleConfirmAutorizar}
            >
              Confirmar Autorización
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function AltasPage() {
  const {
    altasProvisionales,
    getEmpresaNombre, getDepartamentoNombre, getPuestoNombre,
    updateAltaProvisional,
  } = useSCRHStore()

  const [activeTab, setActiveTab] = useState<FilterTab>('todas')
  const [showNuevoSheet, setShowNuevoSheet] = useState(false)
  const [detailAltaNumero, setDetailAltaNumero] = useState<number | null>(null)

  // ALL hooks must be declared before any conditional return
  const total = altasProvisionales.length
  const pendientes = altasProvisionales.filter(a => a.status === 2).length
  const aprobadas = altasProvisionales.filter(a => a.status === 1).length
  const procesando = altasProvisionales.filter(a => a.status === 3).length

  const filtered = useMemo(() => {
    if (activeTab === 'pendientes') return altasProvisionales.filter(a => a.status === 2)
    if (activeTab === 'aprobadas') return altasProvisionales.filter(a => a.status === 1)
    if (activeTab === 'procesando') return altasProvisionales.filter(a => a.status === 3)
    return altasProvisionales
  }, [altasProvisionales, activeTab])

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'todas', label: 'Todas' },
    { key: 'pendientes', label: 'Pendientes' },
    { key: 'aprobadas', label: 'Aprobadas' },
    { key: 'procesando', label: 'Procesando' },
  ]

  const stats = [
    { label: 'Total solicitudes', value: total, icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { label: 'Pendientes', value: pendientes, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
    { label: 'Aprobadas', value: aprobadas, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
    { label: 'Procesando', value: procesando, icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  ]

  // Now safe to do conditional rendering — all hooks already called above
  if (detailAltaNumero !== null) {
    const alta = altasProvisionales.find(a => a.numero === detailAltaNumero)
    if (alta) {
      return (
        <div className="h-full flex flex-col">
          <DetailView altaNumero={detailAltaNumero} onBack={() => setDetailAltaNumero(null)} />
        </div>
      )
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <UserPlus className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Módulo de Altas</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Altas de Personal</h1>
          <p className="text-sm text-gray-500 mt-0.5">Proceso de onboarding de nuevos colaboradores</p>
        </div>
        <Button onClick={() => setShowNuevoSheet(true)} className="flex items-center gap-1.5 text-xs font-bold">
          <Plus className="w-3.5 h-3.5" />
          Nueva Alta
        </Button>
      </div>

      {/* Stats */}
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
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['# Nómina', 'Nombre Completo', 'Empresa / Depto / Puesto', 'Tipo', 'F. Ingreso', 'Progreso', 'Status', 'Acciones'].map(col => (
                  <th key={col} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                    No hay altas provisionales en esta categoría
                  </td>
                </tr>
              ) : (
                filtered.map(alta => {
                  const puestoNombre = getPuestoNombre(alta.puesto)
                  const completed = countCompletedSteps(alta, puestoNombre)
                  const pct = Math.round((completed / 8) * 100)
                  const allDone = allStepsComplete(alta, puestoNombre)

                  return (
                    <tr key={alta.numero} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {alta.clave || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{alta.nombre_completo}</p>
                          <p className="text-[10px] text-gray-400">RFC: {alta.rfc}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-xs text-gray-700 font-medium">{getEmpresaNombre(alta.empresa)}</p>
                          <p className="text-[10px] text-gray-500">{getDepartamentoNombre(alta.depto)} / {puestoNombre}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <TipoEmpleadoBadge tipo={alta.tipo_empleado} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500">
                          {alta.fecha_ingreso ? new Date(alta.fecha_ingreso + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 w-36">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-[10px] text-gray-500">{completed}/8 pasos</span>
                            <span className="text-[10px] font-medium text-gray-600">{pct}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${allDone ? 'bg-green-500' : pct > 50 ? 'bg-blue-500' : 'bg-yellow-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <AltaStatusBadge status={alta.status} />
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="p-1 rounded hover:bg-gray-100 transition-colors outline-none">
                            <MoreHorizontal className="w-4 h-4 text-gray-400" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetailAltaNumero(alta.numero)}>
                              <Eye className="w-3.5 h-3.5 mr-2" />
                              Ver expediente completo
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDetailAltaNumero(alta.numero)}>
                              <Edit className="w-3.5 h-3.5 mr-2" />
                              Editar información
                            </DropdownMenuItem>
                            {alta.status === 2 && (
                              <DropdownMenuItem
                                onClick={() => { if (allDone) setDetailAltaNumero(alta.numero) }}
                                disabled={!allDone}
                                className={allDone ? 'text-green-600 focus:text-green-700' : 'text-gray-300 cursor-not-allowed'}
                              >
                                <CheckCircle className="w-3.5 h-3.5 mr-2" />
                                {allDone ? 'Aprobar' : 'Completar pasos primero'}
                              </DropdownMenuItem>
                            )}
                            {alta.status === 2 && (
                              <DropdownMenuItem
                                onClick={() => updateAltaProvisional(alta.numero, { status: 3 })}
                                className="text-blue-600 focus:text-blue-700"
                              >
                                <Loader2 className="w-3.5 h-3.5 mr-2" />
                                Marcar en proceso
                              </DropdownMenuItem>
                            )}
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
          <span className="text-xs text-gray-500">Mostrando {filtered.length} de {total} solicitudes</span>
        </div>
      </div>

      {/* Nueva Alta Dialog */}
      <Dialog open={showNuevoSheet} onOpenChange={setShowNuevoSheet}>
        <DialogContent className="p-0 flex flex-col" style={{ width: '90vw', maxWidth: '1100px', maxHeight: '92vh' }}>
          <DialogHeader className="px-8 py-5 border-b border-gray-100 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                <UserPlus className="w-3.5 h-3.5 text-white" />
              </div>
              Nueva Alta Provisional
            </DialogTitle>
            <DialogDescription>
              Registre la información básica. Podrá completar el expediente después.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 flex flex-col">
            <NuevaAltaForm onClose={() => setShowNuevoSheet(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
