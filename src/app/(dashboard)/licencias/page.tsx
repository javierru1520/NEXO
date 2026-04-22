"use client"

import { useState, useMemo } from 'react'
import { useSCRHStore } from '@/store'
import type { Licencia } from '@/types'
import {
  CreditCard, ShieldCheck, AlertTriangle, XCircle, Plus, Trash2, Edit2, AlertOctagon,
  Stethoscope, FlaskConical, CheckCircle, XOctagon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose,
} from '@/components/ui/sheet'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

// ─── helpers ──────────────────────────────────────────────────────────────────

const TIPOS_LICENCIA = ['Federal', 'Estatal', 'Particular']

function getLicenciaStatus(vence: string): 'vigente' | 'por_vencer' | 'vencida' {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const venceDate = new Date(vence + 'T00:00:00')
  const diff = Math.floor((venceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'vencida'
  if (diff <= 30) return 'por_vencer'
  return 'vigente'
}

function calcAntiguedad(alta: string): string {
  const hoy = new Date()
  const altaDate = new Date(alta + 'T00:00:00')
  const years = hoy.getFullYear() - altaDate.getFullYear()
  const months = hoy.getMonth() - altaDate.getMonth()
  const totalMonths = years * 12 + months
  const y = Math.floor(totalMonths / 12)
  const m = totalMonths % 12
  if (y === 0) return `${m} mes${m !== 1 ? 'es' : ''}`
  if (m === 0) return `${y} año${y !== 1 ? 's' : ''}`
  return `${y} año${y !== 1 ? 's' : ''} ${m} mes${m !== 1 ? 'es' : ''}`
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function diasRestantes(vence: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const venceDate = new Date(vence + 'T00:00:00')
  return Math.floor((venceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

const STATUS_BADGE = {
  vigente:    { label: 'Vigente',    cls: 'bg-green-100 text-green-700' },
  por_vencer: { label: 'Por vencer', cls: 'bg-yellow-100 text-yellow-700' },
  vencida:    { label: 'Vencida',    cls: 'bg-red-100 text-red-600' },
}

const ROW_BG = {
  vigente:    '',
  por_vencer: 'bg-yellow-50/60',
  vencida:    'bg-red-50/60',
}

const EMPTY_FORM = {
  clave: '', tipo: 'Federal', licencia: '', vence: '',
  federal: false, estatal: false, antidop: '',
}

// ─── AptoLF types & mock ──────────────────────────────────────────────────────

interface AptoLF {
  id: number
  clave: string
  folio: string
  vence: string
  fecha_examen: string
  resultado: 'Apto' | 'No Apto' | 'Condicionado'
  medico: string
  observaciones?: string
}

const APTOS_LF_MOCK: AptoLF[] = [
  { id: 1,  clave: '1001', folio: 'ALF-2024-001', fecha_examen: '2024-03-10', vence: '2026-03-10', resultado: 'Apto',         medico: 'Dr. Ramírez Torres',   observaciones: 'Examen completo sin observaciones' },
  { id: 2,  clave: '1008', folio: 'ALF-2024-002', fecha_examen: '2024-04-15', vence: '2026-04-15', resultado: 'Apto',         medico: 'Dra. Sánchez Pérez',   observaciones: '' },
  { id: 3,  clave: '1014', folio: 'ALF-2023-010', fecha_examen: '2023-05-20', vence: '2025-05-20', resultado: 'Condicionado', medico: 'Dr. Ramírez Torres',   observaciones: 'Requiere uso de lentes graduados' },
  { id: 4,  clave: '1016', folio: 'ALF-2024-015', fecha_examen: '2024-01-08', vence: '2026-01-08', resultado: 'Apto',         medico: 'Dr. Medina Herrera',   observaciones: '' },
  { id: 5,  clave: '1018', folio: 'ALF-2023-022', fecha_examen: '2023-02-14', vence: '2025-02-14', resultado: 'Apto',         medico: 'Dra. Sánchez Pérez',   observaciones: '' },
  { id: 6,  clave: '1019', folio: 'ALF-2023-030', fecha_examen: '2023-06-01', vence: '2024-06-01', resultado: 'No Apto',      medico: 'Dr. Medina Herrera',   observaciones: 'Presión arterial elevada, no apto temporalmente' },
  { id: 7,  clave: '1020', folio: 'ALF-2022-044', fecha_examen: '2022-11-11', vence: '2024-11-11', resultado: 'Apto',         medico: 'Dr. Ramírez Torres',   observaciones: '' },
  { id: 8,  clave: '1023', folio: 'ALF-2024-031', fecha_examen: '2024-06-20', vence: '2026-06-20', resultado: 'Apto',         medico: 'Dra. Sánchez Pérez',   observaciones: '' },
]

const EMPTY_APTO_FORM = {
  clave: '', folio: '', fecha_examen: '', vence: '',
  resultado: 'Apto' as AptoLF['resultado'],
  medico: '', observaciones: '',
}

// ─── Antidoping types & mock ──────────────────────────────────────────────────

interface Antidoping {
  id: number
  clave: string
  fecha: string
  resultado: 'Negativo' | 'Positivo' | 'Pendiente'
  sustancia?: string
  laboratorio: string
  folio: string
  observaciones?: string
}

const ANTIDOPING_MOCK: Antidoping[] = [
  { id: 1,  clave: '1001', folio: 'AD-2024-001', fecha: '2024-03-10', resultado: 'Negativo',  laboratorio: 'Lab Análisis del Norte',    observaciones: '' },
  { id: 2,  clave: '1008', folio: 'AD-2024-002', fecha: '2024-04-15', resultado: 'Negativo',  laboratorio: 'BioLab Baja California',    observaciones: '' },
  { id: 3,  clave: '1002', folio: 'AD-2024-003', fecha: '2024-01-22', resultado: 'Negativo',  laboratorio: 'Lab Análisis del Norte',    observaciones: '' },
  { id: 4,  clave: '1005', folio: 'AD-2023-045', fecha: '2023-11-05', resultado: 'Positivo',  sustancia: 'Anfetaminas', laboratorio: 'Laboratorio Clínico Central', observaciones: 'Se aplica protocolo disciplinario' },
  { id: 5,  clave: '1014', folio: 'AD-2024-010', fecha: '2024-02-28', resultado: 'Negativo',  laboratorio: 'BioLab Baja California',    observaciones: '' },
  { id: 6,  clave: '1016', folio: 'AD-2024-011', fecha: '2024-03-05', resultado: 'Pendiente', laboratorio: 'Lab Análisis del Norte',    observaciones: 'Muestra en análisis' },
  { id: 7,  clave: '1018', folio: 'AD-2024-012', fecha: '2024-03-18', resultado: 'Negativo',  laboratorio: 'Laboratorio Clínico Central', observaciones: '' },
  { id: 8,  clave: '1019', folio: 'AD-2023-060', fecha: '2023-09-15', resultado: 'Negativo',  laboratorio: 'BioLab Baja California',    observaciones: '' },
  { id: 9,  clave: '1020', folio: 'AD-2024-020', fecha: '2024-05-01', resultado: 'Negativo',  laboratorio: 'Lab Análisis del Norte',    observaciones: '' },
  { id: 10, clave: '1023', folio: 'AD-2024-025', fecha: '2024-06-20', resultado: 'Negativo',  laboratorio: 'BioLab Baja California',    observaciones: '' },
]

const EMPTY_ANTI_FORM = {
  clave: '', folio: '', fecha: '',
  resultado: 'Negativo' as Antidoping['resultado'],
  sustancia: '', laboratorio: '', observaciones: '',
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function LicenciasPage() {
  const {
    licencias, empleados,
    addLicencia, updateLicencia, deleteLicencia,
    getEmpleadoNombre, getPuestoNombre,
  } = useSCRHStore()

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'licencias' | 'aptos' | 'antidoping'>('licencias')

  // ── Licencias Stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let vigentes = 0, porVencer = 0, vencidas = 0
    licencias.forEach(l => {
      const s = getLicenciaStatus(l.vence)
      if (s === 'vigente') vigentes++
      else if (s === 'por_vencer') porVencer++
      else vencidas++
    })
    return { total: licencias.length, vigentes, porVencer, vencidas }
  }, [licencias])

  const showPorVencer = stats.porVencer > 0
  const showVencidas = stats.vencidas > 0

  // ── Nueva / Editar licencia ────────────────────────────────────────────────
  const [showSheet, setShowSheet] = useState(false)
  const [editando, setEditando] = useState<Licencia | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [empNombre, setEmpNombre] = useState('')

  function openNueva() {
    setEditando(null)
    setForm({ ...EMPTY_FORM })
    setEmpNombre('')
    setShowSheet(true)
  }

  function openEditar(lic: Licencia) {
    setEditando(lic)
    setForm({
      clave: lic.clave,
      tipo: lic.tipo,
      licencia: lic.licencia,
      vence: lic.vence,
      federal: lic.federal,
      estatal: lic.estatal,
      antidop: lic.antidop ?? '',
    })
    const emp = empleados.find(e => e.clave === lic.clave)
    setEmpNombre(emp?.nombre_completo ?? '')
    setShowSheet(true)
  }

  function handleSave() {
    if (!form.clave || !form.licencia || !form.vence) return
    if (editando) {
      updateLicencia(editando.numero, {
        clave: form.clave,
        tipo: form.tipo,
        licencia: form.licencia,
        vence: form.vence,
        federal: form.federal,
        estatal: form.estatal,
        antidop: form.antidop || undefined,
      })
    } else {
      addLicencia({
        clave: form.clave,
        tipo: form.tipo,
        licencia: form.licencia,
        vence: form.vence,
        federal: form.federal,
        estatal: form.estatal,
        antidop: form.antidop || undefined,
      })
    }
    setShowSheet(false)
  }

  function handleClaveBlur() {
    const emp = empleados.find(e => e.clave === form.clave.trim())
    setEmpNombre(emp?.nombre_completo ?? (form.clave ? 'Empleado no encontrado' : ''))
  }

  // ── Eliminar licencia ──────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Licencia | null>(null)

  function handleDelete() {
    if (!deleteTarget) return
    deleteLicencia(deleteTarget.numero)
    setDeleteTarget(null)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // APTOS LF STATE
  // ─────────────────────────────────────────────────────────────────────────
  const [aptosLF, setAptosLF] = useState<AptoLF[]>(APTOS_LF_MOCK)
  const [showAptoSheet, setShowAptoSheet] = useState(false)
  const [editandoApto, setEditandoApto] = useState<AptoLF | null>(null)
  const [aptoForm, setAptoForm] = useState({ ...EMPTY_APTO_FORM })
  const [aptoEmpNombre, setAptoEmpNombre] = useState('')
  const [deleteAptoTarget, setDeleteAptoTarget] = useState<AptoLF | null>(null)

  const aptosStats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    let aptos = 0, noAptos = 0, condicionados = 0, vencidos = 0, porVencer = 0
    aptosLF.forEach(a => {
      if (a.resultado === 'Apto') aptos++
      else if (a.resultado === 'No Apto') noAptos++
      else condicionados++
      const dias = diasRestantes(a.vence)
      if (dias < 0) vencidos++
      else if (dias <= 30) porVencer++
    })
    return { total: aptosLF.length, aptos, noAptos, condicionados, vencidos, porVencer }
  }, [aptosLF])

  function openNuevoApto() {
    setEditandoApto(null)
    setAptoForm({ ...EMPTY_APTO_FORM })
    setAptoEmpNombre('')
    setShowAptoSheet(true)
  }

  function openEditarApto(a: AptoLF) {
    setEditandoApto(a)
    setAptoForm({ clave: a.clave, folio: a.folio, fecha_examen: a.fecha_examen, vence: a.vence, resultado: a.resultado, medico: a.medico, observaciones: a.observaciones ?? '' })
    const emp = empleados.find(e => e.clave === a.clave)
    setAptoEmpNombre(emp?.nombre_completo ?? '')
    setShowAptoSheet(true)
  }

  function handleSaveApto() {
    if (!aptoForm.clave || !aptoForm.folio || !aptoForm.vence || !aptoForm.fecha_examen) return
    if (editandoApto) {
      setAptosLF(prev => prev.map(a => a.id === editandoApto.id ? { ...a, ...aptoForm } : a))
    } else {
      const newId = aptosLF.length > 0 ? Math.max(...aptosLF.map(a => a.id)) + 1 : 1
      setAptosLF(prev => [...prev, { id: newId, ...aptoForm }])
    }
    setShowAptoSheet(false)
  }

  function handleAptoClaveBlur() {
    const emp = empleados.find(e => e.clave === aptoForm.clave.trim())
    setAptoEmpNombre(emp?.nombre_completo ?? (aptoForm.clave ? 'Empleado no encontrado' : ''))
  }

  function handleDeleteApto() {
    if (!deleteAptoTarget) return
    setAptosLF(prev => prev.filter(a => a.id !== deleteAptoTarget.id))
    setDeleteAptoTarget(null)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ANTIDOPING STATE
  // ─────────────────────────────────────────────────────────────────────────
  const [antidopings, setAntidopings] = useState<Antidoping[]>(ANTIDOPING_MOCK)
  const [showAntiSheet, setShowAntiSheet] = useState(false)
  const [antiForm, setAntiForm] = useState({ ...EMPTY_ANTI_FORM })
  const [antiEmpNombre, setAntiEmpNombre] = useState('')
  const [deleteAntiTarget, setDeleteAntiTarget] = useState<Antidoping | null>(null)

  const antiStats = useMemo(() => {
    let negativos = 0, positivos = 0, pendientes = 0
    antidopings.forEach(a => {
      if (a.resultado === 'Negativo') negativos++
      else if (a.resultado === 'Positivo') positivos++
      else pendientes++
    })
    return { total: antidopings.length, negativos, positivos, pendientes }
  }, [antidopings])

  function openNuevoAnti() {
    setAntiForm({ ...EMPTY_ANTI_FORM })
    setAntiEmpNombre('')
    setShowAntiSheet(true)
  }

  function handleSaveAnti() {
    if (!antiForm.clave || !antiForm.folio || !antiForm.fecha || !antiForm.laboratorio) return
    const newId = antidopings.length > 0 ? Math.max(...antidopings.map(a => a.id)) + 1 : 1
    setAntidopings(prev => [...prev, {
      id: newId,
      clave: antiForm.clave,
      folio: antiForm.folio,
      fecha: antiForm.fecha,
      resultado: antiForm.resultado,
      sustancia: antiForm.sustancia || undefined,
      laboratorio: antiForm.laboratorio,
      observaciones: antiForm.observaciones || undefined,
    }])
    setShowAntiSheet(false)
  }

  function handleAntiClaveBlur() {
    const emp = empleados.find(e => e.clave === antiForm.clave.trim())
    setAntiEmpNombre(emp?.nombre_completo ?? (antiForm.clave ? 'Empleado no encontrado' : ''))
  }

  function handleDeleteAnti() {
    if (!deleteAntiTarget) return
    setAntidopings(prev => prev.filter(a => a.id !== deleteAntiTarget.id))
    setDeleteAntiTarget(null)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Módulo de Licencias</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Control de Licencias</h1>
          <p className="text-sm text-gray-500 mt-0.5">Seguimiento de vencimientos, aptitudes federales y antidoping</p>
        </div>
        {activeTab === 'licencias' && (
          <Button size="sm" className="text-xs" onClick={openNueva}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Nueva Licencia
          </Button>
        )}
        {activeTab === 'aptos' && (
          <Button size="sm" className="text-xs" onClick={openNuevoApto}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Nuevo Apto LF
          </Button>
        )}
        {activeTab === 'antidoping' && (
          <Button size="sm" className="text-xs" onClick={openNuevoAnti}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Registrar Antidoping
          </Button>
        )}
      </div>

      {/* ── Tabs nav ── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { key: 'licencias',   label: 'Licencias',       icon: CreditCard },
          { key: 'aptos',       label: 'Aptos LF',        icon: Stethoscope },
          { key: 'antidoping',  label: 'Antidoping',      icon: FlaskConical },
        ] as const).map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          TAB: LICENCIAS
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'licencias' && (
        <>
          {/* Banners */}
          {showVencidas && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>🚨 {stats.vencidas} licencia{stats.vencidas !== 1 ? 's' : ''} vencida{stats.vencidas !== 1 ? 's' : ''}</span>
            </div>
          )}
          {showPorVencer && (
            <div className="flex items-center gap-2 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>⚠ {stats.porVencer} licencia{stats.porVencer !== 1 ? 's' : ''} por vencer en los próximos 30 días</span>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total licencias', value: stats.total, sub: 'Registradas en sistema', icon: CreditCard, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
              { label: 'Vigentes', value: stats.vigentes, sub: 'Más de 30 días', icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
              { label: 'Por vencer', value: stats.porVencer, sub: 'Próximos 30 días', icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
              { label: 'Vencidas', value: stats.vencidas, sub: 'Requieren renovación', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
            ].map(stat => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className={`bg-white rounded-xl border ${stat.border} shadow-sm p-4 flex items-center gap-3`}>
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                    <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-[10px] text-gray-400">{stat.sub}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Nómina','Nombre empleado','Puesto','Tipo licencia','# Licencia','F. Vencimiento','Estado','Antigüedad','Acciones'].map(col => (
                      <th key={col} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {licencias.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">No hay licencias registradas</td></tr>
                  ) : licencias.map(lic => {
                    const status = getLicenciaStatus(lic.vence)
                    const badge = STATUS_BADGE[status]
                    const rowBg = ROW_BG[status]
                    const emp = empleados.find(e => e.clave === lic.clave)
                    return (
                      <tr key={lic.numero} className={`${rowBg} hover:brightness-95 transition-all`}>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded">{lic.clave}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold text-gray-800 whitespace-nowrap">{emp?.nombre_completo ?? lic.clave}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                          {emp ? getPuestoNombre(emp.puesto) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{lic.tipo}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono font-semibold text-gray-700">{lic.licencia}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtDate(lic.vence)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                          {emp ? calcAntiguedad(emp.alta) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditar(lic)}
                              className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors" title="Editar">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteTarget(lic)}
                              className="p-1.5 rounded hover:bg-red-50 text-red-500 transition-colors" title="Eliminar">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">{licencias.length} licencias registradas</span>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB: APTOS LF
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'aptos' && (
        <>
          {/* Banners */}
          {aptosStats.vencidos > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>🚨 {aptosStats.vencidos} apto{aptosStats.vencidos !== 1 ? 's' : ''} vencido{aptosStats.vencidos !== 1 ? 's' : ''}</span>
            </div>
          )}
          {aptosStats.porVencer > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>⚠ {aptosStats.porVencer} apto{aptosStats.porVencer !== 1 ? 's' : ''} por vencer en 30 días</span>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Total aptos', value: aptosStats.total,       color: 'text-teal-600',   bg: 'bg-teal-50',   border: 'border-teal-100',   icon: Stethoscope },
              { label: 'Aptos',       value: aptosStats.aptos,       color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100',  icon: CheckCircle },
              { label: 'Por vencer',  value: aptosStats.porVencer,   color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100', icon: AlertTriangle },
              { label: 'Vencidos',    value: aptosStats.vencidos,    color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-100',    icon: XCircle },
              { label: 'No aptos',    value: aptosStats.noAptos + aptosStats.condicionados, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', icon: XOctagon },
            ].map(stat => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className={`bg-white rounded-xl border ${stat.border} shadow-sm p-4 flex items-center gap-3`}>
                  <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4.5 h-4.5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium">{stat.label}</p>
                    <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Nómina','Nombre','Puesto','Folio','F. Examen','F. Vencimiento','Resultado','Médico','Días restantes','Acciones'].map(col => (
                      <th key={col} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {aptosLF.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-gray-400">No hay registros de aptitud</td></tr>
                  ) : aptosLF.map(a => {
                    const emp = empleados.find(e => e.clave === a.clave)
                    const dias = diasRestantes(a.vence)
                    const diasColor = dias < 0 ? 'text-red-600 font-bold' : dias < 30 ? 'text-yellow-600 font-semibold' : 'text-green-700 font-semibold'
                    const resultBadge =
                      a.resultado === 'Apto'        ? 'bg-green-100 text-green-700' :
                      a.resultado === 'No Apto'     ? 'bg-red-100 text-red-600' :
                                                      'bg-orange-100 text-orange-700'
                    return (
                      <tr key={a.id} className="hover:bg-gray-50/60 transition-all">
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded">{a.clave}</span>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">
                          {emp?.nombre_completo ?? a.clave}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                          {emp ? getPuestoNombre(emp.puesto) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-gray-700">{a.folio}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtDate(a.fecha_examen)}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtDate(a.vence)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${resultBadge}`}>
                            {a.resultado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{a.medico}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs ${diasColor}`}>
                            {dias < 0 ? `${Math.abs(dias)} días` : `${dias} días`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditarApto(a)}
                              className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors" title="Editar">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteAptoTarget(a)}
                              className="p-1.5 rounded hover:bg-red-50 text-red-500 transition-colors" title="Eliminar">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">{aptosLF.length} registros de aptitud</span>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB: ANTIDOPING
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'antidoping' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total registros', value: antiStats.total,      color: 'text-teal-600',  bg: 'bg-teal-50',  border: 'border-teal-100',  icon: FlaskConical },
              { label: 'Negativos',       value: antiStats.negativos,  color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', icon: CheckCircle },
              { label: 'Positivos',       value: antiStats.positivos,  color: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-100',   icon: XOctagon },
              { label: 'Pendientes',      value: antiStats.pendientes, color: 'text-yellow-600',bg: 'bg-yellow-50',border: 'border-yellow-100',icon: AlertTriangle },
            ].map(stat => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className={`bg-white rounded-xl border ${stat.border} shadow-sm p-4 flex items-center gap-3`}>
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                    <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Positivos banner */}
          {antiStats.positivos > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>🚨 {antiStats.positivos} resultado{antiStats.positivos !== 1 ? 's' : ''} positivo{antiStats.positivos !== 1 ? 's' : ''} — requiere atención</span>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Nómina','Nombre','Folio','Fecha','Resultado','Laboratorio','Sustancia','Observaciones','Acciones'].map(col => (
                      <th key={col} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {antidopings.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">No hay registros de antidoping</td></tr>
                  ) : antidopings.map(a => {
                    const emp = empleados.find(e => e.clave === a.clave)
                    const resultBadge =
                      a.resultado === 'Negativo'  ? 'bg-green-100 text-green-700' :
                      a.resultado === 'Positivo'  ? 'bg-red-100 text-red-600' :
                                                    'bg-yellow-100 text-yellow-700'
                    const rowBg = a.resultado === 'Positivo' ? 'bg-red-50/40' : ''
                    return (
                      <tr key={a.id} className={`${rowBg} hover:brightness-95 transition-all`}>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded">{a.clave}</span>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">
                          {emp?.nombre_completo ?? a.clave}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-gray-700">{a.folio}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtDate(a.fecha)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${resultBadge}`}>
                            {a.resultado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{a.laboratorio}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {a.sustancia ? (
                            <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-semibold">{a.sustancia}</span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] truncate">{a.observaciones || '—'}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => setDeleteAntiTarget(a)}
                            className="p-1.5 rounded hover:bg-red-50 text-red-500 transition-colors" title="Eliminar">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">{antidopings.length} registros de antidoping</span>
            </div>
          </div>
        </>
      )}

      {/* ══ Sheet: Nueva / Editar Licencia ══ */}
      <Sheet open={showSheet} onOpenChange={setShowSheet}>
        <SheetContent side="right" className="w-[440px] sm:max-w-[440px] flex flex-col">
          <SheetHeader>
            <SheetTitle>{editando ? 'Editar Licencia' : 'Nueva Licencia'}</SheetTitle>
            <SheetDescription>
              {editando ? 'Modifica los datos de la licencia' : 'Registra una nueva licencia de conducir'}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Número de nómina *</Label>
              <Input value={form.clave}
                onChange={e => setForm(p => ({ ...p, clave: e.target.value }))}
                onBlur={handleClaveBlur}
                placeholder="Ej: 1001" className="text-xs" />
              {empNombre && (
                <p className={`text-xs mt-1 ${empNombre === 'Empleado no encontrado' ? 'text-red-500' : 'text-green-700 font-medium'}`}>
                  {empNombre}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipo de licencia</Label>
              <Select value={form.tipo} onValueChange={v => { if (v) setForm(p => ({ ...p, tipo: v })) }}>
                <SelectTrigger className="text-xs w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_LICENCIA.map(t => (
                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Número de licencia *</Label>
              <Input value={form.licencia}
                onChange={e => setForm(p => ({ ...p, licencia: e.target.value }))}
                placeholder="Ej: E, D, C" className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Fecha de vencimiento *</Label>
              <Input type="date" value={form.vence}
                onChange={e => setForm(p => ({ ...p, vence: e.target.value }))} className="text-xs" />
            </div>
            <div className="space-y-3 border border-gray-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-600">Cobertura</p>
              <div className="flex items-center gap-2">
                <Checkbox id="fed" checked={form.federal}
                  onCheckedChange={(v) => setForm(p => ({ ...p, federal: !!v }))} />
                <Label htmlFor="fed" className="text-xs cursor-pointer">Federal</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="est" checked={form.estatal}
                  onCheckedChange={(v) => setForm(p => ({ ...p, estatal: !!v }))} />
                <Label htmlFor="est" className="text-xs cursor-pointer">Estatal</Label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Último antidoping</Label>
              <Input type="date" value={form.antidop}
                onChange={e => setForm(p => ({ ...p, antidop: e.target.value }))} className="text-xs" />
            </div>
          </div>
          <SheetFooter className="border-t border-gray-100 pt-4">
            <SheetClose className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-input bg-transparent px-3 py-1.5 text-xs font-medium shadow-xs hover:bg-accent hover:text-accent-foreground">Cancelar</SheetClose>
            <Button size="sm" className="text-xs" onClick={handleSave}>
              {editando ? 'Actualizar' : 'Guardar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ══ Dialog: Confirmar Eliminar Licencia ══ */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar licencia</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la licencia <strong>{deleteTarget?.licencia}</strong> del empleado <strong>{deleteTarget ? getEmpleadoNombre(deleteTarget.clave) : ''}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-input bg-transparent px-3 py-1.5 text-xs font-medium shadow-xs hover:bg-accent hover:text-accent-foreground">Cancelar</DialogClose>
            <Button variant="destructive" size="sm" className="text-xs" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Sheet: Nuevo / Editar Apto LF ══ */}
      <Sheet open={showAptoSheet} onOpenChange={setShowAptoSheet}>
        <SheetContent side="right" className="w-[440px] sm:max-w-[440px] flex flex-col">
          <SheetHeader>
            <SheetTitle>{editandoApto ? 'Editar Apto LF' : 'Nuevo Apto LF'}</SheetTitle>
            <SheetDescription>
              {editandoApto ? 'Modifica el registro de aptitud para licencia federal' : 'Registra una aptitud para licencia federal (examen médico)'}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Número de nómina *</Label>
              <Input value={aptoForm.clave}
                onChange={e => setAptoForm(p => ({ ...p, clave: e.target.value }))}
                onBlur={handleAptoClaveBlur}
                placeholder="Ej: 1001" className="text-xs" />
              {aptoEmpNombre && (
                <p className={`text-xs mt-1 ${aptoEmpNombre === 'Empleado no encontrado' ? 'text-red-500' : 'text-green-700 font-medium'}`}>
                  {aptoEmpNombre}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Folio *</Label>
              <Input value={aptoForm.folio}
                onChange={e => setAptoForm(p => ({ ...p, folio: e.target.value }))}
                placeholder="Ej: ALF-2024-001" className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Fecha de examen *</Label>
              <Input type="date" value={aptoForm.fecha_examen}
                onChange={e => setAptoForm(p => ({ ...p, fecha_examen: e.target.value }))} className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Fecha de vencimiento *</Label>
              <Input type="date" value={aptoForm.vence}
                onChange={e => setAptoForm(p => ({ ...p, vence: e.target.value }))} className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Resultado *</Label>
              <Select value={aptoForm.resultado} onValueChange={v => { if (v) setAptoForm(p => ({ ...p, resultado: v as AptoLF['resultado'] })) }}>
                <SelectTrigger className="text-xs w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Apto" className="text-xs">Apto</SelectItem>
                  <SelectItem value="No Apto" className="text-xs">No Apto</SelectItem>
                  <SelectItem value="Condicionado" className="text-xs">Condicionado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Médico</Label>
              <Input value={aptoForm.medico}
                onChange={e => setAptoForm(p => ({ ...p, medico: e.target.value }))}
                placeholder="Nombre del médico" className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observaciones</Label>
              <Textarea value={aptoForm.observaciones}
                onChange={e => setAptoForm(p => ({ ...p, observaciones: e.target.value }))}
                placeholder="Observaciones adicionales..." className="text-xs resize-none" rows={3} />
            </div>
          </div>
          <SheetFooter className="border-t border-gray-100 pt-4">
            <SheetClose className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-input bg-transparent px-3 py-1.5 text-xs font-medium shadow-xs hover:bg-accent hover:text-accent-foreground">Cancelar</SheetClose>
            <Button size="sm" className="text-xs" onClick={handleSaveApto}>
              {editandoApto ? 'Actualizar' : 'Guardar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ══ Dialog: Confirmar Eliminar Apto ══ */}
      <Dialog open={!!deleteAptoTarget} onOpenChange={open => { if (!open) setDeleteAptoTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar registro de aptitud</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el registro <strong>{deleteAptoTarget?.folio}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-input bg-transparent px-3 py-1.5 text-xs font-medium shadow-xs hover:bg-accent hover:text-accent-foreground">Cancelar</DialogClose>
            <Button variant="destructive" size="sm" className="text-xs" onClick={handleDeleteApto}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Sheet: Registrar Antidoping ══ */}
      <Sheet open={showAntiSheet} onOpenChange={setShowAntiSheet}>
        <SheetContent side="right" className="w-[440px] sm:max-w-[440px] flex flex-col">
          <SheetHeader>
            <SheetTitle>Registrar Antidoping</SheetTitle>
            <SheetDescription>Registra el resultado de una prueba de antidoping</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Número de nómina *</Label>
              <Input value={antiForm.clave}
                onChange={e => setAntiForm(p => ({ ...p, clave: e.target.value }))}
                onBlur={handleAntiClaveBlur}
                placeholder="Ej: 1001" className="text-xs" />
              {antiEmpNombre && (
                <p className={`text-xs mt-1 ${antiEmpNombre === 'Empleado no encontrado' ? 'text-red-500' : 'text-green-700 font-medium'}`}>
                  {antiEmpNombre}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Folio *</Label>
              <Input value={antiForm.folio}
                onChange={e => setAntiForm(p => ({ ...p, folio: e.target.value }))}
                placeholder="Ej: AD-2024-001" className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Fecha *</Label>
              <Input type="date" value={antiForm.fecha}
                onChange={e => setAntiForm(p => ({ ...p, fecha: e.target.value }))} className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Laboratorio *</Label>
              <Input value={antiForm.laboratorio}
                onChange={e => setAntiForm(p => ({ ...p, laboratorio: e.target.value }))}
                placeholder="Nombre del laboratorio" className="text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Resultado *</Label>
              <RadioGroup value={antiForm.resultado} onValueChange={v => setAntiForm(p => ({ ...p, resultado: v as Antidoping['resultado'] }))} className="flex gap-4">
                {(['Negativo', 'Positivo', 'Pendiente'] as const).map(r => (
                  <div key={r} className="flex items-center gap-1.5">
                    <RadioGroupItem value={r} id={`anti-${r}`} />
                    <Label htmlFor={`anti-${r}`} className="text-xs cursor-pointer">{r}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            {antiForm.resultado === 'Positivo' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Sustancia detectada</Label>
                <Input value={antiForm.sustancia}
                  onChange={e => setAntiForm(p => ({ ...p, sustancia: e.target.value }))}
                  placeholder="Ej: Anfetaminas, Cannabis..." className="text-xs" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observaciones</Label>
              <Textarea value={antiForm.observaciones}
                onChange={e => setAntiForm(p => ({ ...p, observaciones: e.target.value }))}
                placeholder="Observaciones adicionales..." className="text-xs resize-none" rows={3} />
            </div>
          </div>
          <SheetFooter className="border-t border-gray-100 pt-4">
            <SheetClose className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-input bg-transparent px-3 py-1.5 text-xs font-medium shadow-xs hover:bg-accent hover:text-accent-foreground">Cancelar</SheetClose>
            <Button size="sm" className="text-xs" onClick={handleSaveAnti}>Guardar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ══ Dialog: Confirmar Eliminar Antidoping ══ */}
      <Dialog open={!!deleteAntiTarget} onOpenChange={open => { if (!open) setDeleteAntiTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar registro de antidoping</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el registro <strong>{deleteAntiTarget?.folio}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-input bg-transparent px-3 py-1.5 text-xs font-medium shadow-xs hover:bg-accent hover:text-accent-foreground">Cancelar</DialogClose>
            <Button variant="destructive" size="sm" className="text-xs" onClick={handleDeleteAnti}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
