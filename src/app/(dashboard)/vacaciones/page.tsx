"use client"

import { useState, useMemo } from 'react'
import { useSCRHStore } from '@/store'
import { calcularDiasHabiles } from '@/lib/calculations'
import type { Vacacion } from '@/types'
import {
  CalendarDays, Plus, Search, Trash2, ChevronDown, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from '@/components/ui/collapsible'

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days - 1)
  return d.toISOString().split('T')[0]
}

function fmtDate(s: string) {
  if (!s) return '—'
  return new Date(s + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

type VopFilter = '' | 'V' | 'P'

interface VacForm {
  clave: string
  year: number
  periodo: string
  catorcena: string
  f_inicial: string
  dias_vac: number
  desc_sab: boolean
  desc_dom: boolean
  vop: 'V' | 'P'
  glob_catna: number
  base_catna: number
  porc_prima: number
}

const emptyForm = (): VacForm => ({
  clave: '',
  year: new Date().getFullYear(),
  periodo: '1',
  catorcena: `${new Date().getFullYear()}-01`,
  f_inicial: new Date().toISOString().split('T')[0],
  dias_vac: 6,
  desc_sab: true,
  desc_dom: true,
  vop: 'V',
  glob_catna: 0,
  base_catna: 0,
  porc_prima: 25,
})

export default function VacacionesPage() {
  const {
    vacaciones, empleados, addVacacion, deleteVacacion, getEmpleadoNombre,
  } = useSCRHStore()

  const [search, setSearch] = useState('')
  const [filterEmp, setFilterEmp] = useState('')
  const [filterAnio, setFilterAnio] = useState<number | ''>('')
  const [filterVop, setFilterVop] = useState<VopFilter>('')
  const [openSheet, setOpenSheet] = useState(false)
  const [form, setForm] = useState<VacForm>(emptyForm())
  const [foundEmp, setFoundEmp] = useState<string>('')
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [collapsedPeriods, setCollapsedPeriods] = useState<Record<string, boolean>>({})

  // ── Stats ─────────────────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear()
  const totalRegistros = vacaciones.length
  const totalV = vacaciones.filter(v => v.vop === 'V').length
  const totalP = vacaciones.filter(v => v.vop === 'P').length
  const diasAnio = vacaciones
    .filter(v => v.year === currentYear && v.vop === 'V')
    .reduce((s, v) => s + v.dias_vac, 0)

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return vacaciones.filter(v => {
      const nombre = getEmpleadoNombre(v.clave).toLowerCase()
      const q = search.toLowerCase()
      const matchQ = !q || nombre.includes(q) || v.clave.includes(q)
      const matchEmp = !filterEmp || v.clave === filterEmp
      const matchAnio = filterAnio === '' || v.year === filterAnio
      const matchVop = !filterVop || v.vop === filterVop
      return matchQ && matchEmp && matchAnio && matchVop
    })
  }, [vacaciones, search, filterEmp, filterAnio, filterVop, getEmpleadoNombre])

  // ── Group by period ───────────────────────────────────────────────────────
  const periodos = useMemo(() => {
    const map: Record<string, Vacacion[]> = {}
    vacaciones.forEach(v => {
      const key = `${v.year}-${String(v.periodo).padStart(2, '0')}`
      if (!map[key]) map[key] = []
      map[key].push(v)
    })
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [vacaciones])

  // ── Calendar ──────────────────────────────────────────────────────────────
  const today = new Date()
  const calYear = today.getFullYear()
  const calMonth = today.getMonth()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const monthName = today.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })

  function getDayVacs(day: number) {
    const date = new Date(calYear, calMonth, day)
    return vacaciones.filter(v => {
      const start = new Date(v.f_inicial + 'T00:00:00')
      const end = new Date(v.f_final + 'T00:00:00')
      return date >= start && date <= end
    })
  }

  // ── Form computed ─────────────────────────────────────────────────────────
  const fFinal = form.f_inicial && form.dias_vac > 0
    ? addDays(form.f_inicial, form.dias_vac)
    : ''
  const diasLab = form.f_inicial && fFinal
    ? calcularDiasHabiles(form.f_inicial, fFinal, form.desc_sab, form.desc_dom)
    : 0

  const globDiario = form.glob_catna > 0 ? form.glob_catna / 15 : 0
  const baseDiario = form.base_catna > 0 ? form.base_catna / 15 : 0
  const primaGlob = globDiario * form.dias_vac * (form.porc_prima / 100)
  const primaVac = baseDiario * form.dias_vac * (form.porc_prima / 100)
  const compPrima = primaGlob - primaVac
  const pDiasVac = globDiario * form.dias_vac
  const pDiasLab = globDiario * diasLab

  function handleSearchEmp() {
    const emp = empleados.find(e => e.clave === form.clave)
    setFoundEmp(emp ? emp.nombre_completo : 'No encontrado')
    if (emp) {
      setForm(f => ({
        ...f,
        glob_catna: emp.s_catorcenal,
        base_catna: emp.sueldo_mensual / 2,
      }))
    }
  }

  function handleGuardar() {
    if (!form.clave || !form.f_inicial || !fFinal) return
    const vac: Omit<Vacacion, 'numero' | 'fecha_captura' | 'usuario'> = {
      clave: form.clave,
      year: form.year,
      periodo: form.periodo,
      catorcena: form.catorcena,
      prima: form.porc_prima,
      dias_vac: form.dias_vac,
      dias_lab: diasLab,
      f_inicial: form.f_inicial,
      f_final: fFinal,
      desc_sab: form.desc_sab,
      desc_dom: form.desc_dom,
      vop: form.vop,
      glob_catna: form.glob_catna,
      base_catna: form.base_catna,
      dias_catna: diasLab,
      glob_diario: globDiario,
      base_diario: baseDiario,
      porc_prima: form.porc_prima,
      prima_glob: primaGlob,
      prima_vac: primaVac,
      comp_prima: compPrima,
      d_vacaciones: form.dias_vac,
      p_dias_vac: pDiasVac,
      p_dias_lab: pDiasLab,
    }
    addVacacion(vac)
    setOpenSheet(false)
    setForm(emptyForm())
    setFoundEmp('')
  }

  function handleDelete(numero: number) {
    deleteVacacion(numero)
    setDeleteTarget(null)
  }

  function togglePeriod(key: string) {
    setCollapsedPeriods(p => ({ ...p, [key]: !p[key] }))
  }

  const anios = [...new Set(vacaciones.map(v => v.year))].sort((a, b) => b - a)

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <CalendarDays className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Módulo de Vacaciones</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Control de Vacaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registra y gestiona periodos de descanso</p>
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5" onClick={() => setOpenSheet(true)}>
          <Plus className="w-3.5 h-3.5" />
          Registrar Vacaciones
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total registros', value: totalRegistros, sub: 'Todos los periodos', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-100' },
          { label: 'Vacaciones (V)', value: totalV, sub: 'Disfrute de días', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'Pagos de prima (P)', value: totalP, sub: 'Prima vacacional', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Días este año', value: diasAnio, sub: `Año ${currentYear}`, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
        ].map(stat => (
          <div key={stat.label} className={`bg-white rounded-xl border ${stat.border} shadow-sm p-4`}>
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
            <p className="text-[10px] text-gray-400">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="registros">
        <TabsList className="mb-4">
          <TabsTrigger value="registros">Registros</TabsTrigger>
          <TabsTrigger value="pendientes">Pendientes por Periodo</TabsTrigger>
          <TabsTrigger value="calendario">Calendario</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Registros ─────────────────────────────────────────────── */}
        <TabsContent value="registros">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Filters */}
            <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-44">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input
                  placeholder="Buscar empleado..."
                  className="pl-9 h-8 text-xs"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select
                className="h-8 px-3 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                value={filterEmp}
                onChange={e => setFilterEmp(e.target.value)}
              >
                <option value="">Todos los empleados</option>
                {empleados.filter(e => e.st === 1).map(e => (
                  <option key={e.clave} value={e.clave}>{e.nombre_completo}</option>
                ))}
              </select>
              <select
                className="h-8 px-3 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                value={filterAnio}
                onChange={e => setFilterAnio(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">Todos los años</option>
                {anios.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select
                className="h-8 px-3 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                value={filterVop}
                onChange={e => setFilterVop(e.target.value as VopFilter)}
              >
                <option value="">Todos los modos</option>
                <option value="V">Vacaciones</option>
                <option value="P">Prima</option>
              </select>
              <span className="text-xs text-gray-500">{filtered.length} registros</span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['#', 'Nómina', 'Nombre empleado', 'Año', 'Periodo', 'Catorcena', 'F.Inicial', 'F.Final', 'Días Vac', 'Modo', 'Registrado por', 'Acciones'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 && (
                    <tr><td colSpan={12} className="py-12 text-center text-sm text-gray-400">Sin registros</td></tr>
                  )}
                  {filtered.map(v => (
                    <tr key={v.numero} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-2.5 text-xs text-gray-400">{v.numero}</td>
                      <td className="px-3 py-2.5 text-xs font-mono text-gray-500">{v.clave}</td>
                      <td className="px-3 py-2.5 text-xs font-medium text-gray-800 whitespace-nowrap">{getEmpleadoNombre(v.clave)}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">{v.year}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">{v.periodo}</td>
                      <td className="px-3 py-2.5 text-xs font-mono text-gray-500">{v.catorcena}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{fmtDate(v.f_inicial)}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{fmtDate(v.f_final)}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-gray-800">{v.dias_vac}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          v.vop === 'V'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {v.vop === 'V' ? 'Vacaciones' : 'Prima'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{v.usuario}</td>
                      <td className="px-3 py-2.5">
                        <AlertDialog>
                          <AlertDialogTrigger className="inline-flex items-center justify-center rounded-md h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminar registro</AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Está seguro de que desea eliminar este registro de vacaciones? Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => handleDelete(v.numero)}
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── Tab 2: Pendientes por periodo ────────────────────────────────── */}
        <TabsContent value="pendientes">
          <div className="space-y-3">
            {periodos.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-sm text-gray-400">
                Sin registros
              </div>
            )}
            {periodos.map(([key, vacs]) => {
              const isOpen = !collapsedPeriods[key]
              const totalDias = vacs.reduce((s, v) => s + v.dias_vac, 0)
              return (
                <Collapsible key={key} open={isOpen}>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <CollapsibleTrigger
                        className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        onClick={() => togglePeriod(key)}
                      >
                        <div className="flex items-center gap-3">
                          {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                          <div>
                            <span className="text-sm font-bold text-gray-800">Periodo {key}</span>
                            <span className="ml-3 text-xs text-gray-500">{vacs.length} empleados · {totalDias} días total</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                            V: {vacs.filter(v => v.vop === 'V').length}
                          </span>
                          <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                            P: {vacs.filter(v => v.vop === 'P').length}
                          </span>
                        </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-gray-100">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50">
                              {['Nómina', 'Empleado', 'F.Inicial', 'F.Final', 'Días', 'Modo'].map(h => (
                                <th key={h} className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {vacs.map(v => (
                              <tr key={v.numero} className="hover:bg-gray-50/50">
                                <td className="px-4 py-2 text-xs font-mono text-gray-500">{v.clave}</td>
                                <td className="px-4 py-2 text-xs text-gray-800">{getEmpleadoNombre(v.clave)}</td>
                                <td className="px-4 py-2 text-xs text-gray-600">{fmtDate(v.f_inicial)}</td>
                                <td className="px-4 py-2 text-xs text-gray-600">{fmtDate(v.f_final)}</td>
                                <td className="px-4 py-2 text-xs font-semibold text-gray-800">{v.dias_vac}</td>
                                <td className="px-4 py-2">
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                    v.vop === 'V' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {v.vop === 'V' ? 'Vacaciones' : 'Prima'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )
            })}
          </div>
        </TabsContent>

        {/* ── Tab 3: Calendario ────────────────────────────────────────────── */}
        <TabsContent value="calendario">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-800 mb-4 capitalize">{monthName}</h3>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1
                const dayVacs = getDayVacs(day)
                const hasVac = dayVacs.length > 0
                const isToday = today.getDate() === day
                return (
                  <div
                    key={day}
                    className={`min-h-14 rounded-lg border p-1 transition-colors ${
                      hasVac
                        ? 'border-blue-200 bg-blue-50'
                        : isToday
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`text-[10px] font-bold block mb-0.5 ${
                      isToday ? 'text-indigo-700' : hasVac ? 'text-blue-700' : 'text-gray-500'
                    }`}>
                      {day}
                    </span>
                    {dayVacs.slice(0, 2).map(v => (
                      <div
                        key={v.numero}
                        className="text-[8px] bg-blue-500 text-white rounded px-0.5 py-px truncate mb-0.5 leading-tight"
                        title={getEmpleadoNombre(v.clave)}
                      >
                        {getEmpleadoNombre(v.clave).split(' ')[0]}
                      </div>
                    ))}
                    {dayVacs.length > 2 && (
                      <div className="text-[8px] text-blue-600 font-semibold">+{dayVacs.length - 2} más</div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span className="text-xs text-gray-600">Vacaciones</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-indigo-100 border border-indigo-300" />
                <span className="text-xs text-gray-600">Hoy</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Registro Sheet ──────────────────────────────────────────────────── */}
      <Sheet open={openSheet} onOpenChange={setOpenSheet}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Registrar Vacaciones</SheetTitle>
            <SheetDescription>Complete los datos del periodo vacacional</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Nómina + búsqueda */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Número de nómina *</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ej: 1001"
                  value={form.clave}
                  onChange={e => setForm(f => ({ ...f, clave: e.target.value }))}
                  className="h-8 text-xs"
                />
                <Button size="sm" variant="outline" onClick={handleSearchEmp} className="shrink-0 text-xs">
                  Buscar
                </Button>
              </div>
              {foundEmp && (
                <p className={`text-xs mt-1 ${foundEmp === 'No encontrado' ? 'text-red-500' : 'text-emerald-600 font-medium'}`}>
                  {foundEmp}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Año *</label>
                <Input
                  type="number"
                  value={form.year}
                  onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Periodo</label>
                <Input
                  placeholder="Ej: 1"
                  value={form.periodo}
                  onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Catorcena * (YYYY-CC)</label>
              <Input
                placeholder="Ej: 2025-01"
                value={form.catorcena}
                onChange={e => setForm(f => ({ ...f, catorcena: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha inicial *</label>
                <Input
                  type="date"
                  value={form.f_inicial}
                  onChange={e => setForm(f => ({ ...f, f_inicial: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Días de vacaciones *</label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={form.dias_vac}
                  onChange={e => setForm(f => ({ ...f, dias_vac: Number(e.target.value) }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha final (calculada)</label>
              <Input value={fFinal || '—'} readOnly className="h-8 text-xs bg-gray-50" />
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.desc_sab}
                  onChange={e => setForm(f => ({ ...f, desc_sab: e.target.checked }))}
                  className="accent-blue-600"
                />
                <span className="text-xs text-gray-700">Descansa sábado</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.desc_dom}
                  onChange={e => setForm(f => ({ ...f, desc_dom: e.target.checked }))}
                  className="accent-blue-600"
                />
                <span className="text-xs text-gray-700">Descansa domingo</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Días laborables (calculado)</label>
              <Input value={diasLab} readOnly className="h-8 text-xs bg-gray-50" />
            </div>

            {/* Modo */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Modo de disfrute</label>
              <div className="flex gap-4">
                {([['V', 'Vacaciones (V)'], ['P', 'Pago de prima (P)']] as const).map(([val, label]) => (
                  <label key={val} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={form.vop === val}
                      onChange={() => setForm(f => ({ ...f, vop: val }))}
                      className="accent-blue-600"
                    />
                    <span className="text-xs text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Prima calcs */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-100">
              <p className="text-xs font-bold text-gray-700">Cálculos de prima</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Global catorcena</label>
                  <Input
                    type="number"
                    value={form.glob_catna}
                    onChange={e => setForm(f => ({ ...f, glob_catna: Number(e.target.value) }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Base catorcena</label>
                  <Input
                    type="number"
                    value={form.base_catna}
                    onChange={e => setForm(f => ({ ...f, base_catna: Number(e.target.value) }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Porcentaje prima (%)</label>
                <Input
                  type="number"
                  value={form.porc_prima}
                  onChange={e => setForm(f => ({ ...f, porc_prima: Number(e.target.value) }))}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5 pt-1">
                {[
                  ['Prima global', primaGlob],
                  ['Prima vacaciones', primaVac],
                  ['Complemento prima', compPrima],
                  ['Días vacaciones', pDiasVac],
                  ['Pago días laborados', pDiasLab],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">{k}</span>
                    <span className="text-xs font-semibold text-gray-800">
                      ${(Number(v)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setOpenSheet(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={handleGuardar}
                disabled={!form.clave || !form.f_inicial}
              >
                Guardar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
