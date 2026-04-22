"use client"

import { useState, useMemo } from 'react'
import { useSCRHStore } from '@/store'
import type { CursoCatalogo, CursoPrograma, AsistenteCurso } from '@/types'
import {
  BookOpen, Calendar, Users, Clock, Plus, Search,
  ChevronDown, ChevronRight, Edit2, XCircle, UserPlus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose,
} from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

// ─── helpers ──────────────────────────────────────────────────────────────────

const CATEGORIAS_FALLBACK = ['Técnico', 'Operativo', 'Administrativo', 'Seguridad', 'Desarrollo']
const ETAPAS = ['Inducción', 'Básico', 'Intermedio', 'Avanzado']
const MODALIDADES = ['Presencial', 'En línea', 'Mixto']

const CANCEL_BTN = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-input bg-transparent px-3 py-1.5 text-xs font-medium shadow-xs hover:bg-accent hover:text-accent-foreground"

const STATUS_CURSO_BADGE: Record<CursoPrograma['status'], { label: string; cls: string }> = {
  programado: { label: 'Programado', cls: 'bg-blue-100 text-blue-700' },
  en_curso:   { label: 'En curso',   cls: 'bg-yellow-100 text-yellow-700' },
  terminado:  { label: 'Terminado',  cls: 'bg-green-100 text-green-700' },
  cancelado:  { label: 'Cancelado',  cls: 'bg-red-100 text-red-600' },
}

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const CATEGORY_COLORS = [
  '#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#14b8a6',
]

function fmtMXN(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color, bg, border }: {
  label: string; value: number | string; sub: string
  icon: React.ElementType; color: string; bg: string; border: string
}) {
  return (
    <div className={`bg-white rounded-xl border ${border} shadow-sm p-4 flex items-center gap-3`}>
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
        <p className="text-[10px] text-gray-400">{sub}</p>
      </div>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

type TabKey = 'catalogo' | 'programados' | 'ficha' | 'calendario'

export default function CapacitacionPage() {
  const {
    cursosCatalogo, cursosProgramados, asistentesCursos, empleados,
    addCursoPrograma, addAsistente, updateAsistente,
    getPuestoNombre, getDepartamentoNombre,
  } = useSCRHStore()

  const [activeTab, setActiveTab] = useState<TabKey>('catalogo')

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalCursos = cursosCatalogo.length
  const cursosProgramadosCount = cursosProgramados.filter(c => c.status !== 'cancelado').length
  const empleadosCapacitados = useMemo(() => {
    const claves = new Set(asistentesCursos.filter(a => a.asistio).map(a => a.clave_emp))
    return claves.size
  }, [asistentesCursos])
  const horasCapacitacion = useMemo(() => {
    const horasPorCurso = new Map<number, number>()
    cursosCatalogo.forEach(c => horasPorCurso.set(c.clave, c.duracion_horas))
    return cursosProgramados
      .filter(p => p.status === 'terminado')
      .reduce((sum, p) => sum + (horasPorCurso.get(p.curso) ?? 0), 0)
  }, [cursosProgramados, cursosCatalogo])

  // ── Nuevo Curso Sheet ──────────────────────────────────────────────────────
  const [showNuevoCurso, setShowNuevoCurso] = useState(false)
  const [ncNombre, setNcNombre] = useState('')
  const [ncNombreCorto, setNcNombreCorto] = useState('')
  const [ncCategoria, setNcCategoria] = useState('1')
  const [ncEtapa, setNcEtapa] = useState('1')
  const [ncModalidad, setNcModalidad] = useState('1')
  const [ncObjetivo, setNcObjetivo] = useState('')
  const [ncDuracion, setNcDuracion] = useState('')
  const [ncCosto, setNcCosto] = useState('')
  const [ncCalMin, setNcCalMin] = useState('70')
  const [ncAudiencia, setNcAudiencia] = useState('')

  function resetNuevoCurso() {
    setNcNombre(''); setNcNombreCorto(''); setNcCategoria('1'); setNcEtapa('1')
    setNcModalidad('1'); setNcObjetivo(''); setNcDuracion(''); setNcCosto('')
    setNcCalMin('70'); setNcAudiencia('')
  }

  function handleAddCurso() {
    if (!ncNombre || !ncNombreCorto || !ncDuracion) return
    const nextClave = cursosCatalogo.length > 0
      ? Math.max(...cursosCatalogo.map(c => c.clave)) + 1 : 1
    const curso: CursoCatalogo = {
      clave: nextClave, nombre: ncNombre, nombre_corto: ncNombreCorto,
      categoria: Number(ncCategoria), etapa: Number(ncEtapa), modalidad: Number(ncModalidad),
      objetivo: ncObjetivo, duracion_horas: Number(ncDuracion),
      costo: Number(ncCosto) || 0, calificacion_minima: Number(ncCalMin) || 70,
      audiencia_max: Number(ncAudiencia) || 30, status: 1,
    }
    useSCRHStore.setState(s => ({ cursosCatalogo: [...s.cursosCatalogo, curso] }))
    setShowNuevoCurso(false)
    resetNuevoCurso()
  }

  // ── Programar Curso Sheet ──────────────────────────────────────────────────
  const [showProgramar, setShowProgramar] = useState(false)
  const [pgCurso, setPgCurso] = useState('')
  const [pgFecha, setPgFecha] = useState('')
  const [pgInstructor, setPgInstructor] = useState('')
  const [pgCosto, setPgCosto] = useState('')
  const [pgAudiencia, setPgAudiencia] = useState('')
  const [pgObs, setPgObs] = useState('')

  function resetProgramar() {
    setPgCurso(''); setPgFecha(''); setPgInstructor(''); setPgCosto(''); setPgAudiencia(''); setPgObs('')
  }

  function handleProgramarCurso() {
    if (!pgCurso || !pgFecha || !pgInstructor) return
    addCursoPrograma({
      curso: Number(pgCurso), fecha: pgFecha, instructor: pgInstructor,
      costo_real: Number(pgCosto) || 0, audiencia_estimada: Number(pgAudiencia) || 0,
      status: 'programado', observaciones: pgObs,
    })
    setShowProgramar(false)
    resetProgramar()
  }

  // ── Editar Curso ──────────────────────────────────────────────────────────
  const [editingCurso, setEditingCurso] = useState<CursoCatalogo | null>(null)

  function openEditCurso(curso: CursoCatalogo) {
    setEditingCurso(curso)
    setNcNombre(curso.nombre)
    setNcNombreCorto(curso.nombre_corto)
    setNcCategoria(String(curso.categoria))
    setNcEtapa(String(curso.etapa))
    setNcModalidad(String(curso.modalidad))
    setNcObjetivo(curso.objetivo)
    setNcDuracion(String(curso.duracion_horas))
    setNcCosto(String(curso.costo))
    setNcCalMin(String(curso.calificacion_minima))
    setNcAudiencia(String(curso.audiencia_max))
    setShowNuevoCurso(true)
  }

  function handleSaveCurso() {
    if (editingCurso) {
      useSCRHStore.setState(s => ({
        cursosCatalogo: s.cursosCatalogo.map(c =>
          c.clave === editingCurso.clave
            ? {
                ...c,
                nombre: ncNombre, nombre_corto: ncNombreCorto,
                categoria: Number(ncCategoria), etapa: Number(ncEtapa), modalidad: Number(ncModalidad),
                objetivo: ncObjetivo, duracion_horas: Number(ncDuracion),
                costo: Number(ncCosto) || 0, calificacion_minima: Number(ncCalMin) || 70,
                audiencia_max: Number(ncAudiencia) || 30,
              }
            : c,
        ),
      }))
      setEditingCurso(null)
    } else {
      handleAddCurso()
      return
    }
    setShowNuevoCurso(false)
    resetNuevoCurso()
  }

  function openProgramarWithCurso(cursoClave: string) {
    const cat = cursosCatalogo.find(c => c.clave === Number(cursoClave))
    setPgCurso(cursoClave)
    setPgCosto(String(cat?.costo ?? 0))
    setShowProgramar(true)
  }

  // ── Asistentes Sheet ──────────────────────────────────────────────────────
  const [asistentesPrograma, setAsistentesPrograma] = useState<CursoPrograma | null>(null)
  const [localAsistentes, setLocalAsistentes] = useState<AsistenteCurso[]>([])
  const [buscarEmp, setBuscarEmp] = useState('')

  function openAsistentes(programa: CursoPrograma) {
    setAsistentesPrograma(programa)
    setLocalAsistentes(asistentesCursos.filter(a => a.curso_programa === programa.numero))
  }

  function toggleAsistio(numero: number) {
    setLocalAsistentes(prev => prev.map(a => a.numero === numero ? { ...a, asistio: !a.asistio } : a))
  }
  function toggleAprobado(numero: number) {
    setLocalAsistentes(prev => prev.map(a => a.numero === numero ? { ...a, aprobado: !a.aprobado } : a))
  }
  function setCalificacion(numero: number, val: string) {
    setLocalAsistentes(prev => prev.map(a => a.numero === numero ? { ...a, calificacion: Number(val) } : a))
  }
  function agregarAsistente() {
    const emp = empleados.find(e => e.clave === buscarEmp.trim())
    if (!emp || !asistentesPrograma) return
    if (localAsistentes.some(a => a.clave_emp === emp.clave)) return
    const nextNum = Math.max(0, ...asistentesCursos.map(a => a.numero), ...localAsistentes.map(a => a.numero)) + 1
    setLocalAsistentes(prev => [...prev, {
      numero: nextNum, curso_programa: asistentesPrograma.numero,
      clave_emp: emp.clave, asistio: false, aprobado: false, usuario: 'ADMIN',
    }])
    setBuscarEmp('')
  }
  function guardarAsistencia() {
    localAsistentes.forEach(a => {
      const existing = asistentesCursos.find(x => x.numero === a.numero)
      if (existing) {
        updateAsistente(a.numero, { asistio: a.asistio, aprobado: a.aprobado, calificacion: a.calificacion })
      } else {
        addAsistente({ curso_programa: a.curso_programa, clave_emp: a.clave_emp, asistio: a.asistio, aprobado: a.aprobado, calificacion: a.calificacion })
      }
    })
    setAsistentesPrograma(null)
  }

  // ── Ficha empleado ────────────────────────────────────────────────────────
  const [fichaSearch, setFichaSearch] = useState('')
  const [fichaEmp, setFichaEmp] = useState<string | null>(null)

  function buscarFicha() {
    const s = fichaSearch.toLowerCase()
    const emp = empleados.find(e => e.clave === fichaSearch.trim() || e.nombre_completo.toLowerCase().includes(s))
    setFichaEmp(emp?.clave ?? null)
  }

  const fichaData = useMemo(() => {
    if (!fichaEmp) return null
    const emp = empleados.find(e => e.clave === fichaEmp)
    if (!emp) return null
    const asistencias = asistentesCursos.filter(a => a.clave_emp === fichaEmp)
    const cursos = asistencias.map(a => {
      const prog = cursosProgramados.find(p => p.numero === a.curso_programa)
      const cat = cursosCatalogo.find(c => c.clave === prog?.curso)
      return { asistente: a, prog, cat }
    })
    const totalHoras = cursos.filter(c => c.asistente.asistio).reduce((s, c) => s + (c.cat?.duracion_horas ?? 0), 0)
    const cals = cursos.filter(c => c.asistente.calificacion != null).map(c => c.asistente.calificacion!)
    const promedio = cals.length > 0 ? Math.round(cals.reduce((s, c) => s + c, 0) / cals.length) : 0
    const aprobados = cursos.filter(c => c.asistente.aprobado).length
    return { emp, cursos, totalHoras, promedio, aprobados }
  }, [fichaEmp, asistentesCursos, cursosProgramados, cursosCatalogo, empleados])

  // ── Calendario ────────────────────────────────────────────────────────────
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null)

  const calendarData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i
      const cursos = cursosProgramados.filter(p => {
        const d = new Date(p.fecha + 'T00:00:00')
        return d.getFullYear() === calYear && d.getMonth() === month
      })
      return { month, cursos }
    })
  }, [cursosProgramados, calYear])

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'catalogo', label: 'Catálogo de Cursos' },
    { key: 'programados', label: 'Cursos Programados' },
    { key: 'ficha', label: 'Ficha de Empleado' },
    { key: 'calendario', label: 'Calendario Anual' },
  ]

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">SICI — Sistema Integral de Capacitación</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Capacitación</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de cursos, programas y seguimiento de personal</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowProgramar(true)}>
            <Calendar className="w-3.5 h-3.5 mr-1" />Programar Curso
          </Button>
          <Button size="sm" className="text-xs" onClick={() => setShowNuevoCurso(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />Nuevo Curso
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Cursos en catálogo" value={totalCursos} sub="Total registrados"
          icon={BookOpen} color="text-violet-600" bg="bg-violet-50" border="border-violet-100" />
        <StatCard label="Cursos programados" value={cursosProgramadosCount} sub="Sin cancelados"
          icon={Calendar} color="text-blue-600" bg="bg-blue-50" border="border-blue-100" />
        <StatCard label="Empleados capacitados" value={empleadosCapacitados} sub="Con asistencia confirmada"
          icon={Users} color="text-green-600" bg="bg-green-50" border="border-green-100" />
        <StatCard label="Horas impartidas" value={horasCapacitacion} sub="Cursos terminados"
          icon={Clock} color="text-amber-600" bg="bg-amber-50" border="border-amber-100" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Catálogo ── */}
      {activeTab === 'catalogo' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['#','Nombre','Nombre corto','Categoría','Modalidad','Duración (hrs)','Costo','Cal. mín','Status','Acciones'].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cursosCatalogo.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400">No hay cursos en catálogo</td></tr>
                ) : cursosCatalogo.map((curso, idx) => (
                  <tr key={curso.clave} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-800">{curso.nombre}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded">{curso.nombre_corto}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {CATEGORIAS_FALLBACK[curso.categoria - 1] ?? `Cat. ${curso.categoria}`}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {MODALIDADES[curso.modalidad - 1] ?? `Mod. ${curso.modalidad}`}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-700">{curso.duracion_horas} h</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{curso.costo === 0 ? 'Gratis' : fmtMXN(curso.costo)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{curso.calificacion_minima}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        curso.status === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {curso.status === 1 ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditCurso(curso)} className="text-[10px] text-blue-600 hover:underline px-2 py-1 rounded hover:bg-blue-50">Editar</button>
                        <button onClick={() => openProgramarWithCurso(String(curso.clave))}
                          className="text-[10px] text-violet-600 hover:underline px-2 py-1 rounded hover:bg-violet-50">Programar</button>
                        <button onClick={() => useSCRHStore.setState(s => ({
                          cursosCatalogo: s.cursosCatalogo.map(c => c.clave === curso.clave ? { ...c, status: c.status === 1 ? 0 : 1 } : c)
                        }))} className="text-[10px] text-gray-500 hover:underline px-2 py-1 rounded hover:bg-gray-50">
                          {curso.status === 1 ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">{cursosCatalogo.length} cursos en catálogo</span>
          </div>
        </div>
      )}

      {/* ── TAB 2: Programados ── */}
      {activeTab === 'programados' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['#','Curso','Fecha','Instructor','Asistentes esp./real','Costo','Status','Acciones'].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cursosProgramados.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No hay cursos programados</td></tr>
                ) : cursosProgramados.map((prog, idx) => {
                  const cat = cursosCatalogo.find(c => c.clave === prog.curso)
                  const asistentes = asistentesCursos.filter(a => a.curso_programa === prog.numero)
                  const reales = asistentes.filter(a => a.asistio).length
                  const badge = STATUS_CURSO_BADGE[prog.status]
                  return (
                    <tr key={prog.numero} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-gray-800">{cat?.nombre ?? `Curso #${prog.curso}`}</p>
                        <p className="text-[10px] text-gray-400">{cat?.nombre_corto}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtDate(prog.fecha)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{prog.instructor}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {prog.audiencia_estimada} / <span className="font-semibold text-gray-800">{reales}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{fmtMXN(prog.costo_real)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openAsistentes(prog)}
                            className="text-[10px] text-blue-600 hover:underline px-2 py-1 rounded hover:bg-blue-50 flex items-center gap-0.5">
                            <Users className="w-3 h-3" />Ver lista
                          </button>
                          <button onClick={() => openAsistentes(prog)}
                            className="text-[10px] text-violet-600 hover:underline px-2 py-1 rounded hover:bg-violet-50 flex items-center gap-0.5">
                            <Edit2 className="w-3 h-3" />Asistencia
                          </button>
                          {prog.status !== 'cancelado' && (
                            <button onClick={() => useSCRHStore.setState(s => ({
                              cursosProgramados: s.cursosProgramados.map(p => p.numero === prog.numero ? { ...p, status: 'cancelado' } : p)
                            }))} className="text-[10px] text-red-500 hover:underline px-2 py-1 rounded hover:bg-red-50 flex items-center gap-0.5">
                              <XCircle className="w-3 h-3" />Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: Ficha Empleado ── */}
      {activeTab === 'ficha' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-600 mb-3">Buscar empleado por nómina o nombre</p>
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={fichaSearch} onChange={e => setFichaSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && buscarFicha()}
                  placeholder="Nómina o nombre..."
                  className="pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 w-full bg-white" />
              </div>
              <Button size="sm" className="text-xs" onClick={buscarFicha}>Buscar</Button>
            </div>
          </div>
          {fichaData && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-violet-50 border-b border-violet-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">{fichaData.emp.nombre_completo}</p>
                  <p className="text-xs text-gray-500">{fichaData.emp.clave} · {getPuestoNombre(fichaData.emp.puesto)} · {getDepartamentoNombre(fichaData.emp.depto)}</p>
                </div>
                <div className="flex gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-violet-700">{fichaData.totalHoras}</p>
                    <p className="text-[10px] text-gray-500">Horas totales</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-700">{fichaData.aprobados}</p>
                    <p className="text-[10px] text-gray-500">Aprobados</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-amber-700">{fichaData.promedio || '—'}</p>
                    <p className="text-[10px] text-gray-500">Promedio</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Curso','Fecha','Instructor','Asistió','Aprobado','Calificación','Horas'].map(col => (
                        <th key={col} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {fichaData.cursos.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-400">Sin cursos registrados</td></tr>
                    ) : fichaData.cursos.map(({ asistente, prog, cat }) => (
                      <tr key={asistente.numero} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs font-medium text-gray-800">{cat?.nombre ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{prog ? fmtDate(prog.fecha) : '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{prog?.instructor ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${asistente.asistio ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {asistente.asistio ? 'Sí' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${asistente.aprobado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {asistente.aprobado ? 'Sí' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-gray-700">{asistente.calificacion ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{asistente.asistio ? (cat?.duracion_horas ?? 0) : 0} h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
                <button onClick={() => alert('Exportar ficha — funcionalidad en desarrollo')}
                  className="text-xs font-medium text-violet-600 hover:underline">Exportar ficha</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: Calendario ── */}
      {activeTab === 'calendario' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Label className="text-xs font-semibold text-gray-600">Año:</Label>
            <div className="flex items-center gap-1">
              <button onClick={() => setCalYear(y => y - 1)}
                className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 text-xs font-bold">‹</button>
              <span className="px-4 py-1 text-sm font-bold text-gray-800">{calYear}</span>
              <button onClick={() => setCalYear(y => y + 1)}
                className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 text-xs font-bold">›</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {calendarData.map(({ month, cursos }) => (
              <div key={month} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <button onClick={() => setExpandedMonth(expandedMonth === month ? null : month)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-800">{MONTH_NAMES[month]}</span>
                    {cursos.length > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-violet-100 text-violet-700 rounded-full">{cursos.length}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {cursos.slice(0, 5).map(c => (
                      <span key={c.numero} className="w-2 h-2 rounded-full"
                        style={{ background: CATEGORY_COLORS[(cursosCatalogo.find(cat => cat.clave === c.curso)?.categoria ?? 1) - 1] }} />
                    ))}
                    {expandedMonth === month
                      ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    }
                  </div>
                </button>
                {expandedMonth === month && cursos.length > 0 && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {cursos.map(c => {
                      const cat = cursosCatalogo.find(cat => cat.clave === c.curso)
                      const badge = STATUS_CURSO_BADGE[c.status]
                      return (
                        <div key={c.numero} className="px-4 py-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: CATEGORY_COLORS[(cat?.categoria ?? 1) - 1] }} />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-700 truncate">{cat?.nombre ?? `Curso #${c.curso}`}</p>
                              <p className="text-[10px] text-gray-400">{fmtDate(c.fecha)}</p>
                            </div>
                          </div>
                          <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
                {expandedMonth === month && cursos.length === 0 && (
                  <div className="border-t border-gray-50 px-4 py-3 text-[10px] text-gray-400 text-center">Sin cursos este mes</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ Sheet: Nuevo Curso ══ */}
      <Sheet open={showNuevoCurso} onOpenChange={open => { if (!open) { setShowNuevoCurso(false); resetNuevoCurso(); setEditingCurso(null) } else setShowNuevoCurso(true) }}>
        <SheetContent side="right" className="w-[480px] sm:max-w-[480px] flex flex-col">
          <SheetHeader>
            <SheetTitle>{editingCurso ? 'Editar Curso' : 'Nuevo Curso'}</SheetTitle>
            <SheetDescription>{editingCurso ? `Modificando: ${editingCurso.nombre_corto}` : 'Registra un nuevo curso en el catálogo SICI'}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nombre del curso *</Label>
              <Input maxLength={60} value={ncNombre} onChange={e => setNcNombre(e.target.value)}
                placeholder="Nombre completo del curso" className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nombre corto *</Label>
              <Input maxLength={20} value={ncNombreCorto} onChange={e => setNcNombreCorto(e.target.value)}
                placeholder="Abreviatura (máx. 20)" className="text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Categoría *</Label>
                <Select value={ncCategoria} onValueChange={v => { if (v) setNcCategoria(v) }}>
                  <SelectTrigger className="text-xs w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_FALLBACK.map((cat, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Etapa</Label>
                <Select value={ncEtapa} onValueChange={v => { if (v) setNcEtapa(v) }}>
                  <SelectTrigger className="text-xs w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ETAPAS.map((e, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Modalidad</Label>
              <Select value={ncModalidad} onValueChange={v => { if (v) setNcModalidad(v) }}>
                <SelectTrigger className="text-xs w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODALIDADES.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Objetivo</Label>
              <Textarea value={ncObjetivo} rows={3} onChange={e => setNcObjetivo(e.target.value)}
                placeholder="Describe el objetivo del curso" className="text-xs resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Duración en horas *</Label>
                <Input type="number" min={1} value={ncDuracion} onChange={e => setNcDuracion(e.target.value)}
                  placeholder="0" className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Costo ($MXN)</Label>
                <Input type="number" min={0} value={ncCosto} onChange={e => setNcCosto(e.target.value)}
                  placeholder="0" className="text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Calificación mínima</Label>
                <Input type="number" min={0} max={100} value={ncCalMin} onChange={e => setNcCalMin(e.target.value)}
                  className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Audiencia máxima</Label>
                <Input type="number" min={1} value={ncAudiencia} onChange={e => setNcAudiencia(e.target.value)}
                  placeholder="30" className="text-xs" />
              </div>
            </div>
          </div>
          <SheetFooter className="border-t border-gray-100 pt-4">
            <SheetClose className={CANCEL_BTN}>Cancelar</SheetClose>
            <Button size="sm" className="text-xs" onClick={handleSaveCurso}>{editingCurso ? 'Guardar cambios' : 'Guardar curso'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ══ Sheet: Programar Curso ══ */}
      <Sheet open={showProgramar} onOpenChange={open => { if (!open) { setShowProgramar(false); resetProgramar() } else setShowProgramar(true) }}>
        <SheetContent side="right" className="w-[440px] sm:max-w-[440px] flex flex-col">
          <SheetHeader>
            <SheetTitle>Programar Curso</SheetTitle>
            <SheetDescription>Agenda una sesión de un curso del catálogo</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Curso *</Label>
              <Select value={pgCurso} onValueChange={v => {
                if (!v) return
                const cat = cursosCatalogo.find(c => c.clave === Number(v))
                setPgCurso(v)
                setPgCosto(String(cat?.costo ?? 0))
              }}>
                <SelectTrigger className="text-xs w-full"><SelectValue placeholder="Selecciona curso" /></SelectTrigger>
                <SelectContent>
                  {cursosCatalogo.filter(c => c.status === 1).map(c => (
                    <SelectItem key={c.clave} value={String(c.clave)} className="text-xs">{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Fecha *</Label>
              <Input type="date" value={pgFecha} onChange={e => setPgFecha(e.target.value)} className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Instructor *</Label>
              <Input value={pgInstructor} onChange={e => setPgInstructor(e.target.value)}
                placeholder="Nombre del instructor" className="text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Costo real</Label>
                <Input type="number" min={0} value={pgCosto} onChange={e => setPgCosto(e.target.value)}
                  placeholder="0" className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Audiencia estimada</Label>
                <Input type="number" min={0} value={pgAudiencia} onChange={e => setPgAudiencia(e.target.value)}
                  placeholder="0" className="text-xs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observaciones</Label>
              <Textarea value={pgObs} rows={3} onChange={e => setPgObs(e.target.value)}
                placeholder="Notas adicionales" className="text-xs resize-none" />
            </div>
          </div>
          <SheetFooter className="border-t border-gray-100 pt-4">
            <SheetClose className={CANCEL_BTN}>Cancelar</SheetClose>
            <Button size="sm" className="text-xs" onClick={handleProgramarCurso}>Programar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ══ Sheet: Asistentes ══ */}
      <Sheet open={!!asistentesPrograma} onOpenChange={open => { if (!open) setAsistentesPrograma(null) }}>
        <SheetContent side="right" className="w-[640px] sm:max-w-[640px] flex flex-col">
          <SheetHeader>
            <SheetTitle>
              {asistentesPrograma
                ? (cursosCatalogo.find(c => c.clave === asistentesPrograma.curso)?.nombre ?? 'Asistentes')
                : 'Asistentes'}
            </SheetTitle>
            <SheetDescription>
              {asistentesPrograma ? `${fmtDate(asistentesPrograma.fecha)} · ${asistentesPrograma.instructor}` : ''}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="flex gap-2">
              <Input value={buscarEmp} onChange={e => setBuscarEmp(e.target.value)}
                placeholder="Nómina del empleado" className="text-xs"
                onKeyDown={e => e.key === 'Enter' && agregarAsistente()} />
              <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={agregarAsistente}>
                <UserPlus className="w-3.5 h-3.5 mr-1" />Agregar
              </Button>
            </div>
            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Nómina','Nombre','Puesto','Dpto','Asistió','Aprobado','Calificación'].map(col => (
                      <th key={col} className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {localAsistentes.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-6 text-center text-xs text-gray-400">Sin asistentes registrados</td></tr>
                  ) : localAsistentes.map(a => {
                    const emp = empleados.find(e => e.clave === a.clave_emp)
                    return (
                      <tr key={a.numero} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs font-mono text-indigo-600">{a.clave_emp}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">{emp?.nombre_completo ?? '—'}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{emp ? getPuestoNombre(emp.puesto) : '—'}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{emp ? getDepartamentoNombre(emp.depto) : '—'}</td>
                        <td className="px-3 py-2">
                          <Switch checked={a.asistio} onCheckedChange={() => toggleAsistio(a.numero)} size="sm" />
                        </td>
                        <td className="px-3 py-2">
                          <Switch checked={a.aprobado} onCheckedChange={() => toggleAprobado(a.numero)} size="sm" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min={0} max={100}
                            value={a.calificacion ?? ''}
                            onChange={e => setCalificacion(a.numero, e.target.value)}
                            className="w-16 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-400"
                            placeholder="—" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <SheetFooter className="border-t border-gray-100 pt-4">
            <SheetClose className={CANCEL_BTN}>Cerrar</SheetClose>
            <Button size="sm" className="text-xs" onClick={guardarAsistencia}>Guardar asistencia</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
