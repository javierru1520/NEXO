"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { departamentos, puestos } from '@/lib/mock-data'
import { Check, ChevronRight, ChevronLeft, User, Briefcase, DollarSign, ClipboardCheck } from 'lucide-react'

const step1Schema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  a_paterno: z.string().min(2, 'Apellido paterno requerido'),
  a_materno: z.string().min(2, 'Apellido materno requerido'),
  rfc: z.string().min(12, 'RFC inválido').max(13, 'RFC inválido'),
  curp: z.string().length(18, 'CURP debe tener 18 caracteres'),
  imss: z.string().min(11, 'NSS debe tener 11 dígitos').max(11),
  sexo: z.enum(['M', 'F']),
  f_nacimiento: z.string().min(1, 'Fecha requerida'),
  telefono: z.string().min(10, 'Teléfono inválido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
})

const step2Schema = z.object({
  empresa: z.coerce.number().min(1),
  depto: z.coerce.number().min(1, 'Seleccione departamento'),
  puesto: z.coerce.number().min(1, 'Seleccione puesto'),
  jefe_inmed: z.string().optional(),
  alta: z.string().min(1, 'Fecha de alta requerida'),
  tipo_contrato: z.string().min(1, 'Tipo de contrato requerido'),
  horario: z.string().min(1, 'Horario requerido'),
})

const step3Schema = z.object({
  sueldo_mensual: z.coerce.number().min(1, 'Sueldo requerido'),
  despensa: z.coerce.number().min(0).default(0),
  asistencia: z.coerce.number().min(0).default(0),
  puntualidad: z.coerce.number().min(0).default(0),
  banco: z.string().optional(),
  cuenta_bancaria: z.string().optional(),
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>
type Step3Data = z.infer<typeof step3Schema>

const steps = [
  { label: 'Datos Generales', icon: User },
  { label: 'Datos Laborales', icon: Briefcase },
  { label: 'Datos Salariales', icon: DollarSign },
  { label: 'Confirmación', icon: ClipboardCheck },
]

interface EmpleadoFormProps {
  onClose?: () => void
  onSubmit?: (data: Step1Data & Step2Data & Step3Data) => void
}

export default function EmpleadoForm({ onClose, onSubmit }: EmpleadoFormProps) {
  const [step, setStep] = useState(0)
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null)
  const [step3Data, setStep3Data] = useState<Step3Data | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const form1 = useForm<Step1Data>({ resolver: zodResolver(step1Schema) as never, defaultValues: (step1Data ?? {}) as never })
  const form2 = useForm<Step2Data>({ resolver: zodResolver(step2Schema) as never, defaultValues: (step2Data ?? {}) as never })
  const form3 = useForm<Step3Data>({ resolver: zodResolver(step3Schema) as never, defaultValues: (step3Data ?? {}) as never })

  const handleStep1 = form1.handleSubmit((data) => {
    setStep1Data(data)
    setStep(1)
  })

  const handleStep2 = form2.handleSubmit((data: Step2Data) => {
    setStep2Data(data as Step2Data)
    setStep(2)
  })

  const handleStep3 = form3.handleSubmit((data: Step3Data) => {
    setStep3Data(data as Step3Data)
    setStep(3)
  })

  const handleFinalSubmit = () => {
    if (step1Data && step2Data && step3Data) {
      onSubmit?.({ ...step1Data, ...step2Data, ...step3Data })
      setSubmitted(true)
    }
  }

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-white transition-all"
  const labelClass = "block text-xs font-semibold text-gray-600 mb-1"
  const errorClass = "text-[10px] text-red-500 mt-0.5"

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-800">Empleado registrado</h3>
        <p className="text-sm text-gray-500">El nuevo empleado ha sido creado exitosamente.</p>
        <button
          onClick={onClose}
          className="mt-2 px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Cerrar
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Stepper */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-0">
          {steps.map((s, i) => {
            const Icon = s.icon
            const done = i < step
            const active = i === step
            return (
              <div key={i} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      done
                        ? 'bg-green-500 text-white'
                        : active
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] font-medium whitespace-nowrap ${active ? 'text-indigo-600' : done ? 'text-green-600' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-px mx-2 mb-4 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Form content */}
      <div className="flex-1 overflow-y-auto px-6">

        {/* Step 0: Datos Generales */}
        {step === 0 && (
          <form id="form-step-0" onSubmit={handleStep1} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nombre(s) *</label>
                <input {...form1.register('nombre')} className={inputClass} placeholder="Juan Carlos" />
                {form1.formState.errors.nombre && <p className={errorClass}>{form1.formState.errors.nombre.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Apellido Paterno *</label>
                <input {...form1.register('a_paterno')} className={inputClass} placeholder="García" />
                {form1.formState.errors.a_paterno && <p className={errorClass}>{form1.formState.errors.a_paterno.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Apellido Materno *</label>
                <input {...form1.register('a_materno')} className={inputClass} placeholder="López" />
                {form1.formState.errors.a_materno && <p className={errorClass}>{form1.formState.errors.a_materno.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Sexo *</label>
                <select {...form1.register('sexo')} className={inputClass}>
                  <option value="">Seleccionar</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
                {form1.formState.errors.sexo && <p className={errorClass}>{form1.formState.errors.sexo.message}</p>}
              </div>
              <div>
                <label className={labelClass}>RFC *</label>
                <input {...form1.register('rfc')} className={inputClass} placeholder="GARC850312HBC" style={{ textTransform: 'uppercase' }} />
                {form1.formState.errors.rfc && <p className={errorClass}>{form1.formState.errors.rfc.message}</p>}
              </div>
              <div>
                <label className={labelClass}>CURP *</label>
                <input {...form1.register('curp')} className={inputClass} placeholder="GARC850312HBCXXX01" style={{ textTransform: 'uppercase' }} />
                {form1.formState.errors.curp && <p className={errorClass}>{form1.formState.errors.curp.message}</p>}
              </div>
              <div>
                <label className={labelClass}>NSS (IMSS) *</label>
                <input {...form1.register('imss')} className={inputClass} placeholder="12345678901" maxLength={11} />
                {form1.formState.errors.imss && <p className={errorClass}>{form1.formState.errors.imss.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Fecha de Nacimiento *</label>
                <input type="date" {...form1.register('f_nacimiento')} className={inputClass} />
                {form1.formState.errors.f_nacimiento && <p className={errorClass}>{form1.formState.errors.f_nacimiento.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Teléfono *</label>
                <input {...form1.register('telefono')} className={inputClass} placeholder="664-123-4567" />
                {form1.formState.errors.telefono && <p className={errorClass}>{form1.formState.errors.telefono.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" {...form1.register('email')} className={inputClass} placeholder="empleado@traxion.com" />
                {form1.formState.errors.email && <p className={errorClass}>{form1.formState.errors.email.message}</p>}
              </div>
            </div>
          </form>
        )}

        {/* Step 1: Datos Laborales */}
        {step === 1 && (
          <form id="form-step-1" onSubmit={handleStep2} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Empresa *</label>
                <select {...form2.register('empresa')} className={inputClass}>
                  <option value={1}>Traxion Tijuana</option>
                  <option value={2}>Traxion CDMX</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Departamento *</label>
                <select {...form2.register('depto')} className={inputClass}>
                  <option value="">Seleccionar</option>
                  {departamentos.map(d => (
                    <option key={d.clave} value={d.clave}>{d.descripcion}</option>
                  ))}
                </select>
                {form2.formState.errors.depto && <p className={errorClass}>{form2.formState.errors.depto.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Puesto *</label>
                <select {...form2.register('puesto')} className={inputClass}>
                  <option value="">Seleccionar</option>
                  {puestos.map(p => (
                    <option key={p.clave} value={p.clave}>{p.descripcion}</option>
                  ))}
                </select>
                {form2.formState.errors.puesto && <p className={errorClass}>{form2.formState.errors.puesto.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Jefe Inmediato</label>
                <input {...form2.register('jefe_inmed')} className={inputClass} placeholder="Clave del jefe" />
              </div>
              <div>
                <label className={labelClass}>Fecha de Alta *</label>
                <input type="date" {...form2.register('alta')} className={inputClass} />
                {form2.formState.errors.alta && <p className={errorClass}>{form2.formState.errors.alta.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Tipo de Contrato *</label>
                <select {...form2.register('tipo_contrato')} className={inputClass}>
                  <option value="">Seleccionar</option>
                  <option value="Indeterminado">Tiempo Indeterminado</option>
                  <option value="Determinado">Tiempo Determinado</option>
                  <option value="Por obra">Por Obra o Servicio</option>
                </select>
                {form2.formState.errors.tipo_contrato && <p className={errorClass}>{form2.formState.errors.tipo_contrato.message}</p>}
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Horario *</label>
                <select {...form2.register('horario')} className={inputClass}>
                  <option value="">Seleccionar</option>
                  <option value="Matutino">Matutino (06:00 - 14:00)</option>
                  <option value="Vespertino">Vespertino (14:00 - 22:00)</option>
                  <option value="Nocturno">Nocturno (22:00 - 06:00)</option>
                  <option value="Administrativo">Administrativo (08:00 - 17:00)</option>
                </select>
                {form2.formState.errors.horario && <p className={errorClass}>{form2.formState.errors.horario.message}</p>}
              </div>
            </div>
          </form>
        )}

        {/* Step 2: Datos Salariales */}
        {step === 2 && (
          <form id="form-step-2" onSubmit={handleStep3} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Sueldo Mensual *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
                  <input type="number" {...form3.register('sueldo_mensual')} className={`${inputClass} pl-7`} placeholder="15000" />
                </div>
                {form3.formState.errors.sueldo_mensual && <p className={errorClass}>{form3.formState.errors.sueldo_mensual.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Vales de Despensa</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
                  <input type="number" {...form3.register('despensa')} className={`${inputClass} pl-7`} placeholder="0" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Bono de Asistencia</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
                  <input type="number" {...form3.register('asistencia')} className={`${inputClass} pl-7`} placeholder="0" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Bono de Puntualidad</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
                  <input type="number" {...form3.register('puntualidad')} className={`${inputClass} pl-7`} placeholder="0" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Banco</label>
                <select {...form3.register('banco')} className={inputClass}>
                  <option value="">Sin banco</option>
                  <option value="BBVA">BBVA</option>
                  <option value="Santander">Santander</option>
                  <option value="Banamex">Banamex (Citibanamex)</option>
                  <option value="HSBC">HSBC</option>
                  <option value="Scotiabank">Scotiabank</option>
                  <option value="Banorte">Banorte</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Número de Cuenta / CLABE</label>
                <input {...form3.register('cuenta_bancaria')} className={inputClass} placeholder="1234 5678 9012 3456" />
              </div>
            </div>
          </form>
        )}

        {/* Step 3: Confirmación */}
        {step === 3 && step1Data && step2Data && step3Data && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800">Listo para registrar</p>
                <p className="text-xs text-green-600">Revisa los datos antes de confirmar</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Datos Generales
                </h4>
                <dl className="space-y-1.5">
                  {[
                    ['Nombre', `${step1Data.nombre} ${step1Data.a_paterno} ${step1Data.a_materno}`],
                    ['RFC', step1Data.rfc],
                    ['CURP', step1Data.curp],
                    ['NSS', step1Data.imss],
                    ['Sexo', step1Data.sexo === 'M' ? 'Masculino' : 'Femenino'],
                    ['F. Nac.', step1Data.f_nacimiento],
                    ['Teléfono', step1Data.telefono],
                    ['Email', step1Data.email || '-'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-[10px] text-gray-500">{k}</span>
                      <span className="text-[10px] font-medium text-gray-800 max-w-[55%] text-right truncate">{v}</span>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> Datos Laborales
                </h4>
                <dl className="space-y-1.5">
                  {[
                    ['Departamento', departamentos.find(d => d.clave === Number(step2Data.depto))?.descripcion ?? '-'],
                    ['Puesto', puestos.find(p => p.clave === Number(step2Data.puesto))?.descripcion ?? '-'],
                    ['F. Alta', step2Data.alta],
                    ['Contrato', step2Data.tipo_contrato],
                    ['Horario', step2Data.horario],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-[10px] text-gray-500">{k}</span>
                      <span className="text-[10px] font-medium text-gray-800">{v}</span>
                    </div>
                  ))}
                </dl>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-4 mb-3 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> Datos Salariales
                </h4>
                <dl className="space-y-1.5">
                  {[
                    ['Sueldo', new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(step3Data.sueldo_mensual)],
                    ['Despensa', new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(step3Data.despensa || 0)],
                    ['Banco', step3Data.banco || '-'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-[10px] text-gray-500">{k}</span>
                      <span className="text-[10px] font-medium text-gray-800">{v}</span>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
        <button
          onClick={() => step > 0 ? setStep(step - 1) : onClose?.()}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {step === 0 ? 'Cancelar' : 'Anterior'}
        </button>

        {step < 3 ? (
          <button
            type="submit"
            form={`form-step-${step}`}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleFinalSubmit}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Check className="w-4 h-4" />
            Confirmar y Guardar
          </button>
        )}
      </div>
    </div>
  )
}
