"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSCRHStore } from '@/store'
import { Empleado } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { calcularSalario, formatMXN } from '@/lib/calculations'
import { Save, Calculator, CheckCircle } from 'lucide-react'

// ── Schemas ───────────────────────────────────────────────────────────────────

const generalesSchema = z.object({
  a_paterno: z.string().min(1, 'Requerido').max(25),
  a_materno: z.string().min(1).max(25),
  nombre: z.string().min(1, 'Requerido').max(25),
  rfc: z.string().min(12).max(14),
  curp: z.string().max(18).optional().or(z.literal('')),
  imss: z.string().max(11).optional().or(z.literal('')),
  f_nacimiento: z.string().min(1),
  sexo: z.enum(['M', 'F']),
  rh: z.string().optional().or(z.literal('')),
  edo_civil: z.string().optional().or(z.literal('')),
  telefono: z.string().optional().or(z.literal('')),
  tel_contacto: z.string().optional().or(z.literal('')),
  contacto: z.string().optional().or(z.literal('')),
  calle: z.string().optional().or(z.literal('')),
  colonia: z.string().optional().or(z.literal('')),
  cp: z.string().optional().or(z.literal('')),
  localidad: z.string().optional().or(z.literal('')),
  estado: z.string().optional().or(z.literal('')),
  email_corp: z.string().email('Email inválido').optional().or(z.literal('')),
  email_personal: z.string().email('Email inválido').optional().or(z.literal('')),
})

const laboralesSchema = z.object({
  empresa: z.number().min(1),
  depto: z.number().min(1),
  puesto: z.number().min(1),
  ccostos: z.number().min(1),
  unidad_negocios: z.number().min(0),
  jefe_inmed: z.string().optional().or(z.literal('')),
  tipo_contrato: z.string().optional().or(z.literal('')),
  alta: z.string().min(1),
  fecha_contrato: z.string().optional().or(z.literal('')),
  st: z.number(),
  fecha_baja: z.string().optional().or(z.literal('')),
})

const salarialSchema = z.object({
  sueldo_mensual: z.number().min(1, 'Requerido'),
  banco: z.string().optional().or(z.literal('')),
  cuenta_bancaria: z.string().optional().or(z.literal('')),
})

type GeneralesData = z.infer<typeof generalesSchema>
type LaboralesData = z.infer<typeof laboralesSchema>
type SalarialData = z.infer<typeof salarialSchema>

const RH_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const BANCOS = ['BBVA', 'BANAMEX', 'BANORTE', 'HSBC', 'SANTANDER', 'SCOTIABANK']
const CONTRATOS = ['Indefinido', 'Temporal', 'Por Obra']
const EDO_CIVIL = ['Soltero(a)', 'Casado(a)', 'Divorciado(a)', 'Viudo(a)', 'Unión libre']
const ESTADOS_MX = ['Baja California', 'Sonora', 'Chihuahua', 'Nuevo León', 'Jalisco', 'CDMX', 'Otro']

interface EditarEmpleadoFormProps {
  empleado: Empleado
  onClose: () => void
}

export default function EditarEmpleadoForm({ empleado, onClose }: EditarEmpleadoFormProps) {
  const { empresas, departamentos, puestos, centrosCostos, unidadesNegocio, updateEmpleado } = useSCRHStore()
  const [savedTab, setSavedTab] = useState<string | null>(null)
  const [salaryPreview, setSalaryPreview] = useState<ReturnType<typeof calcularSalario> | null>(null)

  // Form: Generales
  const formGen = useForm<GeneralesData>({
    resolver: zodResolver(generalesSchema),
    defaultValues: {
      a_paterno: empleado.a_paterno,
      a_materno: empleado.a_materno,
      nombre: empleado.nombre,
      rfc: empleado.rfc,
      curp: empleado.curp ?? '',
      imss: empleado.imss ?? '',
      f_nacimiento: empleado.f_nacimiento,
      sexo: empleado.sexo,
      rh: empleado.rh ?? '',
      edo_civil: empleado.edo_civil ?? '',
      telefono: empleado.telefono ?? '',
      tel_contacto: empleado.tel_contacto ?? '',
      contacto: empleado.contacto ?? '',
      calle: empleado.calle ?? '',
      colonia: empleado.colonia ?? '',
      cp: empleado.cp ?? '',
      localidad: empleado.localidad ?? '',
      estado: empleado.estado ?? '',
      email_corp: empleado.email_corp ?? '',
      email_personal: empleado.email_personal ?? '',
    },
  })

  // Form: Laborales
  const formLab = useForm<LaboralesData>({
    resolver: zodResolver(laboralesSchema),
    defaultValues: {
      empresa: empleado.empresa,
      depto: empleado.depto,
      puesto: empleado.puesto,
      ccostos: empleado.ccostos,
      unidad_negocios: empleado.unidad_negocios,
      jefe_inmed: empleado.jefe_inmed ?? '',
      tipo_contrato: empleado.tipo_contrato ?? 'Indefinido',
      alta: empleado.alta,
      fecha_contrato: empleado.fecha_contrato ?? '',
      st: empleado.st,
      fecha_baja: empleado.fecha_baja ?? '',
    },
  })

  // Form: Salariales
  const formSal = useForm<SalarialData>({
    resolver: zodResolver(salarialSchema),
    defaultValues: {
      sueldo_mensual: empleado.sueldo_mensual,
      banco: empleado.banco ?? '',
      cuenta_bancaria: empleado.cuenta_bancaria ?? '',
    },
  })

  const flashSaved = (tab: string) => {
    setSavedTab(tab)
    setTimeout(() => setSavedTab(null), 2000)
  }

  const saveGenerales = (data: GeneralesData) => {
    const nombre_completo = `${data.a_paterno} ${data.a_materno} ${data.nombre}`
    updateEmpleado(empleado.clave, { ...data, nombre_completo })
    flashSaved('generales')
  }

  const saveLaborales = (data: LaboralesData) => {
    updateEmpleado(empleado.clave, data as Partial<Empleado>)
    flashSaved('laborales')
  }

  const saveSalariales = (data: SalarialData) => {
    const empresa = empresas.find(e => e.clave === empleado.empresa)
    const salary = calcularSalario(data.sueldo_mensual, empresa?.periodo_pago ?? 'catorcenal')
    updateEmpleado(empleado.clave, { ...salary, banco: data.banco, cuenta_bancaria: data.cuenta_bancaria })
    flashSaved('salariales')
  }

  const calcPreview = () => {
    const sueldo = formSal.getValues('sueldo_mensual')
    if (!sueldo) return
    const empresa = empresas.find(e => e.clave === empleado.empresa)
    const salary = calcularSalario(sueldo, empresa?.periodo_pago ?? 'catorcenal')
    setSalaryPreview(salary)
  }

  const SavedBanner = () => (
    <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
      <CheckCircle className="w-3.5 h-3.5" />
      Cambios guardados exitosamente
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="generales" className="flex flex-col h-full">
        <div className="px-4 pt-2 border-b border-gray-100 shrink-0">
          <TabsList variant="line" className="w-full">
            <TabsTrigger value="generales" className="flex-1 text-xs">Generales</TabsTrigger>
            <TabsTrigger value="laborales" className="flex-1 text-xs">Laborales</TabsTrigger>
            <TabsTrigger value="salariales" className="flex-1 text-xs">Salariales</TabsTrigger>
          </TabsList>
        </div>

        {/* Generales */}
        <TabsContent value="generales" className="flex-1 overflow-y-auto p-4 space-y-4">
          {savedTab === 'generales' && <SavedBanner />}
          <form onSubmit={formGen.handleSubmit(saveGenerales)} className="space-y-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Nombre</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">A. Paterno *</Label>
                <Input className="h-8 text-xs" {...formGen.register('a_paterno')} />
                {formGen.formState.errors.a_paterno && <p className="text-[10px] text-red-500">{formGen.formState.errors.a_paterno.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">A. Materno</Label>
                <Input className="h-8 text-xs" {...formGen.register('a_materno')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nombre(s) *</Label>
                <Input className="h-8 text-xs" {...formGen.register('nombre')} />
                {formGen.formState.errors.nombre && <p className="text-[10px] text-red-500">{formGen.formState.errors.nombre.message}</p>}
              </div>
            </div>

            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Documentos</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">RFC *</Label>
                <Input className="h-8 text-xs uppercase" maxLength={14} {...formGen.register('rfc')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CURP</Label>
                <Input className="h-8 text-xs uppercase" maxLength={18} {...formGen.register('curp')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">NSS (IMSS)</Label>
                <Input className="h-8 text-xs" maxLength={11} {...formGen.register('imss')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fecha nacimiento</Label>
                <Input type="date" className="h-8 text-xs" {...formGen.register('f_nacimiento')} />
              </div>
            </div>

            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Personal</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Sexo</Label>
                <RadioGroup
                  defaultValue={empleado.sexo}
                  className="flex gap-3 grid-cols-none"
                  onValueChange={(v: unknown) => formGen.setValue('sexo', String(v) as 'M' | 'F')}
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="M" id="edit-sexo-m" />
                    <Label htmlFor="edit-sexo-m" className="text-xs cursor-pointer">M</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="F" id="edit-sexo-f" />
                    <Label htmlFor="edit-sexo-f" className="text-xs cursor-pointer">F</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Grupo sanguíneo</Label>
                <Select defaultValue={empleado.rh} onValueChange={(v: unknown) => formGen.setValue('rh', String(v))}>
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RH_OPTIONS.map(rh => <SelectItem key={rh} value={rh} className="text-xs">{rh}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estado civil</Label>
                <Select defaultValue={empleado.edo_civil} onValueChange={(v: unknown) => formGen.setValue('edo_civil', String(v))}>
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue placeholder="..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EDO_CIVIL.map(ec => <SelectItem key={ec} value={ec} className="text-xs">{ec}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Dirección</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Calle y número</Label>
                <Input className="h-8 text-xs" {...formGen.register('calle')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Colonia</Label>
                <Input className="h-8 text-xs" {...formGen.register('colonia')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">C.P.</Label>
                <Input className="h-8 text-xs" {...formGen.register('cp')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Localidad</Label>
                <Input className="h-8 text-xs" {...formGen.register('localidad')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estado</Label>
                <Select defaultValue={empleado.estado} onValueChange={(v: unknown) => formGen.setValue('estado', String(v))}>
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue placeholder="..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_MX.map(e => <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Contacto</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Teléfono</Label>
                <Input className="h-8 text-xs" {...formGen.register('telefono')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contacto emergencia</Label>
                <Input className="h-8 text-xs" {...formGen.register('contacto')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tel. contacto</Label>
                <Input className="h-8 text-xs" {...formGen.register('tel_contacto')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email corporativo</Label>
                <Input className="h-8 text-xs" type="email" {...formGen.register('email_corp')} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Email personal</Label>
                <Input className="h-8 text-xs" type="email" {...formGen.register('email_personal')} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white py-3">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
              <Button type="submit" size="sm" className="gap-1">
                <Save className="w-3.5 h-3.5" />
                Guardar Generales
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Laborales */}
        <TabsContent value="laborales" className="flex-1 overflow-y-auto p-4 space-y-4">
          {savedTab === 'laborales' && <SavedBanner />}
          <form onSubmit={formLab.handleSubmit(saveLaborales)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Empresa *</Label>
                <Select defaultValue={String(empleado.empresa)} onValueChange={(v: unknown) => formLab.setValue('empresa', parseInt(String(v)))}>
                  <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {empresas.map(e => <SelectItem key={e.clave} value={String(e.clave)} className="text-xs">{e.razon_social}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Departamento *</Label>
                <Select defaultValue={String(empleado.depto)} onValueChange={(v: unknown) => formLab.setValue('depto', parseInt(String(v)))}>
                  <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {departamentos.map(d => <SelectItem key={d.clave} value={String(d.clave)} className="text-xs">{d.descripcion}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Puesto *</Label>
                <Select defaultValue={String(empleado.puesto)} onValueChange={(v: unknown) => formLab.setValue('puesto', parseInt(String(v)))}>
                  <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {puestos.map(p => <SelectItem key={p.clave} value={String(p.clave)} className="text-xs">{p.descripcion}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Centro de costos *</Label>
                <Select defaultValue={String(empleado.ccostos)} onValueChange={(v: unknown) => formLab.setValue('ccostos', parseInt(String(v)))}>
                  <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {centrosCostos.map(c => <SelectItem key={c.clave} value={String(c.clave)} className="text-xs">{c.descripcion}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unidad de negocio</Label>
                <Select defaultValue={String(empleado.unidad_negocios)} onValueChange={(v: unknown) => formLab.setValue('unidad_negocios', parseInt(String(v)))}>
                  <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {unidadesNegocio.map(u => <SelectItem key={u.clave} value={String(u.clave)} className="text-xs">{u.descripcion}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo de contrato</Label>
                <Select defaultValue={empleado.tipo_contrato ?? 'Indefinido'} onValueChange={(v: unknown) => formLab.setValue('tipo_contrato', String(v))}>
                  <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTRATOS.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Jefe inmediato</Label>
              <Input className="h-8 text-xs" {...formLab.register('jefe_inmed')} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Fecha alta</Label>
                <Input type="date" className="h-8 text-xs" {...formLab.register('alta')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fecha contrato</Label>
                <Input type="date" className="h-8 text-xs" {...formLab.register('fecha_contrato')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select defaultValue={String(empleado.st)} onValueChange={(v: unknown) => formLab.setValue('st', parseInt(String(v)))}>
                  <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1" className="text-xs">Activo</SelectItem>
                    <SelectItem value="2" className="text-xs">Inactivo</SelectItem>
                    <SelectItem value="5" className="text-xs">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fecha baja</Label>
                <Input type="date" className="h-8 text-xs" {...formLab.register('fecha_baja')} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white py-3">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
              <Button type="submit" size="sm" className="gap-1">
                <Save className="w-3.5 h-3.5" />
                Guardar Laborales
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Salariales */}
        <TabsContent value="salariales" className="flex-1 overflow-y-auto p-4 space-y-4">
          {savedTab === 'salariales' && <SavedBanner />}
          <form onSubmit={formSal.handleSubmit(saveSalariales)} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Sueldo mensual bruto *</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  className="h-8 text-xs"
                  {...formSal.register('sueldo_mensual')}
                />
                <Button type="button" variant="outline" size="sm" onClick={calcPreview} className="gap-1 shrink-0">
                  <Calculator className="w-3.5 h-3.5" />
                  Calcular
                </Button>
              </div>
            </div>

            {/* Current salary table */}
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-xs">
                <tbody>
                  {[
                    ['Sueldo mensual bruto', formatMXN(empleado.sueldo_mensual)],
                    ['Sueldo base (SDO)', formatMXN(empleado.sdo_mensual)],
                    ['Salario diario', formatMXN(empleado.sd)],
                    ['SDI', formatMXN(empleado.sdi)],
                    ['Despensa', formatMXN(empleado.despensa)],
                    ['Asistencia', formatMXN(empleado.asistencia)],
                    ['Puntualidad', formatMXN(empleado.puntualidad)],
                    ['Antigüedad', formatMXN(empleado.antiguedad)],
                    ['Sueldo catorcenal', formatMXN(empleado.s_catorcenal)],
                  ].map(([label, val], i) => (
                    <tr key={label} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-3 py-2 text-gray-500">{label}</td>
                      <td className="px-3 py-2 font-semibold text-right">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {salaryPreview && (
              <div className="bg-indigo-50 rounded-lg p-3 space-y-1">
                <p className="text-[10px] font-bold text-indigo-700 uppercase mb-2">Nuevo cálculo</p>
                {[
                  ['SD', formatMXN(salaryPreview.sd)],
                  ['SDI', formatMXN(salaryPreview.sdi)],
                  ['Catorcenal', formatMXN(salaryPreview.s_catorcenal)],
                  ['Total', formatMXN(salaryPreview.sdo_mensual)],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-bold text-indigo-700">{val}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Banco</Label>
                <Select defaultValue={empleado.banco} onValueChange={(v: unknown) => formSal.setValue('banco', String(v))}>
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BANCOS.map(b => <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cuenta bancaria</Label>
                <Input className="h-8 text-xs" {...formSal.register('cuenta_bancaria')} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white py-3">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
              <Button type="submit" size="sm" className="gap-1">
                <Save className="w-3.5 h-3.5" />
                Guardar Salariales
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  )
}
