"use client"

import { useState, useMemo } from 'react'
import { useSCRHStore } from '@/store'
import { formatMXN } from '@/lib/calculations'
import type { Incapacidad } from '@/types'
import {
  HeartPulse, Plus, Search, Trash2, AlertTriangle, Activity,
  Calendar, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Progress } from '@/components/ui/progress'

function addDays(dateStr: string, dias: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + dias - 1)
  return d.toISOString().split('T')[0]
}

function fmtDate(s: string) {
  if (!s) return '—'
  return new Date(s + 'T00:00:00').toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const todayStr = new Date().toISOString().split('T')[0]

interface IncForm {
  clave: string
  folio: string
  concepto: number | ''
  modo: number | ''
  f_inicial: string
  dias: number
  catorcena: string
  observaciones: string
}

const emptyForm = (): IncForm => ({
  clave: '',
  folio: '',
  concepto: '',
  modo: '',
  f_inicial: new Date().toISOString().split('T')[0],
  dias: 1,
  catorcena: '',
  observaciones: '',
})

interface ReporteFilter {
  anio: number
  catorcena: string
}

export default function IncapacidadesPage() {
  const {
    incapacidades, empleados, concIncap, modosIncap,
    addIncapacidad, deleteIncapacidad, getEmpleadoNombre,
  } = useSCRHStore()

  const [search, setSearch] = useState('')
  const [filterConcepto, setFilterConcepto] = useState<number | ''>('')
  const [filterModo, setFilterModo] = useState<number | ''>('')
  const [openSheet, setOpenSheet] = useState(false)
  const [form, setForm] = useState<IncForm>(emptyForm())
  const [foundEmp, setFoundEmp] = useState('')
  const [folioError, setFolioError] = useState('')

  const [reporteFiltro, setReporteFiltro] = useState<ReporteFilter>({
    anio: new Date().getFullYear(),
    catorcena: '',
  })

  // ── Stats ─────────────────────────────────────────────────────────────────
  const now = new Date()
  const mesActual = now.getMonth()
  const anioActual = now.getFullYear()

  const totalInc = incapacidades.length

  const diasMes = useMemo(() =>
    incapacidades
      .filter(i => {
        const f = new Date(i.f_inicial + 'T00:00:00')
        return f.getMonth() === mesActual && f.getFullYear() === anioActual
      })
      .reduce((s, i) => s + i.dias, 0),
    [incapacidades, mesActual, anioActual],
  )

  const activas = useMemo(() =>
    incapacidades.filter(i => i.f_final >= todayStr).length,
    [incapacidades],
  )

  const promedioDias = totalInc > 0
    ? (incapacidades.reduce((s, i) => s + i.dias, 0) / totalInc).toFixed(1)
    : '0'

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return incapacidades.filter(i => {
      const nombre = getEmpleadoNombre(i.clave).toLowerCase()
      const q = search.toLowerCase()
      const matchQ = !q || nombre.includes(q) || i.clave.includes(q) || i.folio.toLowerCase().includes(q)
      const matchConc = filterConcepto === '' || i.concepto === filterConcepto
      const matchModo = filterModo === '' || i.modo === filterModo
      return matchQ && matchConc && matchModo
    })
  }, [incapacidades, search, filterConcepto, filterModo, getEmpleadoNombre])

  // ── Active incapacidades ──────────────────────────────────────────────────
  const activasList = useMemo(
    () => incapacidades.filter(i => i.f_final >= todayStr),
    [incapacidades],
  )

  // ── Reporte ───────────────────────────────────────────────────────────────
  const reporteList = useMemo(() => {
    return incapacidades.filter(i => {
      const matchAnio = i.catorcena.startsWith(String(reporteFiltro.anio))
      const matchCat = !reporteFiltro.catorcena || i.catorcena === reporteFiltro.catorcena
      return matchAnio && matchCat
    })
  }, [incapacidades, reporteFiltro])

  const reporteTotalDias = reporteList.reduce((s, i) => s + i.dias, 0)
  const reporteTotalCosto = reporteList.reduce((s, i) => {
    const emp = empleados.find(e => e.clave === i.clave)
    return s + (emp ? emp.sd * i.dias : 0)
  }, 0)

  // ── Form computed ─────────────────────────────────────────────────────────
  const fFinal = form.f_inicial && form.dias > 0
    ? addDays(form.f_inicial, form.dias)
    : ''

  // ── Helpers ───────────────────────────────────────────────────────────────
  function getConceptoColor(concepto: number): string {
    const c = concIncap.find(c => c.clave === concepto)
    return c?.colorcode ?? '#6b7280'
  }

  function getConceptoLabel(concepto: number): string {
    return concIncap.find(c => c.clave === concepto)?.descripcion ?? `Concepto ${concepto}`
  }

  function getModoLabel(modo: number): string {
    return modosIncap.find(m => m.clave === modo)?.descripcion ?? `Modo ${modo}`
  }

  function handleSearchEmp() {
    const emp = empleados.find(e => e.clave === form.clave)
    setFoundEmp(emp ? emp.nombre_completo : 'No encontrado')
  }

  function handleGuardar() {
    if (!form.clave || !form.folio || form.concepto === '' || form.modo === '' || !form.f_inicial || !fFinal) return

    // Validate unique folio
    const exists = incapacidades.some(i => i.folio === form.folio)
    if (exists) {
      setFolioError('El folio ya existe, debe ser único')
      return
    }
    setFolioError('')

    const catorcena = form.catorcena || form.f_inicial.substring(0, 7) + '-01'

    const inc: Omit<Incapacidad, 'numero' | 'fecha_captura' | 'usuario'> = {
      clave: form.clave,
      folio: form.folio,
      concepto: Number(form.concepto),
      modo: Number(form.modo),
      f_inicial: form.f_inicial,
      f_final: fFinal,
      dias: form.dias,
      catorcena,
      observaciones: form.observaciones,
    }
    addIncapacidad(inc)
    setOpenSheet(false)
    setForm(emptyForm())
    setFoundEmp('')
    setFolioError('')
  }

  function getProgressPct(i: Incapacidad): number {
    const inicio = new Date(i.f_inicial + 'T00:00:00')
    const fin = new Date(i.f_final + 'T00:00:00')
    const hoy = new Date()
    if (hoy >= fin) return 100
    if (hoy <= inicio) return 0
    const totalMs = fin.getTime() - inicio.getTime()
    const transcMs = hoy.getTime() - inicio.getTime()
    return Math.round((transcMs / totalMs) * 100)
  }

  function getDiasRestantes(i: Incapacidad): number {
    const fin = new Date(i.f_final + 'T00:00:00')
    const hoy = new Date()
    const diff = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  const catorcenasReporte = useMemo(() => {
    const set = new Set(
      incapacidades
        .filter(i => i.catorcena.startsWith(String(reporteFiltro.anio)))
        .map(i => i.catorcena),
    )
    return [...set].sort()
  }, [incapacidades, reporteFiltro.anio])

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center">
              <HeartPulse className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Módulo de Incapacidades</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Control de Incapacidades</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registra y gestiona incapacidades del personal</p>
        </div>
        <Button size="sm" className="bg-red-600 hover:bg-red-700 gap-1.5" onClick={() => setOpenSheet(true)}>
          <Plus className="w-3.5 h-3.5" />
          Registrar Incapacidad
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total incapacidades', value: totalInc, sub: 'Todos los periodos', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-100', icon: Activity },
          { label: 'Días perdidos este mes', value: diasMes, sub: now.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }), color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: Calendar },
          { label: 'Incapacidades activas', value: activas, sub: 'F.Final ≥ hoy', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', icon: AlertTriangle },
          { label: 'Promedio días', value: promedioDias, sub: 'Por incapacidad', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', icon: Clock },
        ].map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className={`bg-white rounded-xl border ${stat.border} shadow-sm p-4 flex items-center gap-3`}>
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-gray-400">{stat.sub}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="registro">
        <TabsList className="mb-4">
          <TabsTrigger value="registro">Registro</TabsTrigger>
          <TabsTrigger value="activas">Incapacidades Activas</TabsTrigger>
          <TabsTrigger value="reporte">Reporte por Periodo</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Registro ──────────────────────────────────────────────── */}
        <TabsContent value="registro">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Filters */}
            <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-44">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input
                  placeholder="Buscar folio, empleado..."
                  className="pl-9 h-8 text-xs"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select
                className="h-8 px-3 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
                value={filterConcepto}
                onChange={e => setFilterConcepto(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">Todos los conceptos</option>
                {concIncap.map(c => (
                  <option key={c.clave} value={c.clave}>{c.descripcion}</option>
                ))}
              </select>
              <select
                className="h-8 px-3 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
                value={filterModo}
                onChange={e => setFilterModo(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">Todos los modos</option>
                {modosIncap.map(m => (
                  <option key={m.clave} value={m.clave}>{m.descripcion}</option>
                ))}
              </select>
              <span className="text-xs text-gray-500">{filtered.length} registros</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['#', 'Folio', 'Nómina', 'Nombre', 'Concepto', 'Modo', 'F.Inicial', 'F.Final', 'Días', 'Catorcena', 'Acciones'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 && (
                    <tr><td colSpan={11} className="py-12 text-center text-sm text-gray-400">Sin registros</td></tr>
                  )}
                  {filtered.map(inc => {
                    const color = getConceptoColor(inc.concepto)
                    return (
                      <tr key={inc.numero} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-3 py-2.5 text-xs text-gray-400">{inc.numero}</td>
                        <td className="px-3 py-2.5 text-xs font-mono text-gray-600">{inc.folio}</td>
                        <td className="px-3 py-2.5 text-xs font-mono text-gray-500">{inc.clave}</td>
                        <td className="px-3 py-2.5 text-xs font-medium text-gray-800 whitespace-nowrap">{getEmpleadoNombre(inc.clave)}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white whitespace-nowrap"
                            style={{ backgroundColor: color }}
                          >
                            {getConceptoLabel(inc.concepto)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{getModoLabel(inc.modo)}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{fmtDate(inc.f_inicial)}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{fmtDate(inc.f_final)}</td>
                        <td className="px-3 py-2.5 text-xs font-bold text-red-600">{inc.dias}</td>
                        <td className="px-3 py-2.5 text-xs font-mono text-gray-500">{inc.catorcena}</td>
                        <td className="px-3 py-2.5">
                          <AlertDialog>
                            <AlertDialogTrigger className="inline-flex items-center justify-center rounded-md h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eliminar incapacidad</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Está seguro de que desea eliminar el registro con folio {inc.folio}? Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => deleteIncapacidad(inc.numero)}
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── Tab 2: Activas ───────────────────────────────────────────────── */}
        <TabsContent value="activas">
          {activasList.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-sm text-gray-400">
              No hay incapacidades activas hoy
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activasList.map(inc => {
                const pct = getProgressPct(inc)
                const restantes = getDiasRestantes(inc)
                const color = getConceptoColor(inc.concepto)
                return (
                  <div key={inc.numero} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-gray-800">{getEmpleadoNombre(inc.clave)}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{inc.clave} · {inc.folio}</p>
                      </div>
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold text-white shrink-0"
                        style={{ backgroundColor: color }}
                      >
                        {getConceptoLabel(inc.concepto)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <span>{fmtDate(inc.f_inicial)}</span>
                      <span className="font-semibold text-gray-700">{inc.dias} días</span>
                      <span>{fmtDate(inc.f_final)}</span>
                    </div>

                    <Progress value={pct} className="h-1.5" />

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">{pct}% transcurrido</span>
                      <span className={`text-[10px] font-semibold ${restantes <= 2 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {restantes} días restantes
                      </span>
                    </div>

                    <p className="text-[10px] text-gray-500">
                      Modo: {getModoLabel(inc.modo)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 3: Reporte por periodo ───────────────────────────────────── */}
        <TabsContent value="reporte">
          <div className="space-y-4">
            {/* Filtros */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 flex-wrap">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Año</label>
                <Input
                  type="number"
                  value={reporteFiltro.anio}
                  onChange={e => setReporteFiltro(f => ({ ...f, anio: Number(e.target.value), catorcena: '' }))}
                  className="h-8 text-xs w-24"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Catorcena</label>
                <select
                  className="h-8 px-3 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  value={reporteFiltro.catorcena}
                  onChange={e => setReporteFiltro(f => ({ ...f, catorcena: e.target.value }))}
                >
                  <option value="">Todas</option>
                  {catorcenasReporte.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-3 ml-auto">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total días</p>
                  <p className="text-lg font-bold text-red-600">{reporteTotalDias}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Costo estimado</p>
                  <p className="text-lg font-bold text-amber-600">{formatMXN(reporteTotalCosto)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Empleado', 'Concepto', 'Días', 'Costo estimado (días × SD)'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {reporteList.length === 0 && (
                      <tr><td colSpan={4} className="py-12 text-center text-sm text-gray-400">Sin registros para el periodo seleccionado</td></tr>
                    )}
                    {reporteList.map(inc => {
                      const emp = empleados.find(e => e.clave === inc.clave)
                      const costo = emp ? emp.sd * inc.dias : 0
                      const color = getConceptoColor(inc.concepto)
                      return (
                        <tr key={inc.numero} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5">
                            <p className="text-xs font-medium text-gray-800">{getEmpleadoNombre(inc.clave)}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{inc.clave}</p>
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                              style={{ backgroundColor: color }}
                            >
                              {getConceptoLabel(inc.concepto)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs font-bold text-red-600">{inc.dias}</td>
                          <td className="px-4 py-2.5 text-xs font-semibold text-amber-700">{formatMXN(costo)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {reporteList.length > 0 && (
                    <tfoot>
                      <tr className="bg-gray-50 border-t border-gray-200">
                        <td colSpan={2} className="px-4 py-2.5 text-xs font-bold text-gray-700">Total</td>
                        <td className="px-4 py-2.5 text-xs font-bold text-red-600">{reporteTotalDias} días</td>
                        <td className="px-4 py-2.5 text-xs font-bold text-amber-700">{formatMXN(reporteTotalCosto)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Registro Sheet ──────────────────────────────────────────────────── */}
      <Sheet open={openSheet} onOpenChange={open => { setOpenSheet(open); if (!open) { setFolioError(''); setFoundEmp('') } }}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Registrar Incapacidad</SheetTitle>
            <SheetDescription>Complete los datos de la incapacidad médica</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Nómina */}
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

            {/* Folio */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Folio * (único)</label>
              <Input
                placeholder="Ej: INC-2025-007"
                value={form.folio}
                onChange={e => { setForm(f => ({ ...f, folio: e.target.value })); setFolioError('') }}
                className={`h-8 text-xs ${folioError ? 'border-red-400 focus:ring-red-500/30' : ''}`}
              />
              {folioError && <p className="text-[10px] text-red-500 mt-0.5">{folioError}</p>}
            </div>

            {/* Concepto */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Concepto *</label>
              <select
                className="w-full h-8 px-3 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
                value={form.concepto}
                onChange={e => setForm(f => ({ ...f, concepto: e.target.value === '' ? '' : Number(e.target.value) }))}
              >
                <option value="">Seleccionar concepto</option>
                {concIncap.map(c => (
                  <option key={c.clave} value={c.clave}>{c.descripcion}</option>
                ))}
              </select>
              {form.concepto !== '' && (
                <div className="mt-1 flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getConceptoColor(Number(form.concepto)) }}
                  />
                  <span className="text-[10px] text-gray-500">{getConceptoLabel(Number(form.concepto))}</span>
                </div>
              )}
            </div>

            {/* Modo */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Modo *</label>
              <select
                className="w-full h-8 px-3 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
                value={form.modo}
                onChange={e => setForm(f => ({ ...f, modo: e.target.value === '' ? '' : Number(e.target.value) }))}
              >
                <option value="">Seleccionar modo</option>
                {modosIncap.map(m => (
                  <option key={m.clave} value={m.clave}>{m.descripcion}</option>
                ))}
              </select>
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
                <label className="block text-xs font-semibold text-gray-600 mb-1">Días de incapacidad *</label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={form.dias}
                  onChange={e => setForm(f => ({ ...f, dias: Number(e.target.value) }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha final (calculada)</label>
              <Input value={fFinal || '—'} readOnly className="h-8 text-xs bg-gray-50" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Catorcena * (YYYY-CC, Ej: 2025-05)</label>
              <Input
                placeholder="Ej: 2025-05"
                value={form.catorcena}
                onChange={e => setForm(f => ({ ...f, catorcena: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Observaciones</label>
              <Textarea
                placeholder="Notas adicionales..."
                value={form.observaciones}
                onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                className="text-xs resize-none"
                rows={2}
              />
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-800 leading-relaxed">
                Las incapacidades deben registrarse durante el mes en curso. Modificaciones solo las puede hacer Nóminas Corporativo.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setOpenSheet(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={handleGuardar}
                disabled={!form.clave || !form.folio || form.concepto === '' || form.modo === ''}
              >
                Registrar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
