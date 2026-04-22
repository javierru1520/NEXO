"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSCRHStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { calcularSalario, formatMXN } from '@/lib/calculations'
import { mensajeRFC } from '@/lib/validations'
import { PUESTO_ASIGNACION } from '@/lib/mock-data'
import { Check, User, Briefcase, DollarSign, ClipboardCheck, Calculator, AlertCircle } from 'lucide-react'

// ── Schemas ──────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  a_paterno:  z.string().min(2, 'Requerido').max(25),
  a_materno:  z.string().min(2, 'Requerido').max(25),
  nombre:     z.string().min(2, 'Requerido').max(25),
  rfc: z.string()
    .min(1, 'El RFC es requerido')
    .transform((v: string) => v.toUpperCase().trim())
    .refine((v: string) => !mensajeRFC(v), { message: 'Formato inválido (ej: GOAM850101ABC)' }),
  curp:       z.string().max(18).optional().or(z.literal('')),
  imss:       z.string().optional().or(z.literal('')).refine(v => !v || /^[0-9]{11}$/.test(v), 'NSS: 11 dígitos'),
  f_nacimiento: z.string().min(1, 'Requerida').refine(v => new Date(v) <= new Date(), 'No puede ser futura'),
  sexo:       z.enum(['M', 'F']),
  rh:         z.string().optional().or(z.literal('')),
  edo_civil:  z.string().optional().or(z.literal('')),
  telefono:   z.string().optional().or(z.literal('')),
  email_corp: z.string().email('Email inválido').optional().or(z.literal('')),
})

const step2Schema = z.object({
  empresa:         z.number().min(1, 'Seleccione empresa'),
  depto:           z.number().min(1, 'Seleccione departamento'),
  puesto:          z.number().min(1, 'Seleccione puesto'),
  ccostos:         z.number().min(1, 'Seleccione centro de costos'),
  unidad_negocios: z.number().min(0),
  grado_salarial:  z.string().optional().or(z.literal('')),
  tipo_costo:      z.string().optional().or(z.literal('')),
  nivel_puesto:    z.string().optional().or(z.literal('')),
  jefe_inmed:      z.string().optional().or(z.literal('')),
  alta:            z.string().min(1, 'Requerida'),
  fecha_contrato:  z.string().optional().or(z.literal('')),
  tipo_contrato:   z.string().min(1, 'Requerido'),
  solicito:        z.string().optional().or(z.literal('')),
  autorizo:        z.string().optional().or(z.literal('')),
})

const step3Schema = z.object({
  sueldo_mensual: z.number()
    .refine((v: number) => !isNaN(v) && v > 0,   { message: 'Ingrese el sueldo' })
    .refine((v: number) => v >= 100,              { message: 'Muy bajo — verifique que sea mensual' })
    .refine((v: number) => v <= 500000,           { message: 'Muy alto — verifique el monto' }),
  banco:           z.string().optional().or(z.literal('')),
  cuenta_bancaria: z.string().optional().or(z.literal('')),
  clabe:           z.string().max(18).optional().or(z.literal('')),
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>
type Step3Data = z.infer<typeof step3Schema>

const STEPS = [
  { label: 'Generales',    icon: User },
  { label: 'Laborales',    icon: Briefcase },
  { label: 'Salariales',   icon: DollarSign },
  { label: 'Confirmación', icon: ClipboardCheck },
]

const RH_OPTIONS  = ['A+','A-','B+','B-','AB+','AB-','O+','O-']
const BANCOS      = ['BBVA','BANAMEX','BANORTE','HSBC','SANTANDER','SCOTIABANK','OTRO']
const CONTRATOS   = ['Indefinido','Temporal','Por Obra']
const EDO_CIVIL   = ['Soltero(a)','Casado(a)','Divorciado(a)','Viudo(a)','Unión libre']

// ── Field helpers ─────────────────────────────────────────────────────────────

function FieldWrap({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-gray-600">{label}</Label>
      {children}
      {error && <p className="text-[10px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pb-1 border-b border-gray-100 mb-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{children}</span>
    </div>
  )
}

interface NuevoEmpleadoFormProps { onClose: () => void }

export default function NuevoEmpleadoForm({ onClose }: NuevoEmpleadoFormProps) {
  const { empresas, departamentos, puestos, centrosCostos, unidadesNegocio, addAltaProvisional } = useSCRHStore()

  const [step, setStep]             = useState(0)
  const [step1Data, setStep1Data]   = useState<Step1Data | null>(null)
  const [step2Data, setStep2Data]   = useState<Step2Data | null>(null)
  const [step3Data, setStep3Data]   = useState<Step3Data | null>(null)
  const [salaryPreview, setSalary]  = useState<ReturnType<typeof calcularSalario> | null>(null)
  const [saved, setSaved]           = useState(false)
  const [saveError, setSaveError]   = useState('')

  const form1 = useForm<Step1Data>({ resolver: zodResolver(step1Schema), defaultValues: { sexo: 'M' } })
  const form2 = useForm<Step2Data>({ resolver: zodResolver(step2Schema), defaultValues: { tipo_contrato: 'Indefinido' } })
  const form3 = useForm<Step3Data>({ resolver: zodResolver(step3Schema) })

  const watchNames = form1.watch(['a_paterno','a_materno','nombre'])
  const nombreCompleto = [watchNames[0], watchNames[1], watchNames[2]].map(v => (v ?? '').trim()).filter(Boolean).join(' ')

  const handleStep1 = (data: Step1Data) => { setStep1Data(data); setStep(1) }
  const handleStep2 = (data: Step2Data) => { setStep2Data(data); setStep(2) }

  const handleStep3 = (data: Step3Data) => {
    setStep3Data(data)
    const empresa = empresas.find(e => e.clave === step2Data?.empresa)
    setSalary(calcularSalario(data.sueldo_mensual, empresa?.periodo_pago ?? 'catorcenal'))
    setStep(3)
  }

  const calcPreview = () => {
    const sueldo = form3.getValues('sueldo_mensual')
    if (!sueldo || sueldo <= 0) return
    const empresa = empresas.find(e => e.clave === form2.watch('empresa'))
    setSalary(calcularSalario(sueldo, empresa?.periodo_pago ?? 'catorcenal'))
  }

  const handleSave = () => {
    if (!step1Data || !step2Data || !step3Data) return
    setSaveError('')
    const err = addAltaProvisional({
      clave:            '',
      nombre_completo:  `${step1Data.a_paterno} ${step1Data.a_materno} ${step1Data.nombre}`,
      a_paterno:        step1Data.a_paterno,
      a_materno:        step1Data.a_materno,
      nombre:           step1Data.nombre,
      f_nacimiento:     step1Data.f_nacimiento,
      sexo:             step1Data.sexo,
      rfc:              step1Data.rfc,
      curp:             step1Data.curp ?? '',
      imss:             step1Data.imss ?? '',
      grupo_sanguineo:  step1Data.rh ?? '',
      estado_civil:     step1Data.edo_civil ?? '',
      telefono:         step1Data.telefono ?? '',
      empresa:          step2Data.empresa,
      depto:            step2Data.depto,
      puesto:           step2Data.puesto,
      ccostos:          step2Data.ccostos,
      unidad_negocios:  step2Data.unidad_negocios ?? 0,
      grado_salarial:   step2Data.grado_salarial || undefined,
      tipo_costo:       step2Data.tipo_costo || undefined,
      nivel_puesto:     step2Data.nivel_puesto || undefined,
      jefe_inmediato:   step2Data.jefe_inmed ?? '',
      tipo_contrato:    step2Data.tipo_contrato,
      sueldo_mensual:   step3Data.sueldo_mensual,
      ayuda_mensual:    salaryPreview?.despensa ?? 0,
      fecha_ingreso:    step2Data.alta,
      fecha_contrato:   step2Data.fecha_contrato ?? step2Data.alta,
      solicito:         step2Data.solicito ?? '',
      autorizo:         step2Data.autorizo ?? '',
      banco:            step3Data.banco ?? '',
      cuenta_bancaria:  step3Data.cuenta_bancaria ?? '',
      clabe:            step3Data.clabe ?? '',
      observaciones:    '',
      status:           2,
    })
    if (err) { setSaveError(err); return }
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 2000)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* Stepper */}
      <div className="flex items-center px-6 py-4 border-b border-gray-100 bg-gray-50/60 shrink-0">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const done   = i < step
          const active = i === step
          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all ${
                  done   ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : active? 'bg-white border-indigo-600 text-indigo-600'
                  :         'bg-white border-gray-200 text-gray-400'
                }`}>
                  {done ? <Check className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className={`text-[9px] font-semibold whitespace-nowrap ${active ? 'text-indigo-600' : done ? 'text-gray-500' : 'text-gray-300'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-colors ${i < step ? 'bg-indigo-500' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">

        {/* ── Success ── */}
        {saved && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-sm font-semibold text-gray-800">Alta provisional guardada</p>
            <p className="text-xs text-gray-500">El registro fue creado con estatus Provisional.</p>
          </div>
        )}

        {/* ══ Step 0: Datos Generales ══ */}
        {step === 0 && !saved && (
          <form onSubmit={form1.handleSubmit(handleStep1)} className="space-y-5">
            <SectionTitle>Identificación</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              <FieldWrap label="Apellido paterno *" error={form1.formState.errors.a_paterno?.message}>
                <Input className="h-8 text-xs" {...form1.register('a_paterno')} />
              </FieldWrap>
              <FieldWrap label="Apellido materno *" error={form1.formState.errors.a_materno?.message}>
                <Input className="h-8 text-xs" {...form1.register('a_materno')} />
              </FieldWrap>
              <FieldWrap label="Nombre(s) *" error={form1.formState.errors.nombre?.message}>
                <Input className="h-8 text-xs" {...form1.register('nombre')} />
              </FieldWrap>
            </div>

            <FieldWrap label="Nombre completo (auto)">
              <Input className="h-8 text-xs bg-gray-50 text-gray-500" value={nombreCompleto} readOnly />
            </FieldWrap>

            <div className="grid grid-cols-2 gap-3">
              <FieldWrap label="RFC *" error={form1.formState.errors.rfc?.message}>
                <Input className="h-8 text-xs uppercase" maxLength={14} placeholder="GOAM850101ABC" {...form1.register('rfc')} />
              </FieldWrap>
              <FieldWrap label="CURP" error={form1.formState.errors.curp?.message}>
                <Input className="h-8 text-xs uppercase" maxLength={18} {...form1.register('curp')} />
              </FieldWrap>
              <FieldWrap label="NSS / IMSS (11 dígitos)" error={form1.formState.errors.imss?.message}>
                <Input className="h-8 text-xs" maxLength={11} placeholder="00000000000" {...form1.register('imss')} />
              </FieldWrap>
              <FieldWrap label="Fecha de nacimiento *" error={form1.formState.errors.f_nacimiento?.message}>
                <Input type="date" className="h-8 text-xs" {...form1.register('f_nacimiento')} />
              </FieldWrap>
            </div>

            <SectionTitle>Datos personales</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              <FieldWrap label="Sexo *">
                <RadioGroup
                  defaultValue="M"
                  className="flex gap-4 pt-1"
                  onValueChange={(v: unknown) => form1.setValue('sexo', String(v) as 'M' | 'F')}
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="M" id="s-m" />
                    <Label htmlFor="s-m" className="text-xs cursor-pointer">Masculino</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="F" id="s-f" />
                    <Label htmlFor="s-f" className="text-xs cursor-pointer">Femenino</Label>
                  </div>
                </RadioGroup>
              </FieldWrap>
              <FieldWrap label="Grupo sanguíneo">
                <Select onValueChange={(v: unknown) => form1.setValue('rh', String(v))}>
                  <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>{RH_OPTIONS.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent>
                </Select>
              </FieldWrap>
              <FieldWrap label="Estado civil">
                <Select onValueChange={(v: unknown) => form1.setValue('edo_civil', String(v))}>
                  <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>{EDO_CIVIL.map(e => <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>)}</SelectContent>
                </Select>
              </FieldWrap>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FieldWrap label="Teléfono">
                <Input className="h-8 text-xs" placeholder="10 dígitos" {...form1.register('telefono')} />
              </FieldWrap>
              <FieldWrap label="Email corporativo" error={form1.formState.errors.email_corp?.message}>
                <Input className="h-8 text-xs" type="email" placeholder="nombre@empresa.com" {...form1.register('email_corp')} />
              </FieldWrap>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" className="text-xs" onClick={onClose}>Cancelar</Button>
              <Button type="submit" size="sm" className="text-xs">Siguiente →</Button>
            </div>
          </form>
        )}

        {/* ══ Step 1: Datos Laborales ══ */}
        {step === 1 && !saved && (
          <form onSubmit={form2.handleSubmit(handleStep2)} className="space-y-5">
            <SectionTitle>Asignación organizacional</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <FieldWrap label="Empresa *" error={form2.formState.errors.empresa?.message}>
                <Select onValueChange={(v: unknown) => form2.setValue('empresa', parseInt(String(v)))}>
                  <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>{empresas.map(e => <SelectItem key={e.clave} value={String(e.clave)} className="text-xs">{e.razon_social}</SelectItem>)}</SelectContent>
                </Select>
              </FieldWrap>
              <FieldWrap label="Puesto *" error={form2.formState.errors.puesto?.message}>
                <Select
                  value={form2.watch('puesto') ? String(form2.watch('puesto')) : null}
                  itemToStringLabel={(v) => puestos.find(p => String(p.clave) === v)?.descripcion ?? String(v)}
                  onValueChange={(v: unknown) => {
                    const puestoId = parseInt(String(v))
                    form2.setValue('puesto', puestoId)
                    const asign = PUESTO_ASIGNACION[puestoId]
                    if (asign) {
                      form2.setValue('depto', asign.depto)
                      form2.setValue('ccostos', asign.ccostos)
                      form2.setValue('unidad_negocios', asign.unidad)
                      form2.setValue('grado_salarial', asign.grado)
                      form2.setValue('tipo_costo', asign.tipoCosto)
                      form2.setValue('nivel_puesto', asign.nivel)
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>{puestos.map(p => <SelectItem key={p.clave} value={String(p.clave)} className="text-xs">{p.descripcion}</SelectItem>)}</SelectContent>
                </Select>
              </FieldWrap>
              <FieldWrap label="Departamento *" error={form2.formState.errors.depto?.message}>
                <div className={`h-8 w-full flex items-center px-2 rounded-md border text-xs ${form2.watch('depto') ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-medium' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                  {form2.watch('depto') ? departamentos.find(d => d.clave === form2.watch('depto'))?.descripcion : 'Autofill'}
                </div>
              </FieldWrap>
              <FieldWrap label="Centro de costos *" error={form2.formState.errors.ccostos?.message}>
                <div className={`h-8 w-full flex items-center px-2 rounded-md border text-xs ${form2.watch('ccostos') ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-medium' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                  {form2.watch('ccostos') ? centrosCostos.find(c => c.clave === form2.watch('ccostos'))?.descripcion : 'Autofill'}
                </div>
              </FieldWrap>
              <FieldWrap label="Área funcional (Talentrax)">
                <div className={`h-8 w-full flex items-center px-2 rounded-md border text-xs ${form2.watch('unidad_negocios') ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-medium' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                  {form2.watch('unidad_negocios') ? unidadesNegocio.find(u => u.clave === form2.watch('unidad_negocios'))?.descripcion : 'Autofill'}
                </div>
              </FieldWrap>
              <FieldWrap label="Grado salarial">
                <div className={`h-8 w-full flex items-center px-2 rounded-md border text-xs ${form2.watch('grado_salarial') ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-medium' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                  {form2.watch('grado_salarial') || 'Autofill'}
                </div>
              </FieldWrap>
              <FieldWrap label="Tipo de costo">
                <div className={`h-8 w-full flex items-center px-2 rounded-md border text-xs ${form2.watch('tipo_costo') ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-medium' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                  {form2.watch('tipo_costo') || 'Autofill'}
                </div>
              </FieldWrap>
              <FieldWrap label="Nivel de puesto">
                <div className={`h-8 w-full flex items-center px-2 rounded-md border text-xs ${form2.watch('nivel_puesto') ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-medium' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                  {form2.watch('nivel_puesto') || 'Autofill'}
                </div>
              </FieldWrap>
              <FieldWrap label="Tipo de contrato *" error={form2.formState.errors.tipo_contrato?.message}>
                <Select defaultValue="Indefinido" onValueChange={(v: unknown) => form2.setValue('tipo_contrato', String(v))}>
                  <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{CONTRATOS.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                </Select>
              </FieldWrap>
            </div>

            <FieldWrap label="Jefe inmediato (nómina)">
              <Input className="h-8 text-xs font-mono" placeholder="15100002" {...form2.register('jefe_inmed')} />
            </FieldWrap>

            <SectionTitle>Contratación</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <FieldWrap label="Fecha de ingreso *" error={form2.formState.errors.alta?.message}>
                <Input type="date" className="h-8 text-xs" {...form2.register('alta')} />
              </FieldWrap>
              <FieldWrap label="Fecha de contrato">
                <Input type="date" className="h-8 text-xs" {...form2.register('fecha_contrato')} />
              </FieldWrap>
              <FieldWrap label="Solicitó">
                <Input className="h-8 text-xs" {...form2.register('solicito')} />
              </FieldWrap>
              <FieldWrap label="Autorizó">
                <Input className="h-8 text-xs" {...form2.register('autorizo')} />
              </FieldWrap>
            </div>

            <div className="flex justify-between pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setStep(0)}>← Anterior</Button>
              <Button type="submit" size="sm" className="text-xs">Siguiente →</Button>
            </div>
          </form>
        )}

        {/* ══ Step 2: Datos Salariales ══ */}
        {step === 2 && !saved && (
          <form onSubmit={form3.handleSubmit(handleStep3)} className="space-y-5">
            <SectionTitle>Salario</SectionTitle>
            <FieldWrap label="Sueldo mensual bruto *" error={form3.formState.errors.sueldo_mensual?.message}>
              <div className="flex gap-2">
                <Input
                  type="number"
                  className="h-8 text-xs"
                  placeholder="Ej: 8500"
                  {...form3.register('sueldo_mensual', { valueAsNumber: true })}
                />
                <Button type="button" variant="outline" size="sm" onClick={calcPreview} className="gap-1 shrink-0 text-xs">
                  <Calculator className="w-3.5 h-3.5" /> Calcular
                </Button>
              </div>
            </FieldWrap>

            {salaryPreview && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-1.5">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-2">Desglose salarial</p>
                {([
                  ['Salario diario',       salaryPreview.sd],
                  ['SDI',                  salaryPreview.sdi],
                  ['Despensa (10%)',        salaryPreview.despensa],
                  ['Asistencia (6%)',       salaryPreview.asistencia],
                  ['Puntualidad (3%)',      salaryPreview.puntualidad],
                  ['Sueldo catorcenal',     salaryPreview.s_catorcenal],
                  ['Total percepciones',   salaryPreview.sdo_mensual],
                ] as [string, number][]).map(([label, val]) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-semibold text-indigo-700">{formatMXN(val)}</span>
                  </div>
                ))}
              </div>
            )}

            <SectionTitle>Datos bancarios (opcional)</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <FieldWrap label="Banco">
                <Select onValueChange={(v: unknown) => form3.setValue('banco', String(v))}>
                  <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>{BANCOS.map(b => <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>)}</SelectContent>
                </Select>
              </FieldWrap>
              <FieldWrap label="No. de cuenta">
                <Input className="h-8 text-xs font-mono" {...form3.register('cuenta_bancaria')} />
              </FieldWrap>
              <div className="col-span-2">
                <FieldWrap label="CLABE interbancaria (18 dígitos)">
                  <Input className="h-8 text-xs font-mono" maxLength={18} placeholder="000000000000000000" {...form3.register('clabe')} />
                </FieldWrap>
              </div>
            </div>

            <div className="flex justify-between pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setStep(1)}>← Anterior</Button>
              <Button type="submit" size="sm" className="text-xs">Siguiente →</Button>
            </div>
          </form>
        )}

        {/* ══ Step 3: Confirmación ══ */}
        {step === 3 && !saved && step1Data && step2Data && step3Data && (
          <div className="space-y-4">

            {/* Personales */}
            <div className="rounded-xl border border-blue-100 overflow-hidden">
              <div className="bg-blue-50 px-4 py-2">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Datos Personales</p>
              </div>
              <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {[
                  ['Nombre',        `${step1Data.a_paterno} ${step1Data.a_materno} ${step1Data.nombre}`],
                  ['RFC',           step1Data.rfc],
                  ['CURP',          step1Data.curp || '—'],
                  ['NSS / IMSS',    step1Data.imss || '—'],
                  ['F. Nacimiento', step1Data.f_nacimiento],
                  ['Sexo',          step1Data.sexo === 'M' ? 'Masculino' : 'Femenino'],
                  ['Gpo. Sanguíneo',step1Data.rh || '—'],
                  ['Estado civil',  step1Data.edo_civil || '—'],
                  ['Teléfono',      step1Data.telefono || '—'],
                  ['Email',         step1Data.email_corp || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-gray-400">{k}</span>
                    <span className="font-medium text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Laborales */}
            <div className="rounded-xl border border-green-100 overflow-hidden">
              <div className="bg-green-50 px-4 py-2">
                <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Datos Laborales</p>
              </div>
              <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {[
                  ['Empresa',        empresas.find(e => e.clave === step2Data.empresa)?.razon_social ?? '—'],
                  ['Departamento',   departamentos.find(d => d.clave === step2Data.depto)?.descripcion ?? '—'],
                  ['Puesto',         puestos.find(p => p.clave === step2Data.puesto)?.descripcion ?? '—'],
                  ['C. Costos',      centrosCostos.find(c => c.clave === step2Data.ccostos)?.descripcion ?? '—'],
                  ['Jefe inmediato', step2Data.jefe_inmed || '—'],
                  ['Tipo contrato',  step2Data.tipo_contrato],
                  ['F. Ingreso',     step2Data.alta],
                  ['Solicitó',       step2Data.solicito || '—'],
                  ['Autorizó',       step2Data.autorizo || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-gray-400">{k}</span>
                    <span className="font-medium text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Salariales */}
            <div className="rounded-xl border border-amber-100 overflow-hidden">
              <div className="bg-amber-50 px-4 py-2">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Datos Salariales</p>
              </div>
              <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {[
                  ['Sueldo bruto',    formatMXN(step3Data.sueldo_mensual)],
                  ...(salaryPreview ? [
                    ['S. catorcenal', formatMXN(salaryPreview.s_catorcenal)],
                    ['SDI',           formatMXN(salaryPreview.sdi)],
                    ['Despensa',      formatMXN(salaryPreview.despensa)],
                  ] : []),
                  ['Banco',          step3Data.banco || '—'],
                  ['CLABE',          step3Data.clabe ? `****${step3Data.clabe.slice(-4)}` : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-gray-400">{k}</span>
                    <span className="font-medium text-right font-mono">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {saveError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="text-xs text-red-700 font-medium">{saveError}</span>
              </div>
            )}

            <div className="flex justify-between pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setStep(2)}>← Anterior</Button>
              <Button type="button" size="sm" className="text-xs bg-green-600 hover:bg-green-700 text-white gap-1.5" onClick={handleSave}>
                <Check className="w-3.5 h-3.5" /> Guardar Alta Provisional
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
