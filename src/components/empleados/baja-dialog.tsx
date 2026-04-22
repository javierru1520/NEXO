"use client"

import { useState } from 'react'
import { useSCRHStore } from '@/store'
import { Empleado } from '@/types'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectTrigger, SelectContent, SelectItem,
} from '@/components/ui/select'
import { UserX, CheckCircle, Building2, User, Briefcase, Calendar, Zap } from 'lucide-react'
import { esFechaFutura } from '@/lib/validations'
import { CAUSA_BAJA_AUTOFILL, TIPOS_BAJA, CAUSAS_BAJA, CAUSAS_IMSS } from '@/lib/mock-data'

const CATEGORIAS_EMP = ['Operativo', 'Administrativo', 'Sindicalizado', 'Confianza', 'Directivo']

function YesNo({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="flex gap-1">
        <button type="button" onClick={() => onChange(true)}
          className={`flex-1 h-8 rounded text-xs font-semibold border transition-colors ${value ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
          Sí
        </button>
        <button type="button" onClick={() => onChange(false)}
          className={`flex-1 h-8 rounded text-xs font-semibold border transition-colors ${!value ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
          No
        </button>
      </div>
    </div>
  )
}

function AutofillDisplay({ label, value, filled }: { label: string; value: string; filled: boolean }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium flex items-center gap-1">
        {label} {filled && <Zap className="w-3 h-3 text-indigo-400" />}
      </Label>
      <div className={`h-8 w-full flex items-center px-3 rounded-md border text-xs ${filled ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-medium' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
        {filled ? value : 'Se llena automáticamente'}
      </div>
    </div>
  )
}

function AutofillBool({ label, value, filled }: { label: string; value: boolean; filled: boolean }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium flex items-center gap-1">
        {label} {filled && <Zap className="w-3 h-3 text-indigo-400" />}
      </Label>
      <div className={`h-8 w-full flex items-center px-3 rounded-md border text-xs font-semibold ${!filled ? 'bg-gray-50 border-gray-200 text-gray-400' : value ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
        {!filled ? 'Se llena automáticamente' : value ? 'Sí' : 'No'}
      </div>
    </div>
  )
}

interface BajaDialogProps {
  empleado: Empleado
  open: boolean
  onClose: () => void
}

export default function BajaDialog({ empleado, open, onClose }: BajaDialogProps) {
  const { getDepartamentoNombre, getPuestoNombre, getEmpresaNombre, registrarBaja } = useSCRHStore()
  const tiposBaja  = TIPOS_BAJA
  const causasBaja = CAUSAS_BAJA
  const causasIMSS = CAUSAS_IMSS

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    fecha_baja: today,
    jefe_actual: '',
    servicio: '',
    tipo_baja: 0,
    causa_baja: 0,
    categoria: '',
    // autofill
    rotacion_controlable: false,
    tipo_rotacion: '',
    recontratable: false,
    // user fills after
    afecta_indice: false,
    causaimss: 0,
    comentarios: '',
    // checklist
    firmorenuncia: false,
    prestamo_pdt: false,
    dev_uniforme: false,
    dev_radio: false,
    marca_radio: '',
    serie_radio: '',
    vb_jefe: false,
    baja_negociada: false,
    negocio: '',
    autorizo_neg: '',
    monto_negociado: 0,
    det_negociacion: '',
    observaciones: '',
  })

  const [autofilled, setAutofilled] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)

  const set = (k: keyof typeof form, v: unknown) => {
    setForm(p => ({ ...p, [k]: v }))
    setErrors(p => { const n = { ...p }; delete n[k]; return n })
  }

  const handleTipoBaja = (tipoId: number) => {
    setForm(prev => ({ ...prev, tipo_baja: tipoId, causa_baja: 0, rotacion_controlable: false, tipo_rotacion: '', recontratable: false }))
    setAutofilled(false)
    setErrors(p => { const n = { ...p }; delete n.tipo_baja; delete n.causa_baja; return n })
  }

  const handleCausaBaja = (causaId: number) => {
    const fill = CAUSA_BAJA_AUTOFILL[causaId]
    if (fill) {
      setForm(prev => ({ ...prev, causa_baja: causaId, rotacion_controlable: fill.rotacion_controlable, tipo_rotacion: fill.tipo_rotacion, recontratable: fill.recontratable }))
      setAutofilled(true)
    } else {
      set('causa_baja', causaId)
    }
    setErrors(p => { const n = { ...p }; delete n.causa_baja; return n })
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.fecha_baja) e.fecha_baja = 'Requerido'
    else if (esFechaFutura(form.fecha_baja)) e.fecha_baja = 'La fecha de baja no puede ser futura'
    if (!form.jefe_actual.trim()) e.jefe_actual = 'Requerido'
    if (!form.tipo_baja) e.tipo_baja = 'Requerido'
    if (!form.causa_baja) e.causa_baja = 'Requerido'
    if (!form.categoria) e.categoria = 'Requerido'
    if (!form.causaimss) e.causaimss = 'Requerido'
    return e
  }

  const handleSave = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    const causaDesc = causasBaja.find(c => c.clave === form.causa_baja)?.descripcion ?? ''
    registrarBaja({
      clave: empleado.clave,
      fecha_baja: form.fecha_baja,
      jefe_actual: form.jefe_actual,
      servicio: form.servicio || undefined,
      tipo_baja: form.tipo_baja,
      motivo_baja: 0,
      causa_baja: form.causa_baja,
      causa_detalle: causaDesc,
      categoria: form.categoria,
      rotacion_controlable: form.rotacion_controlable,
      tipo_rotacion: form.tipo_rotacion || 'No aplica',
      causaimss: form.causaimss,
      cbr: form.rotacion_controlable ? 'Controlable' : 'No controlable',
      firmorenuncia: form.firmorenuncia,
      recontratable: form.recontratable,
      prestamo_pdt: form.prestamo_pdt,
      dev_uniforme: form.dev_uniforme,
      dev_radio: form.dev_radio,
      marca_radio: form.dev_radio ? form.marca_radio : undefined,
      serie_radio: form.dev_radio ? form.serie_radio : undefined,
      vb_jefe: form.vb_jefe,
      baja_negociada: form.baja_negociada,
      negocio: form.baja_negociada ? form.negocio : undefined,
      autorizo_neg: form.baja_negociada ? form.autorizo_neg : undefined,
      monto_negociado: form.baja_negociada ? form.monto_negociado : undefined,
      det_negociacion: form.baja_negociada ? form.det_negociacion : undefined,
      observaciones: [form.comentarios, form.observaciones].filter(Boolean).join(' | '),
    })
    setSuccess(true)
    setTimeout(() => { setSuccess(false); onClose() }, 2000)
  }

  const empresaNombre = getEmpresaNombre(empleado.empresa)
  const deptNombre = getDepartamentoNombre(empleado.depto)
  const puestoNombre = getPuestoNombre(empleado.puesto)

  const causasFiltradas = causasBaja
  const tipoBajaLabel = tiposBaja.find(t => t.clave === form.tipo_baja)?.descripcion ?? ''
  const causaBajaLabel = causasBaja.find(c => c.clave === form.causa_baja)?.descripcion ?? ''
  const causaIMSSLabel = causasIMSS.find(c => c.clave === form.causaimss)?.descripcion ?? ''

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-5xl w-[90vw] overflow-y-auto max-h-[92vh] p-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <UserX className="w-4.5 h-4.5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-base">Registrar Baja</DialogTitle>
              <DialogDescription className="text-xs">Complete todos los campos para procesar la baja del colaborador</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-4 py-12 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-800">Baja registrada exitosamente</p>
              <p className="text-sm text-gray-500 mt-1">{empleado.nombre_completo} ha sido dado de baja del sistema.</p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5">

            {/* Employee summary */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 grid grid-cols-4 gap-3">
              <div className="flex items-center gap-2 col-span-4 sm:col-span-2">
                <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Colaborador</p>
                  <p className="text-xs font-bold text-gray-800">{empleado.nombre_completo}</p>
                  <p className="text-[10px] text-indigo-600 font-mono">#{empleado.clave}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Empresa</p>
                  <p className="text-xs font-semibold text-gray-700">{empresaNombre}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Puesto</p>
                  <p className="text-xs font-semibold text-gray-700">{puestoNombre}</p>
                  <p className="text-[10px] text-gray-400">{deptNombre}</p>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">N° Nómina</Label>
                <div className="h-8 px-3 flex items-center bg-gray-50 border border-gray-200 rounded-md text-xs font-mono text-indigo-600 font-semibold">{empleado.clave}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Fecha de baja *</Label>
                <Input type="date" className="h-8 text-xs" value={form.fecha_baja} onChange={e => set('fecha_baja', e.target.value)} />
                {errors.fecha_baja && <p className="text-[10px] text-red-500">{errors.fecha_baja}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Fecha de captura</Label>
                <div className="h-8 px-3 flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Jefe actual *</Label>
                <Input className="h-8 text-xs" placeholder="Nombre del jefe directo" value={form.jefe_actual} onChange={e => set('jefe_actual', e.target.value)} />
                {errors.jefe_actual && <p className="text-[10px] text-red-500">{errors.jefe_actual}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Servicio / Unidad</Label>
                <Input className="h-8 text-xs" placeholder="Ej. Ruta 12 / Unidad Mty" value={form.servicio} onChange={e => set('servicio', e.target.value)} />
              </div>
            </div>

            {/* ── USUARIO LLENA ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Tipo de baja *</Label>
                <Select onValueChange={(v: unknown) => handleTipoBaja(parseInt(String(v)))}>
                  <SelectTrigger className="h-8 text-xs w-full">
                    <span className={`flex-1 text-left text-xs truncate ${!tipoBajaLabel ? 'text-muted-foreground' : ''}`}>
                      {tipoBajaLabel || 'Seleccionar tipo...'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {tiposBaja.map(t => (
                      <SelectItem key={t.clave} value={String(t.clave)} className="text-xs">{t.descripcion}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tipo_baja && <p className="text-[10px] text-red-500">{errors.tipo_baja}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Categoría *</Label>
                <Select onValueChange={(v: unknown) => set('categoria', String(v))}>
                  <SelectTrigger className="h-8 text-xs w-full">
                    <span className={`flex-1 text-left text-xs truncate ${!form.categoria ? 'text-muted-foreground' : ''}`}>
                      {form.categoria || 'Seleccionar...'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_EMP.map(c => (
                      <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoria && <p className="text-[10px] text-red-500">{errors.categoria}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Causa de baja *
              </Label>
              <Select onValueChange={(v: unknown) => handleCausaBaja(parseInt(String(v)))}>
                <SelectTrigger className="h-8 text-xs w-full">
                  <span className={`flex-1 text-left text-xs truncate ${!causaBajaLabel ? 'text-muted-foreground' : ''}`}>
                    {causaBajaLabel || 'Seleccionar causa...'}
                  </span>
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {causasFiltradas.map(c => (
                    <SelectItem key={c.clave} value={String(c.clave)} className="text-xs">{c.descripcion}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.causa_baja && <p className="text-[10px] text-red-500">{errors.causa_baja}</p>}
            </div>

            {/* ── AUTOFILL ── */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide flex items-center gap-1.5">
                <Zap className="w-3 h-3" />
                Se llenan automáticamente al seleccionar la causa
              </p>
              <div className="grid grid-cols-3 gap-3">
                <AutofillBool label="Rotación controlable" value={form.rotacion_controlable} filled={autofilled} />
                <AutofillDisplay label="Tipo de rotación" value={form.tipo_rotacion} filled={autofilled && !!form.tipo_rotacion} />
                <AutofillBool label="Trabajador recontratable" value={form.recontratable} filled={autofilled} />
              </div>
            </div>

            {/* ── USUARIO LLENA DESPUÉS ── */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Datos complementarios</p>

              <div className="grid grid-cols-2 gap-3">
                <YesNo label="Afecta índice de rotación" value={form.afecta_indice} onChange={v => set('afecta_indice', v)} />
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Causa aviso IMSS *</Label>
                  <Select onValueChange={(v: unknown) => set('causaimss', parseInt(String(v)))}>
                    <SelectTrigger className="h-8 text-xs w-full">
                      <span className={`flex-1 text-left text-xs truncate ${!causaIMSSLabel ? 'text-muted-foreground' : ''}`}>
                        {causaIMSSLabel || 'Seleccionar...'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {causasIMSS.map(c => (
                        <SelectItem key={c.clave} value={String(c.clave)} className="text-xs">{c.descripcion}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.causaimss && <p className="text-[10px] text-red-500">{errors.causaimss}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Comentarios</Label>
                <Textarea
                  className="text-xs min-h-[56px] resize-none"
                  placeholder="Comentarios sobre la causa de baja..."
                  value={form.comentarios}
                  onChange={e => set('comentarios', e.target.value)}
                />
              </div>
            </div>

            {/* ── CHECKLIST ── */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Checklist de salida</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                <YesNo label="Firmó renuncia" value={form.firmorenuncia} onChange={v => set('firmorenuncia', v)} />
                <YesNo label="Tiene préstamos" value={form.prestamo_pdt} onChange={v => set('prestamo_pdt', v)} />
                <YesNo label="Devolvió uniforme" value={form.dev_uniforme} onChange={v => set('dev_uniforme', v)} />
                <YesNo label="Devolvió equipo" value={form.dev_radio} onChange={v => set('dev_radio', v)} />
                <YesNo label="V.B. del jefe" value={form.vb_jefe} onChange={v => set('vb_jefe', v)} />
                <YesNo label="Baja negociada" value={form.baja_negociada} onChange={v => set('baja_negociada', v)} />
              </div>
            </div>

            {form.dev_radio && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Marca del equipo</Label>
                  <Input className="h-8 text-xs" placeholder="Marca..." value={form.marca_radio} onChange={e => set('marca_radio', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">N° de serie</Label>
                  <Input className="h-8 text-xs" placeholder="Serie..." value={form.serie_radio} onChange={e => set('serie_radio', e.target.value)} />
                </div>
              </div>
            )}

            {form.baja_negociada && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  Detalles de Baja Negociada
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Negocio / Motivo negociación</Label>
                    <Input className="h-8 text-xs bg-white" placeholder="Descripción del acuerdo..." value={form.negocio} onChange={e => set('negocio', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Autorizó</Label>
                    <Input className="h-8 text-xs bg-white" placeholder="Nombre de quien autorizó..." value={form.autorizo_neg} onChange={e => set('autorizo_neg', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Monto negociado ($)</Label>
                  <Input type="number" className="h-8 text-xs bg-white w-48" placeholder="0.00" value={form.monto_negociado || ''} onChange={e => set('monto_negociado', parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Detalle de negociación</Label>
                  <Textarea className="text-xs min-h-[56px] resize-none bg-white" placeholder="Descripción detallada del acuerdo alcanzado..." value={form.det_negociacion} onChange={e => set('det_negociacion', e.target.value)} />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-medium">Observaciones</Label>
              <Textarea className="text-xs min-h-[64px] resize-none" placeholder="Notas adicionales sobre la baja..." value={form.observaciones} onChange={e => set('observaciones', e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
              <Button type="button" size="sm" className="bg-red-600 hover:bg-red-700 text-white font-bold" onClick={handleSave}>
                <UserX className="w-3.5 h-3.5 mr-1.5" />
                Registrar Baja
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
