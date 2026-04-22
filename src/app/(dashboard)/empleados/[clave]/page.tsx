"use client"

import { useState, useMemo, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSCRHStore } from '@/store'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  calcularSalario, calcularPrima, calcularDiasHabiles, formatMXN, getStatusLabel,
} from '@/lib/calculations'
import {
  ArrowLeft, Edit2, Calendar, DollarSign, FileText, Activity,
  Briefcase, User, Plus, Trash2, AlertCircle,
  TrendingUp, TrendingDown, ArrowRightLeft, Clock,
  Save, X, Upload, Eye, MapPin, Phone, Contact, Globe,
  Car, Home, Users, BookOpen, Building2, CreditCard, CheckCircle,
} from 'lucide-react'
import BajaDialog from '@/components/empleados/baja-dialog'
import EditarEmpleadoForm from '@/components/empleados/editar-empleado-form'
import CredencialCard from '@/components/empleados/credencial-card'

// ─── AVATAR HELPERS ───────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-violet-500', 'bg-sky-500',
]

function getInitials(nombre: string): string {
  const parts = nombre.split(' ')
  return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : nombre.slice(0, 2).toUpperCase()
}

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days - 1)
  return d.toISOString().split('T')[0]
}

function calcAntiguedad(from: string): { years: number; months: number } {
  const start = new Date(from)
  const now = new Date()
  let years = now.getFullYear() - start.getFullYear()
  let months = now.getMonth() - start.getMonth()
  if (months < 0) { years--; months += 12 }
  return { years, months }
}

function calcPeriod(f_inicio: string, f_fin: string): { years: number; months: number } {
  if (!f_inicio || !f_fin) return { years: 0, months: 0 }
  const start = new Date(f_inicio)
  const end = new Date(f_fin)
  let years = end.getFullYear() - start.getFullYear()
  let months = end.getMonth() - start.getMonth()
  if (months < 0) { years--; months += 12 }
  return { years: Math.max(0, years), months: Math.max(0, months) }
}

// ─── VACATION SCHEMA ──────────────────────────────────────────────────────────

const vacacionSchema = z.object({
  year: z.number().min(2000),
  periodo: z.string().min(1),
  catorcena: z.string().min(1),
  f_inicial: z.string().min(1),
  dias_vac: z.number().min(1),
  desc_sab: z.boolean().default(false),
  desc_dom: z.boolean().default(true),
  vop: z.enum(['V', 'P']),
})
type VacacionForm = z.infer<typeof vacacionSchema>

// ─── INCAPACIDAD SCHEMA ───────────────────────────────────────────────────────

const incapSchema = z.object({
  folio: z.string().min(1, 'Requerido'),
  concepto: z.number().min(1),
  modo: z.number().min(1),
  f_inicial: z.string().min(1),
  dias: z.number().min(1),
  catorcena: z.string().min(1),
  observaciones: z.string().optional().or(z.literal('')),
})
type IncapForm = z.infer<typeof incapSchema>

// ─── DOCUMENT TYPES ───────────────────────────────────────────────────────────

interface DocCard {
  id: string
  name: string
  status: 'cargado' | 'pendiente'
  uploadDate?: string
}

const INITIAL_DOCS: DocCard[] = [
  { id: 'csf',       name: 'Constancia de Situación Fiscal (CSF)', status: 'pendiente' },
  { id: 'psico',     name: 'Evaluación Psicométrica',              status: 'pendiente' },
  { id: 'medica',    name: 'Evaluación Médica',                    status: 'pendiente' },
  { id: 'socioeco',  name: 'Evaluación Socioeconómica',            status: 'pendiente' },
  { id: 'certif',    name: 'Certificación Piloto/Grupo',           status: 'pendiente' },
  { id: 'foto',      name: 'Foto de empleado',                     status: 'pendiente' },
]

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function EmpleadoExpedientePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const clave = params.clave as string

  const {
    getEmpleado, empresas, departamentos, puestos, centrosCostos, unidadesNegocio,
    vacaciones, incapacidades, historialPersonal, empleosAnteriores,
    concIncap, modosIncap, updateEmpleado,
    addVacacion, deleteVacacion, addIncapacidad, deleteIncapacidad,
    addEmpleoAnterior, deleteEmpleoAnterior,
    getDepartamentoNombre, getPuestoNombre, getEmpresaNombre, getCCostosNombre,
  } = useSCRHStore()

  const empleado = getEmpleado(clave)

  // ── UI state ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') ?? 'generales')
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [showBajaDialog, setShowBajaDialog] = useState(false)
  const [showVacDialog, setShowVacDialog] = useState(false)
  const [showIncapDialog, setShowIncapDialog] = useState(false)
  const [showEmpleoForm, setShowEmpleoForm] = useState(false)

  // ── Edit modes per tab ───────────────────────────────────────────────────────
  const [editGenerales, setEditGenerales] = useState(false)
  const [editLaborales, setEditLaborales] = useState(false)
  const [editSociales, setEditSociales] = useState(false)
  const [editFiscales, setEditFiscales] = useState(false)
  const [editContacto, setEditContacto] = useState(false)
  const [editDireccion, setEditDireccion] = useState(false)

  // ── Local form state for Generales ──────────────────────────────────────────
  const [genForm, setGenForm] = useState({
    nombre_completo: '',
    rfc: '',
    curp: '',
    imss: '',
    f_nacimiento: '',
    sexo: '',
    rh: '',
    calle: '',
    colonia: '',
    cp: '',
    localidad: '',
    estado: '',
    telefono: '',
    contacto: '',
    tel_contacto: '',
  })

  // ── Local form state for Laborales ──────────────────────────────────────────
  const [labForm, setLabForm] = useState({
    jefe_inmed: '',
    tipo_contrato: '',
    fecha_contrato: '',
  })

  // ── Local state for Sociales (not in Empleado type) ─────────────────────────
  const [sociales, setSociales] = useState({
    lugar_nacimiento: '',
    nacionalidad: 'Mexicana',
    edo_civil: '',
    nivel_estudios: '',
    ocupacion_anterior: '',
    nombre_padre: '',
    nombre_madre: '',
    nombre_conyuge: '',
    lee: 'S',
    escribe: 'S',
    reside_desde: '',
    tipo_domicilio: '',
    delegacion: '',
    estado_soc: '',
    pais: 'México',
    entre_calle1: '',
    entre_calle2: '',
  })

  // ── Local state for Fiscales ─────────────────────────────────────────────────
  const [fiscales, setFiscales] = useState({
    rfc_fiscal: '',
    curp_fiscal: '',
    nombre_fiscal: '',
    f_nac_fiscal: '',
    regimen: '',
    calle_fiscal: '',
    num_ext: '',
    num_int: '',
    colonia_fiscal: '',
    cp_fiscal: '',
    municipio_fiscal: '',
    estado_fiscal: '',
    pais_fiscal: 'México',
  })

  // ── Local state for Contacto ─────────────────────────────────────────────────
  const [contacto, setContacto] = useState({
    extension: '',
    email_corp: '',
    email_personal: '',
    celular: '',
    tel_casa: '',
    tipo_vehiculo: '',
    placas: '',
    modelo_anio: '',
  })

  // ── Local state for Dirección Alterna ────────────────────────────────────────
  const [direccionAlterna, setDireccionAlterna] = useState({
    calle: '',
    colonia: '',
    cp: '',
    localidad: '',
    municipio: '',
    estado: '',
    pais: 'México',
    codigo_sigo: '',
  })

  // ── Document cards state ─────────────────────────────────────────────────────
  const [docs, setDocs] = useState<DocCard[]>(INITIAL_DOCS)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null)

  // ── Empleo anterior form ──────────────────────────────────────────────────────
  const [empleoForm, setEmpleoForm] = useState({
    empresa: '',
    puesto_anterior: '',
    f_inicio: '',
    f_fin: '',
  })

  // ── Memoized derived data ────────────────────────────────────────────────────
  const empVacaciones = useMemo(
    () => vacaciones.filter(v => v.clave === clave).sort((a, b) => b.year - a.year),
    [vacaciones, clave],
  )
  const empIncapacidades = useMemo(
    () => incapacidades.filter(i => i.clave === clave).sort((a, b) => b.f_inicial.localeCompare(a.f_inicial)),
    [incapacidades, clave],
  )
  const empHistorial = useMemo(
    () => historialPersonal.filter(h => h.clave === clave).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [historialPersonal, clave],
  )
  const empEmpleos = useMemo(
    () => empleosAnteriores.filter(e => e.clave === clave),
    [empleosAnteriores, clave],
  )

  // ── Vacation form ────────────────────────────────────────────────────────────
  const vacForm = useForm<VacacionForm>({
    defaultValues: { year: new Date().getFullYear(), vop: 'V', desc_sab: false, desc_dom: true, periodo: '', catorcena: '', f_inicial: '', dias_vac: 0 },
  })
  const vacFInicial = vacForm.watch('f_inicial')
  const vacDias = vacForm.watch('dias_vac')
  const vacFFinal = vacFInicial && vacDias ? addDays(vacFInicial, vacDias) : ''
  const vacPrima = empleado && vacFFinal ? calcularPrima(vacDias ?? 0, empleado.sd, 25) : 0
  const vacDiasLab = vacFInicial && vacFFinal
    ? calcularDiasHabiles(vacFInicial, vacFFinal, vacForm.watch('desc_sab'), vacForm.watch('desc_dom'))
    : 0

  // ── Incapacidad form ─────────────────────────────────────────────────────────
  const incapForm = useForm<IncapForm>({
    defaultValues: { folio: '', concepto: 0, modo: 0, f_inicial: '', dias: 0, catorcena: '', observaciones: '' },
  })
  const incapFInicial = incapForm.watch('f_inicial')
  const incapDias = incapForm.watch('dias')
  const incapFFinal = incapFInicial && incapDias ? addDays(incapFInicial, incapDias) : ''

  // ─── HANDLERS ────────────────────────────────────────────────────────────────

  const handleSaveVacacion = (data: VacacionForm) => {
    if (!empleado) return
    addVacacion({
      clave, year: Number(data.year), periodo: data.periodo, catorcena: data.catorcena,
      f_inicial: data.f_inicial, f_final: vacFFinal, dias_vac: Number(data.dias_vac),
      dias_lab: vacDiasLab, desc_sab: !!data.desc_sab, desc_dom: !!data.desc_dom,
      vop: data.vop, prima: vacPrima, glob_catna: empleado.s_catorcenal,
      base_catna: empleado.sdo_mensual / 2, dias_catna: 14,
      glob_diario: empleado.sdo_mensual / 30, base_diario: empleado.sd,
      porc_prima: 25, prima_glob: vacPrima, prima_vac: vacPrima, comp_prima: 0,
      d_vacaciones: Number(data.dias_vac), p_dias_vac: vacPrima, p_dias_lab: vacDiasLab,
    })
    setShowVacDialog(false)
    vacForm.reset()
  }

  const handleSaveIncap = (data: IncapForm) => {
    addIncapacidad({
      clave, folio: data.folio, concepto: Number(data.concepto), modo: Number(data.modo),
      f_inicial: data.f_inicial, f_final: incapFFinal, dias: Number(data.dias),
      observaciones: data.observaciones ?? '', catorcena: data.catorcena,
    })
    setShowIncapDialog(false)
    incapForm.reset()
  }

  const startEditGenerales = () => {
    if (!empleado) return
    setGenForm({
      nombre_completo: empleado.nombre_completo,
      rfc: empleado.rfc,
      curp: empleado.curp,
      imss: empleado.imss,
      f_nacimiento: empleado.f_nacimiento,
      sexo: empleado.sexo,
      rh: empleado.rh,
      calle: empleado.calle,
      colonia: empleado.colonia,
      cp: empleado.cp,
      localidad: empleado.localidad,
      estado: empleado.estado,
      telefono: empleado.telefono,
      contacto: empleado.contacto,
      tel_contacto: empleado.tel_contacto,
    })
    setEditGenerales(true)
  }

  const saveGenerales = () => {
    updateEmpleado(clave, {
      nombre_completo: genForm.nombre_completo,
      rfc: genForm.rfc,
      curp: genForm.curp,
      imss: genForm.imss,
      f_nacimiento: genForm.f_nacimiento,
      sexo: genForm.sexo as 'M' | 'F',
      rh: genForm.rh,
      calle: genForm.calle,
      colonia: genForm.colonia,
      cp: genForm.cp,
      localidad: genForm.localidad,
      estado: genForm.estado,
      telefono: genForm.telefono,
      contacto: genForm.contacto,
      tel_contacto: genForm.tel_contacto,
    })
    setEditGenerales(false)
  }

  const startEditLaborales = () => {
    if (!empleado) return
    setLabForm({
      jefe_inmed: empleado.jefe_inmed,
      tipo_contrato: empleado.tipo_contrato ?? '',
      fecha_contrato: empleado.fecha_contrato ?? '',
    })
    setEditLaborales(true)
  }

  const saveLaborales = () => {
    updateEmpleado(clave, {
      jefe_inmed: labForm.jefe_inmed,
      tipo_contrato: labForm.tipo_contrato,
      fecha_contrato: labForm.fecha_contrato,
    })
    setEditLaborales(false)
  }

  const handleSimulateUpload = (docId: string) => {
    setUploadingDocId(docId)
    fileInputRef.current?.click()
  }

  const handleFileChange = () => {
    if (!uploadingDocId) return
    setDocs(prev => prev.map(d =>
      d.id === uploadingDocId
        ? { ...d, status: 'cargado', uploadDate: new Date().toLocaleDateString('es-MX') }
        : d
    ))
    setUploadingDocId(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleAddEmpleo = () => {
    const { f_inicio, f_fin, ...rest } = empleoForm
    if (!rest.empresa || !f_inicio) return
    const { years, months } = calcPeriod(f_inicio, f_fin)
    addEmpleoAnterior({ clave, empresa: rest.empresa, puesto_anterior: rest.puesto_anterior, f_inicio, f_fin, years, months })
    setEmpleoForm({ empresa: '', puesto_anterior: '', f_inicio: '', f_fin: '' })
    setShowEmpleoForm(false)
  }

  // ─── GUARD ───────────────────────────────────────────────────────────────────

  if (!empleado) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
        <AlertCircle className="w-12 h-12 text-gray-300" />
        <p className="text-gray-500 text-sm">Empleado no encontrado</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/empleados')}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Regresar
        </Button>
      </div>
    )
  }

  // ─── DERIVED VALUES ───────────────────────────────────────────────────────────

  const status = getStatusLabel(empleado.st)
  const colorIdx = parseInt(empleado.clave) % AVATAR_COLORS.length
  const empresa = empresas.find(e => e.clave === empleado.empresa)
  const hireDate = new Date(empleado.alta)
  const today = new Date()
  const daysSince = Math.floor((today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24))
  const nextAnniv = new Date(hireDate)
  nextAnniv.setFullYear(today.getFullYear())
  if (nextAnniv < today) nextAnniv.setFullYear(today.getFullYear() + 1)
  const daysUntilAnniv = Math.floor((nextAnniv.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const years = Math.floor(daysSince / 365)
  const antiq = calcAntiguedad(empleado.alta)

  const histMovIcon = (mov: number) => {
    switch (mov) {
      case 1: return { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100', label: 'Alta' }
      case 2: return { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-100', label: 'Baja' }
      case 3: return { icon: ArrowRightLeft, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Cambio Puesto' }
      case 4: return { icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Cambio Sueldo' }
      default: return { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Movimiento' }
    }
  }

  // ─── TAB DEFINITIONS ──────────────────────────────────────────────────────────

  const TABS = [
    { key: 'generales',    label: 'Generales',       icon: User },
    { key: 'laborales',    label: 'Laborales',        icon: Briefcase },
    { key: 'sociales',     label: 'Sociales',         icon: Users },
    { key: 'fiscales',     label: 'Fiscales',         icon: CreditCard },
    { key: 'contacto',     label: 'Contacto',         icon: Phone },
    { key: 'direccion',    label: 'Dir. Alterna',     icon: MapPin },
    { key: 'procedencia',  label: 'Procedencia',      icon: Building2 },
    { key: 'documentos',   label: 'Documentos',       icon: FileText },
    { key: 'salariales',   label: 'Salariales',       icon: DollarSign },
    { key: 'vacaciones',   label: 'Vacaciones',       icon: Calendar },
    { key: 'incapacidades',label: 'Incapacidades',    icon: Activity },
    { key: 'historial',    label: 'Historial',        icon: Clock },
  ]

  // ─── RENDER ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/empleados')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className={`w-14 h-14 rounded-2xl ${AVATAR_COLORS[colorIdx]} flex items-center justify-center shrink-0`}>
            <span className="text-lg font-bold text-white">{getInitials(empleado.nombre_completo)}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{empleado.nombre_completo}</h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                status.color === 'green' ? 'bg-green-100 text-green-700'
                : status.color === 'red' ? 'bg-red-100 text-red-600'
                : 'bg-yellow-100 text-yellow-700'
              }`}>
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {empleado.clave}
              </span>
              <span className="text-xs text-gray-500">{empresa?.razon_social ?? '—'}</span>
              <span className="text-xs text-gray-500">{getPuestoNombre(empleado.puesto)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {empleado.st !== 5 && (
            <Button
              variant="outline" size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50 text-xs gap-1"
              onClick={() => setShowBajaDialog(true)}
            >
              Registrar Baja
            </Button>
          )}
          <Button size="sm" className="gap-1 text-xs" onClick={() => setShowEditSheet(true)}>
            <Edit2 className="w-3.5 h-3.5" />
            Editar
          </Button>
        </div>
      </div>

      {/* Alert bar */}
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
        <Calendar className="w-4 h-4 shrink-0" />
        <span>
          Alta: <strong>{new Date(empleado.alta).toLocaleDateString('es-MX', { dateStyle: 'long' })}</strong>
          {' — '}<strong>{years} años</strong> ({daysSince} días en la empresa){' '}
          — Próximo aniversario en <strong>{daysUntilAnniv} días</strong>
        </span>
      </div>

      {/* ─── TABS ─────────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto pb-0.5">
          <TabsList variant="line" className="w-max min-w-full">
            {TABS.map(({ key, label, icon: Icon }) => (
              <TabsTrigger key={key} value={key} className="text-[11px] gap-1 px-3">
                <Icon className="w-3 h-3" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: GENERALES
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="generales" className="mt-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Datos Generales</h3>
              {!editGenerales ? (
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={startEditGenerales}>
                  <Edit2 className="w-3 h-3" /> Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setEditGenerales(false)}>
                    <X className="w-3 h-3" /> Cancelar
                  </Button>
                  <Button size="sm" className="gap-1 text-xs" onClick={saveGenerales}>
                    <Save className="w-3 h-3" /> Guardar
                  </Button>
                </div>
              )}
            </div>

            {!editGenerales ? (
              <>
                <Section title="Identificación">
                  <FieldGrid>
                    <Field label="Nombre completo" value={empleado.nombre_completo} />
                    <Field label="RFC" value={empleado.rfc} mono />
                    <Field label="CURP" value={empleado.curp} mono />
                    <Field label="NSS (IMSS)" value={empleado.imss} mono />
                  </FieldGrid>
                </Section>
                <Section title="Nacimiento y Datos Personales">
                  <FieldGrid>
                    <Field label="Fecha nacimiento" value={empleado.f_nacimiento} />
                    <Field label="Edad" value={`${empleado.edad} años`} />
                    <Field label="Sexo" value={empleado.sexo === 'M' ? 'Masculino' : 'Femenino'} />
                    <Field label="Grupo sanguíneo" value={empleado.rh || '—'} />
                  </FieldGrid>
                </Section>
                <Section title="Dirección principal">
                  <FieldGrid>
                    <Field label="Calle" value={empleado.calle || '—'} className="col-span-2" />
                    <Field label="Colonia" value={empleado.colonia || '—'} />
                    <Field label="C.P." value={empleado.cp || '—'} />
                    <Field label="Localidad" value={empleado.localidad || '—'} />
                    <Field label="Estado" value={empleado.estado || '—'} />
                  </FieldGrid>
                </Section>
                <Section title="Contacto">
                  <FieldGrid>
                    <Field label="Teléfono" value={empleado.telefono || '—'} />
                    <Field label="Contacto emergencia" value={empleado.contacto || '—'} />
                    <Field label="Tel. contacto" value={empleado.tel_contacto || '—'} />
                  </FieldGrid>
                </Section>
              </>
            ) : (
              <div className="space-y-4">
                <Section title="Identificación">
                  <div className="grid grid-cols-2 gap-3">
                    <EditField label="Nombre completo" value={genForm.nombre_completo}
                      onChange={v => setGenForm(p => ({ ...p, nombre_completo: v }))} className="col-span-2" />
                    <EditField label="RFC" value={genForm.rfc} onChange={v => setGenForm(p => ({ ...p, rfc: v }))} />
                    <EditField label="CURP" value={genForm.curp} onChange={v => setGenForm(p => ({ ...p, curp: v }))} />
                    <EditField label="NSS (IMSS)" value={genForm.imss} onChange={v => setGenForm(p => ({ ...p, imss: v }))} />
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Sexo</Label>
                      <Select value={genForm.sexo} onValueChange={v => setGenForm(p => ({ ...p, sexo: v ?? '' }))}>
                        <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M" className="text-xs">Masculino</SelectItem>
                          <SelectItem value="F" className="text-xs">Femenino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <EditField label="Fecha nacimiento" value={genForm.f_nacimiento} type="date"
                      onChange={v => setGenForm(p => ({ ...p, f_nacimiento: v }))} />
                    <EditField label="Grupo sanguíneo" value={genForm.rh} onChange={v => setGenForm(p => ({ ...p, rh: v }))} />
                  </div>
                </Section>
                <Section title="Dirección">
                  <div className="grid grid-cols-2 gap-3">
                    <EditField label="Calle" value={genForm.calle} onChange={v => setGenForm(p => ({ ...p, calle: v }))} className="col-span-2" />
                    <EditField label="Colonia" value={genForm.colonia} onChange={v => setGenForm(p => ({ ...p, colonia: v }))} />
                    <EditField label="C.P." value={genForm.cp} onChange={v => setGenForm(p => ({ ...p, cp: v }))} />
                    <EditField label="Localidad" value={genForm.localidad} onChange={v => setGenForm(p => ({ ...p, localidad: v }))} />
                    <EditField label="Estado" value={genForm.estado} onChange={v => setGenForm(p => ({ ...p, estado: v }))} />
                  </div>
                </Section>
                <Section title="Contacto">
                  <div className="grid grid-cols-2 gap-3">
                    <EditField label="Teléfono" value={genForm.telefono} onChange={v => setGenForm(p => ({ ...p, telefono: v }))} />
                    <EditField label="Contacto emergencia" value={genForm.contacto} onChange={v => setGenForm(p => ({ ...p, contacto: v }))} />
                    <EditField label="Tel. contacto" value={genForm.tel_contacto} onChange={v => setGenForm(p => ({ ...p, tel_contacto: v }))} />
                  </div>
                </Section>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: LABORALES
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="laborales" className="mt-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Datos Laborales</h3>
              {!editLaborales ? (
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={startEditLaborales}>
                  <Edit2 className="w-3 h-3" /> Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setEditLaborales(false)}>
                    <X className="w-3 h-3" /> Cancelar
                  </Button>
                  <Button size="sm" className="gap-1 text-xs" onClick={saveLaborales}>
                    <Save className="w-3 h-3" /> Guardar
                  </Button>
                </div>
              )}
            </div>
            <Section title="Asignación">
              <FieldGrid>
                <Field label="Empresa" value={getEmpresaNombre(empleado.empresa)} />
                <Field label="Departamento" value={getDepartamentoNombre(empleado.depto)} />
                <Field label="Puesto" value={getPuestoNombre(empleado.puesto)} />
                <Field label="Centro de costos" value={getCCostosNombre(empleado.ccostos)} />
                <Field label="Unidad de negocio" value={unidadesNegocio.find(u => u.clave === empleado.unidad_negocios)?.descripcion ?? '—'} />
                {!editLaborales ? (
                  <Field label="Jefe inmediato" value={empleado.jefe_inmed || '—'} />
                ) : (
                  <EditField label="Jefe inmediato" value={labForm.jefe_inmed}
                    onChange={v => setLabForm(p => ({ ...p, jefe_inmed: v }))} />
                )}
              </FieldGrid>
            </Section>
            <Section title="Contrato">
              <FieldGrid>
                {!editLaborales ? (
                  <>
                    <Field label="Tipo de contrato" value={empleado.tipo_contrato ?? '—'} />
                    <Field label="Fecha alta" value={empleado.alta} />
                    <Field label="Fecha contrato" value={empleado.fecha_contrato ?? '—'} />
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Tipo de contrato</Label>
                      <Select value={labForm.tipo_contrato} onValueChange={v => setLabForm(p => ({ ...p, tipo_contrato: v ?? '' }))}>
                        <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {['Indeterminado','Determinado','Obra determinada','Por temporada','Por capacitación'].map(t => (
                            <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Field label="Fecha alta" value={empleado.alta} />
                    <EditField label="Fecha contrato" value={labForm.fecha_contrato} type="date"
                      onChange={v => setLabForm(p => ({ ...p, fecha_contrato: v }))} />
                  </>
                )}
                <div>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Antigüedad</p>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5">{antiq.years} años, {antiq.months} meses</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Status</p>
                  <span className={`mt-0.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    status.color === 'green' ? 'bg-green-100 text-green-700'
                    : status.color === 'red' ? 'bg-red-100 text-red-600'
                    : 'bg-yellow-100 text-yellow-700'
                  }`}>{status.label}</span>
                </div>
                {empleado.fecha_baja && <Field label="Fecha baja" value={empleado.fecha_baja} />}
              </FieldGrid>
            </Section>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 3: SOCIALES
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="sociales" className="mt-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Datos Sociales</h3>
              {!editSociales ? (
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setEditSociales(true)}>
                  <Edit2 className="w-3 h-3" /> Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setEditSociales(false)}>
                    <X className="w-3 h-3" /> Cancelar
                  </Button>
                  <Button size="sm" className="gap-1 text-xs" onClick={() => setEditSociales(false)}>
                    <Save className="w-3 h-3" /> Guardar
                  </Button>
                </div>
              )}
            </div>
            {!editSociales ? (
              <>
                <Section title="Nacimiento">
                  <FieldGrid>
                    <Field label="Fecha de nacimiento" value={empleado.f_nacimiento} />
                    <Field label="Lugar de nacimiento" value={sociales.lugar_nacimiento || '—'} />
                    <Field label="Nacionalidad" value={sociales.nacionalidad} />
                  </FieldGrid>
                </Section>
                <Section title="Estado Civil y Estudios">
                  <FieldGrid>
                    <Field label="Estado civil" value={sociales.edo_civil || '—'} />
                    <Field label="Nivel de estudios" value={sociales.nivel_estudios || '—'} />
                    <Field label="Ocupación anterior" value={sociales.ocupacion_anterior || '—'} />
                  </FieldGrid>
                </Section>
                <Section title="Familia">
                  <FieldGrid>
                    <Field label="Nombre del padre" value={sociales.nombre_padre || '—'} />
                    <Field label="Nombre de la madre" value={sociales.nombre_madre || '—'} />
                    <Field label="Nombre del cónyuge" value={sociales.nombre_conyuge || '—'} />
                  </FieldGrid>
                </Section>
                <Section title="Habilidades y Domicilio">
                  <FieldGrid>
                    <Field label="¿Lee?" value={sociales.lee} />
                    <Field label="¿Escribe?" value={sociales.escribe} />
                    <Field label="Reside desde" value={sociales.reside_desde || '—'} />
                    <Field label="Tipo de domicilio" value={sociales.tipo_domicilio || '—'} />
                    <Field label="Delegación/Municipio" value={sociales.delegacion || '—'} />
                    <Field label="Estado" value={sociales.estado_soc || '—'} />
                    <Field label="País" value={sociales.pais} />
                    <Field label="Entre calle" value={sociales.entre_calle1 ? `${sociales.entre_calle1} y ${sociales.entre_calle2}` : '—'} />
                  </FieldGrid>
                </Section>
              </>
            ) : (
              <div className="space-y-4">
                <Section title="Nacimiento">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Fecha de nacimiento" value={empleado.f_nacimiento} />
                    <EditField label="Lugar de nacimiento" value={sociales.lugar_nacimiento}
                      onChange={v => setSociales(p => ({ ...p, lugar_nacimiento: v }))} />
                    <EditField label="Nacionalidad" value={sociales.nacionalidad}
                      onChange={v => setSociales(p => ({ ...p, nacionalidad: v }))} />
                  </div>
                </Section>
                <Section title="Estado Civil y Estudios">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Estado civil</Label>
                      <Select value={sociales.edo_civil} onValueChange={v => setSociales(p => ({ ...p, edo_civil: v ?? '' }))}>
                        <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {['Soltero','Casado','Divorciado','Viudo','Unión libre'].map(s => (
                            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Nivel de estudios</Label>
                      <Select value={sociales.nivel_estudios} onValueChange={v => setSociales(p => ({ ...p, nivel_estudios: v ?? '' }))}>
                        <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {['Primaria','Secundaria','Preparatoria','Técnico','Licenciatura','Posgrado'].map(s => (
                            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <EditField label="Ocupación anterior" value={sociales.ocupacion_anterior}
                      onChange={v => setSociales(p => ({ ...p, ocupacion_anterior: v }))} />
                  </div>
                </Section>
                <Section title="Familia">
                  <div className="grid grid-cols-2 gap-3">
                    <EditField label="Nombre del padre" value={sociales.nombre_padre}
                      onChange={v => setSociales(p => ({ ...p, nombre_padre: v }))} />
                    <EditField label="Nombre de la madre" value={sociales.nombre_madre}
                      onChange={v => setSociales(p => ({ ...p, nombre_madre: v }))} />
                    <EditField label="Nombre del cónyuge" value={sociales.nombre_conyuge}
                      onChange={v => setSociales(p => ({ ...p, nombre_conyuge: v }))} />
                  </div>
                </Section>
                <Section title="Habilidades y Domicilio">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">¿Lee?</Label>
                      <RadioGroup value={sociales.lee} onValueChange={v => setSociales(p => ({ ...p, lee: v ?? 'S' }))} className="flex gap-4">
                        <div className="flex items-center gap-1.5"><RadioGroupItem value="S" id="lee-s" /><Label htmlFor="lee-s" className="text-xs cursor-pointer">Sí</Label></div>
                        <div className="flex items-center gap-1.5"><RadioGroupItem value="N" id="lee-n" /><Label htmlFor="lee-n" className="text-xs cursor-pointer">No</Label></div>
                      </RadioGroup>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">¿Escribe?</Label>
                      <RadioGroup value={sociales.escribe} onValueChange={v => setSociales(p => ({ ...p, escribe: v ?? 'S' }))} className="flex gap-4">
                        <div className="flex items-center gap-1.5"><RadioGroupItem value="S" id="esc-s" /><Label htmlFor="esc-s" className="text-xs cursor-pointer">Sí</Label></div>
                        <div className="flex items-center gap-1.5"><RadioGroupItem value="N" id="esc-n" /><Label htmlFor="esc-n" className="text-xs cursor-pointer">No</Label></div>
                      </RadioGroup>
                    </div>
                    <EditField label="Reside desde" value={sociales.reside_desde} type="date"
                      onChange={v => setSociales(p => ({ ...p, reside_desde: v }))} />
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Tipo de domicilio</Label>
                      <Select value={sociales.tipo_domicilio} onValueChange={v => setSociales(p => ({ ...p, tipo_domicilio: v ?? '' }))}>
                        <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {['Propio','Rentado','Familiar'].map(t => (
                            <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <EditField label="Delegación/Municipio" value={sociales.delegacion}
                      onChange={v => setSociales(p => ({ ...p, delegacion: v }))} />
                    <EditField label="Estado" value={sociales.estado_soc}
                      onChange={v => setSociales(p => ({ ...p, estado_soc: v }))} />
                    <EditField label="País" value={sociales.pais}
                      onChange={v => setSociales(p => ({ ...p, pais: v }))} />
                    <EditField label="Entre calle" value={sociales.entre_calle1}
                      onChange={v => setSociales(p => ({ ...p, entre_calle1: v }))} />
                    <EditField label="Y calle" value={sociales.entre_calle2}
                      onChange={v => setSociales(p => ({ ...p, entre_calle2: v }))} />
                  </div>
                </Section>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 4: FISCALES
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="fiscales" className="mt-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Datos Fiscales</h3>
              {!editFiscales ? (
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setEditFiscales(true)}>
                  <Edit2 className="w-3 h-3" /> Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setEditFiscales(false)}>
                    <X className="w-3 h-3" /> Cancelar
                  </Button>
                  <Button size="sm" className="gap-1 text-xs" onClick={() => setEditFiscales(false)}>
                    <Save className="w-3 h-3" /> Guardar
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Los datos fiscales deben coincidir exactamente con el SAT para el timbrado de recibos de nómina.
                Evitar acentos y caracteres especiales.
              </p>
            </div>

            {!editFiscales ? (
              <>
                <Section title="Identificación Fiscal">
                  <FieldGrid>
                    <Field label="RFC (14 chars)" value={fiscales.rfc_fiscal || empleado.rfc} mono />
                    <Field label="CURP (18 chars)" value={fiscales.curp_fiscal || empleado.curp} mono />
                    <Field label="Nombre fiscal completo" value={fiscales.nombre_fiscal || empleado.nombre_completo} className="col-span-2" />
                    <Field label="Fecha de nacimiento (fiscal)" value={fiscales.f_nac_fiscal || empleado.f_nacimiento} />
                    <Field label="Régimen fiscal" value={fiscales.regimen || '—'} />
                  </FieldGrid>
                </Section>
                <Section title="Domicilio Fiscal">
                  <FieldGrid>
                    <Field label="Calle" value={fiscales.calle_fiscal || '—'} className="col-span-2" />
                    <Field label="Núm. exterior" value={fiscales.num_ext || '—'} />
                    <Field label="Núm. interior" value={fiscales.num_int || '—'} />
                    <Field label="Colonia" value={fiscales.colonia_fiscal || '—'} />
                    <Field label="C.P." value={fiscales.cp_fiscal || '—'} />
                    <Field label="Municipio" value={fiscales.municipio_fiscal || '—'} />
                    <Field label="Estado" value={fiscales.estado_fiscal || '—'} />
                    <Field label="País" value={fiscales.pais_fiscal} />
                  </FieldGrid>
                </Section>
              </>
            ) : (
              <div className="space-y-4">
                <Section title="Identificación Fiscal">
                  <div className="grid grid-cols-2 gap-3">
                    <EditField label="RFC" value={fiscales.rfc_fiscal} onChange={v => setFiscales(p => ({ ...p, rfc_fiscal: v }))} />
                    <EditField label="CURP" value={fiscales.curp_fiscal} onChange={v => setFiscales(p => ({ ...p, curp_fiscal: v }))} />
                    <EditField label="Nombre fiscal completo" value={fiscales.nombre_fiscal}
                      onChange={v => setFiscales(p => ({ ...p, nombre_fiscal: v }))} className="col-span-2" />
                    <EditField label="Fecha nacimiento (fiscal)" value={fiscales.f_nac_fiscal} type="date"
                      onChange={v => setFiscales(p => ({ ...p, f_nac_fiscal: v }))} />
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Régimen fiscal</Label>
                      <Select value={fiscales.regimen} onValueChange={v => setFiscales(p => ({ ...p, regimen: v ?? '' }))}>
                        <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {['Asalariado','Honorarios','Actividad empresarial'].map(r => (
                            <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Section>
                <Section title="Domicilio Fiscal">
                  <div className="grid grid-cols-2 gap-3">
                    <EditField label="Calle" value={fiscales.calle_fiscal}
                      onChange={v => setFiscales(p => ({ ...p, calle_fiscal: v }))} className="col-span-2" />
                    <EditField label="Núm. exterior" value={fiscales.num_ext} onChange={v => setFiscales(p => ({ ...p, num_ext: v }))} />
                    <EditField label="Núm. interior" value={fiscales.num_int} onChange={v => setFiscales(p => ({ ...p, num_int: v }))} />
                    <EditField label="Colonia" value={fiscales.colonia_fiscal} onChange={v => setFiscales(p => ({ ...p, colonia_fiscal: v }))} />
                    <EditField label="C.P." value={fiscales.cp_fiscal} onChange={v => setFiscales(p => ({ ...p, cp_fiscal: v }))} />
                    <EditField label="Municipio" value={fiscales.municipio_fiscal} onChange={v => setFiscales(p => ({ ...p, municipio_fiscal: v }))} />
                    <EditField label="Estado" value={fiscales.estado_fiscal} onChange={v => setFiscales(p => ({ ...p, estado_fiscal: v }))} />
                    <EditField label="País" value={fiscales.pais_fiscal} onChange={v => setFiscales(p => ({ ...p, pais_fiscal: v }))} />
                  </div>
                </Section>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 5: CONTACTO
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="contacto" className="mt-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Datos de Contacto</h3>
              {!editContacto ? (
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setEditContacto(true)}>
                  <Edit2 className="w-3 h-3" /> Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setEditContacto(false)}>
                    <X className="w-3 h-3" /> Cancelar
                  </Button>
                  <Button size="sm" className="gap-1 text-xs" onClick={() => setEditContacto(false)}>
                    <Save className="w-3 h-3" /> Guardar
                  </Button>
                </div>
              )}
            </div>
            {!editContacto ? (
              <>
                <Section title="Teléfonos y Correo">
                  <FieldGrid>
                    <Field label="Extensión telefónica" value={contacto.extension || '—'} />
                    <Field label="Email corporativo" value={contacto.email_corp || empleado.email_corp || '—'} />
                    <Field label="Email personal" value={contacto.email_personal || empleado.email_personal || '—'} />
                    <Field label="Teléfono celular" value={contacto.celular || empleado.telefono || '—'} />
                    <Field label="Teléfono de casa" value={contacto.tel_casa || '—'} />
                  </FieldGrid>
                </Section>
                <Section title="Vehículo">
                  <FieldGrid>
                    <Field label="Tipo de vehículo" value={contacto.tipo_vehiculo || '—'} />
                    <Field label="Placas" value={contacto.placas || '—'} />
                    <Field label="Modelo/Año" value={contacto.modelo_anio || '—'} />
                  </FieldGrid>
                </Section>
              </>
            ) : (
              <div className="space-y-4">
                <Section title="Teléfonos y Correo">
                  <div className="grid grid-cols-2 gap-3">
                    <EditField label="Extensión telefónica" value={contacto.extension}
                      onChange={v => setContacto(p => ({ ...p, extension: v }))} />
                    <EditField label="Email corporativo" value={contacto.email_corp}
                      onChange={v => setContacto(p => ({ ...p, email_corp: v }))} />
                    <EditField label="Email personal" value={contacto.email_personal}
                      onChange={v => setContacto(p => ({ ...p, email_personal: v }))} />
                    <EditField label="Teléfono celular" value={contacto.celular}
                      onChange={v => setContacto(p => ({ ...p, celular: v }))} />
                    <EditField label="Teléfono de casa" value={contacto.tel_casa}
                      onChange={v => setContacto(p => ({ ...p, tel_casa: v }))} />
                  </div>
                </Section>
                <Section title="Vehículo">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Tipo de vehículo</Label>
                      <Select value={contacto.tipo_vehiculo} onValueChange={v => setContacto(p => ({ ...p, tipo_vehiculo: v ?? '' }))}>
                        <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {['Ninguno','Motocicleta','Automóvil','Camioneta','Otro'].map(t => (
                            <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <EditField label="Placas" value={contacto.placas}
                      onChange={v => setContacto(p => ({ ...p, placas: v }))} />
                    <EditField label="Modelo/Año" value={contacto.modelo_anio}
                      onChange={v => setContacto(p => ({ ...p, modelo_anio: v }))} />
                  </div>
                </Section>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 6: DIRECCIÓN ALTERNA
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="direccion" className="mt-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Dirección Alterna</h3>
              {!editDireccion ? (
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setEditDireccion(true)}>
                  <Edit2 className="w-3 h-3" /> Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setEditDireccion(false)}>
                    <X className="w-3 h-3" /> Cancelar
                  </Button>
                  <Button size="sm" className="gap-1 text-xs" onClick={() => setEditDireccion(false)}>
                    <Save className="w-3 h-3" /> Guardar
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
              <Home className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Dirección alterna para envío de correspondencia oficial.
              </p>
            </div>

            {!editDireccion ? (
              <Section title="Domicilio">
                <FieldGrid>
                  <Field label="Calle y número" value={direccionAlterna.calle || '—'} className="col-span-2" />
                  <Field label="Colonia" value={direccionAlterna.colonia || '—'} />
                  <Field label="C.P." value={direccionAlterna.cp || '—'} />
                  <Field label="Localidad" value={direccionAlterna.localidad || '—'} />
                  <Field label="Municipio" value={direccionAlterna.municipio || '—'} />
                  <Field label="Estado" value={direccionAlterna.estado || '—'} />
                  <Field label="País" value={direccionAlterna.pais} />
                  <Field label="Código SIGO" value={direccionAlterna.codigo_sigo || '—'} mono />
                </FieldGrid>
              </Section>
            ) : (
              <Section title="Domicilio">
                <div className="grid grid-cols-2 gap-3">
                  <EditField label="Calle y número" value={direccionAlterna.calle}
                    onChange={v => setDireccionAlterna(p => ({ ...p, calle: v }))} className="col-span-2" />
                  <EditField label="Colonia" value={direccionAlterna.colonia}
                    onChange={v => setDireccionAlterna(p => ({ ...p, colonia: v }))} />
                  <EditField label="C.P." value={direccionAlterna.cp}
                    onChange={v => setDireccionAlterna(p => ({ ...p, cp: v }))} />
                  <EditField label="Localidad" value={direccionAlterna.localidad}
                    onChange={v => setDireccionAlterna(p => ({ ...p, localidad: v }))} />
                  <EditField label="Municipio" value={direccionAlterna.municipio}
                    onChange={v => setDireccionAlterna(p => ({ ...p, municipio: v }))} />
                  <EditField label="Estado" value={direccionAlterna.estado}
                    onChange={v => setDireccionAlterna(p => ({ ...p, estado: v }))} />
                  <EditField label="País" value={direccionAlterna.pais}
                    onChange={v => setDireccionAlterna(p => ({ ...p, pais: v }))} />
                  <EditField label="Código SIGO" value={direccionAlterna.codigo_sigo}
                    onChange={v => setDireccionAlterna(p => ({ ...p, codigo_sigo: v }))} />
                </div>
              </Section>
            )}
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 7: PROCEDENCIA
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="procedencia" className="mt-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Empleos Anteriores</h3>
              <Button size="sm" className="gap-1 text-xs" onClick={() => setShowEmpleoForm(true)}>
                <Plus className="w-3.5 h-3.5" />
                Agregar empleo anterior
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['#', 'Empresa', 'Puesto anterior', 'F.Inicio', 'F.Fin', 'Años', 'Meses', 'Acciones'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {empEmpleos.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400">No hay empleos anteriores registrados</td>
                    </tr>
                  ) : (
                    empEmpleos.map((emp, idx) => (
                      <tr key={emp.numero} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium">{emp.empresa}</td>
                        <td className="px-4 py-3 text-gray-600">{emp.puesto_anterior || '—'}</td>
                        <td className="px-4 py-3">{emp.f_inicio}</td>
                        <td className="px-4 py-3">{emp.f_fin || '—'}</td>
                        <td className="px-4 py-3 font-semibold">{emp.years}</td>
                        <td className="px-4 py-3">{emp.months}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => deleteEmpleoAnterior(emp.numero)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add empleo dialog */}
          <Dialog open={showEmpleoForm} onOpenChange={setShowEmpleoForm}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Agregar empleo anterior</DialogTitle>
                <DialogDescription>Registrar empresa de procedencia</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Empresa *</Label>
                  <Input className="h-8 text-xs" value={empleoForm.empresa}
                    onChange={e => setEmpleoForm(p => ({ ...p, empresa: e.target.value }))}
                    placeholder="Nombre de la empresa" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Puesto anterior</Label>
                  <Input className="h-8 text-xs" value={empleoForm.puesto_anterior}
                    onChange={e => setEmpleoForm(p => ({ ...p, puesto_anterior: e.target.value }))}
                    placeholder="Puesto desempeñado" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Fecha inicio *</Label>
                    <Input type="date" className="h-8 text-xs" value={empleoForm.f_inicio}
                      onChange={e => setEmpleoForm(p => ({ ...p, f_inicio: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fecha fin</Label>
                    <Input type="date" className="h-8 text-xs" value={empleoForm.f_fin}
                      onChange={e => setEmpleoForm(p => ({ ...p, f_fin: e.target.value }))} />
                  </div>
                </div>
                {empleoForm.f_inicio && empleoForm.f_fin && (
                  <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
                    {(() => {
                      const { years: y, months: m } = calcPeriod(empleoForm.f_inicio, empleoForm.f_fin)
                      return <span>Duración: <strong>{y} años, {m} meses</strong></span>
                    })()}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setShowEmpleoForm(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleAddEmpleo} disabled={!empleoForm.empresa || !empleoForm.f_inicio}>
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 8: DOCUMENTOS
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="documentos" className="mt-4 space-y-5">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileChange}
          />

          {/* Credencial */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Credencial de empleado</h3>
            <CredencialCard
              nombre={empleado.nombre_completo}
              puesto={getPuestoNombre(empleado.puesto)}
              departamento={getDepartamentoNombre(empleado.depto)}
              clave={empleado.clave}
              empresa={empresa?.razon_social ?? 'TRAXION'}
            />
          </div>

          {/* Document cards */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Documentos del expediente</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {docs.map(doc => {
                const isFoto = doc.id === 'foto'
                const isCargado = doc.status === 'cargado'
                return (
                  <div
                    key={doc.id}
                    className="border border-gray-100 rounded-xl p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow"
                  >
                    {/* Icon / Avatar */}
                    <div className="flex items-center justify-center">
                      {isFoto ? (
                        <div className={`w-14 h-14 rounded-2xl ${AVATAR_COLORS[colorIdx]} flex items-center justify-center`}>
                          <span className="text-lg font-bold text-white">{getInitials(empleado.nombre_completo)}</span>
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <p className="text-[11px] font-semibold text-gray-700 text-center leading-tight">{doc.name}</p>

                    {/* Status badge */}
                    <div className="flex justify-center">
                      {isCargado ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          Documento cargado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          Pendiente
                        </span>
                      )}
                    </div>

                    {/* Upload date */}
                    {isCargado && doc.uploadDate && (
                      <p className="text-[10px] text-gray-400 text-center">Subido: {doc.uploadDate}</p>
                    )}

                    {/* Action button */}
                    <div className="mt-auto flex flex-col gap-1.5">
                      {!isCargado ? (
                        <Button size="sm" variant="outline" className="text-xs gap-1 w-full" onClick={() => handleSimulateUpload(doc.id)}>
                          <Upload className="w-3 h-3" />
                          {isFoto ? 'Subir foto' : 'Subir documento'}
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" className="text-xs gap-1 w-full">
                            <Eye className="w-3 h-3" />
                            Ver documento
                          </Button>
                          <Button size="sm" variant="ghost" className="text-xs gap-1 w-full text-gray-500"
                            onClick={() => handleSimulateUpload(doc.id)}>
                            <Upload className="w-3 h-3" />
                            Reemplazar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Aptitud para Licencia Federal ── */}
          {(() => {
            const APTOS_LF_DATA = [
              { id: 1,  clave: '1001', folio: 'ALF-2024-001', fecha_examen: '2024-03-10', vence: '2026-03-10', resultado: 'Apto' as const,         medico: 'Dr. Ramírez Torres' },
              { id: 2,  clave: '1008', folio: 'ALF-2024-002', fecha_examen: '2024-04-15', vence: '2026-04-15', resultado: 'Apto' as const,         medico: 'Dra. Sánchez Pérez' },
              { id: 3,  clave: '1014', folio: 'ALF-2023-010', fecha_examen: '2023-05-20', vence: '2025-05-20', resultado: 'Condicionado' as const, medico: 'Dr. Ramírez Torres' },
              { id: 4,  clave: '1016', folio: 'ALF-2024-015', fecha_examen: '2024-01-08', vence: '2026-01-08', resultado: 'Apto' as const,         medico: 'Dr. Medina Herrera' },
              { id: 5,  clave: '1018', folio: 'ALF-2023-022', fecha_examen: '2023-02-14', vence: '2025-02-14', resultado: 'Apto' as const,         medico: 'Dra. Sánchez Pérez' },
              { id: 6,  clave: '1019', folio: 'ALF-2023-030', fecha_examen: '2023-06-01', vence: '2024-06-01', resultado: 'No Apto' as const,      medico: 'Dr. Medina Herrera' },
              { id: 7,  clave: '1020', folio: 'ALF-2022-044', fecha_examen: '2022-11-11', vence: '2024-11-11', resultado: 'Apto' as const,         medico: 'Dr. Ramírez Torres' },
              { id: 8,  clave: '1023', folio: 'ALF-2024-031', fecha_examen: '2024-06-20', vence: '2026-06-20', resultado: 'Apto' as const,         medico: 'Dra. Sánchez Pérez' },
            ]
            const empAptos = APTOS_LF_DATA.filter(a => a.clave === clave)
            const latest = empAptos.length > 0 ? empAptos[empAptos.length - 1] : null
            const today = new Date(); today.setHours(0, 0, 0, 0)
            const calcDias = (v: string) => Math.floor((new Date(v + 'T00:00:00').getTime() - today.getTime()) / 86400000)
            return (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-800">Aptitud para Licencia Federal</h3>
                  <a href="/licencias" className="text-xs text-teal-600 hover:underline font-medium">Ver todos →</a>
                </div>
                {latest ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500 font-medium">Folio:</span>{' '}
                          <span className="font-mono text-gray-800">{latest.folio}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 font-medium">Resultado:</span>{' '}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            latest.resultado === 'Apto' ? 'bg-green-100 text-green-700' :
                            latest.resultado === 'No Apto' ? 'bg-red-100 text-red-600' :
                            'bg-orange-100 text-orange-700'
                          }`}>{latest.resultado}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 font-medium">F. Examen:</span>{' '}
                          <span className="text-gray-700">{new Date(latest.fecha_examen + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 font-medium">Vencimiento:</span>{' '}
                          <span className="text-gray-700">{new Date(latest.vence + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 font-medium">Médico:</span>{' '}
                          <span className="text-gray-700">{latest.medico}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 font-medium">Días restantes:</span>{' '}
                          <span className={`font-semibold text-xs ${calcDias(latest.vence) < 0 ? 'text-red-600' : calcDias(latest.vence) < 30 ? 'text-yellow-600' : 'text-green-700'}`}>
                            {calcDias(latest.vence) < 0 ? `Vencido hace ${Math.abs(calcDias(latest.vence))} días` : `${calcDias(latest.vence)} días`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">Sin registros de aptitud</p>
                    <a href="/licencias">
                      <Button size="sm" variant="outline" className="text-xs">
                        <Plus className="w-3 h-3 mr-1" />
                        Registrar
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            )
          })()}

          {/* ── Antidoping ── */}
          {(() => {
            const ANTIDOPING_DATA = [
              { id: 1,  clave: '1001', folio: 'AD-2024-001', fecha: '2024-03-10', resultado: 'Negativo' as const,  laboratorio: 'Lab Análisis del Norte' },
              { id: 2,  clave: '1008', folio: 'AD-2024-002', fecha: '2024-04-15', resultado: 'Negativo' as const,  laboratorio: 'BioLab Baja California' },
              { id: 3,  clave: '1002', folio: 'AD-2024-003', fecha: '2024-01-22', resultado: 'Negativo' as const,  laboratorio: 'Lab Análisis del Norte' },
              { id: 4,  clave: '1005', folio: 'AD-2023-045', fecha: '2023-11-05', resultado: 'Positivo' as const,  laboratorio: 'Laboratorio Clínico Central', sustancia: 'Anfetaminas' },
              { id: 5,  clave: '1014', folio: 'AD-2024-010', fecha: '2024-02-28', resultado: 'Negativo' as const,  laboratorio: 'BioLab Baja California' },
              { id: 6,  clave: '1016', folio: 'AD-2024-011', fecha: '2024-03-05', resultado: 'Pendiente' as const, laboratorio: 'Lab Análisis del Norte' },
              { id: 7,  clave: '1018', folio: 'AD-2024-012', fecha: '2024-03-18', resultado: 'Negativo' as const,  laboratorio: 'Laboratorio Clínico Central' },
              { id: 8,  clave: '1019', folio: 'AD-2023-060', fecha: '2023-09-15', resultado: 'Negativo' as const,  laboratorio: 'BioLab Baja California' },
              { id: 9,  clave: '1020', folio: 'AD-2024-020', fecha: '2024-05-01', resultado: 'Negativo' as const,  laboratorio: 'Lab Análisis del Norte' },
              { id: 10, clave: '1023', folio: 'AD-2024-025', fecha: '2024-06-20', resultado: 'Negativo' as const,  laboratorio: 'BioLab Baja California' },
            ]
            const empAnti = ANTIDOPING_DATA.filter(a => a.clave === clave).slice(-2)
            return (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-800">Registro de Antidoping</h3>
                  <div className="flex items-center gap-2">
                    <a href="/licencias" className="text-xs text-teal-600 hover:underline font-medium">Ver todos →</a>
                  </div>
                </div>
                {empAnti.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {empAnti.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-gray-700 font-medium">{a.folio}</span>
                          <span className="text-xs text-gray-500">{new Date(a.fecha + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          <span className="text-xs text-gray-500">{a.laboratorio}</span>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          a.resultado === 'Negativo' ? 'bg-green-100 text-green-700' :
                          a.resultado === 'Positivo' ? 'bg-red-100 text-red-600' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{a.resultado}</span>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-1">
                      <a href="/licencias">
                        <Button size="sm" variant="outline" className="text-xs">Ver todos</Button>
                      </a>
                      <a href="/licencias">
                        <Button size="sm" variant="outline" className="text-xs">
                          <Plus className="w-3 h-3 mr-1" />
                          Nuevo registro
                        </Button>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">Sin registros de antidoping</p>
                    <a href="/licencias">
                      <Button size="sm" variant="outline" className="text-xs">
                        <Plus className="w-3 h-3 mr-1" />
                        Nuevo registro
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            )
          })()}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 9: SALARIALES
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="salariales" className="mt-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
            <Section title="Salario">
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-xs">
                  <tbody>
                    {[
                      ['Sueldo mensual bruto', formatMXN(empleado.sueldo_mensual)],
                      ['Sueldo base (SDO mensual)', formatMXN(empleado.sdo_mensual)],
                      ['Salario diario', formatMXN(empleado.sd)],
                      ['SDI', formatMXN(empleado.sdi)],
                    ].map(([label, val], i) => (
                      <tr key={label} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-4 py-2.5 text-gray-500 font-medium">{label}</td>
                        <td className="px-4 py-2.5 font-bold text-right text-gray-800">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Percepciones">
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-xs">
                  <tbody>
                    {[
                      ['Despensa', formatMXN(empleado.despensa)],
                      ['Asistencia', formatMXN(empleado.asistencia)],
                      ['Puntualidad', formatMXN(empleado.puntualidad)],
                      ['Antigüedad', formatMXN(empleado.antiguedad)],
                    ].map(([label, val], i) => (
                      <tr key={label} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-4 py-2.5 text-gray-500">{label}</td>
                        <td className="px-4 py-2.5 font-semibold text-right">{val}</td>
                      </tr>
                    ))}
                    <tr className="bg-indigo-50 border-t border-indigo-100">
                      <td className="px-4 py-2.5 font-bold text-indigo-700">Total percepciones</td>
                      <td className="px-4 py-2.5 font-bold text-right text-indigo-700">
                        {formatMXN(empleado.despensa + empleado.asistencia + empleado.puntualidad + empleado.antiguedad)}
                      </td>
                    </tr>
                    <tr className="bg-green-50">
                      <td className="px-4 py-2.5 font-bold text-green-700">Sueldo catorcenal</td>
                      <td className="px-4 py-2.5 font-bold text-right text-green-700">{formatMXN(empleado.s_catorcenal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Datos bancarios">
              <FieldGrid>
                <Field label="Banco" value={empleado.banco ?? '—'} />
                <Field label="Cuenta bancaria" value={empleado.cuenta_bancaria ?? '—'} mono />
              </FieldGrid>
            </Section>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 10: VACACIONES
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="vacaciones" className="mt-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Vacaciones registradas</h3>
              <Button size="sm" className="gap-1 text-xs" onClick={() => setShowVacDialog(true)}>
                <Plus className="w-3.5 h-3.5" />
                Registrar vacaciones
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Año', 'Periodo', 'Catorcena', 'F.Inicial', 'F.Final', 'Días Vac', 'Modo', 'Prima', 'Opciones'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {empVacaciones.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No hay vacaciones registradas</td></tr>
                  ) : (
                    empVacaciones.map(v => (
                      <tr key={v.numero} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">{v.year}</td>
                        <td className="px-4 py-3">{v.periodo}</td>
                        <td className="px-4 py-3 font-mono">{v.catorcena}</td>
                        <td className="px-4 py-3">{v.f_inicial}</td>
                        <td className="px-4 py-3">{v.f_final}</td>
                        <td className="px-4 py-3 font-semibold">{v.dias_vac}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${v.vop === 'V' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                            {v.vop === 'V' ? 'Vacaciones' : 'Pago'}
                          </span>
                        </td>
                        <td className="px-4 py-3">{formatMXN(v.prima)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => deleteVacacion(v.numero)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vacation dialog */}
          <Dialog open={showVacDialog} onOpenChange={setShowVacDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Registrar Vacaciones</DialogTitle>
                <DialogDescription>Nómina: {empleado.clave} — {empleado.nombre_completo}</DialogDescription>
              </DialogHeader>
              <form onSubmit={vacForm.handleSubmit(handleSaveVacacion)} className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Año</Label>
                    <Input type="number" className="h-8 text-xs" {...vacForm.register('year')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Periodo</Label>
                    <Input className="h-8 text-xs" placeholder="2024-01" {...vacForm.register('periodo')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Catorcena</Label>
                    <Input className="h-8 text-xs" placeholder="2024-01" {...vacForm.register('catorcena')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Fecha inicial</Label>
                    <Input type="date" className="h-8 text-xs" {...vacForm.register('f_inicial')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Días de vacaciones</Label>
                    <Input type="number" className="h-8 text-xs" {...vacForm.register('dias_vac')} />
                  </div>
                </div>
                {vacFFinal && (
                  <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs">
                    <span className="text-blue-600">Fecha final: <strong>{vacFFinal}</strong></span>
                  </div>
                )}
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <Checkbox id="desc_sab" checked={vacForm.watch('desc_sab')}
                      onCheckedChange={v => vacForm.setValue('desc_sab', !!v)} />
                    <Label htmlFor="desc_sab" className="text-xs cursor-pointer">Descansa sábado</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Checkbox id="desc_dom" checked={vacForm.watch('desc_dom')}
                      onCheckedChange={v => vacForm.setValue('desc_dom', !!v)} />
                    <Label htmlFor="desc_dom" className="text-xs cursor-pointer">Descansa domingo</Label>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Modo</Label>
                  <RadioGroup defaultValue="V" className="flex gap-4 grid-cols-none"
                    onValueChange={v => vacForm.setValue('vop', v as 'V' | 'P')}>
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="V" id="vop-v" />
                      <Label htmlFor="vop-v" className="text-xs cursor-pointer">Vacaciones</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="P" id="vop-p" />
                      <Label htmlFor="vop-p" className="text-xs cursor-pointer">Pago</Label>
                    </div>
                  </RadioGroup>
                </div>
                {vacDiasLab > 0 && (
                  <div className="bg-green-50 rounded-lg px-3 py-2 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Prima vacacional:</span>
                      <span className="font-bold text-green-700">{formatMXN(vacPrima)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Días laborables:</span>
                      <span className="font-bold text-green-700">{vacDiasLab}</span>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowVacDialog(false)}>Cancelar</Button>
                  <Button type="submit" size="sm">Guardar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 11: INCAPACIDADES
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="incapacidades" className="mt-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Incapacidades registradas</h3>
              <Button size="sm" className="gap-1 text-xs" onClick={() => setShowIncapDialog(true)}>
                <Plus className="w-3.5 h-3.5" />
                Registrar incapacidad
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Folio', 'Concepto', 'Modo', 'F.Inicial', 'F.Final', 'Días', 'Catorcena', 'Opciones'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {empIncapacidades.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No hay incapacidades registradas</td></tr>
                  ) : (
                    empIncapacidades.map(inc => {
                      const conc = concIncap.find(c => c.clave === inc.concepto)
                      const modo = modosIncap.find(m => m.clave === inc.modo)
                      return (
                        <tr key={inc.numero} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-mono">{inc.folio}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {conc && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: conc.colorcode }} />}
                              {conc?.descripcion ?? inc.concepto}
                            </div>
                          </td>
                          <td className="px-4 py-3">{modo?.descripcion ?? inc.modo}</td>
                          <td className="px-4 py-3">{inc.f_inicial}</td>
                          <td className="px-4 py-3">{inc.f_final}</td>
                          <td className="px-4 py-3 font-semibold">{inc.dias}</td>
                          <td className="px-4 py-3 font-mono">{inc.catorcena}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => deleteIncapacidad(inc.numero)}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Incapacidad dialog */}
          <Dialog open={showIncapDialog} onOpenChange={setShowIncapDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Registrar Incapacidad</DialogTitle>
                <DialogDescription>Nómina: {empleado.clave} — {empleado.nombre_completo}</DialogDescription>
              </DialogHeader>
              <form onSubmit={incapForm.handleSubmit(handleSaveIncap)} className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Folio *</Label>
                  <Input className="h-8 text-xs" {...incapForm.register('folio')} placeholder="IMSS-000001" />
                  {incapForm.formState.errors.folio && (
                    <p className="text-[10px] text-red-500">{incapForm.formState.errors.folio.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Concepto *</Label>
                    <Select onValueChange={(v: unknown) => incapForm.setValue('concepto', parseInt(String(v)))}>
                      <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {concIncap.map(c => (
                          <SelectItem key={c.clave} value={String(c.clave)} className="text-xs">{c.descripcion}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Modo *</Label>
                    <Select onValueChange={(v: unknown) => incapForm.setValue('modo', parseInt(String(v)))}>
                      <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {modosIncap.map(m => (
                          <SelectItem key={m.clave} value={String(m.clave)} className="text-xs">{m.descripcion}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Fecha inicial *</Label>
                    <Input type="date" className="h-8 text-xs" {...incapForm.register('f_inicial')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Días *</Label>
                    <Input type="number" className="h-8 text-xs" {...incapForm.register('dias')} />
                  </div>
                </div>
                {incapFFinal && (
                  <div className="bg-orange-50 rounded-lg px-3 py-2 text-xs text-orange-700">
                    Fecha final: <strong>{incapFFinal}</strong>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Catorcena (YYYY-CC) *</Label>
                  <Input className="h-8 text-xs" placeholder="2024-01" {...incapForm.register('catorcena')} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Observaciones</Label>
                  <Textarea className="text-xs min-h-[60px]" {...incapForm.register('observaciones')} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowIncapDialog(false)}>Cancelar</Button>
                  <Button type="submit" size="sm">Guardar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 12: HISTORIAL
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="historial" className="mt-4 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Línea de tiempo</h3>
            {empHistorial.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin movimientos registrados</p>
            ) : (
              <div className="space-y-0">
                {empHistorial.map((h, idx) => {
                  const { icon: Icon, color, bg, label } = histMovIcon(h.movimiento)
                  return (
                    <div key={h.numero} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-3.5 h-3.5 ${color}`} />
                        </div>
                        {idx < empHistorial.length - 1 && (
                          <div className="w-0.5 flex-1 bg-gray-100 my-1" />
                        )}
                      </div>
                      <div className="pb-4 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bg} ${color}`}>{label}</span>
                          <span className="text-xs text-gray-400">{h.fecha}</span>
                        </div>
                        <p className="text-xs text-gray-600">{h.observaciones}</p>
                        {(h.puesto_inicial > 0 || h.puesto_final > 0) && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Puesto: {h.puesto_inicial > 0 ? getPuestoNombre(h.puesto_inicial) : '—'}
                            {' → '}
                            {h.puesto_final > 0 ? getPuestoNombre(h.puesto_final) : '—'}
                          </p>
                        )}
                        {(h.sueldo_inicial > 0 || h.sueldo_final > 0) && (
                          <p className="text-[10px] text-gray-400">
                            Sueldo: {h.sueldo_inicial > 0 ? formatMXN(h.sueldo_inicial) : '—'}
                            {' → '}
                            {h.sueldo_final > 0 ? formatMXN(h.sueldo_final) : '—'}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── EDIT SHEET ────────────────────────────────────────────────────────── */}
      <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
        <SheetContent side="right" className="w-[560px] sm:max-w-[560px] p-0 flex flex-col overflow-hidden">
          <SheetHeader className="px-6 py-4 border-b border-gray-100 shrink-0">
            <SheetTitle>Editar empleado</SheetTitle>
            <SheetDescription>{empleado.nombre_completo} — {empleado.clave}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <EditarEmpleadoForm empleado={empleado} onClose={() => setShowEditSheet(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── BAJA DIALOG ───────────────────────────────────────────────────────── */}
      <BajaDialog
        empleado={empleado}
        open={showBajaDialog}
        onClose={() => setShowBajaDialog(false)}
      />
    </div>
  )
}

// ─── HELPER DISPLAY COMPONENTS ────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-1">{title}</h4>
      {children}
    </div>
  )
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>
}

function Field({
  label, value, mono, className,
}: {
  label: string; value: string | number; mono?: boolean; className?: string
}) {
  return (
    <div className={className}>
      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-xs font-semibold text-gray-800 mt-0.5 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}

function EditField({
  label, value, onChange, type = 'text', className,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; className?: string
}) {
  return (
    <div className={`space-y-1 ${className ?? ''}`}>
      <Label className="text-xs text-gray-500">{label}</Label>
      <Input
        type={type}
        className="h-8 text-xs"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}
