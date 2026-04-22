"use client"

import { useState, useMemo } from 'react'
import { useSCRHStore } from '@/store'
import { formatMXN } from '@/lib/calculations'
import {
  FileText, Users, DollarSign, ArrowRightLeft,
  Clock, GraduationCap, Download, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

// ── Types ─────────────────────────────────────────────────────────────────────
type ReportId =
  | 'todos_empleados' | 'activos_depto' | 'cumpleanos' | 'aniversarios' | 'vencimiento_contratos'
  | 'nomina_global' | 'historico_incrementos' | 'cuentas_bancarias'
  | 'altas_periodo' | 'bajas_periodo' | 'transferencias_periodo'
  | 'incapacidades_periodo' | 'vacaciones_periodo'
  | 'avance_capacitacion'

interface ReportCategory {
  id: string
  label: string
  icon: React.ElementType
  reports: { id: ReportId; label: string }[]
}

// ── Categories ────────────────────────────────────────────────────────────────
const CATEGORIES: ReportCategory[] = [
  {
    id: 'personal', label: 'Personal', icon: Users,
    reports: [
      { id: 'todos_empleados', label: 'Todos los empleados' },
      { id: 'activos_depto', label: 'Activos por Departamento' },
      { id: 'cumpleanos', label: 'Cumpleaños del Mes' },
      { id: 'aniversarios', label: 'Aniversarios del Mes' },
      { id: 'vencimiento_contratos', label: 'Vencimiento de Contratos' },
    ],
  },
  {
    id: 'sueldos', label: 'Sueldos', icon: DollarSign,
    reports: [
      { id: 'nomina_global', label: 'Nómina Global' },
      { id: 'historico_incrementos', label: 'Histórico de Incrementos' },
      { id: 'cuentas_bancarias', label: 'Cuentas Bancarias' },
    ],
  },
  {
    id: 'movimientos', label: 'Movimientos', icon: ArrowRightLeft,
    reports: [
      { id: 'altas_periodo', label: 'Altas del Período' },
      { id: 'bajas_periodo', label: 'Bajas del Período' },
      { id: 'transferencias_periodo', label: 'Transferencias del Período' },
    ],
  },
  {
    id: 'asistencia', label: 'Asistencia', icon: Clock,
    reports: [
      { id: 'incapacidades_periodo', label: 'Incapacidades por Período' },
      { id: 'vacaciones_periodo', label: 'Vacaciones por Período' },
    ],
  },
  {
    id: 'capacitacion', label: 'Capacitación', icon: GraduationCap,
    reports: [
      { id: 'avance_capacitacion', label: 'Avance de Capacitación' },
    ],
  },
]

// ── Helper components ─────────────────────────────────────────────────────────
function ReportTable({ headers, children, count }: { headers: string[]; children: React.ReactNode; count?: number }) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left bg-gray-50">
              {headers.map(h => (
                <th key={h} className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      {count !== undefined && (
        <p className="text-xs text-gray-400 mt-3">{count} registro(s)</p>
      )}
    </div>
  )
}

function FilterRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-3 mb-4 items-end">{children}</div>
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function ExportButton({ count, onExport }: { count: number; onExport: () => void }) {
  return (
    <Button variant="outline" size="sm" className="ml-auto" onClick={onExport}>
      <Download className="w-4 h-4 mr-1" /> Exportar
    </Button>
  )
}

// ── RFC Birth date parser ─────────────────────────────────────────────────────
function rfcBirthDate(rfc: string): { day: number; month: number; year: number } | null {
  if (!rfc || rfc.length < 10) return null
  const yy = parseInt(rfc.substring(4, 6))
  const mm = parseInt(rfc.substring(6, 8))
  const dd = parseInt(rfc.substring(8, 10))
  if (isNaN(yy) || isNaN(mm) || isNaN(dd)) return null
  const year = yy >= 0 && yy <= 30 ? 2000 + yy : 1900 + yy
  return { day: dd, month: mm, year }
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ReportesPage() {
  const {
    empleados, historialPersonal, bajas, vacaciones, incapacidades,
    cursosProgramados, asistentesCursos, cursosCatalogo,
    empresas, departamentos, puestos, concIncap, modosIncap,
    tiposBaja, motivosBaja,
    getEmpresaNombre, getDepartamentoNombre, getPuestoNombre,
  } = useSCRHStore()

  const [activeCategory, setActiveCategory] = useState('personal')
  const [activeReport, setActiveReport] = useState<ReportId>('todos_empleados')
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const cat = CATEGORIES.find(c => c.id === activeCategory)

  // ── Filters ───────────────────────────────────────────────────────────────
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Personal filters
  const [fEmpresa, setFEmpresa] = useState(0)
  const [fDepto, setFDepto] = useState(0)
  const [fStatus, setFStatus] = useState<'todos' | 'activos' | 'bajas'>('todos')
  const [fPuesto, setFPuesto] = useState(0)

  // Month/year pickers
  const [mesSeleccionado, setMesSeleccionado] = useState(currentMonth)
  const [anyoSeleccionado, setAnyoSeleccionado] = useState(currentYear)

  // Vencimiento contratos
  const [diasVencimiento, setDiasVencimiento] = useState(30)

  // Date ranges
  const [desdeFecha, setDesdeFecha] = useState('')
  const [hastaFecha, setHastaFecha] = useState('')

  // Incapacidades
  const [incapYear, setIncapYear] = useState(currentYear)

  // Vacaciones
  const [vacYear, setVacYear] = useState(currentYear)

  // Capacitacion
  const [capDepto, setCapDepto] = useState(0)

  // Cuentas bancarias
  const [soloActivos, setSoloActivos] = useState(true)

  // ── Computations ──────────────────────────────────────────────────────────

  // 1. Todos los empleados
  const reportTodosEmpleados = useMemo(() => {
    return empleados.filter(e => {
      if (fEmpresa && e.empresa !== fEmpresa) return false
      if (fDepto && e.depto !== fDepto) return false
      if (fPuesto && e.puesto !== fPuesto) return false
      if (fStatus === 'activos' && e.st !== 1) return false
      if (fStatus === 'bajas' && e.st !== 5) return false
      return true
    })
  }, [empleados, fEmpresa, fDepto, fPuesto, fStatus])

  // 2. Activos por departamento
  const reportActivosPorDepto = useMemo(() => {
    const activos = empleados.filter(e => e.st === 1)
    const total = activos.length || 1
    const grouped: Record<string, { depto: number; empresa: number; count: number }[]> = {}
    activos.forEach(e => {
      const key = `${e.depto}-${e.empresa}`
      if (!grouped[key]) grouped[key] = []
    })
    const map = new Map<string, { depto: number; empresa: number; count: number }>()
    activos.forEach(e => {
      const key = `${e.depto}-${e.empresa}`
      if (!map.has(key)) map.set(key, { depto: e.depto, empresa: e.empresa, count: 0 })
      map.get(key)!.count++
    })
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .map(r => ({ ...r, pct: ((r.count / total) * 100).toFixed(1) }))
  }, [empleados])

  // 3. Cumpleaños
  const reportCumpleanos = useMemo(() => {
    return empleados
      .map(e => {
        const bd = rfcBirthDate(e.rfc)
        if (!bd) return null
        if (bd.month !== mesSeleccionado) return null
        const anos = currentYear - bd.year
        return { emp: e, day: bd.day, years: anos }
      })
      .filter(Boolean)
      .sort((a, b) => a!.day - b!.day) as { emp: typeof empleados[0]; day: number; years: number }[]
  }, [empleados, mesSeleccionado, currentYear])

  // 4. Aniversarios
  const reportAniversarios = useMemo(() => {
    return empleados
      .filter(e => e.st === 1)
      .map(e => {
        const alta = new Date(e.alta)
        if (alta.getMonth() + 1 !== mesSeleccionado) return null
        const anos = anyoSeleccionado - alta.getFullYear()
        if (anos <= 0) return null
        return { emp: e, day: alta.getDate(), years: anos }
      })
      .filter(Boolean)
      .sort((a, b) => a!.day - b!.day) as { emp: typeof empleados[0]; day: number; years: number }[]
  }, [empleados, mesSeleccionado, anyoSeleccionado])

  // 5. Vencimiento contratos
  const reportVencimientoContratos = useMemo(() => {
    const hoy = new Date()
    return empleados
      .filter(e => e.st === 1 && e.fecha_contrato)
      .map(e => {
        const vence = new Date(e.fecha_contrato!)
        const diff = Math.floor((vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
        return { emp: e, dias: diff }
      })
      .filter(r => r.dias >= 0 && r.dias <= diasVencimiento)
      .sort((a, b) => a.dias - b.dias)
  }, [empleados, diasVencimiento])

  // 6. Nómina global
  const reportNominaGlobal = useMemo(() => {
    const activos = empleados.filter(e => e.st === 1)
    const map = new Map<string, { empresa: number; depto: number; count: number; bruto: number; sd: number; sdi: number }>()
    activos.forEach(e => {
      const key = `${e.empresa}-${e.depto}`
      if (!map.has(key)) map.set(key, { empresa: e.empresa, depto: e.depto, count: 0, bruto: 0, sd: 0, sdi: 0 })
      const r = map.get(key)!
      r.count++
      r.bruto += e.sueldo_mensual
      r.sd += e.sd
      r.sdi += e.sdi
    })
    return Array.from(map.values()).sort((a, b) => b.bruto - a.bruto)
  }, [empleados])

  // 7. Histórico incrementos
  const reportIncrementos = useMemo(() => {
    return historialPersonal
      .filter(h => h.movimiento === 4 && h.sueldo_inicial > 0)
      .map(h => {
        const diff = h.sueldo_final - h.sueldo_inicial
        const pct = h.sueldo_inicial > 0 ? ((diff / h.sueldo_inicial) * 100).toFixed(1) : '0'
        const emp = empleados.find(e => e.clave === h.clave)
        return { ...h, emp, diff, pct }
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [historialPersonal, empleados])

  // 8. Cuentas bancarias
  const reportCuentasBancarias = useMemo(() => {
    return empleados.filter(e => soloActivos ? e.st === 1 : true)
  }, [empleados, soloActivos])

  // 9. Altas del período
  const reportAltas = useMemo(() => {
    return historialPersonal
      .filter(h => {
        if (h.movimiento !== 1) return false
        if (desdeFecha && h.fecha < desdeFecha) return false
        if (hastaFecha && h.fecha > hastaFecha) return false
        return true
      })
      .map(h => ({ ...h, emp: empleados.find(e => e.clave === h.clave) }))
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [historialPersonal, empleados, desdeFecha, hastaFecha])

  // 10. Bajas del período
  const reportBajas = useMemo(() => {
    return bajas
      .filter(b => {
        if (desdeFecha && b.fecha_baja < desdeFecha) return false
        if (hastaFecha && b.fecha_baja > hastaFecha) return false
        return true
      })
      .map(b => {
        const emp = empleados.find(e => e.clave === b.clave)
        const tipo = tiposBaja.find(t => t.clave === b.tipo_baja)
        return { ...b, emp, tipoNombre: tipo?.descripcion ?? '—' }
      })
      .sort((a, b) => b.fecha_baja.localeCompare(a.fecha_baja))
  }, [bajas, empleados, tiposBaja, desdeFecha, hastaFecha])

  const resumenBajas = useMemo(() => {
    const map = new Map<string, number>()
    reportBajas.forEach(b => {
      const k = b.tipoNombre
      map.set(k, (map.get(k) ?? 0) + 1)
    })
    return Array.from(map.entries()).map(([tipo, count]) => ({ tipo, count }))
  }, [reportBajas])

  // 11. Transferencias del período
  const reportTransferencias = useMemo(() => {
    return historialPersonal
      .filter(h => {
        if (h.movimiento !== 3) return false
        if (desdeFecha && h.fecha < desdeFecha) return false
        if (hastaFecha && h.fecha > hastaFecha) return false
        return true
      })
      .map(h => ({ ...h, emp: empleados.find(e => e.clave === h.clave) }))
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [historialPersonal, empleados, desdeFecha, hastaFecha])

  // 12. Incapacidades
  const reportIncapacidades = useMemo(() => {
    return incapacidades
      .filter(i => {
        const year = new Date(i.f_inicial).getFullYear()
        return year === incapYear
      })
      .map(i => {
        const emp = empleados.find(e => e.clave === i.clave)
        const concepto = concIncap.find(c => c.clave === i.concepto)
        const modo = modosIncap.find(m => m.clave === i.modo)
        const costo = emp ? emp.sd * i.dias : 0
        return { ...i, emp, conceptoNombre: concepto?.descripcion ?? '—', modoNombre: modo?.descripcion ?? '—', costo }
      })
      .sort((a, b) => b.f_inicial.localeCompare(a.f_inicial))
  }, [incapacidades, empleados, concIncap, modosIncap, incapYear])

  const totalDiasIncap = useMemo(() => reportIncapacidades.reduce((s, i) => s + i.dias, 0), [reportIncapacidades])
  const totalCostoIncap = useMemo(() => reportIncapacidades.reduce((s, i) => s + i.costo, 0), [reportIncapacidades])

  // 13. Vacaciones
  const reportVacaciones = useMemo(() => {
    return vacaciones
      .filter(v => v.year === vacYear)
      .map(v => ({ ...v, emp: empleados.find(e => e.clave === v.clave) }))
      .sort((a, b) => b.f_inicial.localeCompare(a.f_inicial))
  }, [vacaciones, empleados, vacYear])

  // 14. Avance capacitación
  const reportCapacitacion = useMemo(() => {
    return empleados
      .filter(e => e.st === 1 && (capDepto === 0 || e.depto === capDepto))
      .map(e => {
        const programas = cursosProgramados.map(p => p.numero)
        const asistencias = asistentesCursos.filter(a => a.clave_emp === e.clave)
        const tomados = asistencias.length
        const aprobados = asistencias.filter(a => a.aprobado).length
        const pct = tomados > 0 ? ((aprobados / tomados) * 100).toFixed(0) : '—'
        const horas = asistencias.reduce((s, a) => {
          const prog = cursosProgramados.find(p => p.numero === a.curso_programa)
          if (!prog) return s
          const cat = cursosCatalogo.find(c => c.clave === prog.curso)
          return s + (cat?.duracion_horas ?? 0)
        }, 0)
        const calProm = asistencias.filter(a => a.calificacion != null).length > 0
          ? (asistencias.reduce((s, a) => s + (a.calificacion ?? 0), 0) / asistencias.filter(a => a.calificacion != null).length).toFixed(1)
          : '—'
        return { emp: e, tomados, aprobados, pct, horas, calProm }
      })
      .sort((a, b) => b.tomados - a.tomados)
  }, [empleados, asistentesCursos, cursosProgramados, cursosCatalogo, capDepto])

  // ── Months ────────────────────────────────────────────────────────────────
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  // ── Render report content ─────────────────────────────────────────────────
  function renderReport() {
    switch (activeReport) {

      // 1. Todos los empleados
      case 'todos_empleados':
        return (
          <div>
            <FilterRow>
              <FilterGroup label="Empresa">
                <select value={fEmpresa} onChange={e => setFEmpresa(Number(e.target.value))} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value={0}>Todas</option>
                  {empresas.map(e => <option key={e.clave} value={e.clave}>{e.razon_social}</option>)}
                </select>
              </FilterGroup>
              <FilterGroup label="Departamento">
                <select value={fDepto} onChange={e => setFDepto(Number(e.target.value))} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value={0}>Todos</option>
                  {departamentos.map(d => <option key={d.clave} value={d.clave}>{d.descripcion}</option>)}
                </select>
              </FilterGroup>
              <FilterGroup label="Puesto">
                <select value={fPuesto} onChange={e => setFPuesto(Number(e.target.value))} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value={0}>Todos</option>
                  {puestos.map(p => <option key={p.clave} value={p.clave}>{p.descripcion}</option>)}
                </select>
              </FilterGroup>
              <FilterGroup label="Status">
                <select value={fStatus} onChange={e => setFStatus(e.target.value as 'todos' | 'activos' | 'bajas')} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="todos">Todos</option>
                  <option value="activos">Activos</option>
                  <option value="bajas">Bajas</option>
                </select>
              </FilterGroup>
              <ExportButton count={reportTodosEmpleados.length} onExport={() => showToast(`Exportando ${reportTodosEmpleados.length} registros...`)} />
            </FilterRow>
            <ReportTable
              headers={['Nómina', 'Nombre', 'RFC', 'Empresa', 'Dpto', 'Puesto', 'CC', 'Sueldo', 'F.Alta', 'Status']}
              count={reportTodosEmpleados.length}
            >
              {reportTodosEmpleados.map(e => (
                <tr key={e.clave} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-mono text-xs">{e.clave}</td>
                  <td className="py-2 px-3 whitespace-nowrap">{e.nombre_completo}</td>
                  <td className="py-2 px-3 font-mono text-xs">{e.rfc}</td>
                  <td className="py-2 px-3 whitespace-nowrap text-xs">{getEmpresaNombre(e.empresa)}</td>
                  <td className="py-2 px-3 whitespace-nowrap text-xs">{getDepartamentoNombre(e.depto)}</td>
                  <td className="py-2 px-3 whitespace-nowrap text-xs">{getPuestoNombre(e.puesto)}</td>
                  <td className="py-2 px-3 text-xs">{e.ccostos}</td>
                  <td className="py-2 px-3 whitespace-nowrap text-xs">{formatMXN(e.sueldo_mensual)}</td>
                  <td className="py-2 px-3 text-xs">{e.alta}</td>
                  <td className="py-2 px-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${e.st === 1 ? 'bg-green-100 text-green-700' : e.st === 5 ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>
                      {e.st === 1 ? 'Activo' : e.st === 5 ? 'Baja' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </ReportTable>
          </div>
        )

      // 2. Activos por departamento
      case 'activos_depto': {
        const total = reportActivosPorDepto.reduce((s, r) => s + r.count, 0)
        return (
          <div>
            <div className="flex justify-end mb-4">
              <ExportButton count={reportActivosPorDepto.length} onExport={() => showToast(`Exportando ${reportActivosPorDepto.length} registros...`)} />
            </div>
            <ReportTable headers={['Departamento', 'Empresa', 'Total activos', '% del total']} count={reportActivosPorDepto.length}>
              {reportActivosPorDepto.map((r, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3">{getDepartamentoNombre(r.depto)}</td>
                  <td className="py-2 px-3 text-xs text-gray-600">{getEmpresaNombre(r.empresa)}</td>
                  <td className="py-2 px-3 font-bold text-indigo-700">{r.count}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 bg-indigo-200 rounded-full" style={{ width: `${(r.count / total) * 120}px` }}>
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: '100%' }} />
                      </div>
                      <span className="text-xs text-gray-600">{r.pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </ReportTable>
            <div className="mt-3 text-sm text-gray-500">Total activos: <span className="font-bold text-gray-800">{total}</span></div>
          </div>
        )
      }

      // 3. Cumpleaños
      case 'cumpleanos':
        return (
          <div>
            <div className="flex items-center gap-3 mb-4 p-3 bg-pink-50 rounded-lg border border-pink-100">
              <span className="text-2xl">🎂</span>
              <div>
                <p className="font-semibold text-pink-800">Cumpleaños del mes</p>
                <p className="text-xs text-pink-600">{reportCumpleanos.length} empleado(s) cumplen años en {MESES[mesSeleccionado - 1]}</p>
              </div>
            </div>
            <FilterRow>
              <FilterGroup label="Mes">
                <select value={mesSeleccionado} onChange={e => setMesSeleccionado(Number(e.target.value))} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </FilterGroup>
              <ExportButton count={reportCumpleanos.length} onExport={() => showToast(`Exportando ${reportCumpleanos.length} registros...`)} />
            </FilterRow>
            <ReportTable headers={['Día', 'Nombre', 'Departamento', 'Empresa', 'Años que cumple']} count={reportCumpleanos.length}>
              {reportCumpleanos.map(({ emp, day, years }, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-pink-50">
                  <td className="py-2 px-3 font-bold text-pink-600">{day}</td>
                  <td className="py-2 px-3">{emp.nombre_completo}</td>
                  <td className="py-2 px-3 text-xs text-gray-600">{getDepartamentoNombre(emp.depto)}</td>
                  <td className="py-2 px-3 text-xs text-gray-600">{getEmpresaNombre(emp.empresa)}</td>
                  <td className="py-2 px-3 text-pink-700 font-semibold">{years} años</td>
                </tr>
              ))}
              {reportCumpleanos.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">Sin cumpleaños en {MESES[mesSeleccionado - 1]}</td></tr>
              )}
            </ReportTable>
          </div>
        )

      // 4. Aniversarios
      case 'aniversarios': {
        const badgeAniv = (years: number) => {
          if (years >= 20) return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-700">⭐ {years} años</span>
          if (years >= 15) return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-700">{years} años</span>
          if (years >= 10) return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">{years} años</span>
          if (years >= 5) return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-100 text-teal-700">{years} años</span>
          return <span className="text-xs text-gray-600">{years} años</span>
        }
        return (
          <div>
            <FilterRow>
              <FilterGroup label="Mes">
                <select value={mesSeleccionado} onChange={e => setMesSeleccionado(Number(e.target.value))} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </FilterGroup>
              <FilterGroup label="Año">
                <Input type="number" value={anyoSeleccionado} onChange={e => setAnyoSeleccionado(Number(e.target.value))} className="w-24" />
              </FilterGroup>
              <ExportButton count={reportAniversarios.length} onExport={() => showToast(`Exportando ${reportAniversarios.length} registros...`)} />
            </FilterRow>
            <ReportTable headers={['Día', 'Nombre', 'Departamento', 'Empresa', 'Antigüedad']} count={reportAniversarios.length}>
              {reportAniversarios.map(({ emp, day, years }, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-bold text-indigo-600">{day}</td>
                  <td className="py-2 px-3">{emp.nombre_completo}</td>
                  <td className="py-2 px-3 text-xs text-gray-600">{getDepartamentoNombre(emp.depto)}</td>
                  <td className="py-2 px-3 text-xs text-gray-600">{getEmpresaNombre(emp.empresa)}</td>
                  <td className="py-2 px-3">{badgeAniv(years)}</td>
                </tr>
              ))}
              {reportAniversarios.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">Sin aniversarios en {MESES[mesSeleccionado - 1]}</td></tr>
              )}
            </ReportTable>
          </div>
        )
      }

      // 5. Vencimiento contratos
      case 'vencimiento_contratos':
        return (
          <div>
            <FilterRow>
              <FilterGroup label="Días hacia adelante">
                <select value={diasVencimiento} onChange={e => setDiasVencimiento(Number(e.target.value))} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value={30}>30 días</option>
                  <option value={60}>60 días</option>
                  <option value={90}>90 días</option>
                </select>
              </FilterGroup>
              <ExportButton count={reportVencimientoContratos.length} onExport={() => showToast(`Exportando ${reportVencimientoContratos.length} registros...`)} />
            </FilterRow>
            <ReportTable headers={['Nómina', 'Nombre', 'Empresa', 'Dpto', 'F.Contrato', 'Días restantes']} count={reportVencimientoContratos.length}>
              {reportVencimientoContratos.map(({ emp: e, dias }) => (
                <tr key={e.clave} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-mono text-xs">{e.clave}</td>
                  <td className="py-2 px-3">{e.nombre_completo}</td>
                  <td className="py-2 px-3 text-xs">{getEmpresaNombre(e.empresa)}</td>
                  <td className="py-2 px-3 text-xs">{getDepartamentoNombre(e.depto)}</td>
                  <td className="py-2 px-3 text-xs">{e.fecha_contrato}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${dias < 30 ? 'bg-red-100 text-red-700' : dias < 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                      {dias} días
                    </span>
                  </td>
                </tr>
              ))}
              {reportVencimientoContratos.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">Sin contratos por vencer en {diasVencimiento} días</td></tr>
              )}
            </ReportTable>
          </div>
        )

      // 6. Nómina global
      case 'nomina_global': {
        const totBruto = reportNominaGlobal.reduce((s, r) => s + r.bruto, 0)
        const totSD = reportNominaGlobal.reduce((s, r) => s + r.sd, 0)
        const totSDI = reportNominaGlobal.reduce((s, r) => s + r.sdi, 0)
        const totEmp = reportNominaGlobal.reduce((s, r) => s + r.count, 0)
        return (
          <div>
            <div className="flex justify-end mb-4">
              <ExportButton count={reportNominaGlobal.length} onExport={() => showToast(`Exportando ${reportNominaGlobal.length} registros...`)} />
            </div>
            <ReportTable headers={['Empresa', 'Dpto', '# Empleados', 'Sueldo Bruto Total', 'SD Total', 'SDI Total']}>
              {reportNominaGlobal.map((r, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 text-xs">{getEmpresaNombre(r.empresa)}</td>
                  <td className="py-2 px-3 text-xs">{getDepartamentoNombre(r.depto)}</td>
                  <td className="py-2 px-3 font-semibold">{r.count}</td>
                  <td className="py-2 px-3 whitespace-nowrap">{formatMXN(r.bruto)}</td>
                  <td className="py-2 px-3 whitespace-nowrap">{formatMXN(r.sd)}</td>
                  <td className="py-2 px-3 whitespace-nowrap">{formatMXN(r.sdi)}</td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                <td className="py-2 px-3 text-xs" colSpan={2}>TOTALES</td>
                <td className="py-2 px-3">{totEmp}</td>
                <td className="py-2 px-3 whitespace-nowrap text-indigo-700">{formatMXN(totBruto)}</td>
                <td className="py-2 px-3 whitespace-nowrap">{formatMXN(totSD)}</td>
                <td className="py-2 px-3 whitespace-nowrap">{formatMXN(totSDI)}</td>
              </tr>
            </ReportTable>
          </div>
        )
      }

      // 7. Histórico incrementos
      case 'historico_incrementos': {
        const promPct = reportIncrementos.length > 0
          ? (reportIncrementos.reduce((s, r) => s + parseFloat(r.pct), 0) / reportIncrementos.length).toFixed(1)
          : '0'
        const totIncr = reportIncrementos.reduce((s, r) => s + r.diff, 0)
        return (
          <div>
            <div className="flex gap-4 mb-4">
              <div className="px-4 py-2 bg-indigo-50 rounded-lg text-sm">
                <span className="text-gray-500">Promedio incremento: </span>
                <span className="font-bold text-indigo-700">{promPct}%</span>
              </div>
              <div className="px-4 py-2 bg-green-50 rounded-lg text-sm">
                <span className="text-gray-500">Total incrementado: </span>
                <span className="font-bold text-green-700">{formatMXN(totIncr)}</span>
              </div>
              <ExportButton count={reportIncrementos.length} onExport={() => showToast(`Exportando ${reportIncrementos.length} registros...`)} />
            </div>
            <ReportTable headers={['Fecha', 'Nómina', 'Nombre', 'Puesto', 'Sueldo ant.', 'Sueldo nuevo', 'Diferencia', '% Inc.', 'Usuario']} count={reportIncrementos.length}>
              {reportIncrementos.map(r => (
                <tr key={r.numero} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 text-xs">{r.fecha}</td>
                  <td className="py-2 px-3 font-mono text-xs">{r.clave}</td>
                  <td className="py-2 px-3 whitespace-nowrap text-xs">{r.emp?.nombre_completo ?? '—'}</td>
                  <td className="py-2 px-3 text-xs">{getPuestoNombre(r.puesto_final)}</td>
                  <td className="py-2 px-3 whitespace-nowrap text-xs">{formatMXN(r.sueldo_inicial)}</td>
                  <td className="py-2 px-3 whitespace-nowrap text-xs">{formatMXN(r.sueldo_final)}</td>
                  <td className="py-2 px-3 whitespace-nowrap text-green-700 text-xs">+{formatMXN(r.diff)}</td>
                  <td className="py-2 px-3 text-xs font-semibold text-indigo-600">{r.pct}%</td>
                  <td className="py-2 px-3 text-xs text-gray-500">{r.usuario}</td>
                </tr>
              ))}
            </ReportTable>
          </div>
        )
      }

      // 8. Cuentas bancarias
      case 'cuentas_bancarias': {
        const conCuenta = reportCuentasBancarias.filter(e => e.cuenta_bancaria).length
        const sinCuenta = reportCuentasBancarias.length - conCuenta
        return (
          <div>
            <FilterRow>
              <FilterGroup label="Mostrar">
                <select value={soloActivos ? '1' : '0'} onChange={e => setSoloActivos(e.target.value === '1')} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="1">Solo activos</option>
                  <option value="0">Todos</option>
                </select>
              </FilterGroup>
              <div className="px-3 py-1.5 bg-green-50 rounded text-xs text-green-700">Con cuenta: <strong>{conCuenta}</strong></div>
              <div className="px-3 py-1.5 bg-red-50 rounded text-xs text-red-700">Sin cuenta: <strong>{sinCuenta}</strong></div>
              <ExportButton count={reportCuentasBancarias.length} onExport={() => showToast(`Exportando ${reportCuentasBancarias.length} registros...`)} />
            </FilterRow>
            <ReportTable headers={['Nómina', 'Nombre', 'Banco', 'Cuenta', 'CLABE', 'Status']} count={reportCuentasBancarias.length}>
              {reportCuentasBancarias.map(e => (
                <tr key={e.clave} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-mono text-xs">{e.clave}</td>
                  <td className="py-2 px-3 whitespace-nowrap">{e.nombre_completo}</td>
                  <td className="py-2 px-3 text-xs">{e.banco ?? <span className="text-gray-300">—</span>}</td>
                  <td className="py-2 px-3 font-mono text-xs">{e.cuenta_bancaria ?? <span className="text-gray-300">—</span>}</td>
                  <td className="py-2 px-3 font-mono text-xs text-gray-500">{e.cuenta_bancaria ? e.cuenta_bancaria.padEnd(18, '0').substring(0, 18) : '—'}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${e.st === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {e.st === 1 ? 'Activo' : 'Baja'}
                    </span>
                  </td>
                </tr>
              ))}
            </ReportTable>
          </div>
        )
      }

      // 9. Altas del período
      case 'altas_periodo':
        return (
          <div>
            <FilterRow>
              <FilterGroup label="Desde">
                <Input type="date" value={desdeFecha} onChange={e => setDesdeFecha(e.target.value)} className="w-36" />
              </FilterGroup>
              <FilterGroup label="Hasta">
                <Input type="date" value={hastaFecha} onChange={e => setHastaFecha(e.target.value)} className="w-36" />
              </FilterGroup>
              <ExportButton count={reportAltas.length} onExport={() => showToast(`Exportando ${reportAltas.length} registros...`)} />
            </FilterRow>
            <ReportTable headers={['Nómina', 'Nombre', 'Empresa', 'Dpto', 'Puesto', 'F.Alta', 'Sueldo', 'Usuario']} count={reportAltas.length}>
              {reportAltas.map(r => (
                <tr key={r.numero} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-mono text-xs">{r.clave}</td>
                  <td className="py-2 px-3 whitespace-nowrap">{r.emp?.nombre_completo ?? '—'}</td>
                  <td className="py-2 px-3 text-xs">{r.emp ? getEmpresaNombre(r.emp.empresa) : '—'}</td>
                  <td className="py-2 px-3 text-xs">{r.emp ? getDepartamentoNombre(r.emp.depto) : '—'}</td>
                  <td className="py-2 px-3 text-xs">{r.emp ? getPuestoNombre(r.emp.puesto) : '—'}</td>
                  <td className="py-2 px-3 text-xs">{r.fecha}</td>
                  <td className="py-2 px-3 whitespace-nowrap text-xs">{formatMXN(r.sueldo_final)}</td>
                  <td className="py-2 px-3 text-xs text-gray-500">{r.usuario}</td>
                </tr>
              ))}
            </ReportTable>
          </div>
        )

      // 10. Bajas del período
      case 'bajas_periodo':
        return (
          <div>
            <FilterRow>
              <FilterGroup label="Desde">
                <Input type="date" value={desdeFecha} onChange={e => setDesdeFecha(e.target.value)} className="w-36" />
              </FilterGroup>
              <FilterGroup label="Hasta">
                <Input type="date" value={hastaFecha} onChange={e => setHastaFecha(e.target.value)} className="w-36" />
              </FilterGroup>
              <ExportButton count={reportBajas.length} onExport={() => showToast(`Exportando ${reportBajas.length} registros...`)} />
            </FilterRow>
            {resumenBajas.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {resumenBajas.map(r => (
                  <span key={r.tipo} className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-700">
                    {r.tipo}: <strong>{r.count}</strong>
                  </span>
                ))}
              </div>
            )}
            <ReportTable headers={['Nómina', 'Nombre', 'Empresa', 'Dpto', 'Puesto', 'F.Baja', 'Tipo baja', 'Motivo', 'Recontratable', 'Usuario']} count={reportBajas.length}>
              {reportBajas.map(b => (
                <tr key={b.numero} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-mono text-xs">{b.clave}</td>
                  <td className="py-2 px-3 whitespace-nowrap">{b.emp?.nombre_completo ?? '—'}</td>
                  <td className="py-2 px-3 text-xs">{b.emp ? getEmpresaNombre(b.emp.empresa) : '—'}</td>
                  <td className="py-2 px-3 text-xs">{b.emp ? getDepartamentoNombre(b.emp.depto) : '—'}</td>
                  <td className="py-2 px-3 text-xs">{b.emp ? getPuestoNombre(b.emp.puesto) : '—'}</td>
                  <td className="py-2 px-3 text-xs">{b.fecha_baja}</td>
                  <td className="py-2 px-3 text-xs">{b.tipoNombre}</td>
                  <td className="py-2 px-3 text-xs">{b.causa_detalle}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${b.recontratable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {b.recontratable ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-500">{b.usuario}</td>
                </tr>
              ))}
            </ReportTable>
          </div>
        )

      // 11. Transferencias del período
      case 'transferencias_periodo':
        return (
          <div>
            <FilterRow>
              <FilterGroup label="Desde">
                <Input type="date" value={desdeFecha} onChange={e => setDesdeFecha(e.target.value)} className="w-36" />
              </FilterGroup>
              <FilterGroup label="Hasta">
                <Input type="date" value={hastaFecha} onChange={e => setHastaFecha(e.target.value)} className="w-36" />
              </FilterGroup>
              <ExportButton count={reportTransferencias.length} onExport={() => showToast(`Exportando ${reportTransferencias.length} registros...`)} />
            </FilterRow>
            <ReportTable headers={['Fecha', 'Nómina', 'Nombre', 'Empresa origen', 'Empresa destino', 'Puesto anterior', 'Puesto nuevo', 'Sueldo ant.', 'Sueldo nuevo']} count={reportTransferencias.length}>
              {reportTransferencias.map(r => (
                <tr key={r.numero} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 text-xs">{r.fecha}</td>
                  <td className="py-2 px-3 font-mono text-xs">{r.clave}</td>
                  <td className="py-2 px-3 whitespace-nowrap text-xs">{r.emp?.nombre_completo ?? '—'}</td>
                  <td className="py-2 px-3 text-xs">{r.emp ? getEmpresaNombre(r.emp.empresa) : '—'}</td>
                  <td className="py-2 px-3 text-xs text-indigo-700">{r.depto_final ? getDepartamentoNombre(r.depto_final) : '—'}</td>
                  <td className="py-2 px-3 text-xs">{getPuestoNombre(r.puesto_inicial)}</td>
                  <td className="py-2 px-3 text-xs text-indigo-700">{getPuestoNombre(r.puesto_final)}</td>
                  <td className="py-2 px-3 whitespace-nowrap text-xs">{formatMXN(r.sueldo_inicial)}</td>
                  <td className="py-2 px-3 whitespace-nowrap text-xs">{formatMXN(r.sueldo_final)}</td>
                </tr>
              ))}
            </ReportTable>
          </div>
        )

      // 12. Incapacidades
      case 'incapacidades_periodo':
        return (
          <div>
            <FilterRow>
              <FilterGroup label="Año">
                <Input type="number" value={incapYear} onChange={e => setIncapYear(Number(e.target.value))} className="w-24" />
              </FilterGroup>
              <div className="px-3 py-1.5 bg-amber-50 rounded text-xs text-amber-700">
                Días perdidos: <strong>{totalDiasIncap}</strong>
              </div>
              <div className="px-3 py-1.5 bg-red-50 rounded text-xs text-red-700">
                Costo estimado: <strong>{formatMXN(totalCostoIncap)}</strong>
              </div>
              <ExportButton count={reportIncapacidades.length} onExport={() => showToast(`Exportando ${reportIncapacidades.length} registros...`)} />
            </FilterRow>
            <ReportTable headers={['Nómina', 'Nombre', 'Folio', 'Concepto', 'Modo', 'Días', 'F.Inicial', 'F.Final', 'Costo est.']} count={reportIncapacidades.length}>
              {reportIncapacidades.map(i => (
                <tr key={i.numero} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-mono text-xs">{i.clave}</td>
                  <td className="py-2 px-3 whitespace-nowrap text-xs">{i.emp?.nombre_completo ?? '—'}</td>
                  <td className="py-2 px-3 font-mono text-xs">{i.folio}</td>
                  <td className="py-2 px-3 text-xs">{i.conceptoNombre}</td>
                  <td className="py-2 px-3 text-xs">{i.modoNombre}</td>
                  <td className="py-2 px-3 font-bold text-amber-700">{i.dias}</td>
                  <td className="py-2 px-3 text-xs">{i.f_inicial}</td>
                  <td className="py-2 px-3 text-xs">{i.f_final}</td>
                  <td className="py-2 px-3 whitespace-nowrap text-xs">{formatMXN(i.costo)}</td>
                </tr>
              ))}
            </ReportTable>
          </div>
        )

      // 13. Vacaciones
      case 'vacaciones_periodo':
        return (
          <div>
            <FilterRow>
              <FilterGroup label="Año">
                <Input type="number" value={vacYear} onChange={e => setVacYear(Number(e.target.value))} className="w-24" />
              </FilterGroup>
              <ExportButton count={reportVacaciones.length} onExport={() => showToast(`Exportando ${reportVacaciones.length} registros...`)} />
            </FilterRow>
            <ReportTable headers={['Nómina', 'Nombre', 'F.Inicial', 'F.Final', 'Días Vac', 'Prima', 'Tipo']} count={reportVacaciones.length}>
              {reportVacaciones.map(v => (
                <tr key={v.numero} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-mono text-xs">{v.clave}</td>
                  <td className="py-2 px-3 whitespace-nowrap">{v.emp?.nombre_completo ?? '—'}</td>
                  <td className="py-2 px-3 text-xs">{v.f_inicial}</td>
                  <td className="py-2 px-3 text-xs">{v.f_final}</td>
                  <td className="py-2 px-3 font-semibold text-indigo-700">{v.dias_vac}</td>
                  <td className="py-2 px-3 whitespace-nowrap text-xs">{formatMXN(v.prima_vac)}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${v.vop === 'V' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {v.vop === 'V' ? 'Vacaciones' : 'Prima'}
                    </span>
                  </td>
                </tr>
              ))}
            </ReportTable>
          </div>
        )

      // 14. Avance capacitación
      case 'avance_capacitacion':
        return (
          <div>
            <FilterRow>
              <FilterGroup label="Departamento">
                <select value={capDepto} onChange={e => setCapDepto(Number(e.target.value))} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value={0}>Todos</option>
                  {departamentos.map(d => <option key={d.clave} value={d.clave}>{d.descripcion}</option>)}
                </select>
              </FilterGroup>
              <ExportButton count={reportCapacitacion.length} onExport={() => showToast(`Exportando ${reportCapacitacion.length} registros...`)} />
            </FilterRow>
            <ReportTable headers={['Nómina', 'Nombre', 'Dpto', 'Cursos tomados', 'Aprobados', '% Aprobación', 'Horas totales', 'Cal. prom.']} count={reportCapacitacion.length}>
              {reportCapacitacion.map(r => (
                <tr key={r.emp.clave} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-mono text-xs">{r.emp.clave}</td>
                  <td className="py-2 px-3 whitespace-nowrap">{r.emp.nombre_completo}</td>
                  <td className="py-2 px-3 text-xs">{getDepartamentoNombre(r.emp.depto)}</td>
                  <td className="py-2 px-3 font-semibold text-center">{r.tomados}</td>
                  <td className="py-2 px-3 text-center text-green-700">{r.aprobados}</td>
                  <td className="py-2 px-3 text-center">
                    {r.pct !== '—' ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${parseFloat(r.pct as string) >= 80 ? 'bg-green-100 text-green-700' : parseFloat(r.pct as string) >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
                        {r.pct}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-2 px-3 text-center">{r.horas}h</td>
                  <td className="py-2 px-3 text-center">{r.calProm}</td>
                </tr>
              ))}
            </ReportTable>
          </div>
        )

      default:
        return <div className="py-12 text-center text-gray-400 text-sm">Selecciona un reporte</div>
    }
  }

  const currentReportLabel = CATEGORIES.flatMap(c => c.reports).find(r => r.id === activeReport)?.label ?? ''

  return (
    <div className="p-6 space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium bg-indigo-50 border border-indigo-200 text-indigo-800">
          <Download className="w-4 h-4" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-sm text-gray-500 mt-1">Generación de reportes del sistema</p>
      </div>

      {/* Main layout */}
      <div className="flex gap-4">
        {/* Left sidebar */}
        <div className="w-48 shrink-0 space-y-1">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            const isActive = cat.id === activeCategory
            return (
              <div key={cat.id}>
                <button
                  onClick={() => {
                    setActiveCategory(cat.id)
                    setActiveReport(cat.reports[0].id)
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {cat.label}
                </button>
                {isActive && (
                  <div className="ml-2 mt-1 space-y-0.5">
                    {cat.reports.map(r => (
                      <button
                        key={r.id}
                        onClick={() => setActiveReport(r.id)}
                        className={`w-full text-left pl-6 pr-2 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5 ${
                          r.id === activeReport
                            ? 'text-indigo-700 font-semibold bg-indigo-100'
                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        <ChevronRight className="w-3 h-3 shrink-0" />
                        {r.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Report content */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-5 min-w-0">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">{currentReportLabel}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {CATEGORIES.find(c => c.id === activeCategory)?.label} — SCRH
              </p>
            </div>
            <FileText className="w-5 h-5 text-gray-300" />
          </div>
          {renderReport()}
        </div>
      </div>
    </div>
  )
}
