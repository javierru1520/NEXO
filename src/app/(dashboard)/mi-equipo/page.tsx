"use client"

import { useState, useMemo, useEffect } from 'react'
import { useSCRHStore } from '@/store'
import { getEquipoCompleto } from '@/lib/org-tree'
import { Empleado } from '@/types'
import { formatMXN } from '@/lib/calculations'
import {
  Users, UserPlus, Search, Pencil, Check, X, ChevronDown, Building2,
  Briefcase, CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'

type Tab = 'plantilla' | 'alta'

// ─── helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ st }: { st: 1 | 2 | 5 }) {
  if (st === 1) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Activo</span>
  if (st === 5) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">Baja</span>
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-700">Inactivo</span>
}

// ─── inline row editor ────────────────────────────────────────────────────────

function EditRow({
  emp, puestos, departamentos, centrosCostos,
  getPuestoNombre, getDepartamentoNombre,
  onSave, onCancel,
}: {
  emp: Empleado
  puestos: { clave: number; descripcion: string }[]
  departamentos: { clave: number; descripcion: string }[]
  centrosCostos: { clave: number; descripcion: string; desc_corta: string }[]
  getPuestoNombre: (id: number) => string
  getDepartamentoNombre: (id: number) => string
  onSave: (data: Partial<Empleado>) => void
  onCancel: () => void
}) {
  const [puesto, setPuesto] = useState(String(emp.puesto))
  const [depto, setDepto] = useState(String(emp.depto))

  return (
    <tr className="bg-indigo-50/60 border-b border-indigo-100">
      <td className="px-4 py-2">
        <span className="text-xs font-mono text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">{emp.clave}</span>
      </td>
      <td className="px-4 py-2">
        <p className="text-xs font-semibold text-gray-800">{emp.nombre_completo}</p>
      </td>
      <td className="px-4 py-2">
        <Select value={depto} onValueChange={v => setDepto(v ?? '')}>
          <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {departamentos.map(d => (
              <SelectItem key={d.clave} value={String(d.clave)} className="text-xs">{d.descripcion}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-2">
        <Select value={puesto} onValueChange={v => setPuesto(v ?? '')}>
          <SelectTrigger className="h-8 text-xs w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {puestos.map(p => (
              <SelectItem key={p.clave} value={String(p.clave)} className="text-xs">{p.descripcion}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-2">
        <StatusBadge st={emp.st} />
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSave({ puesto: parseInt(puesto), depto: parseInt(depto) })}
            className="flex items-center gap-1 px-2.5 py-1 bg-green-600 text-white rounded-lg text-[11px] font-semibold hover:bg-green-700 transition-colors"
          >
            <Check className="w-3 h-3" /> Guardar
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 text-gray-600 rounded-lg text-[11px] font-semibold hover:bg-gray-50 transition-colors"
          >
            <X className="w-3 h-3" /> Cancelar
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

const EMPTY_ALTA = {
  clave: '', a_paterno: '', a_materno: '', nombre: '',
  rfc: '', depto: 0, puesto: 0, ccostos: 0,
  sueldo_mensual: 0, fecha_ingreso: '', solicito: '',
}

export default function MiEquipoPage() {
  const {
    empleados, departamentos, puestos, centrosCostos, empresas,
    unidadesNegocio, updateEmpleado, addEmpleado,
    getPuestoNombre, getDepartamentoNombre, getEmpresaNombre,
  } = useSCRHStore()

  // ── auth ───────────────────────────────────────────────────────────────────
  const [rolCode, setRolCode] = useState<string>('')
  const [userName, setUserName] = useState('')
  const [userUN, setUserUN] = useState<number>(0)
  const [userNomina, setUserNomina] = useState<string>('')

  useEffect(() => {
    const stored = localStorage.getItem('nexo_user')
    if (stored) {
      try {
        const u = JSON.parse(stored)
        setRolCode(u.rolCode || '')
        setUserName(u.nombre || '')
        setUserNomina(u.nomina || '')
        if (u.rolCode === 'JT' || u.rolCode === 'C') setUserUN(5)
        else setUserUN(0)
      } catch {}
    }
  }, [])

  // ── state ──────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('plantilla')
  const [search, setSearch] = useState('')
  const [filterDepto, setFilterDepto] = useState(0)
  const [editingClave, setEditingClave] = useState<string | null>(null)
  const [altaForm, setAltaForm] = useState(EMPTY_ALTA)
  const [altaError, setAltaError] = useState('')
  const [altaSuccess, setAltaSuccess] = useState(false)
  const [altaNomina, setAltaNomina] = useState('')
  const [empEncontrado, setEmpEncontrado] = useState<null | 'en_nexo' | 'nuevo'>(null)

  // ── equipo jerárquico completo (todos los niveles hacia abajo) ────────────
  const equipoBase = useMemo(() => {
    if (!userNomina) return []
    if (rolCode === 'ADMIN') return empleados.filter(e => e.unidad_negocios === userUN)
    return getEquipoCompleto(userNomina, empleados)
  }, [empleados, rolCode, userNomina, userUN])

  const miGente = useMemo(() => {
    let list = equipoBase
    if (filterDepto) list = list.filter(e => e.depto === filterDepto)
    if (search.trim()) {
      const s = search.toLowerCase()
      list = list.filter(e => e.nombre_completo.toLowerCase().includes(s) || e.clave.includes(s))
    }
    return list
  }, [equipoBase, filterDepto, search])

  const misDeptos = useMemo(() => {
    const deptoIds = new Set(equipoBase.map(e => e.depto))
    return departamentos.filter(d => deptoIds.has(d.clave))
  }, [equipoBase, departamentos])

  const nombreUN = useMemo(
    () => unidadesNegocio.find(u => u.clave === userUN)?.descripcion ?? '—',
    [unidadesNegocio, userUN],
  )

  // stats
  const activos = useMemo(() => miGente.filter(e => e.st === 1).length, [miGente])
  const sinPuesto = useMemo(() => miGente.filter(e => !e.puesto).length, [miGente])

  // ── handlers ───────────────────────────────────────────────────────────────
  const handleSavePuesto = (clave: string, data: Partial<Empleado>) => {
    updateEmpleado(clave, data)
    setEditingClave(null)
  }

  const setAltaField = <K extends keyof typeof EMPTY_ALTA>(k: K, v: typeof EMPTY_ALTA[K]) =>
    setAltaForm(prev => ({ ...prev, [k]: v }))

  const today = new Date().toISOString().split('T')[0]

  const handleBuscarNomina = () => {
    const nom = altaNomina.trim()
    if (!nom) return
    const existe = empleados.find(e => e.clave === nom)
    if (existe) {
      setEmpEncontrado('en_nexo')
      setAltaForm(f => ({ ...f, clave: nom }))
    } else {
      setEmpEncontrado('nuevo')
      setAltaForm({ ...EMPTY_ALTA, clave: nom })
    }
    setAltaError('')
  }

  const handleVincularExistente = () => {
    updateEmpleado(altaNomina.trim(), { jefe_inmed: userNomina, unidad_negocios: userUN })
    setAltaSuccess(true)
    setTimeout(() => { setAltaSuccess(false); setAltaNomina(''); setEmpEncontrado(null) }, 2500)
  }

  const handleGuardarAlta = () => {
    if (!altaForm.a_paterno.trim() || !altaForm.nombre.trim()) {
      setAltaError('Apellido paterno y nombre son requeridos')
      return
    }
    if (!altaForm.rfc.trim()) { setAltaError('RFC es requerido'); return }
    if (!altaForm.depto || !altaForm.puesto) { setAltaError('Selecciona departamento y puesto'); return }
    if (!altaForm.sueldo_mensual || altaForm.sueldo_mensual <= 0) { setAltaError('Ingresa un sueldo válido'); return }
    if (!altaForm.fecha_ingreso) { setAltaError('Fecha de ingreso requerida'); return }

    setAltaError('')
    addEmpleado({
      clave: altaForm.clave.trim(),
      nombre_completo: `${altaForm.a_paterno} ${altaForm.a_materno} ${altaForm.nombre}`.trim(),
      a_paterno: altaForm.a_paterno.trim(),
      a_materno: altaForm.a_materno.trim(),
      nombre: altaForm.nombre.trim(),
      f_nacimiento: '',
      edad: 0,
      sexo: 'M',
      rfc: altaForm.rfc.trim(),
      curp: '',
      imss: '',
      empresa: 1,
      depto: altaForm.depto,
      puesto: altaForm.puesto,
      ccostos: altaForm.ccostos || 0,
      unidad_negocios: userUN,
      sueldo_mensual: altaForm.sueldo_mensual,
      sdo_mensual: 0,
      sd: 0,
      sdi: 0,
      despensa: 0,
      asistencia: 0,
      puntualidad: 0,
      antiguedad: 0,
      s_catorcenal: 0,
      alta: altaForm.fecha_ingreso,
      fecha_contrato: altaForm.fecha_ingreso,
      jefe_inmed: userNomina,
      st: 1,
      telefono: '',
      tel_contacto: '',
      contacto: '',
      calle: '',
      colonia: '',
      cp: '',
      localidad: '',
      estado: '',
      rh: '',
    })
    setAltaSuccess(true)
    setTimeout(() => {
      setAltaSuccess(false)
      setAltaForm(EMPTY_ALTA)
      setAltaNomina('')
      setEmpEncontrado(null)
    }, 2500)
  }

  // ── access guard ───────────────────────────────────────────────────────────
  if (rolCode && rolCode !== 'JT' && rolCode !== 'C' && rolCode !== 'ADMIN') {
    return (
      <div className="p-10 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
          <Users className="w-7 h-7 text-gray-400" />
        </div>
        <p className="text-sm font-semibold text-gray-700">Acceso restringido</p>
        <p className="text-xs text-gray-500">Este módulo es solo para Jefes y Coordinadores de Transportación.</p>
      </div>
    )
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Mi Equipo</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Mi Equipo</h1>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            {nombreUN}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 max-w-xl">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
            <Users className="w-4.5 h-4.5 text-indigo-600" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Total en mi UN</p>
            <p className="text-xl font-bold text-indigo-600">{miGente.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4.5 h-4.5 text-green-600" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Activos</p>
            <p className="text-xl font-bold text-green-600">{activos}</p>
          </div>
        </div>
        <div className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3 ${sinPuesto > 0 ? 'border-amber-200' : 'border-gray-100'}`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${sinPuesto > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
            <Briefcase className={`w-4.5 h-4.5 ${sinPuesto > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Sin puesto asignado</p>
            <p className={`text-xl font-bold ${sinPuesto > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{sinPuesto}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {([
          { key: 'plantilla' as Tab, label: 'Mi Plantilla', icon: Users },
          { key: 'alta' as Tab, label: 'Alta Rápida', icon: UserPlus },
        ]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full transition-colors ${
              tab === key ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: MI PLANTILLA ──────────────────────────────────────────────── */}
      {tab === 'plantilla' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Filters */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o nómina..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300/40"
              />
            </div>
            <Select value={filterDepto ? String(filterDepto) : ''} onValueChange={v => setFilterDepto(v ? parseInt(v) : 0)}>
              <SelectTrigger className="h-8 text-xs w-48">
                <SelectValue placeholder="Todos los deptos." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" className="text-xs">Todos los deptos.</SelectItem>
                {misDeptos.map(d => (
                  <SelectItem key={d.clave} value={String(d.clave)} className="text-xs">{d.descripcion}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-gray-400 ml-auto">{miGente.length} personas</span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Nómina', 'Nombre', 'Departamento', 'Puesto', 'Status', 'Acciones'].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {miGente.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                      No hay empleados en tu unidad de negocio
                    </td>
                  </tr>
                ) : miGente.map(emp => (
                  editingClave === emp.clave ? (
                    <EditRow
                      key={emp.clave}
                      emp={emp}
                      puestos={puestos}
                      departamentos={departamentos}
                      centrosCostos={centrosCostos}
                      getPuestoNombre={getPuestoNombre}
                      getDepartamentoNombre={getDepartamentoNombre}
                      onSave={data => handleSavePuesto(emp.clave, data)}
                      onCancel={() => setEditingClave(null)}
                    />
                  ) : (
                    <tr key={emp.clave} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{emp.clave}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-gray-800">{emp.nombre_completo}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600">{getDepartamentoNombre(emp.depto) || <span className="text-amber-500 italic">Sin depto.</span>}</span>
                      </td>
                      <td className="px-4 py-3">
                        {emp.puesto
                          ? <span className="text-xs text-gray-600">{getPuestoNombre(emp.puesto)}</span>
                          : <span className="text-xs text-amber-500 italic font-medium">Sin puesto asignado</span>
                        }
                      </td>
                      <td className="px-4 py-3"><StatusBadge st={emp.st} /></td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setEditingClave(emp.clave)}
                          className="flex items-center gap-1 px-2.5 py-1 text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-[11px] font-semibold transition-colors"
                        >
                          <Pencil className="w-3 h-3" /> Editar puesto
                        </button>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>

          {sinPuesto > 0 && (
            <div className="px-5 py-3 border-t border-amber-100 bg-amber-50/50 flex items-center gap-2">
              <span className="text-amber-600 text-sm">⚠️</span>
              <p className="text-xs text-amber-700 font-medium">
                {sinPuesto} persona{sinPuesto > 1 ? 's' : ''} sin puesto asignado — haz clic en "Editar puesto" para completar la relación.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: AGREGAR DE GIRON ──────────────────────────────────────────── */}
      {tab === 'alta' && (
        <div className="max-w-2xl">
          {altaSuccess ? (
            <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-16 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-base font-bold text-gray-800">Empleado agregado a tu equipo</p>
              <p className="text-sm text-gray-500">Ya aparece en tu plantilla.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
                  <UserPlus className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Agregar empleado a mi equipo</p>
                  <p className="text-[11px] text-gray-500">Busca por nómina GIRON · <span className="font-semibold text-indigo-600">{nombreUN}</span></p>
                </div>
              </div>

              <div className="p-6 space-y-5">

                {/* Paso 1: buscar por nómina */}
                <div>
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Paso 1 — Nómina del empleado en GIRON</p>
                  <div className="flex gap-2">
                    <Input
                      className="h-9 text-sm max-w-xs"
                      placeholder="Ej. 15100345"
                      value={altaNomina}
                      onChange={e => { setAltaNomina(e.target.value); setEmpEncontrado(null); setAltaError('') }}
                      onKeyDown={e => e.key === 'Enter' && handleBuscarNomina()}
                    />
                    <Button variant="outline" size="sm" onClick={handleBuscarNomina}>
                      <Search className="w-3.5 h-3.5 mr-1.5" /> Buscar
                    </Button>
                  </div>
                </div>

                {/* Resultado: ya existe en NEXO */}
                {empEncontrado === 'en_nexo' && (() => {
                  const emp = empleados.find(e => e.clave === altaNomina.trim())!
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                        <p className="text-sm font-semibold text-blue-800">Este empleado ya existe en NEXO</p>
                      </div>
                      <div className="text-xs text-blue-700 space-y-0.5">
                        <p><span className="font-medium">Nombre:</span> {emp.nombre_completo}</p>
                        <p><span className="font-medium">Puesto:</span> {getPuestoNombre(emp.puesto) || '—'}</p>
                        <p><span className="font-medium">Jefe actual:</span> {emp.jefe_inmed || 'Sin asignar'}</p>
                      </div>
                      <p className="text-xs text-blue-600">¿Quieres asignarlo a tu equipo? Se actualizará su jefe inmediato a tu nómina.</p>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8" onClick={handleVincularExistente}>
                        Sí, agregar a mi equipo
                      </Button>
                    </div>
                  )
                })()}

                {/* Resultado: no existe, mostrar form */}
                {empEncontrado === 'nuevo' && (
                  <>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
                      <span className="text-amber-600 text-sm">⚠️</span>
                      <p className="text-xs text-amber-700">Nómina <span className="font-mono font-bold">{altaNomina}</span> no está en NEXO aún. Captura los datos para registrarlo.</p>
                    </div>

                    {/* Nombre */}
                    <div>
                      <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Paso 2 — Datos del empleado</p>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Apellido paterno *</Label>
                          <Input className="h-9 text-sm" placeholder="Paterno"
                            value={altaForm.a_paterno} onChange={e => setAltaField('a_paterno', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Apellido materno</Label>
                          <Input className="h-9 text-sm" placeholder="Materno"
                            value={altaForm.a_materno} onChange={e => setAltaField('a_materno', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Nombre(s) *</Label>
                          <Input className="h-9 text-sm" placeholder="Nombre"
                            value={altaForm.nombre} onChange={e => setAltaField('nombre', e.target.value)} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">RFC *</Label>
                        <Input className="h-9 text-sm" placeholder="XXXX000000XXX"
                          value={altaForm.rfc} onChange={e => setAltaField('rfc', e.target.value.toUpperCase())} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Fecha de ingreso *</Label>
                        <Input type="date" className="h-9 text-sm"
                          value={altaForm.fecha_ingreso} onChange={e => setAltaField('fecha_ingreso', e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Departamento *</Label>
                        <Select value={altaForm.depto ? String(altaForm.depto) : ''} onValueChange={v => setAltaField('depto', parseInt(v || '0'))}>
                          <SelectTrigger className="h-9 text-sm w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                          <SelectContent>{departamentos.map(d => <SelectItem key={d.clave} value={String(d.clave)} className="text-sm">{d.descripcion}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Puesto *</Label>
                        <Select value={altaForm.puesto ? String(altaForm.puesto) : ''} onValueChange={v => setAltaField('puesto', parseInt(v || '0'))}>
                          <SelectTrigger className="h-9 text-sm w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                          <SelectContent>{puestos.map(p => <SelectItem key={p.clave} value={String(p.clave)} className="text-sm">{p.descripcion}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5 max-w-xs">
                      <Label className="text-xs font-semibold">Sueldo mensual bruto *</Label>
                      <Input type="number" className="h-9 text-sm" placeholder="0.00"
                        value={altaForm.sueldo_mensual || ''} onChange={e => setAltaField('sueldo_mensual', parseFloat(e.target.value) || 0)} />
                    </div>

                    {altaError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                        <p className="text-xs text-red-600 font-medium">{altaError}</p>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                      <Button variant="outline" size="sm" onClick={() => { setAltaForm(EMPTY_ALTA); setAltaNomina(''); setEmpEncontrado(null); setAltaError('') }}>
                        Cancelar
                      </Button>
                      <Button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6" onClick={handleGuardarAlta}>
                        Agregar a mi equipo
                      </Button>
                    </div>
                  </>
                )}

              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
