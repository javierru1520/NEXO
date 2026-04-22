import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Empleado,
  AltaProvisional,
  Baja,
  SolicitudReingreso,
  Vacacion,
  Incapacidad,
  Licencia,
  CursoCatalogo,
  CursoPrograma,
  AsistenteCurso,
  HistorialPersonal,
  EmpleoAnterior,
  Empresa,
  Departamento,
  Puesto,
  CentroCostos,
  UnidadNegocio,
  TipoBaja,
  MotivoBaja,
  CausaBaja,
  CausaIMSS,
  ModoIncap,
  ConcIncap,
  ProspectoBaja,
  RegistroAsistencia,
} from '@/types'
import {
  empleados as EMPLEADOS,
  ALTAS_PROVISIONALES,
  BAJAS_REGISTRADAS,
  SOLICITUDES_REINGRESO,
  VACACIONES,
  INCAPACIDADES,
  LICENCIAS,
  CURSOS_CATALOGO,
  CURSOS_PROGRAMADOS,
  ASISTENTES_CURSOS,
  HISTORIAL_PERSONAL,
  EMPLEOS_ANTERIORES,
  EMPRESAS,
  departamentos as DEPARTAMENTOS,
  puestos as PUESTOS,
  centrosCostos as CENTROS_COSTOS,
  UNIDADES_NEGOCIO,
  TIPOS_BAJA,
  MOTIVOS_BAJA,
  CAUSAS_BAJA,
  CAUSAS_IMSS,
  MODOS_INCAP,
  CONC_INCAP,
  PUESTO_ASIGNACION,
} from '@/lib/mock-data'
import { generarClave, calcularSalario } from '@/lib/calculations'

// ─── STORE INTERFACE ───────────────────────────────────────────────────────────

interface SCRHStore {
  // Transactional data
  empleados: Empleado[]
  altasProvisionales: AltaProvisional[]
  bajas: Baja[]
  prospectosBaja: ProspectoBaja[]
  solicitudesReingreso: SolicitudReingreso[]
  vacaciones: Vacacion[]
  incapacidades: Incapacidad[]
  licencias: Licencia[]
  registrosAsistencia: RegistroAsistencia[]
  cursosCatalogo: CursoCatalogo[]
  cursosProgramados: CursoPrograma[]
  asistentesCursos: AsistenteCurso[]
  historialPersonal: HistorialPersonal[]
  empleosAnteriores: EmpleoAnterior[]

  // Catalogs (read-only references)
  empresas: Empresa[]
  departamentos: Departamento[]
  puestos: Puesto[]
  centrosCostos: CentroCostos[]
  unidadesNegocio: UnidadNegocio[]
  tiposBaja: TipoBaja[]
  motivosBaja: MotivoBaja[]
  causasBaja: CausaBaja[]
  causasIMSS: CausaIMSS[]
  modosIncap: ModoIncap[]
  concIncap: ConcIncap[]

  // ── EMPLEADOS CRUD ──────────────────────────────────────────────────────────
  addEmpleado: (emp: Omit<Empleado, 'usuario' | 'ult_mod'>) => void
  updateEmpleado: (clave: string, data: Partial<Empleado>) => void

  // ── ALTAS ───────────────────────────────────────────────────────────────────
  addAltaProvisional: (alta: Omit<AltaProvisional, 'numero' | 'fecha_captura' | 'usuario'>) => string | null
  updateAltaProvisional: (numero: number, data: Partial<AltaProvisional>) => void
  aprobarAlta: (numero: number) => void

  // ── BAJAS ───────────────────────────────────────────────────────────────────
  registrarBaja: (baja: Omit<Baja, 'numero' | 'fecha_captura' | 'usuario'>) => void
  updateBaja: (numero: number, data: Partial<Baja>) => void
  addProspectoBaja: (p: Omit<ProspectoBaja, 'id'>) => void
  updateProspectoBaja: (id: number, data: Partial<ProspectoBaja>) => void
  deleteProspectoBaja: (id: number) => void

  // ── REINGRESOS ──────────────────────────────────────────────────────────────
  addReingreso: (sol: Omit<SolicitudReingreso, 'numero' | 'f_solicitud' | 'usuario'>) => void
  aprobarReingreso: (numero: number) => void

  // ── ASISTENCIA ──────────────────────────────────────────────────────────────
  addRegistroAsistencia: (reg: RegistroAsistencia) => void
  upsertRegistroAsistencia: (reg: RegistroAsistencia) => void
  deleteRegistroAsistencia: (id: string) => void

  // ── VACACIONES ──────────────────────────────────────────────────────────────
  addVacacion: (vac: Omit<Vacacion, 'numero' | 'fecha_captura' | 'usuario'>) => void
  deleteVacacion: (numero: number) => void

  // ── INCAPACIDADES ───────────────────────────────────────────────────────────
  addIncapacidad: (inc: Omit<Incapacidad, 'numero' | 'fecha_captura' | 'usuario'>) => void
  deleteIncapacidad: (numero: number) => void

  // ── LICENCIAS ───────────────────────────────────────────────────────────────
  addLicencia: (lic: Omit<Licencia, 'numero'>) => void
  updateLicencia: (numero: number, data: Partial<Licencia>) => void
  deleteLicencia: (numero: number) => void

  // ── CURSOS ──────────────────────────────────────────────────────────────────
  addCursoPrograma: (curso: Omit<CursoPrograma, 'numero' | 'usuario'>) => void
  addAsistente: (asistente: Omit<AsistenteCurso, 'numero' | 'usuario'>) => void
  updateAsistente: (numero: number, data: Partial<AsistenteCurso>) => void

  // ── HISTORIAL ───────────────────────────────────────────────────────────────
  addHistorial: (h: Omit<HistorialPersonal, 'numero'>) => void

  // ── EMPLEOS ANTERIORES ──────────────────────────────────────────────────────
  addEmpleoAnterior: (emp: Omit<EmpleoAnterior, 'numero'>) => void
  deleteEmpleoAnterior: (numero: number) => void

  // ── SESSION ─────────────────────────────────────────────────────────────────
  currentUser: string
  setCurrentUser: (user: string) => void

  // ── HELPERS ─────────────────────────────────────────────────────────────────
  getEmpleado: (clave: string) => Empleado | undefined
  getEmpleadoNombre: (clave: string) => string
  getDepartamentoNombre: (clave: number) => string
  getPuestoNombre: (clave: number) => string
  getEmpresaNombre: (clave: number) => string
  getCCostosNombre: (clave: number) => string

  // ── RESET ───────────────────────────────────────────────────────────────────
  resetData: () => void
}

// ─── INITIAL STATE ────────────────────────────────────────────────────────────

const PROSPECTOS_INICIALES: ProspectoBaja[] = [
  {
    id: 1,
    clave: '15100044',
    reporto: 'CLARA MANZANO QUIJANO',
    tipo: 'Ausentismo',
    causa_probable: 'Abandono probable',
    notas: 'Sin presentarse desde el lunes, no ha respondido a llamadas.',
    status: 'Pendiente',
    fecha: '2026-03-20',
    usuario: 'ADMIN',
  },
  {
    id: 2,
    clave: '15100089',
    reporto: 'ALDO ELIER VARGAS RAMIREZ',
    tipo: 'Tardanza reiterada',
    causa_probable: 'Baja voluntaria probable',
    notas: 'Más de 10 tardanzas acumuladas en el bimestre.',
    status: 'Revisado',
    fecha: '2026-03-08',
    usuario: 'ADMIN',
  },
  {
    id: 3,
    clave: '15100104',
    reporto: 'SERAFIN ESQUIVEL HERNANDEZ',
    tipo: 'Falta grave',
    causa_probable: 'Rescisión probable',
    notas: 'Tres faltas injustificadas en el mes. Se le ha llamado la atención.',
    status: 'Pendiente',
    fecha: '2026-03-15',
    usuario: 'ADMIN',
  },
]

const initialState = {
  currentUser: 'ADMIN',
  empleados: EMPLEADOS,
  altasProvisionales: ALTAS_PROVISIONALES,
  bajas: BAJAS_REGISTRADAS,
  prospectosBaja: PROSPECTOS_INICIALES,
  solicitudesReingreso: SOLICITUDES_REINGRESO,
  vacaciones: VACACIONES,
  incapacidades: INCAPACIDADES,
  registrosAsistencia: [] as RegistroAsistencia[],
  licencias: LICENCIAS,
  cursosCatalogo: CURSOS_CATALOGO,
  cursosProgramados: CURSOS_PROGRAMADOS,
  asistentesCursos: ASISTENTES_CURSOS,
  historialPersonal: HISTORIAL_PERSONAL,
  empleosAnteriores: EMPLEOS_ANTERIORES,
  // Catalogs
  empresas: EMPRESAS,
  departamentos: DEPARTAMENTOS,
  puestos: PUESTOS,
  centrosCostos: CENTROS_COSTOS,
  unidadesNegocio: UNIDADES_NEGOCIO,
  tiposBaja: TIPOS_BAJA,
  motivosBaja: MOTIVOS_BAJA,
  causasBaja: CAUSAS_BAJA,
  causasIMSS: CAUSAS_IMSS,
  modosIncap: MODOS_INCAP,
  concIncap: CONC_INCAP,
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString().split('T')[0]

function nextId(arr: { numero: number }[]): number {
  if (arr.length === 0) return 1
  return Math.max(...arr.map(x => x.numero)) + 1
}

// ─── STORE ────────────────────────────────────────────────────────────────────

export const useSCRHStore = create<SCRHStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ── EMPLEADOS CRUD ────────────────────────────────────────────────────

      addEmpleado: (emp) => {
        const existing = get().empleados.map(e => e.clave)
        const clave = emp.clave && emp.clave.trim() !== '' ? emp.clave : generarClave(existing)
        const salary = calcularSalario(
          emp.sueldo_mensual,
          get().empresas.find(e => e.clave === emp.empresa)?.periodo_pago ?? 'catorcenal',
        )
        const newEmp: Empleado = {
          ...emp,
          ...salary,
          clave,
          usuario: get().currentUser,
          ult_mod: now(),
        }
        set(s => ({ empleados: [...s.empleados, newEmp] }))
      },

      updateEmpleado: (clave, data) => {
        set(s => ({
          empleados: s.empleados.map(e =>
            e.clave === clave
              ? { ...e, ...data, ult_mod: now() }
              : e,
          ),
        }))
      },

      // ── ALTAS ─────────────────────────────────────────────────────────────

      addAltaProvisional: (alta) => {
        const rfcUpper = alta.rfc?.toUpperCase().trim()
        if (rfcUpper) {
          const duplicadoEmp = get().empleados.find(e => e.rfc?.toUpperCase() === rfcUpper && e.st !== 5)
          if (duplicadoEmp) return `RFC ya registrado: ${duplicadoEmp.nombre_completo} (${duplicadoEmp.clave})`
          const duplicadoAlta = get().altasProvisionales.find(a => a.rfc?.toUpperCase() === rfcUpper)
          if (duplicadoAlta) return `RFC ya tiene alta provisional #${duplicadoAlta.numero}`
        }
        const numero = nextId(get().altasProvisionales)
        set(s => ({
          altasProvisionales: [
            ...s.altasProvisionales,
            { ...alta, numero, fecha_captura: now(), usuario: get().currentUser },
          ],
        }))
        return null
      },

      updateAltaProvisional: (numero, data) => {
        set(s => ({
          altasProvisionales: s.altasProvisionales.map(a =>
            a.numero === numero ? { ...a, ...data } : a,
          ),
        }))
      },

      aprobarAlta: (numero) => {
        const alta = get().altasProvisionales.find(a => a.numero === numero)
        if (!alta) return

        const existing = get().empleados.map(e => e.clave)
        const clave = generarClave(existing)
        const empresa = get().empresas.find(e => e.clave === alta.empresa)
        const salary = calcularSalario(alta.sueldo_mensual, empresa?.periodo_pago ?? 'catorcenal')

        const newEmpleado: Empleado = {
          clave,
          a_paterno: alta.a_paterno,
          a_materno: alta.a_materno,
          nombre: alta.nombre,
          nombre_completo: alta.nombre_completo,
          rfc: alta.rfc,
          imss: alta.imss ?? '',
          curp: alta.curp ?? '',
          sexo: alta.sexo,
          f_nacimiento: alta.f_nacimiento,
          edad: new Date().getFullYear() - new Date(alta.f_nacimiento).getFullYear(),
          telefono: alta.telefono ?? '',
          tel_contacto: '',
          contacto: '',
          calle: '',
          colonia: '',
          cp: '',
          localidad: '',
          estado: '',
          rh: '',
          st: 1,
          alta: alta.fecha_ingreso,
          empresa: alta.empresa,
          depto: alta.depto,
          puesto: alta.puesto,
          ccostos: alta.ccostos,
          unidad_negocios: alta.unidad_negocios,
          jefe_inmed: alta.jefe_inmediato ?? '',
          ...salary,
          antiguedad: 0,
          fecha_contrato: alta.fecha_contrato,
          tipo_contrato: alta.tipo_contrato ?? 'Indefinido',
          banco: alta.banco ?? '',
          cuenta_bancaria: alta.cuenta_bancaria ?? '',
          clabe: alta.clabe ?? '',
          usuario: get().currentUser,
          ult_mod: now(),
        }

        const histEntry: HistorialPersonal = {
          numero: nextId(get().historialPersonal),
          clave,
          fecha: alta.fecha_ingreso,
          movimiento: 1,
          sueldo_inicial: 0,
          sueldo_final: alta.sueldo_mensual,
          puesto_inicial: 0,
          puesto_final: alta.puesto,
          depto_inicial: 0,
          depto_final: alta.depto,
          observaciones: `Alta procesada desde solicitud #${numero}`,
          usuario: get().currentUser,
        }

        set(s => ({
          empleados: [...s.empleados, newEmpleado],
          altasProvisionales: s.altasProvisionales.map(a =>
            a.numero === numero
              ? { ...a, status: 1, clave, fecha_procesada: now() }
              : a,
          ),
          historialPersonal: [...s.historialPersonal, histEntry],
        }))
      },

      // ── BAJAS ─────────────────────────────────────────────────────────────

      registrarBaja: (baja) => {
        const numero = nextId(get().bajas)
        const histNumero = nextId(get().historialPersonal)
        const emp = get().empleados.find(e => e.clave === baja.clave)

        const histEntry: HistorialPersonal = {
          numero: histNumero,
          clave: baja.clave,
          fecha: baja.fecha_baja,
          movimiento: 2,
          sueldo_inicial: emp?.sueldo_mensual ?? 0,
          sueldo_final: 0,
          puesto_inicial: emp?.puesto ?? 0,
          puesto_final: 0,
          depto_inicial: emp?.depto ?? 0,
          depto_final: 0,
          observaciones: baja.observaciones || 'Baja registrada en sistema',
          usuario: get().currentUser,
        }

        set(s => ({
          bajas: [
            ...s.bajas,
            { ...baja, numero, fecha_captura: now(), usuario: get().currentUser },
          ],
          empleados: s.empleados.map(e =>
            e.clave === baja.clave
              ? { ...e, st: 5, fecha_baja: baja.fecha_baja, causas_baja: baja.causa_detalle, ult_mod: now() }
              : e,
          ),
          historialPersonal: [...s.historialPersonal, histEntry],
        }))
      },

      updateBaja: (numero, data) => {
        set(s => ({
          bajas: s.bajas.map(b => b.numero === numero ? { ...b, ...data } : b),
        }))
      },

      addProspectoBaja: (p) => {
        const id = get().prospectosBaja.length > 0
          ? Math.max(...get().prospectosBaja.map(x => x.id)) + 1
          : 1
        set(s => ({ prospectosBaja: [...s.prospectosBaja, { ...p, id }] }))
      },

      updateProspectoBaja: (id, data) => {
        set(s => ({
          prospectosBaja: s.prospectosBaja.map(p => p.id === id ? { ...p, ...data } : p),
        }))
      },

      deleteProspectoBaja: (id) => {
        set(s => ({ prospectosBaja: s.prospectosBaja.filter(p => p.id !== id) }))
      },

      // ── ASISTENCIA ────────────────────────────────────────────────────────

      addRegistroAsistencia: (reg) => {
        set(s => ({ registrosAsistencia: [...s.registrosAsistencia, reg] }))
      },

      upsertRegistroAsistencia: (reg) => {
        set(s => {
          const exists = s.registrosAsistencia.some(r => r.id === reg.id)
          if (exists) {
            return { registrosAsistencia: s.registrosAsistencia.map(r => r.id === reg.id ? reg : r) }
          }
          return { registrosAsistencia: [...s.registrosAsistencia, reg] }
        })
      },

      deleteRegistroAsistencia: (id) => {
        set(s => ({ registrosAsistencia: s.registrosAsistencia.filter(r => r.id !== id) }))
      },

      // ── REINGRESOS ────────────────────────────────────────────────────────

      addReingreso: (sol) => {
        const numero = nextId(get().solicitudesReingreso)
        set(s => ({
          solicitudesReingreso: [
            ...s.solicitudesReingreso,
            { ...sol, numero, f_solicitud: now(), usuario: get().currentUser },
          ],
        }))
      },

      aprobarReingreso: (numero) => {
        const sol = get().solicitudesReingreso.find(s => s.numero === numero)
        if (!sol) return

        const emp = get().empleados.find(e => e.clave === sol.clave)
        const empresa = get().empresas.find(e => e.clave === sol.empresa)
        const salary = calcularSalario(sol.sueldo_mensual, empresa?.periodo_pago ?? 'catorcenal')

        const histEntry: HistorialPersonal = {
          numero: nextId(get().historialPersonal),
          clave: sol.clave,
          fecha: sol.f_reingreso,
          movimiento: 1,
          sueldo_inicial: 0,
          sueldo_final: sol.sueldo_mensual,
          puesto_inicial: emp?.puesto ?? 0,
          puesto_final: sol.puesto,
          depto_inicial: emp?.depto ?? 0,
          depto_final: sol.depto,
          observaciones: `Reingreso aprobado desde solicitud #${numero}`,
          usuario: get().currentUser,
        }

        set(s => ({
          empleados: s.empleados.map(e =>
            e.clave === sol.clave
              ? {
                  ...e,
                  st: 1,
                  empresa: sol.empresa,
                  depto: sol.depto,
                  puesto: sol.puesto,
                  ccostos: sol.ccostos,
                  unidad_negocios: sol.unidad_negocios,
                  alta: sol.f_reingreso,
                  fecha_contrato: sol.f_contrato,
                  fecha_baja: undefined,
                  causas_baja: undefined,
                  ...salary,
                  ult_mod: now(),
                }
              : e,
          ),
          solicitudesReingreso: s.solicitudesReingreso.map(sr =>
            sr.numero === numero ? { ...sr, status: 1 } : sr,
          ),
          historialPersonal: [...s.historialPersonal, histEntry],
        }))
      },

      // ── VACACIONES ────────────────────────────────────────────────────────

      addVacacion: (vac) => {
        const numero = nextId(get().vacaciones)
        set(s => ({
          vacaciones: [
            ...s.vacaciones,
            { ...vac, numero, fecha_captura: now(), usuario: get().currentUser },
          ],
        }))
      },

      deleteVacacion: (numero) => {
        set(s => ({ vacaciones: s.vacaciones.filter(v => v.numero !== numero) }))
      },

      // ── INCAPACIDADES ─────────────────────────────────────────────────────

      addIncapacidad: (inc) => {
        const numero = nextId(get().incapacidades)
        set(s => ({
          incapacidades: [
            ...s.incapacidades,
            { ...inc, numero, fecha_captura: now(), usuario: get().currentUser },
          ],
        }))
      },

      deleteIncapacidad: (numero) => {
        set(s => ({ incapacidades: s.incapacidades.filter(i => i.numero !== numero) }))
      },

      // ── LICENCIAS ─────────────────────────────────────────────────────────

      addLicencia: (lic) => {
        const numero = nextId(get().licencias)
        set(s => ({ licencias: [...s.licencias, { ...lic, numero }] }))
      },

      updateLicencia: (numero, data) => {
        set(s => ({
          licencias: s.licencias.map(l => l.numero === numero ? { ...l, ...data } : l),
        }))
      },

      deleteLicencia: (numero) => {
        set(s => ({ licencias: s.licencias.filter(l => l.numero !== numero) }))
      },

      // ── CURSOS ────────────────────────────────────────────────────────────

      addCursoPrograma: (curso) => {
        const numero = nextId(get().cursosProgramados)
        set(s => ({
          cursosProgramados: [
            ...s.cursosProgramados,
            { ...curso, numero, usuario: get().currentUser },
          ],
        }))
      },

      addAsistente: (asistente) => {
        const numero = nextId(get().asistentesCursos)
        set(s => ({
          asistentesCursos: [
            ...s.asistentesCursos,
            { ...asistente, numero, usuario: get().currentUser },
          ],
        }))
      },

      updateAsistente: (numero, data) => {
        set(s => ({
          asistentesCursos: s.asistentesCursos.map(a =>
            a.numero === numero ? { ...a, ...data } : a,
          ),
        }))
      },

      // ── HISTORIAL ─────────────────────────────────────────────────────────

      addHistorial: (h) => {
        const numero = nextId(get().historialPersonal)
        set(s => ({
          historialPersonal: [...s.historialPersonal, { ...h, numero }],
        }))
      },

      // ── EMPLEOS ANTERIORES ────────────────────────────────────────────────

      addEmpleoAnterior: (emp) => {
        const numero = nextId(get().empleosAnteriores)
        set(s => ({
          empleosAnteriores: [...s.empleosAnteriores, { ...emp, numero }],
        }))
      },

      deleteEmpleoAnterior: (numero) => {
        set(s => ({
          empleosAnteriores: s.empleosAnteriores.filter(e => e.numero !== numero),
        }))
      },

      // ── SESSION ───────────────────────────────────────────────────────────

      setCurrentUser: (user) => {
        set({ currentUser: user })
      },

      // ── HELPERS ───────────────────────────────────────────────────────────

      getEmpleado: (clave) => {
        return get().empleados.find(e => e.clave === clave)
      },

      getEmpleadoNombre: (clave) => {
        if (!clave || clave.trim() === '') return '—'
        const emp = get().empleados.find(e => e.clave === clave)
        return emp ? `${emp.nombre} ${emp.a_paterno} ${emp.a_materno}` : clave
      },

      getDepartamentoNombre: (clave) => {
        const dep = get().departamentos.find(d => d.clave === clave)
        return dep?.descripcion ?? String(clave)
      },

      getPuestoNombre: (clave) => {
        const pto = get().puestos.find(p => p.clave === clave)
        return pto?.descripcion ?? String(clave)
      },

      getEmpresaNombre: (clave) => {
        const emp = get().empresas.find(e => e.clave === clave)
        return emp?.razon_social ?? String(clave)
      },

      getCCostosNombre: (clave) => {
        const cc = get().centrosCostos.find(c => c.clave === clave)
        return cc?.descripcion ?? String(clave)
      },

      // ── RESET ─────────────────────────────────────────────────────────────

      resetData: () => {
        set(initialState)
      },
    }),
    {
      name: 'scrh-data',
      version: 7,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>
        // v < 3: campos faltantes del store
        if (version < 3) {
          if (!state.prospectosBaja) state.prospectosBaja = []
          if (!state.registrosAsistencia) state.registrosAsistencia = []
          if (!state.currentUser) state.currentUser = 'SISTEMA'
        }
        // v < 4: merge empleados seed — agrega cualquier empleado del seed que
        // no esté ya en el store (por clave). Preserva cambios a empleados existentes.
        if (version < 4) {
          const stored = (state.empleados as { clave: string }[]) ?? []
          const storedClaves = new Set(stored.map(e => e.clave))
          const missing = EMPLEADOS.filter(e => !storedClaves.has(e.clave))
          if (missing.length > 0) {
            state.empleados = [...stored, ...missing]
          }
        }
        // v < 5: Re-seed catalogs with real taxonomy
        if (version < 5) {
          state.departamentos = DEPARTAMENTOS
          state.puestos = PUESTOS
          state.centrosCostos = CENTROS_COSTOS
          state.unidadesNegocio = UNIDADES_NEGOCIO
        }
        // v >= 6: catalogs are excluded from persist via partialize — delete any
        // stale catalog keys so initialState (fresh mock-data) is used instead
        delete state.tiposBaja
        delete state.motivosBaja
        delete state.causasBaja
        delete state.causasIMSS
        delete state.modosIncap
        delete state.concIncap
        delete state.empresas
        delete state.departamentos
        delete state.puestos
        delete state.centrosCostos
        delete state.unidadesNegocio
        return state
      },
      partialize: (state) => ({
        empleados:            state.empleados,
        altasProvisionales:   state.altasProvisionales,
        bajas:                state.bajas,
        solicitudesReingreso: state.solicitudesReingreso,
        vacaciones:           state.vacaciones,
        incapacidades:        state.incapacidades,
        licencias:            state.licencias,
        cursosCatalogo:       state.cursosCatalogo,
        cursosProgramados:    state.cursosProgramados,
        asistentesCursos:     state.asistentesCursos,
        historialPersonal:    state.historialPersonal,
        empleosAnteriores:    state.empleosAnteriores,
        prospectosBaja:       state.prospectosBaja,
        registrosAsistencia:  state.registrosAsistencia,
        currentUser:          state.currentUser,
      }),
      onRehydrateStorage: () => (state) => {
        // Always overwrite catalogs with fresh mock-data after hydration
        if (state) {
          state.tiposBaja       = TIPOS_BAJA
          state.motivosBaja     = MOTIVOS_BAJA
          state.causasBaja      = CAUSAS_BAJA
          state.causasIMSS      = CAUSAS_IMSS
          state.modosIncap      = MODOS_INCAP
          state.concIncap       = CONC_INCAP
          state.empresas        = EMPRESAS
          state.departamentos   = DEPARTAMENTOS
          state.puestos         = PUESTOS
          state.centrosCostos   = CENTROS_COSTOS
          state.unidadesNegocio = UNIDADES_NEGOCIO
        }
      },
    },
  ),
)
