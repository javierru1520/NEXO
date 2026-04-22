"use client"

import { useState, useMemo, useRef, useEffect } from 'react'
import { useSCRHStore } from '@/store'
import { getEquipoCompleto } from '@/lib/org-tree'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  Truck, Users, CheckCircle2, XCircle, TrendingUp, ChevronLeft,
  ChevronRight, AlertTriangle, Clock, Search, Calendar, Plus,
  FileText, Upload, X, Check, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface Operador {
  id: string; nombre: string; coordinador: string; turno: string
  unidad: string; diasVacPendientes: number
}

interface FormField {
  name: string; label: string; type: string; required: boolean
  options?: string[]; showWhen?: { field: string; value: string }
}

interface FormSchema {
  id: string; label: string; button: string
  evidenciaLabel: string | null; evidenciaRequerida: boolean
  fields: FormField[]
}

interface RegistroAusencia {
  id: string; operadorId: string; incidenciaId: string
  fecha: string; obs: string; registradoPor: string
  nombreRegistra: string; detalles: Record<string, string>
}

interface DiaHistorial {
  fecha: string; activos: number; operaron: number
  noOperaron: number; pct: number; capturadas: number; pendientes: number
}

interface CatIncidencia {
  id: string; nombre: string; color: string; tipo: string
  impactoNomina: string; quienAutoriza: string
}

type VacStatus = 'solicitud_pendiente' | 'reprogramada' | 'respuesta_colaborador' | 'pendiente_auth' | 'autorizado' | 'rechazado'

interface SolicitudVacaciones {
  id: string; operadorId: string; incidenciaId: 'VACACIONES'
  fechaInicio: string; fechaFin: string; diasAusencia: number; diasDisponibles: number
  motivoAdicional?: string; fechaCaptura: string; status: VacStatus
  propuestaTentativa?: { fechaInicio: string; fechaFin: string; nota?: string }
  reprogramadoPor?: string; fechaReprogramacion?: string
  contrapropuesta?: { fechaInicio: string; fechaFin: string; nota?: string; fechaRespuesta: string }
  autorizadoCoord?: string; fechaAutorizacionCoord?: string
  autorizadoPor?: string; fechaAutorizacion?: string; motivoRechazo?: string
}

// ─── CATÁLOGO ─────────────────────────────────────────────────────────────────

const CATALOGO: CatIncidencia[] = [
  { id:'FALTA_INJ',   nombre:'Falta injustificada',        color:'#EF4444', tipo:'Ausentismo Incontrolable', impactoNomina:'Descuento',          quienAutoriza:'JT / GO / ADP / RL' },
  { id:'PERMISOS',    nombre:'Permisos',                   color:'#3B82F6', tipo:'Ausentismo Controlable',   impactoNomina:'Según tipo',         quienAutoriza:'JT / GO / ADP / RL' },
  { id:'VACACIONES',  nombre:'Vacaciones',                 color:'#10B981', tipo:'Ausentismo Controlable',   impactoNomina:'Con goce de sueldo', quienAutoriza:'JT / GO / ADP / RL' },
  { id:'SUSPENSION',  nombre:'Suspensión',                 color:'#DC2626', tipo:'Disciplina',               impactoNomina:'Sin pago',           quienAutoriza:'RL' },
  { id:'PROC_DEM',    nombre:'Proceso demanda',            color:'#7C3AED', tipo:'Ausentismo Controlable',   impactoNomina:'Según resolución',   quienAutoriza:'RL' },
  { id:'ACTA_DEF',    nombre:'Trámite acta de defunción',  color:'#64748B', tipo:'Ausentismo Controlable',   impactoNomina:'Con goce de sueldo', quienAutoriza:'RL / ADP' },
  { id:'TRAM_PEN',    nombre:'Trámite pensión',            color:'#0EA5E9', tipo:'Ausentismo Controlable',   impactoNomina:'TBD',                quienAutoriza:'RL / ADP' },
  { id:'INC',         nombre:'Incapacidad',                color:'#F97316', tipo:'Médica',                   impactoNomina:'Descuento',          quienAutoriza:'ADP / RL' },
  { id:'CONS_MED',    nombre:'Consulta médica',            color:'#F59E0B', tipo:'Médica',                   impactoNomina:'TBD',                quienAutoriza:'JT / GO / ADP / RL' },
  { id:'REST_MED',    nombre:'Restricción médica',         color:'#EC4899', tipo:'Médica',                   impactoNomina:'TBD',                quienAutoriza:'ADP / RL' },
  { id:'RETIRO_U',    nombre:'Retiro de unidad',           color:'#8B5CF6', tipo:'Operativa',                impactoNomina:'TBD',                quienAutoriza:'C / JT / GO' },
  { id:'ARR_CLI',     nombre:'Arranque de cliente',        color:'#059669', tipo:'Operativa',                impactoNomina:'TBD',                quienAutoriza:'GO / RL' },
  { id:'CIE_CAN',     nombre:'Cierre / Cancelación',       color:'#B45309', tipo:'Operativa',                impactoNomina:'TBD',                quienAutoriza:'GO / RL' },
  { id:'FESTIVO',     nombre:'Festivo',                    color:'#6366F1', tipo:'Ausentismo Controlable',   impactoNomina:'Con goce de sueldo', quienAutoriza:'JT / GO' },
  { id:'DESCANSO',    nombre:'Día de descanso',            color:'#A8A29E', tipo:'Ausentismo Controlable',   impactoNomina:'Con goce de sueldo', quienAutoriza:'JT / GO' },
  { id:'CAPACITACION',nombre:'En capacitación',            color:'#06B6D4', tipo:'CH',                       impactoNomina:'Pago',               quienAutoriza:'RL' },
  { id:'COMISION',    nombre:'Comisión interna',           color:'#84CC16', tipo:'CH',                       impactoNomina:'Pago',               quienAutoriza:'GO' },
  { id:'PERM_SIN',    nombre:'Permiso sindical',           color:'#C084FC', tipo:'CH',                       impactoNomina:'Pago',               quienAutoriza:'RL' },
]
const catMap = Object.fromEntries(CATALOGO.map(c => [c.id, c]))

// Grupos para el menú
const GRUPOS_INC = [
  { label: 'Ausentismo', ids: ['FALTA_INJ','PERMISOS','VACACIONES','SUSPENSION','FESTIVO','DESCANSO'] },
  { label: 'Médica',     ids: ['INC','CONS_MED','REST_MED'] },
  { label: 'Legal / HR', ids: ['PROC_DEM','ACTA_DEF','TRAM_PEN','PERM_SIN'] },
  { label: 'Operativa',  ids: ['RETIRO_U','ARR_CLI','CIE_CAN'] },
  { label: 'Capital H.', ids: ['CAPACITACION','COMISION'] },
]

const NOMENCLATURA: Record<string, string> = {
  C:   'Coordinador / Jefe de área',
  JT:  'Jefe de Transportación / Operaciones',
  GO:  'Gerente de Transportación / Operaciones',
  ADP: 'Especialista de Administración de Personal',
  RL:  'Especialista de Relaciones Laborales',
  SM:  'Servicio Médico',
  L:   'Legal',
}

// ─── FORM SCHEMAS (18 tipos) ──────────────────────────────────────────────────

const FORM_SCHEMAS: FormSchema[] = [
  {
    id:'FALTA_INJ', label:'Falta injustificada', button:'Registrar falta injustificada',
    evidenciaLabel: null, evidenciaRequerida: false,
    fields:[
      { name:'rutaAfectada',      label:'Ruta afectada',                  type:'text',     required:true  },
      { name:'horaDebioPresent',  label:'Hora en que debió presentarse',  type:'time',     required:true  },
      { name:'seLocalizo',        label:'¿Se localizó al operador?',      type:'boolean',  required:true  },
      { name:'medioContacto',     label:'Medio de intento de contacto',   type:'select',   required:true,
        options:['Llamada telefónica','WhatsApp','Radio','En persona','No se intentó'] },
      { name:'telefonoContacto',  label:'Teléfono al que se contactó',    type:'text',     required:false },
      { name:'siSePresento',      label:'¿Sí se presentó?',              type:'boolean',  required:false },
      { name:'horaInicioReal',    label:'Hora en que inició a trabajar',  type:'time',     required:false },
      { name:'vaARegresar',       label:'¿Va a regresar?',               type:'boolean',  required:false },
      { name:'comentarios',       label:'Comentarios',                    type:'textarea', required:false },
    ],
  },
  {
    id:'PERMISOS', label:'Permisos', button:'Registrar permiso',
    evidenciaLabel:'Formato de permiso', evidenciaRequerida:true,
    fields:[
      { name:'tipo', label:'Tipo de permiso', type:'select', required:true,
        options:['Permiso sin goce','Permiso con goce'] },
      { name:'motivoGoce', label:'Motivo del permiso con goce', type:'select', required:true,
        options:['Paternidad','Defunción','Matrimonio','Tema legal','Actividad cívica'],
        showWhen:{ field:'tipo', value:'Permiso con goce' } },
      { name:'diaCompleto',  label:'¿Día completo?',           type:'boolean', required:false },
      { name:'fechaFin',     label:'Fecha fin (si aplica)',     type:'date',    required:false },
      { name:'diasNum',      label:'Número de días',            type:'number',  required:true  },
      { name:'fechaRegreso', label:'Día de regreso a trabajar', type:'date',    required:true  },
      { name:'motivo',       label:'Motivo / justificación',   type:'textarea',required:true  },
    ],
  },
  {
    id:'VACACIONES', label:'Vacaciones', button:'Registrar vacaciones',
    evidenciaLabel:'Solicitud de vacaciones', evidenciaRequerida:true,
    fields:[
      { name:'tipo',         label:'Tipo',                        type:'select', required:true,
        options:['Vacaciones','Anticipo de vacaciones'] },
      { name:'fechaInicio',  label:'Inicio de vacaciones',        type:'date',   required:true  },
      { name:'fechaFin',     label:'Fecha fin de vacaciones',     type:'date',   required:true  },
      { name:'fechaRegreso', label:'Día de regreso a trabajar',   type:'date',   required:true  },
      { name:'diasNum',      label:'Número de días',              type:'number', required:true  },
    ],
  },
  {
    id:'SUSPENSION', label:'Suspensión', button:'Levantar caso de suspensión',
    evidenciaLabel:'Acta administrativa', evidenciaRequerida:true,
    fields:[
      { name:'diasSuspension',    label:'Días de suspensión',           type:'number',   required:true  },
      { name:'fechaInicio',       label:'Fecha de inicio',              type:'date',     required:true  },
      { name:'fechaFin',          label:'Fecha de fin',                 type:'date',     required:true  },
      { name:'fechaRegreso',      label:'Día de regreso a trabajar',    type:'date',     required:true  },
      { name:'esReincidencia',    label:'¿Es reincidencia?',            type:'boolean',  required:true  },
      { name:'numeroReincidencia',label:'Número de reincidencia',       type:'number',   required:true,
        showWhen:{ field:'esReincidencia', value:'true' } },
      { name:'motivoSuspension',  label:'Motivo',                       type:'text',     required:true  },
      { name:'descripcionHechos', label:'Descripción de hechos',        type:'textarea', required:true  },
    ],
  },
  {
    id:'PROC_DEM', label:'Proceso demanda', button:'Levantar caso legal',
    evidenciaLabel:'Documento legal', evidenciaRequerida:true,
    fields:[
      { name:'tipoAsunto', label:'Tipo de asunto', type:'select', required:true,
        options:['Demanda laboral','Presentación ante la autoridad','Citatorio laboral','Citatorio civil','Medidas precautorias','Otro'] },
      { name:'fechaRecepcion',    label:'Fecha de recepción',   type:'date',     required:true },
      { name:'fechaCaptura',      label:'Fecha de captura',     type:'date',     required:true },
      { name:'fechaDiligencia',   label:'Fecha de diligencia',  type:'date',     required:true },
      { name:'descripcionAsunto', label:'Breve descripción',    type:'textarea', required:true },
    ],
  },
  {
    id:'ACTA_DEF', label:'Trámite acta de defunción', button:'Registrar trámite de acta de defunción',
    evidenciaLabel:'Acta de defunción', evidenciaRequerida:true,
    fields:[
      { name:'fechaDefuncion', label:'Fecha de defunción', type:'date',     required:true  },
      { name:'fechaCaptura',   label:'Fecha de captura',   type:'date',     required:true  },
      { name:'folioActa',      label:'Folio del acta',     type:'text',     required:false },
      { name:'observaciones',  label:'Observaciones',      type:'textarea', required:false },
    ],
  },
  {
    id:'TRAM_PEN', label:'Trámite pensión', button:'Registrar trámite de pensión',
    evidenciaLabel:'Documentación IMSS', evidenciaRequerida:true,
    fields:[
      { name:'tipoTramite', label:'Tipo de trámite', type:'select', required:true,
        options:['Pensión por vejez','Pensión por invalidez','Pensión por enfermedad general','Pensión por enfermedad de trabajo','Pensión por riesgo de trabajo','Otro'] },
      { name:'etapaTramite', label:'Etapa del trámite', type:'select', required:true,
        options:['Inicio','En proceso','Dictamen','Resolución','Finalizado'] },
    ],
  },
  {
    id:'INC', label:'Incapacidad', button:'Registrar incapacidad',
    evidenciaLabel:'Certificado IMSS / Dictamen médico', evidenciaRequerida:true,
    fields:[
      { name:'clasificacion', label:'Clasificación de incapacidad', type:'select', required:true,
        options:['Inicial','Subsecuente'] },
      { name:'tipoIncapacidad', label:'Tipo de incapacidad', type:'select', required:true,
        options:['Enfermedad general','Riesgo de trabajo','Maternidad','Interna / dictamen médico','Psicosocial'] },
      { name:'fechaRecepcion',       label:'Fecha de recepción',          type:'date',     required:true  },
      { name:'fechaCaptura',         label:'Fecha de captura',            type:'date',     required:true  },
      { name:'fechaInicio',          label:'Fecha de inicio',             type:'date',     required:true  },
      { name:'fechaFin',             label:'Fecha fin',                   type:'date',     required:true  },
      { name:'fechaRegreso',         label:'Fecha de regreso a trabajar', type:'date',     required:true  },
      { name:'diasNum',              label:'Número de días',              type:'number',   required:true  },
      { name:'folioIMSS',            label:'Folio IMSS (si aplica)',      type:'text',     required:false },
      { name:'descripcionIncidente', label:'Descripción / notas',         type:'textarea', required:false },
      { name:'duranteServicio',      label:'¿Ocurrió en la jornada laboral?', type:'boolean', required:false },
    ],
  },
  {
    id:'CONS_MED', label:'Consulta médica', button:'Registrar consulta médica',
    evidenciaLabel:'Comprobante', evidenciaRequerida:true,
    fields:[
      { name:'horaSalida',    label:'Hora salida',       type:'time',    required:true  },
      { name:'horaRegreso',   label:'Hora regreso',      type:'time',    required:false },
      { name:'perdioServicio',label:'¿Perdió servicio?', type:'boolean', required:true  },
      { name:'tipoConsulta',  label:'Tipo de consulta',  type:'select',  required:true,
        options:['IMSS','Particular','Urgencias','Interno','Revaloración'] },
    ],
  },
  {
    id:'REST_MED', label:'Restricción médica', button:'Registrar restricción médica',
    evidenciaLabel:'Dictamen', evidenciaRequerida:true,
    fields:[
      { name:'tipoRestriccion',         label:'Tipo de restricción',       type:'text',     required:true },
      { name:'vigencia',                label:'Vigencia',                  type:'text',     required:true },
      { name:'actividadesNoPermitidas', label:'Actividades no permitidas', type:'textarea', required:true },
    ],
  },
  {
    id:'RETIRO_U', label:'Retiro de unidad', button:'Registrar retiro de unidad',
    evidenciaLabel:'Reporte operación', evidenciaRequerida:false,
    fields:[
      { name:'horaRetiro',     label:'Hora del retiro', type:'time', required:true },
      { name:'unidadRetirada', label:'Unidad retirada', type:'text', required:true },
      { name:'rutaAfectada',   label:'Ruta afectada',   type:'text', required:true },
      { name:'motivoRetiro',   label:'Motivo del retiro', type:'select', required:true,
        options:['Reasignación por indisciplina','Cambio de modelo','Mantenimiento','Diferencias en combustible','Siniestro por operación','Para eficiencia de kilometraje','Abandono de unidad (ausentismo)','Capacitación'] },
      { name:'seReemplazoUnidad',    label:'¿Se reemplazó la unidad?',               type:'boolean', required:true  },
      { name:'unidadLlega',          label:'¿Cuál es la unidad que llega?',          type:'text',    required:true, showWhen:{ field:'seReemplazoUnidad', value:'true' } },
      { name:'fechaAsignacionNueva', label:'Fecha de asignación de la nueva unidad', type:'date',    required:true, showWhen:{ field:'seReemplazoUnidad', value:'true' } },
      { name:'reasignacionActividades', label:'Reasignación de actividades', type:'select', required:false,
        options:['Operador de patio','Apoyo en logística de combustible','Funciones administrativas','Envío a casa'] },
    ],
  },
  {
    id:'CAPACITACION', label:'Operador en capacitación', button:'Registrar capacitación',
    evidenciaLabel:'Lista de asistencia', evidenciaRequerida:true,
    fields:[
      { name:'tipoCapacitacion', label:'Tipo de capacitación', type:'text',    required:true },
      { name:'horario',          label:'Horario',              type:'text',    required:true },
      { name:'instructorArea',   label:'Instructor / área',    type:'text',    required:true },
      { name:'fueProgramada',    label:'¿Fue programada?',     type:'boolean', required:true },
    ],
  },
  {
    id:'COMISION', label:'Comisión interna', button:'Registrar comisión interna',
    evidenciaLabel: null, evidenciaRequerida:false,
    fields:[
      { name:'motivoComision', label:'Motivo de la comisión', type:'select', required:true,
        options:['Traer unidad','Llevar unidad','Apoyo en otras UN'] },
      { name:'lugarSalida',     label:'Lugar de salida',                   type:'text', required:true },
      { name:'lugarLlegada',    label:'Lugar de llegada',                  type:'text', required:true },
      { name:'responsable',     label:'Responsable del traslado / apoyo',  type:'text', required:true },
      { name:'areaSolicitante', label:'Área solicitante',                  type:'text', required:true },
      { name:'horario',         label:'Horario',                           type:'text', required:true },
    ],
  },
  {
    id:'ARR_CLI', label:'Arranque de cliente', button:'Registrar arranque de cliente',
    evidenciaLabel: null, evidenciaRequerida:false,
    fields:[
      { name:'cliente',                 label:'Cliente',                        type:'text',     required:true  },
      { name:'fechaAsignacion',         label:'Fecha de asignación',            type:'date',     required:true  },
      { name:'fechaTentativaArranque',  label:'Fecha tentativa de arranque',    type:'date',     required:true  },
      { name:'fechaRealArranque',       label:'Fecha real de arranque',         type:'date',     required:false },
      { name:'ruta',                    label:'Ruta',                           type:'text',     required:true  },
      { name:'comentarios',             label:'Comentarios',                    type:'textarea', required:false },
    ],
  },
  {
    id:'CIE_CAN', label:'Cierre / Cancelación de servicio', button:'Registrar cierre o cancelación',
    evidenciaLabel: null, evidenciaRequerida:false,
    fields:[
      { name:'tipoMovimiento', label:'¿Qué fue?', type:'select', required:true,
        options:['Cliente','Servicio'] },
      { name:'cliente',       label:'Cliente',           type:'text',     required:true },
      { name:'fechaCaptura',  label:'Fecha de captura',  type:'date',     required:true },
      { name:'fechaEfectiva', label:'Fecha efectiva',    type:'date',     required:true },
      { name:'ruta',          label:'Ruta / Servicio',   type:'text',     required:true },
      { name:'motivo',        label:'Motivo',            type:'textarea', required:true },
    ],
  },
  {
    id:'FESTIVO', label:'Festivo', button:'Registrar día festivo',
    evidenciaLabel: null, evidenciaRequerida:false,
    fields:[
      { name:'fechaFestivo', label:'Fecha del día festivo', type:'date',     required:true  },
      { name:'descripcion',  label:'Descripción',           type:'text',     required:true  },
      { name:'comentarios',  label:'Comentarios',           type:'textarea', required:false },
    ],
  },
  {
    id:'DESCANSO', label:'Día de descanso', button:'Registrar día de descanso',
    evidenciaLabel: null, evidenciaRequerida:false,
    fields:[
      { name:'tipoDescanso', label:'Tipo de descanso', type:'select', required:true,
        options:['Descanso semanal','Día festivo','Descanso compensatorio'] },
      { name:'fechaDescanso', label:'Fecha de descanso', type:'date',     required:true  },
      { name:'comentarios',   label:'Comentarios',       type:'textarea', required:false },
    ],
  },
  {
    id:'PERM_SIN', label:'Permiso sindical', button:'Registrar permiso sindical',
    evidenciaLabel:'Oficio sindicato', evidenciaRequerida:true,
    fields:[
      { name:'fechaInicio', label:'Fecha inicio', type:'date',   required:true },
      { name:'fechaFin',    label:'Fecha fin',    type:'date',   required:true },
      { name:'horario',     label:'Horario',      type:'text',   required:true },
      { name:'motivo',      label:'Motivo', type:'select', required:true,
        options:['Comisión sindical'] },
    ],
  },
]

const schemaMap = Object.fromEntries(FORM_SCHEMAS.map(s => [s.id, s]))

// opMap y OPERADORES se calculan dinámicamente en AsistenciaPage y se pasan como props
type OpMap = Record<string, Operador>

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().split('T')[0] }

function addDaysStr(s: string, n: number) {
  const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function formatFecha(s: string) {
  const [y,m,d] = s.split('-')
  const M = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${parseInt(d)} ${M[parseInt(m)-1]} ${y}`
}

function diaSemana(s: string) {
  return ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][new Date(s+'T12:00:00').getDay()]
}

function generarHistorial(): DiaHistorial[] {
  const dias: DiaHistorial[] = []
  const hoy = new Date()
  for (let d = 180; d >= 1; d--) {
    const f = new Date(hoy); f.setDate(f.getDate() - d)
    if (f.getDay() === 0 || f.getDay() === 6) continue
    const seed = (d * 7 + 13) % 20
    const noOp = 6 + (seed % 12)
    const op = 80 - noOp
    const cap = noOp - (seed % 4)
    dias.push({
      fecha: f.toISOString().split('T')[0],
      activos: 80, operaron: op, noOperaron: noOp,
      pct: parseFloat(((op/80)*100).toFixed(1)),
      capturadas: cap, pendientes: noOp - cap,
    })
  }
  return dias
}
const HISTORIAL = generarHistorial()

// ─── MOTIVO BADGE ─────────────────────────────────────────────────────────────

function MotivoBadge({ incId }: { incId: string }) {
  const inc = catMap[incId]; if (!inc) return null
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap border"
      style={{ background:`${inc.color}18`, borderColor:`${inc.color}40`, color:inc.color }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background:inc.color }} />
      {inc.nombre}
    </span>
  )
}

// ─── FORM FIELD ───────────────────────────────────────────────────────────────

function FieldInput({ field, value, onChange, error }: {
  field: FormField; value: string; onChange: (v:string) => void; error?: boolean
}) {
  const base = `w-full text-xs rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white ${error ? 'border-red-400' : 'border-gray-200'}`

  if (field.type === 'boolean') return (
    <div className="flex gap-4">
      {(['true','false'] as const).map(v => (
        <label key={v} className="flex items-center gap-2 cursor-pointer text-xs">
          <input type="radio" name={`f-${field.name}`} value={v} checked={value===v} onChange={() => onChange(v)} className="accent-indigo-600" />
          {v === 'true' ? 'Sí' : 'No'}
        </label>
      ))}
    </div>
  )
  if (field.type === 'select') return (
    <select className={base} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">— Seleccionar —</option>
      {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
  if (field.type === 'textarea') return (
    <textarea className={`${base} min-h-[64px] resize-none`} value={value} onChange={e => onChange(e.target.value)} rows={3} />
  )
  return (
    <input type={field.type === 'number' ? 'number' : field.type} className={base} value={value}
      min={field.type === 'number' ? 0 : undefined}
      onChange={e => onChange(e.target.value)} />
  )
}

// ─── FORMULARIO DE INCIDENCIA ─────────────────────────────────────────────────

function FormIncidencia({ schema, registros, operadores, opMap, onGuardar, onCancel, initialOpId }: {
  schema: FormSchema
  registros: RegistroAusencia[]
  operadores: Operador[]
  opMap: OpMap
  onGuardar: (r: RegistroAusencia) => void
  onCancel: () => void
  initialOpId?: string
}) {
  const cat = catMap[schema.id]
  const color = cat?.color || '#6366F1'
  const today = todayStr()

  const [opSearch, setOpSearch]   = useState('')
  const [opId, setOpId]           = useState(initialOpId ?? '')
  const [showList, setShowList]   = useState(false)
  const [fecha, setFecha]         = useState(today)
  const [regPor, setRegPor]       = useState('')
  const [nombreReg, setNombreReg] = useState('')
  const [observ, setObs]          = useState('')
  const [fvals, setFvals]         = useState<Record<string,string>>(
    Object.fromEntries(schema.fields.map(f => [f.name, '']))
  )
  const [errors, setErrors]   = useState<Record<string,boolean>>({})
  const [archivos, setArchivos] = useState<File[]>([])
  const [alert8va, setAlert8va] = useState(false)
  const [saved, setSaved]       = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const selectedOp = opId ? opMap[opId] : null

  const filteredOps = useMemo(() => {
    if (opSearch.length < 2) return []
    const q = opSearch.toLowerCase()
    return operadores.filter(o =>
      o.nombre.toLowerCase().includes(q) || o.id.toLowerCase().includes(q)
    ).slice(0, 20)
  }, [opSearch])

  const setF = (name: string, val: string) => {
    setFvals(p => ({ ...p, [name]: val }))
    setErrors(p => ({ ...p, [name]: false }))
  }

  const validate = () => {
    const e: Record<string,boolean> = {}
    if (!opId) e.opId = true
    if (!fecha) e.fecha = true
    if (!regPor) e.regPor = true
    if (!nombreReg.trim()) e.nombreReg = true
    schema.fields.forEach(f => {
      if (f.showWhen && fvals[f.showWhen.field] !== f.showWhen.value) return
      if (f.required && !fvals[f.name]) e[f.name] = true
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleGuardar = () => {
    if (!validate()) return
    const reg: RegistroAusencia = {
      id: `reg-${Date.now()}`,
      operadorId: opId, incidenciaId: schema.id,
      fecha, registradoPor: regPor, nombreRegistra: nombreReg,
      obs: observ, detalles: { ...fvals },
    }
    setSaved(true)
    setTimeout(() => { onGuardar(reg); setSaved(false) }, 900)
  }

  if (saved) return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <p className="text-sm font-bold text-gray-800">Incidencia registrada correctamente</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header del tipo */}
      <div className="rounded-xl px-4 py-3 border-l-4 flex items-start justify-between"
        style={{ background:`${color}08`, borderLeftColor:color }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background:color }} />
            <span className="text-sm font-bold" style={{ color }}>{schema.label}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold"
              style={{ background:`${color}15`, color, borderColor:`${color}40` }}>
              {cat?.tipo}
            </span>
          </div>
          {cat && <p className="text-[11px] text-gray-500 mt-1">Nómina: <strong>{cat.impactoNomina}</strong> · Autoriza: <strong>{cat.quienAutoriza}</strong></p>}
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Operador */}
      <div className="relative">
        <label className="block text-xs font-semibold text-gray-700 mb-1">Colaborador *</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            className={`w-full pl-8 pr-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-300 ${errors.opId ? 'border-red-400' : 'border-gray-200'}`}
            placeholder="Buscar por nombre o ID (mín. 2 chars)..."
            value={selectedOp ? `${selectedOp.nombre} — ${selectedOp.id}` : opSearch}
            onChange={e => { setOpSearch(e.target.value); setOpId(''); setShowList(true); setErrors(p=>({...p,opId:false})) }}
            onFocus={() => setShowList(true)}
            onBlur={() => setTimeout(() => setShowList(false), 150)}
            autoComplete="off"
          />
        </div>
        {errors.opId && <p className="text-[10px] text-red-500 mt-1">Selecciona un colaborador</p>}
        {showList && filteredOps.length > 0 && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
            {filteredOps.map(op => (
              <button key={op.id} type="button"
                className="w-full text-left px-3 py-2 hover:bg-indigo-50 border-b border-gray-50 last:border-0 transition-colors"
                onMouseDown={() => {
                  setOpId(op.id); setOpSearch(''); setShowList(false)
                  if (schema.id === 'FALTA_INJ') {
                    const cnt = registros.filter(r => r.operadorId===op.id && r.incidenciaId==='FALTA_INJ').length
                    if (cnt >= 7) setAlert8va(true)
                  }
                }}>
                <span className="text-xs font-semibold text-gray-800">{op.nombre}</span>
                <span className="text-[10px] text-gray-400 ml-2">{op.id} · {op.turno} · {op.coordinador.split(' ').pop()}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info vacaciones */}
      {schema.id === 'VACACIONES' && selectedOp && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-center gap-2">
          <span>🏖️</span>
          <span><strong>{selectedOp.nombre}</strong> tiene <strong>{selectedOp.diasVacPendientes} días disponibles</strong></span>
        </div>
      )}

      {/* Fecha */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha *</label>
        <input type="date" value={fecha} onChange={e => { setFecha(e.target.value); setErrors(p=>({...p,fecha:false})) }}
          className={`w-full text-xs rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${errors.fecha ? 'border-red-400' : 'border-gray-200'}`} />
      </div>

      {/* Campos del schema */}
      <div className="grid grid-cols-2 gap-3">
        {schema.fields.map(f => {
          if (f.showWhen && fvals[f.showWhen.field] !== f.showWhen.value) return null
          const isWide = f.type === 'textarea' || f.name.toLowerCase().includes('descripcion') || f.name.toLowerCase().includes('comentarios') || f.name.toLowerCase().includes('motivo')
          return (
            <div key={f.name} className={isWide ? 'col-span-2' : ''}>
              <label className={`block text-xs font-semibold text-gray-700 mb-1 ${f.required ? "after:content-['*'] after:text-red-500 after:ml-0.5" : ''}`}>{f.label}</label>
              <FieldInput field={f} value={fvals[f.name]} onChange={v => setF(f.name, v)} error={errors[f.name]} />
              {errors[f.name] && <p className="text-[10px] text-red-500 mt-0.5">Campo requerido</p>}
            </div>
          )
        })}
      </div>

      {/* Evidencia */}
      {schema.evidenciaRequerida && schema.evidenciaLabel && (
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            📎 Evidencia — {schema.evidenciaLabel} *
          </label>
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${archivos.length > 0 ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
            <input ref={fileRef} type="file" multiple className="hidden"
              onChange={e => setArchivos(Array.from(e.target.files || []))} />
            {archivos.length === 0 ? (
              <div className="space-y-1">
                <Upload className="w-6 h-6 text-gray-400 mx-auto" />
                <p className="text-xs text-gray-500">Haz clic para seleccionar archivos</p>
                <p className="text-[10px] text-gray-400">PDF, imagen, Word, etc.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {archivos.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-green-700 bg-white rounded-lg px-2 py-1 border border-green-200">
                    <FileText className="w-3 h-3 shrink-0" />
                    <span className="flex-1 truncate text-left">{f.name}</span>
                    <span className="text-[10px] text-gray-400">{(f.size/1024).toFixed(0)} KB</span>
                  </div>
                ))}
                <p className="text-[10px] text-green-600 mt-1">Clic para cambiar archivos</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Registrado por */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Registrado por *</label>
          <select value={regPor} onChange={e => { setRegPor(e.target.value); setErrors(p=>({...p,regPor:false})) }}
            className={`w-full text-xs rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${errors.regPor ? 'border-red-400' : 'border-gray-200'}`}>
            <option value="">— Seleccionar rol —</option>
            {Object.entries(NOMENCLATURA).map(([k,v]) => <option key={k} value={k}>{k} — {v}</option>)}
          </select>
          {errors.regPor && <p className="text-[10px] text-red-500 mt-0.5">Campo requerido</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre de quien registra *</label>
          <input type="text" value={nombreReg}
            onChange={e => { setNombreReg(e.target.value); setErrors(p=>({...p,nombreReg:false})) }}
            placeholder="Tu nombre completo..."
            className={`w-full text-xs rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${errors.nombreReg ? 'border-red-400' : 'border-gray-200'}`} />
          {errors.nombreReg && <p className="text-[10px] text-red-500 mt-0.5">Campo requerido</p>}
        </div>
      </div>

      {/* Observaciones */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Observaciones</label>
        <textarea value={observ} onChange={e => setObs(e.target.value)} rows={2}
          placeholder="Notas adicionales..."
          className="w-full text-xs rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" className="font-bold text-white" style={{ background:color }} onClick={handleGuardar}>
          {schema.button}
        </Button>
      </div>

      {/* Alerta 8va falta */}
      {alert8va && selectedOp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-[90%] max-w-md shadow-2xl overflow-hidden">
            <div className="bg-red-600 px-6 py-4 flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-white font-bold">8va Falta Injustificada — Baja Procedente</p>
                <p className="text-red-200 text-xs mt-0.5">Alerta de Capital Humano</p>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-gray-700"><strong>{selectedOp.nombre}</strong> ya alcanzó el límite de <strong>8 faltas injustificadas</strong> según política interna.</p>
              <p className="text-sm text-gray-600">Se requiere iniciar el proceso de <strong className="text-red-600">baja del colaborador</strong>.</p>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => { setAlert8va(false); setOpId(''); setOpSearch('') }}>
                  Cancelar registro
                </Button>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white font-bold"
                  onClick={() => setAlert8va(false)}>
                  Registrar de todos modos
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SELECTOR DE TIPO DE INCIDENCIA ──────────────────────────────────────────

function SelectorTipo({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">Selecciona el tipo de incidencia a registrar:</p>
      {GRUPOS_INC.map(grupo => (
        <div key={grupo.label}>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{grupo.label}</p>
          <div className="grid grid-cols-2 gap-2">
            {grupo.ids.map(id => {
              const cat = catMap[id]
              if (!cat) return null
              return (
                <button key={id} onClick={() => onSelect(id)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border hover:border-indigo-300 hover:bg-indigo-50/40 transition-all text-left group"
                  style={{ borderColor:`${cat.color}30`, background:`${cat.color}06` }}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background:cat.color }} />
                  <span className="text-xs font-semibold text-gray-700 group-hover:text-indigo-700">{cat.nombre}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── CIERRE DEL DÍA ───────────────────────────────────────────────────────────

function PanelItemJT({ sol, onAutorizar, onRechazar, opMap }: {
  sol: SolicitudVacaciones
  onAutorizar: (id: string) => void
  onRechazar: (id: string, motivo: string) => void
  opMap: OpMap
}) {
  const [rechazando, setRechazando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const op = opMap[sol.operadorId]
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-amber-200 flex items-center justify-center text-[10px] font-bold text-amber-800 shrink-0">
            {op?.nombre?.split(' ').map((n:string)=>n[0]).join('').slice(0,2) || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{op?.nombre || sol.operadorId}</p>
            <p className="text-[10px] text-gray-400">{sol.fechaInicio} → {sol.fechaFin} · {sol.diasAusencia}d · aprobado por {sol.autorizadoCoord}</p>
          </div>
        </div>
        {!rechazando && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => setRechazando(true)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors">
              ✗ Rechazar
            </button>
            <button onClick={() => onAutorizar(sol.id)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">
              ✓ Autorizar
            </button>
          </div>
        )}
      </div>
      {rechazando && (
        <div className="mt-2 flex gap-2">
          <input value={motivo} onChange={e => setMotivo(e.target.value)}
            placeholder="Motivo (opcional)…"
            className="flex-1 text-[11px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-300" />
          <button onClick={() => setRechazando(false)}
            className="text-[11px] px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">Cancelar</button>
          <button onClick={() => { onRechazar(sol.id, motivo); setRechazando(false) }}
            className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700">Confirmar</button>
        </div>
      )}
    </div>
  )
}

function CierreDelDia({ registros, operadores, opMap, rol, solicitudesVac, onIrAutorizaciones, onAutorizarJT, onRechazarJT, clavesConViajeProp, bustraxLoadingProp, onRegistrar }: {
  registros: RegistroAusencia[]
  operadores: Operador[]
  opMap: OpMap
  rol: 'C' | 'JT' | null
  solicitudesVac: SolicitudVacaciones[]
  onIrAutorizaciones: () => void
  onAutorizarJT: (id: string) => void
  onRechazarJT: (id: string, motivo: string) => void
  clavesConViajeProp: Set<string>
  bustraxLoadingProp: boolean
  onRegistrar: (opId: string) => void
}) {
  const today = todayStr()
  const minFecha = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  }, [])
  const [fecha, setFecha]         = useState(today)
  const [busqueda, setBusqueda]   = useState('')
  const [filtroCoord, setFiltroCoord] = useState('Todos')
  const esHoy = fecha === today

  // ── Bustrax histórico: caché por fecha ────────────────────────────────────
  const bustraxCache = useRef<Record<string, { clavesViaje: Set<string>; faltas: number }>>({})
  const [bustraxFecha, setBustraxFecha] = useState<{ clavesViaje: Set<string>; faltas: number } | null>(null)
  const [bustraxFechaLoading, setBustraxFechaLoading] = useState(false)

  useEffect(() => {
    if (esHoy) { setBustraxFecha(null); return }
    if (bustraxCache.current[fecha]) { setBustraxFecha(bustraxCache.current[fecha]); return }
    setBustraxFechaLoading(true)
    Promise.all([
      fetch(`/api/bustrax/viajes?unidad=8&fechaini=${fecha}&fechafin=${fecha}`).then(r => r.json()).catch(() => null),
      fetch(`/api/bustrax/faltas?unidad=8&fechaini=${fecha}&fechafin=${fecha}`).then(r => r.json()).catch(() => null),
    ]).then(([vData, fData]) => {
      const claves = new Set<string>(
        Array.isArray(vData)
          ? vData.filter((v: { noEmpleado: string | null }) => v.noEmpleado).map((v: { noEmpleado: string }) => v.noEmpleado)
          : []
      )
      const faltas = Array.isArray(fData) ? fData.length : 0
      const result = { clavesViaje: claves, faltas }
      bustraxCache.current[fecha] = result
      setBustraxFecha(result)
    }).finally(() => setBustraxFechaLoading(false))
  }, [fecha, esHoy])

  // Registros del día seleccionado (reales)
  const regsHoyFull = useMemo(() => {
    const map: Record<string, RegistroAusencia> = {}
    registros.filter(r => r.fecha === fecha).forEach(r => { map[r.operadorId] = r })
    return map
  }, [registros, fecha])

  const stats = useMemo(() => {
    const total = operadores.length
    if (esHoy) {
      if (clavesConViajeProp.size > 0) {
        const operaron = operadores.filter(o => clavesConViajeProp.has(o.id)).length
        return { activos: total, operaron, noOperaron: total - operaron, source: 'bustrax' as const }
      }
      const noOp = Object.keys(regsHoyFull).length
      return { activos: total, operaron: total - noOp, noOperaron: noOp, source: 'local' as const }
    }
    if (bustraxFecha) {
      const operaron = operadores.filter(o => bustraxFecha.clavesViaje.has(o.id)).length
      return { activos: total, operaron, noOperaron: total - operaron, source: 'bustrax' as const }
    }
    return { activos: total, operaron: total, noOperaron: 0, source: 'local' as const }
  }, [fecha, esHoy, operadores, regsHoyFull, clavesConViajeProp, bustraxFecha])

  const { pendientes, conMotivo } = useMemo(() => {
    if (!esHoy) return { pendientes: [], conMotivo: [] }
    const clavesActivas = esHoy && clavesConViajeProp.size > 0 ? clavesConViajeProp : null
    const pend: Operador[] = []
    const conM: { op: Operador; reg: RegistroAusencia }[] = []
    operadores.forEach(op => {
      const reg = regsHoyFull[op.id]
      const opero = clavesActivas ? clavesActivas.has(op.id) : !!reg
      if (!opero) pend.push(op)
      else if (reg) conM.push({ op, reg })
    })
    return { pendientes: pend, conMotivo: conM }
  }, [esHoy, regsHoyFull, operadores, clavesConViajeProp])

  const pendFilt = useMemo(() => {
    const q = busqueda.toLowerCase()
    return pendientes.filter(op =>
      (filtroCoord==='Todos' || op.coordinador===filtroCoord) &&
      (!q || op.nombre.toLowerCase().includes(q) || op.id.toLowerCase().includes(q))
    )
  }, [pendientes, busqueda, filtroCoord])

  const pct = stats ? ((stats.operaron/stats.activos)*100).toFixed(1) : '—'

  const distribucion = useMemo(() => {
    const m: Record<string,number> = {}
    Object.values(regsHoyFull).forEach(r => { m[r.incidenciaId] = (m[r.incidenciaId]||0)+1 })
    return Object.entries(m).sort((a,b)=>b[1]-a[1])
  }, [regsHoyFull])

  // Datos para paneles de rol
  const vacPendCoord = solicitudesVac.filter(s => s.status === 'solicitud_pendiente' || s.status === 'respuesta_colaborador')
  const vacPendJT = solicitudesVac.filter(s => s.status === 'pendiente_auth')

  return (
    <div className="space-y-4">

      {/* Panel Mi Copiloto — solo Coordinadores */}
      {rol === 'C' && vacPendCoord.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">📱</span>
            <div>
              <p className="text-xs font-bold text-blue-800">Mi Copiloto — Solicitudes de vacaciones</p>
              <p className="text-[11px] text-blue-600 mt-0.5">
                {vacPendCoord.filter(s => s.status === 'solicitud_pendiente').length} pendientes de revisar
                {vacPendCoord.filter(s => s.status === 'respuesta_colaborador').length > 0 &&
                  ` · ${vacPendCoord.filter(s => s.status === 'respuesta_colaborador').length} con respuesta del colaborador`}
              </p>
            </div>
          </div>
          <button onClick={onIrAutorizaciones}
            className="text-xs font-bold text-blue-700 bg-white border border-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors shrink-0">
            Ver solicitudes →
          </button>
        </div>
      )}

      {/* Panel Pendientes Autorización — solo JT */}
      {rol === 'JT' && vacPendJT.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <span className="text-base">✅</span>
              <p className="text-xs font-bold text-amber-800">Pendientes de autorización final</p>
              <span className="text-[10px] bg-amber-200 text-amber-800 font-extrabold px-1.5 py-0.5 rounded-full">{vacPendJT.length}</span>
            </div>
            <button onClick={onIrAutorizaciones} className="text-[11px] text-amber-700 font-semibold hover:underline">
              Ver todas →
            </button>
          </div>
          <div className="divide-y divide-amber-100">
            {vacPendJT.slice(0, 3).map(sol => (
              <PanelItemJT key={sol.id} sol={sol} onAutorizar={onAutorizarJT} onRechazar={onRechazarJT} opMap={opMap} />
            ))}
          </div>
        </div>
      )}

      {/* Navigator */}
      <div className="flex items-center gap-2">
        <button onClick={() => setFecha(p=>addDaysStr(p,-1))} disabled={fecha<=minFecha}
          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30">
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-semibold text-gray-700">{diaSemana(fecha)} {formatFecha(fecha)}</span>
          {esHoy && <span className="text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">HOY</span>}
        </div>
        <button onClick={() => setFecha(p=>addDaysStr(p,1))} disabled={fecha>=today}
          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30">
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
        {!esHoy && <button onClick={() => setFecha(today)} className="text-xs text-indigo-600 font-medium hover:underline">Ir a hoy</button>}
        {(bustraxFechaLoading || (esHoy && bustraxLoadingProp)) && (
          <div className="flex items-center gap-1 text-xs text-indigo-500">
            <RefreshCw className="w-3 h-3 animate-spin" /> Cargando bustrax…
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label:'Total HC', val:stats.activos, color:'text-indigo-600', border:'border-indigo-100' },
            { label:'Operaron', val:stats.operaron, color:'text-green-600', border:'border-green-100' },
            { label:'No operaron', val:stats.noOperaron, color:'text-red-500', border:'border-red-100' },
            { label:'% Operativo', val:`${pct}%`, color:Number(pct)>=90?'text-green-600':Number(pct)>=85?'text-yellow-600':'text-red-600', border:'border-gray-100' },
          ].map(s => (
            <div key={s.label} className={`bg-white rounded-xl border ${s.border} shadow-sm p-3 text-center`}>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{s.label}</p>
              <p className={`text-2xl font-extrabold ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-3">
          {/* Pendientes */}
          {esHoy && pendientes.length > 0 && (
            <div className="bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-orange-50 border-b border-orange-100">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-xs font-bold text-orange-700">Sin motivo registrado</span>
                  <span className="text-[10px] bg-orange-200 text-orange-700 font-bold px-1.5 py-0.5 rounded-full">{pendientes.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                    <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar..."
                      className="pl-6 pr-3 py-1 text-[11px] border border-gray-200 rounded-lg bg-white focus:outline-none w-32" />
                  </div>
                  <select value={filtroCoord} onChange={e=>setFiltroCoord(e.target.value)}
                    className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none">
                    <option value="Todos">Todos</option>
                    {[...new Set(operadores.map(o => o.coordinador))].filter(Boolean).map((c: string) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {pendFilt.map(op => (
                <button key={op.id} onClick={() => onRegistrar(op.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-orange-50 transition-colors text-left">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600">
                      {op.nombre.split(' ').map(n=>n[0]).join('').slice(0,2)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{op.nombre}</p>
                      <p className="text-[10px] text-gray-400">{op.id} · {op.turno}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-orange-500 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">Registrar →</span>
                </button>
              ))}
            </div>
          )}

          {/* Con motivo */}
          {esHoy && conMotivo.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span className="text-xs font-bold text-gray-700">Con motivo registrado</span>
                <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded-full">{conMotivo.length}</span>
              </div>
              {conMotivo.map(({ op, reg }) => (
                <div key={op.id} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-[10px] font-bold text-green-600">
                      {op.nombre.split(' ').map(n=>n[0]).join('').slice(0,2)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{op.nombre}</p>
                      <p className="text-[10px] text-gray-400">{op.id} · {op.turno}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <MotivoBadge incId={reg.incidenciaId} />
                    <p className="text-[10px] text-gray-400 max-w-[180px] truncate">{reg.obs}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!esHoy && bustraxFechaLoading && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" /> Cargando datos de Bustrax…
            </div>
          )}
          {!esHoy && !bustraxFechaLoading && bustraxFecha && (() => {
            const noOperaron = operadores.filter(o => !bustraxFecha.clavesViaje.has(o.id))
            const operaron = operadores.filter(o => bustraxFecha.clavesViaje.has(o.id))
            return (
              <div className="space-y-3">
                {noOperaron.length > 0 && (
                  <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border-b border-red-100">
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-xs font-bold text-red-700">No operaron</span>
                      <span className="text-[10px] bg-red-200 text-red-700 font-bold px-1.5 py-0.5 rounded-full">{noOperaron.length}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {noOperaron.map(op => (
                        <div key={op.id} className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-red-600">{op.nombre.split(' ').map((n:string)=>n[0]).slice(0,2).join('')}</span>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-800">{op.nombre}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{op.id}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">Sin viaje</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {operaron.length > 0 && (
                  <div className="bg-white rounded-xl border border-green-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border-b border-green-100">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-xs font-bold text-green-700">Operaron</span>
                      <span className="text-[10px] bg-green-200 text-green-700 font-bold px-1.5 py-0.5 rounded-full">{operaron.length}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {operaron.map(op => (
                        <div key={op.id} className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-green-600">{op.nombre.split(' ').map((n:string)=>n[0]).slice(0,2).join('')}</span>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-800">{op.nombre}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{op.id}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">Operó</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
          {!esHoy && !bustraxFechaLoading && !bustraxFecha && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-400">Sin datos de Bustrax para esta fecha.</div>
          )}
        </div>

        {/* Sidebar distribución */}
        {esHoy && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-700">Distribución hoy</p>
              <p className="text-[10px] text-gray-400">{Object.keys(regsHoyFull).length} registradas</p>
            </div>
            {distribucion.length > 0 && (
              <div className="px-4 py-2">
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={distribucion.map(([id,v])=>({ name:catMap[id]?.nombre||id, value:v, color:catMap[id]?.color||'#9CA3AF' }))}
                      cx="50%" cy="50%" innerRadius={32} outerRadius={54} dataKey="value" paddingAngle={2}>
                      {distribucion.map(([id]) => <Cell key={id} fill={catMap[id]?.color||'#9CA3AF'} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize:10, borderRadius:6 }} formatter={(v)=>[`${v} op.`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="px-4 pb-3 space-y-1.5">
              {distribucion.map(([id,count]) => {
                const inc = catMap[id]
                return (
                  <div key={id} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background:inc?.color }} />
                    <span className="text-[11px] text-gray-600 flex-1 truncate">{inc?.nombre||id}</span>
                    <span className="text-[11px] font-bold text-gray-700">{count}</span>
                  </div>
                )
              })}
              {pendientes.length > 0 && (
                <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                  <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                  <span className="text-[11px] text-gray-600 flex-1">Sin motivo</span>
                  <span className="text-[11px] font-bold text-orange-500">{pendientes.length}</span>
                </div>
              )}
            </div>
            {pendientes.length > 0 && (
              <div className="mx-3 mb-3 bg-orange-50 border border-orange-200 rounded-lg p-2.5 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-orange-700 font-medium">{pendientes.length} sin registrar — deben capturarse antes del cierre</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── HISTORIAL ────────────────────────────────────────────────────────────────

function HistorialTab() {
  const [rango, setRango] = useState<'semana'|'mes'|'3m'|'6m'>('mes')
  const [drawer, setDrawer] = useState<DiaHistorial|null>(null)

  const datos = useMemo(() => {
    const hoy = new Date(); let dias = 30
    if (rango==='semana') dias=7; else if (rango==='3m') dias=90; else if (rango==='6m') dias=180
    const lim = new Date(hoy); lim.setDate(lim.getDate()-dias)
    return HISTORIAL.filter(d => new Date(d.fecha+'T12:00:00')>=lim)
  }, [rango])

  const chartData = useMemo(() => {
    const m = rango==='3m'?2:rango==='6m'?4:1
    return datos.filter((_,i)=>i%m===0).map(d=>({ ...d, label:`${diaSemana(d.fecha)} ${d.fecha.slice(8)}/${d.fecha.slice(5,7)}` }))
  }, [datos, rango])

  const avg = useMemo(() => {
    if (!datos.length) return { pct:'0.0' }
    return { pct:(datos.reduce((a,d)=>a+d.pct,0)/datos.length).toFixed(1) }
  }, [datos])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1">
          {(['semana','mes','3m','6m'] as const).map(id => (
            <button key={id} onClick={()=>setRango(id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${rango===id?'bg-indigo-600 text-white':'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {id==='semana'?'Esta semana':id==='mes'?'Este mes':id}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">Promedio operativo: <strong className={`${Number(avg.pct)>=90?'text-green-600':'text-yellow-600'}`}>{avg.pct}%</strong></span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-bold text-gray-700 mb-3">Tendencia operativa</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top:5,right:20,left:0,bottom:5 }}
            onClick={(e:unknown) => { const ev=e as {activePayload?:{payload:DiaHistorial}[]}; if(ev?.activePayload?.[0]) setDrawer(ev.activePayload[0].payload) }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="label" tick={{ fontSize:10, fill:'#94A3B8' }} tickLine={false} />
            <YAxis tick={{ fontSize:10, fill:'#94A3B8' }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ fontSize:11, borderRadius:8, border:'1px solid #E5E7EB' }} />
            <Legend formatter={v=><span style={{fontSize:11,color:'#64748B'}}>{v}</span>} />
            <Line type="monotone" dataKey="activos"   name="Total HC"      stroke="#6366F1" strokeWidth={2} dot={false} activeDot={{r:4}} />
            <Line type="monotone" dataKey="operaron"  name="Operaron"      stroke="#10B981" strokeWidth={2} dot={false} activeDot={{r:4}} />
            <Line type="monotone" dataKey="noOperaron" name="No operaron"  stroke="#EF4444" strokeWidth={2} dot={false} activeDot={{r:4}} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-gray-400 text-center mt-1">Clic en un punto para ver detalle del día</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-xs font-bold text-gray-700">Detalle diario</span>
          <span className="text-[10px] text-gray-400">{datos.length} días</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Fecha','Día','HC','Operaron','No op.','% Operativo','Capturadas'].map(h=>(
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {datos.slice().reverse().map(d => (
                <tr key={d.fecha} className="hover:bg-indigo-50/30 cursor-pointer" onClick={()=>setDrawer(d)}>
                  <td className="px-4 py-2 text-xs font-medium text-gray-700">{formatFecha(d.fecha)}</td>
                  <td className="px-4 py-2 text-xs text-gray-400">{diaSemana(d.fecha)}</td>
                  <td className="px-4 py-2 text-xs font-semibold text-indigo-600">{d.activos}</td>
                  <td className="px-4 py-2 text-xs font-semibold text-green-600">{d.operaron}</td>
                  <td className="px-4 py-2 text-xs font-semibold text-red-500">{d.noOperaron}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="h-1.5 rounded-full" style={{ width:`${d.pct}%`, background:d.pct>=90?'#10B981':d.pct>=85?'#F59E0B':'#EF4444' }} />
                      </div>
                      <span className={`text-xs font-bold ${d.pct>=90?'text-green-600':d.pct>=85?'text-yellow-600':'text-red-600'}`}>{d.pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs text-purple-600 font-semibold">{d.capturadas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={()=>setDrawer(null)} />
          <div className="w-72 bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="text-sm font-bold text-gray-800">{formatFecha(drawer.fecha)}</p>
                <p className="text-[10px] text-gray-400">{diaSemana(drawer.fecha)}</p>
              </div>
              <button onClick={()=>setDrawer(null)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">×</button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2">
              {[
                {label:'Total HC',     val:drawer.activos,    color:'text-indigo-600'},
                {label:'Operaron',     val:drawer.operaron,   color:'text-green-600'},
                {label:'No operaron',  val:drawer.noOperaron, color:'text-red-500'},
                {label:'% Operativo',  val:`${drawer.pct}%`,  color:drawer.pct>=90?'text-green-600':'text-yellow-600'},
                {label:'Capturadas',   val:drawer.capturadas, color:'text-purple-600'},
                {label:'Pendientes',   val:drawer.pendientes, color:'text-orange-500'},
              ].map(k=>(
                <div key={k.label} className="bg-gray-50 rounded-lg p-2.5 text-center border border-gray-100">
                  <p className="text-[10px] text-gray-400">{k.label}</p>
                  <p className={`text-lg font-extrabold ${k.color}`}>{k.val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SISTEMA DE CORREOS DE VACACIONES ────────────────────────────────────────

interface EmailNotificacion {
  id: string
  fecha: string
  hora: string
  de: string
  para: string[]
  asunto: string
  cuerpo: string
  tipo: 'solicitud' | 'reprogramacion' | 'contrapropuesta' | 'autorizado_coord' | 'autorizado_jt' | 'rechazado'
  leido: boolean
  solId: string
}

const EMAILS_INIT: EmailNotificacion[] = [
  // ── TIPO 1: Solicitud nueva — colaborador → coordinador ──────────────────────
  {
    id: 'e1', solId: 'v1', leido: true,
    fecha: '2026-04-06', hora: '07:52',
    de: 'Mi Copiloto <no-reply@traxion.com.mx>',
    para: ['Ing. Morales Vega <i.morales@traxion.com.mx>'],
    asunto: '📱 Nueva solicitud de vacaciones — Carlos García (OP-1006)',
    tipo: 'solicitud',
    cuerpo: `El colaborador Carlos García (OP-1006) ha enviado una solicitud de vacaciones desde la app Mi Copiloto.

Detalle de la solicitud:
  Fecha inicio:        10 de abril de 2026
  Fecha fin:           16 de abril de 2026
  Días solicitados:    5 días
  Días disponibles:    — días

Ingresa a NEXO › Autorizaciones › "Solicitudes" para autorizar o proponer nuevas fechas.

───────────────────────────────────────────
NEXO Capital Humano · Traxion
no-reply@traxion.com.mx  (no responder a este correo)`,
  },
  // ── TIPO 2: Reprogramación — coordinador → colaborador vía app ───────────────
  {
    id: 'e2', solId: 'v3', leido: true,
    fecha: '2026-04-04', hora: '11:30',
    de: 'Ing. Morales Vega <i.morales@traxion.com.mx>',
    para: ['Mi Copiloto <no-reply@traxion.com.mx>', 'r.aguilar@traxion.com.mx'],
    asunto: '🔄 Propuesta de reprogramación — Vacaciones Ramón Aguilar (OP-1023)',
    tipo: 'reprogramacion',
    cuerpo: `Estimado Ramón Aguilar,

Hemos revisado tu solicitud de vacaciones del 08 al 12 de abril. Lamentablemente en esas fechas tenemos operación asignada a tu unidad y no podemos liberarte.

Te proponemos las siguientes fechas tentativas:
  Nueva fecha inicio:  21 de abril de 2026
  Nueva fecha fin:     25 de abril de 2026
  Nota: "Operación reducida esa semana, podemos liberarte sin problema."

Por favor responde en la app Mi Copiloto si aceptas o propones otras fechas.

Saludos,
Ing. Morales Vega
Coordinador de Transportación — Traxion
i.morales@traxion.com.mx`,
  },
  // ── TIPO 3: Contrapropuesta — colaborador propone de vuelta → coordinador ─────
  {
    id: 'e3', solId: 'v3', leido: false,
    fecha: '2026-04-05', hora: '18:42',
    de: 'Mi Copiloto <no-reply@traxion.com.mx>',
    para: ['Ing. Morales Vega <i.morales@traxion.com.mx>'],
    asunto: '💬 Ramón Aguilar propone nuevas fechas — requiere tu revisión',
    tipo: 'contrapropuesta',
    cuerpo: `El operador Ramón Aguilar (OP-1023) respondió a tu propuesta de reprogramación con nuevas fechas desde la app Mi Copiloto.

  Propuesta del coordinador:       21 – 25 de abril de 2026
  Nueva propuesta del colaborador: 14 – 18 de abril de 2026
  Mensaje del colaborador: "Esa semana también me acomoda, agradezco la respuesta."
  Respondió el: 05 de abril de 2026 a las 18:41

Ingresa a NEXO › Autorizaciones › "Respuestas del colaborador" para aceptar las nuevas fechas o proponer una alternativa.

───────────────────────────────────────────
NEXO Capital Humano · Traxion
no-reply@traxion.com.mx  (no responder a este correo)`,
  },
  // ── TIPO 4: Enviado a JT — coordinador aprueba → jefe de transportación ───────
  {
    id: 'e4', solId: 'v4', leido: true,
    fecha: '2026-04-01', hora: '10:05',
    de: 'Lic. Castillo Ramos <l.castillo@traxion.com.mx>',
    para: ['JT Pérez <jt.perez@traxion.com.mx>'],
    asunto: '✅ Solicitud lista para tu autorización — Antonio Díaz (OP-1009)',
    tipo: 'autorizado_coord',
    cuerpo: `Jefe de Transportación,

Se envía la siguiente solicitud de vacaciones para tu autorización final. Ya fue revisada y aprobada a nivel coordinación.

Datos del colaborador:
  Nombre:              Antonio Díaz
  Número nómina:       OP-1009
  Turno:               Matutino
  Coordinador:         Lic. Castillo Ramos

Período de vacaciones:
  Fecha inicio:        07 de abril de 2026
  Fecha fin:           11 de abril de 2026
  Días solicitados:    4 días
  Días disponibles:    — días

Ingresa a NEXO › Autorizaciones › "Pendientes autorización" para dar el visto bueno final.

Saludos,
Lic. Castillo Ramos
Coordinadora de Transportación — Traxion
l.castillo@traxion.com.mx`,
  },
  // ── TIPO 5: Autorizado por JT — jefe aprueba → colaborador + coordinador ──────
  {
    id: 'e5', solId: 'v5', leido: true,
    fecha: '2026-03-14', hora: '14:22',
    de: 'JT Pérez <jt.perez@traxion.com.mx>',
    para: [
      'Mi Copiloto <no-reply@traxion.com.mx>',
      'v.beltran@traxion.com.mx',
      'Ing. Morales Vega <i.morales@traxion.com.mx>',
    ],
    asunto: '🎉 Vacaciones AUTORIZADAS — Víctor Beltrán (OP-1036) · 17–21 Mar',
    tipo: 'autorizado_jt',
    cuerpo: `Estimado Víctor Beltrán,

Nos complace informarte que tu solicitud de vacaciones ha sido AUTORIZADA.

  Período autorizado:  17 de marzo de 2026  →  21 de marzo de 2026
  Días autorizados:    5 días
  Autorizado por:      JT Pérez
  Fecha autorización:  14 de marzo de 2026
  Regreso programado:  22 de marzo de 2026

Recuerda confirmar turno y unidad con tu coordinador el día hábil previo a tu regreso.

¡Que disfrutes tus vacaciones!

JT Pérez
Jefe de Transportación — Traxion
jt.perez@traxion.com.mx`,
  },
  // ── TIPO 6: Rechazado por JT — jefe rechaza → colaborador + coordinador ───────
  {
    id: 'e6', solId: 'v4', leido: false,
    fecha: '2026-04-06', hora: '16:10',
    de: 'JT Pérez <jt.perez@traxion.com.mx>',
    para: [
      'Mi Copiloto <no-reply@traxion.com.mx>',
      'a.diaz@traxion.com.mx',
      'Lic. Castillo Ramos <l.castillo@traxion.com.mx>',
    ],
    asunto: '❌ Solicitud de vacaciones NO autorizada — Antonio Díaz (OP-1009)',
    tipo: 'rechazado',
    cuerpo: `Estimado Antonio Díaz,

Lamentamos informarte que tu solicitud de vacaciones no pudo ser autorizada en este momento.

  Período solicitado:  07 – 11 de abril de 2026
  Días solicitados:    4 días

Motivo del rechazo:
  "Semana de cierre de operaciones Q1. Requerimos cobertura completa de unidades y no es posible liberar operadores en esas fechas."

Tus días de vacaciones disponibles siguen vigentes. Puedes enviar una nueva solicitud desde la app Mi Copiloto con fechas diferentes, o hablar con tu coordinadora Lic. Castillo Ramos para planificar las próximas fechas disponibles.

JT Pérez
Jefe de Transportación — Traxion
jt.perez@traxion.com.mx`,
  },
]

function generarEmail(
  sol: SolicitudVacaciones,
  tipo: EmailNotificacion['tipo'],
  opMap: OpMap,
  extras?: { fi?: string; ff?: string; nota?: string; motivo?: string }
): EmailNotificacion {
  const op = opMap[sol.operadorId]
  const hoy = todayStr()
  const hora = new Date().toTimeString().slice(0, 5)
  const id = `e_${Date.now()}`

  const plantillas: Record<EmailNotificacion['tipo'], { asunto: string; para: string[]; de: string; cuerpo: string }> = {
    solicitud: {
      asunto: `📱 Nueva solicitud de vacaciones — ${op?.nombre} (${op?.id})`,
      de: 'Mi Copiloto <no-reply@traxion.com>',
      para: [`${op?.coordinador} <coord@traxion.com>`],
      cuerpo: `${op?.nombre} (${op?.id}) solicitó vacaciones:\n• Del ${sol.fechaInicio} al ${sol.fechaFin} (${sol.diasAusencia} días)\n• Días disponibles: ${sol.diasDisponibles}\n${sol.motivoAdicional ? `• Comentario: "${sol.motivoAdicional}"\n` : ''}`,
    },
    reprogramacion: {
      asunto: `🔄 Propuesta de reprogramación — Vacaciones ${op?.nombre}`,
      de: 'Coord. (yo) <coord@traxion.com>',
      para: [`Mi Copiloto <no-reply@traxion.com>`, `${op?.nombre} (app)`],
      cuerpo: `Se proponen nuevas fechas tentativas:\n• Nueva fecha inicio: ${extras?.fi}\n• Nueva fecha fin:    ${extras?.ff}\n${extras?.nota ? `• Nota: "${extras.nota}"\n` : ''}\nEl colaborador debe responder desde la app Mi Copiloto.`,
    },
    contrapropuesta: {
      asunto: `💬 ${op?.nombre} propone nuevas fechas — requiere tu revisión`,
      de: 'Mi Copiloto <no-reply@traxion.com>',
      para: [`${op?.coordinador} <coord@traxion.com>`],
      cuerpo: `El operador respondió con nuevas fechas propuestas.\nRevisa en NEXO > Autorizaciones > "Respuestas colaborador".`,
    },
    autorizado_coord: {
      asunto: `✅ Vacaciones enviadas a JT — ${op?.nombre} (${op?.id})`,
      de: 'Coord. (yo) <coord@traxion.com>',
      para: ['Jefe de Transportación <jt@traxion.com>'],
      cuerpo: `Se envía para autorización final:\n• Operador: ${op?.nombre} (${op?.id})\n• Período:  ${sol.fechaInicio} al ${sol.fechaFin} (${sol.diasAusencia} días)\n• Revisado y aprobado por Coordinador.\n\nFavor de autorizar en NEXO > Autorizaciones > "Pendientes autorización".`,
    },
    autorizado_jt: {
      asunto: `🎉 Vacaciones AUTORIZADAS — ${op?.nombre} (${op?.id})`,
      de: 'JT (yo) <jt@traxion.com>',
      para: [`${op?.nombre} (app)`, `${op?.coordinador} <coord@traxion.com>`, 'Mi Copiloto <no-reply@traxion.com>'],
      cuerpo: `Las vacaciones han sido AUTORIZADAS:\n• Operador: ${op?.nombre} (${op?.id})\n• Período:  ${sol.fechaInicio} al ${sol.fechaFin} (${sol.diasAusencia} días)\n• Autorizado por: JT (yo)\n\nEl colaborador recibirá notificación en la app Mi Copiloto.`,
    },
    rechazado: {
      asunto: `❌ Solicitud de vacaciones RECHAZADA — ${op?.nombre} (${op?.id})`,
      de: 'JT (yo) <jt@traxion.com>',
      para: [`${op?.nombre} (app)`, `${op?.coordinador} <coord@traxion.com>`],
      cuerpo: `La solicitud de vacaciones ha sido RECHAZADA:\n• Operador: ${op?.nombre} (${op?.id})\n• Período solicitado: ${sol.fechaInicio} al ${sol.fechaFin}\n${extras?.motivo ? `• Motivo: "${extras.motivo}"\n` : ''}\nEl colaborador puede enviar una nueva solicitud con fechas diferentes.`,
    },
  }

  const p = plantillas[tipo]
  return {
    id, solId: sol.id, fecha: hoy, hora,
    de: p.de, para: p.para,
    asunto: p.asunto,
    cuerpo: `${p.cuerpo}\n\n— Sistema NEXO · Traxion Capital Humano`,
    tipo, leido: false,
  }
}

function BandejaCorreos({ emails, onClose, onMarcarLeido }: {
  emails: EmailNotificacion[]
  onClose: () => void
  onMarcarLeido: (id: string) => void
}) {
  const [selId, setSelId] = useState<string | null>(emails.length > 0 ? emails[0].id : null)
  const sel = emails.find(e => e.id === selId)

  const TIPO_COLOR: Record<string, string> = {
    solicitud: '#2563EB', reprogramacion: '#7C3AED', contrapropuesta: '#EA580C',
    autorizado_coord: '#0EA5E9', autorizado_jt: '#16A34A', rechazado: '#DC2626',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-10">
      <div className="bg-white rounded-2xl shadow-2xl w-[800px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">📬</span>
            <div>
              <p className="text-sm font-bold text-gray-900">Bandeja de notificaciones</p>
              <p className="text-[11px] text-gray-500">Correos generados por el flujo de vacaciones</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {emails.filter(e => !e.leido).length > 0 && (
              <span className="text-[11px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                {emails.filter(e => !e.leido).length} sin leer
              </span>
            )}
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 text-lg font-bold">×</button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Lista */}
          <div className="w-64 border-r border-gray-100 overflow-y-auto shrink-0">
            {emails.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">Sin correos todavía.<br/>Realiza una acción en el flujo.</div>
            ) : emails.map(e => (
              <button key={e.id} onClick={() => { setSelId(e.id); onMarcarLeido(e.id) }}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selId === e.id ? 'bg-blue-50 border-l-2 border-l-blue-400' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TIPO_COLOR[e.tipo] || '#64748B', opacity: e.leido ? 0.3 : 1 }} />
                  <span className={`text-[11px] truncate flex-1 ${e.leido ? 'text-gray-500' : 'font-bold text-gray-800'}`}>{e.asunto}</span>
                </div>
                <p className="text-[10px] text-gray-400 ml-4">{e.fecha} · {e.hora}</p>
              </button>
            ))}
          </div>

          {/* Detalle */}
          {sel ? (
            <div className="flex-1 p-5 overflow-y-auto">
              <h2 className="text-sm font-bold text-gray-900 mb-3">{sel.asunto}</h2>
              <div className="space-y-1.5 mb-4 text-[11px]">
                <p><span className="text-gray-400 inline-block w-10">De:</span> <span className="text-gray-700">{sel.de}</span></p>
                <p><span className="text-gray-400 inline-block w-10">Para:</span> <span className="text-gray-700">{sel.para.join(', ')}</span></p>
                <p><span className="text-gray-400 inline-block w-10">Fecha:</span> <span className="text-gray-700">{sel.fecha} · {sel.hora}</span></p>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{sel.cuerpo}</pre>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Selecciona un correo
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── AUTORIZACIONES DE VACACIONES ─────────────────────────────────────────────

const VAC_COLOR = '#10B981'

const TABS_COORD = [
  { id: 'solicitud_pendiente' as VacStatus,    label: 'Solicitudes',          color: '#2563EB' },
  { id: 'respuesta_colaborador' as VacStatus,  label: 'Respuestas colaborador', color: '#EA580C' },
  { id: 'reprogramada' as VacStatus,           label: 'Reprogramadas',         color: '#7C3AED' },
]
const TABS_JT = [
  { id: 'pendiente_auth' as VacStatus, label: 'Pendientes autorización', color: '#F59E0B' },
  { id: 'autorizado' as VacStatus,     label: 'Autorizadas',             color: '#16A34A' },
  { id: 'rechazado' as VacStatus,      label: 'Rechazadas',              color: '#DC2626' },
]

function TarjetaVacCoord({ sol, onAutorizar, onReprogramar, opMap }: {
  sol: SolicitudVacaciones
  onAutorizar: (id: string, contrapropuesta?: SolicitudVacaciones['contrapropuesta']) => void
  onReprogramar: (id: string, fi: string, ff: string, nota: string) => void
  opMap: OpMap
}) {
  const [showForm, setShowForm] = useState(false)
  const [fi, setFi] = useState(''); const [ff, setFf] = useState(''); const [nota, setNota] = useState('')
  const op = opMap[sol.operadorId]
  const isPend = sol.status === 'solicitud_pendiente'
  const isResp = sol.status === 'respuesta_colaborador'

  const handleReprogram = () => {
    if (!fi || !ff) return
    onReprogramar(sol.id, fi, ff, nota)
    setShowForm(false); setFi(''); setFf(''); setNota('')
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-3" style={{ borderColor: `${VAC_COLOR}30` }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b flex-wrap" style={{ background: `${VAC_COLOR}08`, borderColor: `${VAC_COLOR}20` }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: VAC_COLOR }}>
          {op?.nombre?.charAt(0) || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">{op?.nombre}</p>
          <p className="text-xs text-gray-500">{op?.id} · {op?.turno} · {op?.coordinador}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full border" style={{ background: `${VAC_COLOR}15`, color: VAC_COLOR, borderColor: `${VAC_COLOR}40` }}>Vacaciones</span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">📱 Mi copiloto</span>
          {isResp && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">💬 Colaborador propone nuevas fechas</span>}
          {sol.status === 'reprogramada' && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">🔄 Reprogramada</span>}
        </div>
      </div>

      {/* Body */}
      <div className={`p-5 grid gap-4 ${isResp ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {/* Solicitud original */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Solicitud original</p>
          {[
            ['Fecha inicio', sol.fechaInicio], ['Fecha fin', sol.fechaFin],
            ['Días solicitados', String(sol.diasAusencia)], ['Días disponibles', String(sol.diasDisponibles)],
            sol.motivoAdicional ? ['Comentario', sol.motivoAdicional] : null,
            ['Fecha solicitud', sol.fechaCaptura],
          ].filter((x): x is string[] => x !== null).map(([l, v]) => (
            <div key={l} className="flex gap-2 text-xs py-1 border-b border-gray-50 last:border-0">
              <span className="text-gray-400 min-w-[130px]">{l}:</span>
              <span className="font-medium text-gray-800">{v}</span>
            </div>
          ))}
        </div>
        {/* Propuesta coordinador */}
        {sol.propuestaTentativa && (
          <div>
            <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mb-2">Propuesta del coordinador</p>
            {[
              ['Fecha inicio', sol.propuestaTentativa.fechaInicio],
              ['Fecha fin', sol.propuestaTentativa.fechaFin],
              sol.propuestaTentativa.nota ? ['Nota', sol.propuestaTentativa.nota] : null,
              ['Enviado por', sol.reprogramadoPor], ['Fecha', sol.fechaReprogramacion],
            ].filter((x): x is string[] => x !== null).map(([l, v]) => (
              <div key={l} className="flex gap-2 text-xs py-1 border-b border-gray-50 last:border-0">
                <span className="text-gray-400 min-w-[100px]">{l}:</span>
                <span className="font-medium text-gray-800">{v}</span>
              </div>
            ))}
          </div>
        )}
        {/* Contrapropuesta colaborador */}
        {isResp && sol.contrapropuesta && (
          <div className="bg-orange-50 rounded-xl p-3 border border-orange-200">
            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-2">Nueva propuesta del colaborador</p>
            {[
              ['Fecha inicio', sol.contrapropuesta.fechaInicio],
              ['Fecha fin', sol.contrapropuesta.fechaFin],
              sol.contrapropuesta.nota ? ['Mensaje', sol.contrapropuesta.nota] : null,
              ['Respondió el', sol.contrapropuesta.fechaRespuesta],
            ].filter((x): x is string[] => x !== null).map(([l, v]) => (
              <div key={l} className="flex gap-2 text-xs py-1 border-b border-orange-100 last:border-0">
                <span className="text-orange-400 min-w-[100px]">{l}:</span>
                <span className="font-semibold text-orange-800">{v}</span>
              </div>
            ))}
          </div>
        )}
        {/* Info operador (cuando no hay propuesta) */}
        {!sol.propuestaTentativa && !isResp && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Información del operador</p>
            {[['Turno', op?.turno], ['Coordinador', op?.coordinador]].map(([l, v]) => (
              <div key={l} className="flex gap-2 text-xs py-1 border-b border-gray-50 last:border-0">
                <span className="text-gray-400 min-w-[100px]">{l}:</span>
                <span className="font-medium text-gray-800">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acciones */}
      {(isPend || isResp) && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          {!showForm ? (
            <div className="flex items-center gap-3 justify-end flex-wrap">
              {isResp && (
                <span className="text-xs text-gray-500 mr-auto">
                  El colaborador propone: <strong>{sol.contrapropuesta?.fechaInicio} → {sol.contrapropuesta?.fechaFin}</strong>
                </span>
              )}
              <button
                onClick={() => setShowForm(true)}
                className="text-xs font-bold px-4 py-2 rounded-lg border-2 transition-colors"
                style={{ borderColor: '#7C3AED', color: '#7C3AED' }}
              >
                🔄 {isResp ? 'Reprogramar de nuevo' : 'Reprogramar'}
              </button>
              <button
                onClick={() => onAutorizar(sol.id, isResp ? sol.contrapropuesta : undefined)}
                className="text-xs font-bold px-4 py-2 rounded-lg text-white transition-colors"
                style={{ background: '#2563EB' }}
              >
                ✓ {isResp ? 'Aceptar nuevas fechas y enviar a JT' : 'Autorizar y enviar a JT'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-700">Propuesta tentativa para el colaborador</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Fecha inicio propuesta</label>
                  <input type="date" value={fi} onChange={e => setFi(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Fecha fin propuesta</label>
                  <input type="date" value={ff} onChange={e => setFf(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Nota para el colaborador (opcional)</label>
                <textarea rows={2} value={nota} onChange={e => setNota(e.target.value)}
                  placeholder="Explica el motivo del cambio de fechas…"
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none resize-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowForm(false)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100">Cancelar</button>
                <button onClick={handleReprogram} disabled={!fi || !ff}
                  className="text-xs font-bold px-4 py-1.5 rounded-lg text-white disabled:opacity-40 transition-colors"
                  style={{ background: fi && ff ? '#7C3AED' : '#CBD5E1' }}>
                  Enviar propuesta al colaborador
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TarjetaVacJT({ sol, onAutorizar, onRechazar, opMap }: {
  sol: SolicitudVacaciones
  onAutorizar: (id: string) => void
  onRechazar: (id: string, motivo: string) => void
  opMap: OpMap
}) {
  const [showRechazo, setShowRechazo] = useState(false)
  const [motivo, setMotivo] = useState('')
  const op = opMap[sol.operadorId]
  const isPend = sol.status === 'pendiente_auth'

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-3" style={{ borderColor: `${VAC_COLOR}30` }}>
      <div className="flex items-center gap-3 px-5 py-3.5 border-b flex-wrap" style={{ background: `${VAC_COLOR}08`, borderColor: `${VAC_COLOR}20` }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: VAC_COLOR }}>
          {op?.nombre?.charAt(0) || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">{op?.nombre}</p>
          <p className="text-xs text-gray-500">{op?.id} · {op?.turno} · {op?.coordinador}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full border" style={{ background: `${VAC_COLOR}15`, color: VAC_COLOR, borderColor: `${VAC_COLOR}40` }}>Vacaciones</span>
          {sol.status === 'autorizado' && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">✓ Autorizado</span>}
          {sol.status === 'rechazado' && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">✗ Rechazado</span>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 p-5">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Detalle solicitud</p>
          {[
            ['Fecha inicio', sol.fechaInicio], ['Fecha fin', sol.fechaFin],
            ['Días', String(sol.diasAusencia)], ['Días disponibles', String(sol.diasDisponibles)],
            ['Fecha captura', sol.fechaCaptura],
          ].map(([l, v]) => (
            <div key={l} className="flex gap-2 text-xs py-1 border-b border-gray-50 last:border-0">
              <span className="text-gray-400 min-w-[130px]">{l}:</span>
              <span className="font-medium text-gray-800">{v}</span>
            </div>
          ))}
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Proceso</p>
          {[
            ['Autorizado por Coord.', sol.autorizadoCoord || '—'],
            ['Fecha aprobación Coord.', sol.fechaAutorizacionCoord || '—'],
          ].map(([l, v]) => (
            <div key={l} className="flex gap-2 text-xs py-1 border-b border-gray-50 last:border-0">
              <span className="text-gray-400 min-w-[160px]">{l}:</span>
              <span className="font-medium text-gray-800">{v}</span>
            </div>
          ))}
          {!isPend && (
            <div className="mt-3 p-3 rounded-lg border" style={{
              background: sol.status === 'autorizado' ? '#F0FDF4' : '#FEF2F2',
              borderColor: sol.status === 'autorizado' ? '#86EFAC' : '#FCA5A5',
            }}>
              <p className="text-xs font-bold" style={{ color: sol.status === 'autorizado' ? '#16A34A' : '#DC2626' }}>
                {sol.status === 'autorizado' ? '✓ Autorizado' : '✗ Rechazado'} por {sol.autorizadoPor}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">{sol.fechaAutorizacion}</p>
              {sol.motivoRechazo && <p className="text-[11px] text-red-600 mt-1 italic">Motivo: {sol.motivoRechazo}</p>}
            </div>
          )}
        </div>
      </div>
      {isPend && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          {!showRechazo ? (
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowRechazo(true)}
                className="text-xs font-bold px-4 py-2 rounded-lg border-2 text-red-600 border-red-300 hover:bg-red-50 transition-colors">
                ✗ Rechazar
              </button>
              <button onClick={() => onAutorizar(sol.id)}
                className="text-xs font-bold px-4 py-2 rounded-lg text-white transition-colors"
                style={{ background: '#16A34A' }}>
                ✓ Autorizar
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea rows={2} value={motivo} onChange={e => setMotivo(e.target.value)}
                placeholder="Motivo del rechazo (opcional)…"
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none resize-none focus:ring-2 focus:ring-red-300" />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowRechazo(false)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100">Cancelar</button>
                <button onClick={() => { onRechazar(sol.id, motivo); setShowRechazo(false) }}
                  className="text-xs font-bold px-4 py-1.5 rounded-lg text-white bg-red-600 hover:bg-red-700">
                  Confirmar rechazo
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AutorizacionesTab({ solicitudes, onEditar, rol, emails, onAddEmail, onMarcarEmailLeido, userName, opMap }: {
  solicitudes: SolicitudVacaciones[]
  onEditar: (id: string, changes: Partial<SolicitudVacaciones>) => void
  rol: 'C' | 'JT'
  emails: EmailNotificacion[]
  onAddEmail: (e: EmailNotificacion) => void
  onMarcarEmailLeido: (id: string) => void
  userName: string
  opMap: OpMap
}) {
  const esCoord = rol === 'C'
  const TABS = esCoord ? TABS_COORD : TABS_JT
  const [tab, setTab] = useState(TABS[0].id)
  const [showBandeja, setShowBandeja] = useState(false)
  const hoy = todayStr()

  const COORD_STATUSES: VacStatus[] = ['solicitud_pendiente', 'respuesta_colaborador', 'reprogramada']

  const items = useMemo(() => {
    return solicitudes
      .filter(s => s.status === tab)
      .sort((a, b) => b.fechaCaptura.localeCompare(a.fechaCaptura))
  }, [solicitudes, tab])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    ;[...TABS_COORD, ...TABS_JT].forEach(t => {
      c[t.id] = solicitudes.filter(s => s.status === t.id).length
    })
    return c
  }, [solicitudes])

  const sinLeer = emails.filter(e => !e.leido).length

  const handleAutorizarCoord = (id: string, contrapropuesta?: SolicitudVacaciones['contrapropuesta']) => {
    const sol = solicitudes.find(s => s.id === id)!
    const extra = contrapropuesta
      ? { fechaInicio: contrapropuesta.fechaInicio, fechaFin: contrapropuesta.fechaFin }
      : {}
    onEditar(id, { status: 'pendiente_auth', autorizadoCoord: userName, fechaAutorizacionCoord: hoy, ...extra })
    onAddEmail(generarEmail(sol, 'autorizado_coord', opMap))
  }

  const handleReprogramar = (id: string, fi: string, ff: string, nota: string) => {
    const sol = solicitudes.find(s => s.id === id)!
    onEditar(id, {
      status: 'reprogramada',
      propuestaTentativa: { fechaInicio: fi, fechaFin: ff, nota },
      reprogramadoPor: 'Coord. (yo)',
      fechaReprogramacion: hoy,
    })
    onAddEmail(generarEmail(sol, 'reprogramacion', opMap, { fi, ff, nota }))
  }

  const handleAutorizarJT = (id: string) => {
    const sol = solicitudes.find(s => s.id === id)!
    onEditar(id, { status: 'autorizado', autorizadoPor: userName, fechaAutorizacion: hoy })
    onAddEmail(generarEmail(sol, 'autorizado_jt', opMap))
  }

  const handleRechazarJT = (id: string, motivo: string) => {
    const sol = solicitudes.find(s => s.id === id)!
    onEditar(id, { status: 'rechazado', autorizadoPor: userName, fechaAutorizacion: hoy, motivoRechazo: motivo })
    onAddEmail(generarEmail(sol, 'rechazado', opMap, { motivo }))
  }

  const EMPTY_MSG: Record<string, string> = {
    solicitud_pendiente:   'Sin solicitudes de vacaciones pendientes',
    respuesta_colaborador: 'Sin respuestas de colaboradores pendientes',
    reprogramada:          'Sin vacaciones reprogramadas',
    pendiente_auth:        'Sin solicitudes pendientes de autorización',
    autorizado:            'Sin vacaciones autorizadas aún',
    rechazado:             'Sin solicitudes rechazadas',
  }

  return (
    <div className="space-y-4">
      {showBandeja && (
        <BandejaCorreos
          emails={[...emails].reverse()}
          onClose={() => setShowBandeja(false)}
          onMarcarLeido={onMarcarEmailLeido}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3 flex-1">
          <span className="text-lg">ℹ️</span>
          <div>
            <p className="text-xs font-bold text-blue-800">
              {esCoord ? 'Vista de Coordinador — Flujo de vacaciones desde la app' : 'Vista de Jefe de Transportación — Autorización final'}
            </p>
            <p className="text-[11px] text-blue-600 mt-0.5">
              {esCoord
                ? 'Puedes autorizar (envía al JT) o reprogramar (propuesta tentativa al colaborador). Si el colaborador contra-propone fechas, aparece en "Respuestas".'
                : 'Aquí llegan las vacaciones ya revisadas por el Coordinador. Tú das la autorización final.'}
            </p>
          </div>
        </div>

        {/* Botón bandeja */}
        <button
          onClick={() => setShowBandeja(true)}
          className="relative flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm shrink-0"
        >
          <span className="text-base">📬</span>
          <span>Bandeja de correos</span>
          {sinLeer > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-extrabold rounded-full">
              {sinLeer}
            </span>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all"
            style={{
              background: tab === t.id ? t.color : '#F1F5F9',
              color: tab === t.id ? 'white' : '#64748B',
            }}>
            {t.label}
            <span className="px-1.5 py-0.5 rounded-full text-[11px] font-extrabold"
              style={{ background: tab === t.id ? 'rgba(255,255,255,0.3)' : '#E2E8F0', color: tab === t.id ? 'white' : '#64748B' }}>
              {counts[t.id] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Lista */}
      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-3xl mb-3">
            {tab === 'solicitud_pendiente' ? '📱' : tab === 'respuesta_colaborador' ? '💬' : tab === 'reprogramada' ? '🔄' : tab === 'pendiente_auth' ? '✅' : tab === 'autorizado' ? '🎉' : '📋'}
          </p>
          <p className="text-sm font-semibold text-gray-500">{EMPTY_MSG[tab]}</p>
        </div>
      ) : items.map(sol =>
        COORD_STATUSES.includes(tab) ? (
          <TarjetaVacCoord key={sol.id} sol={sol} onAutorizar={handleAutorizarCoord} onReprogramar={handleReprogramar} opMap={opMap} />
        ) : (
          <TarjetaVacJT key={sol.id} sol={sol} onAutorizar={handleAutorizarJT} onRechazar={handleRechazarJT} opMap={opMap} />
        )
      )}
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

type Tab = 'cierre' | 'registrar' | 'historial' | 'autorizaciones'

export default function AsistenciaPage() {
  const { empleados, getPuestoNombre } = useSCRHStore()

  // ── auth ──────────────────────────────────────────────────────────────────
  const [rolCode, setRolCode] = useState<string>('')
  const [userName, setUserName] = useState('')
  const [userNomina, setUserNomina] = useState('')

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('nexo_user') || '{}')
      setRolCode(u.rolCode || '')
      setUserName(u.nombre || '')
      setUserNomina(u.nomina || '')
    } catch {}
  }, [])

  const rol = useMemo<'C' | 'JT' | null>(() => {
    if (rolCode === 'JT') return 'JT'
    if (rolCode === 'C') return 'C'
    return null
  }, [rolCode])

  // ── operadores reales del equipo jerárquico ───────────────────────────────
  const operadores = useMemo<Operador[]>(() => {
    let base = empleados
    if ((rolCode === 'JT' || rolCode === 'C') && userNomina) {
      base = getEquipoCompleto(userNomina, empleados)
    }
    return base
      .filter(e => e.st === 1)
      .map(e => ({
        id: e.clave,
        nombre: e.nombre_completo,
        coordinador: e.jefe_inmed || '—',
        turno: '—',
        unidad: String(e.unidad_negocios || '—'),
        diasVacPendientes: 0,
      }))
  }, [empleados, rolCode, userNomina])

  const opMap = useMemo<OpMap>(
    () => Object.fromEntries(operadores.map(o => [o.id, o])),
    [operadores],
  )

  // ── bustrax: viajes y faltas de hoy ───────────────────────────────────────
  const [clavesConViaje, setClavesConViaje] = useState<Set<string>>(new Set())
  const [totalFaltasBustrax, setTotalFaltasBustrax] = useState(0)
  const [bustraxLoading, setBustraxLoading] = useState(true)
  const [bustraxUpdatedAt, setBustraxUpdatedAt] = useState<Date | null>(null)
  const [bustraxError, setBustraxError] = useState(false)

  const cargarBustrax = () => {
    setBustraxLoading(true)
    setBustraxError(false)
    const hoyStr = new Date().toISOString().split('T')[0]
    Promise.all([
      fetch(`/api/bustrax/viajes?unidad=8&fechaini=${hoyStr}&fechafin=${hoyStr}`).then(r => r.json()).catch(() => null),
      fetch(`/api/bustrax/faltas?unidad=8&fechaini=${hoyStr}&fechafin=${hoyStr}`).then(r => r.json()).catch(() => null),
    ]).then(([vData, fData]) => {
      if (!Array.isArray(vData) && !Array.isArray(fData)) {
        setBustraxError(true)
      } else {
        if (Array.isArray(vData)) {
          setClavesConViaje(new Set(
            vData
              .filter((v: { noEmpleado: string | null }) => v.noEmpleado)
              .map((v: { noEmpleado: string }) => v.noEmpleado)
          ))
        }
        if (Array.isArray(fData)) {
          setTotalFaltasBustrax(fData.length)
        }
        setBustraxUpdatedAt(new Date())
      }
    }).finally(() => setBustraxLoading(false))
  }

  useEffect(() => { cargarBustrax() }, [])

  const [tab, setTab]           = useState<Tab>('cierre')
  const [schemaId, setSchemaId] = useState<string|null>(null)
  const [preOpId, setPreOpId]   = useState<string|undefined>(undefined)

  // registros persisten por usuario en localStorage
  const regKey = `nexo_registros_${userNomina || 'shared'}`
  const [registros, setRegistros] = useState<RegistroAusencia[]>(() => {
    if (typeof window === 'undefined') return []
    const saved = localStorage.getItem(`nexo_registros_${localStorage.getItem('nexo_user') ? JSON.parse(localStorage.getItem('nexo_user')!).nomina || 'shared' : 'shared'}`)
    return saved ? JSON.parse(saved) : []
  })
  const [solicitudesVac, setSolicitudesVac] = useState<SolicitudVacaciones[]>(() => {
    if (typeof window === 'undefined') return []
    const saved = localStorage.getItem('nexo_solicitudes_vac')
    return saved ? JSON.parse(saved) : []
  })
  const [emails, setEmails] = useState<EmailNotificacion[]>(() => {
    if (typeof window === 'undefined') return EMAILS_INIT
    const saved = localStorage.getItem('nexo_emails_vac')
    return saved ? JSON.parse(saved) : EMAILS_INIT
  })

  useEffect(() => {
    if (userNomina) localStorage.setItem(regKey, JSON.stringify(registros))
  }, [registros, regKey, userNomina])

  useEffect(() => {
    localStorage.setItem('nexo_solicitudes_vac', JSON.stringify(solicitudesVac))
  }, [solicitudesVac])

  useEffect(() => {
    localStorage.setItem('nexo_emails_vac', JSON.stringify(emails))
  }, [emails])

  // Recargar registros cuando se sabe el userNomina (hydration)
  useEffect(() => {
    if (!userNomina) return
    const saved = localStorage.getItem(`nexo_registros_${userNomina}`)
    if (saved) {
      try { setRegistros(JSON.parse(saved)) } catch {}
    }
  }, [userNomina])

  const hoy = todayStr()

  const handleEditarVac = (id: string, changes: Partial<SolicitudVacaciones>) => {
    setSolicitudesVac(prev => prev.map(s => s.id === id ? { ...s, ...changes } : s))
  }
  const handleAddEmail = (e: EmailNotificacion) => setEmails(prev => [...prev, e])
  const handleMarcarEmailLeido = (id: string) => setEmails(prev => prev.map(e => e.id === id ? { ...e, leido: true } : e))

  const handleAutorizarJTPage = (id: string) => {
    const sol = solicitudesVac.find(s => s.id === id)!
    handleEditarVac(id, { status: 'autorizado', autorizadoPor: userName, fechaAutorizacion: hoy })
    handleAddEmail(generarEmail(sol, 'autorizado_jt', opMap))
  }
  const handleRechazarJTPage = (id: string, motivo: string) => {
    const sol = solicitudesVac.find(s => s.id === id)!
    handleEditarVac(id, { status: 'rechazado', autorizadoPor: userName, fechaAutorizacion: hoy, motivoRechazo: motivo })
    handleAddEmail(generarEmail(sol, 'rechazado', opMap, { motivo }))
  }

  const registrosHoy = useMemo(() => registros.filter(r => r.fecha === hoy), [registros, hoy])
  const statsHoy = useMemo(() => {
    const total = operadores.length
    if (clavesConViaje.size > 0) {
      // Cruzar equipo del coordinador contra bustrax
      const operaron = operadores.filter(o => clavesConViaje.has(o.id)).length
      const noOperaron = total - operaron
      return { activos: total, operaron, noOperaron, pct: total > 0 ? parseFloat(((operaron / total) * 100).toFixed(1)) : 100 }
    }
    const ausentes = new Set(registrosHoy.map(r => r.operadorId)).size
    const operaron = total - ausentes
    return { activos: total, operaron, noOperaron: ausentes, pct: total > 0 ? parseFloat(((operaron / total) * 100).toFixed(1)) : 100 }
  }, [operadores, registrosHoy, clavesConViaje])

  const promedios = useMemo(() => {
    const last30 = HISTORIAL.slice(-30)
    return { pct:(last30.reduce((a,d)=>a+d.pct,0)/last30.length).toFixed(1) }
  }, [])

  const handleGuardar = (r: RegistroAusencia) => {
    setRegistros(p=>[r,...p])
    setSchemaId(null)
    setTab('cierre')
  }

  const allRegs = useMemo(() => registros, [registros])

  const schema = schemaId ? schemaMap[schemaId] : null

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Truck className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Operaciones</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Control de Asistencia</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cierre operativo diario · Fuerza de trabajo</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Promedio / 30d</p>
            <p className={`text-2xl font-extrabold ${Number(promedios.pct)>=90?'text-green-600':'text-yellow-600'}`}>{promedios.pct}%</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => { setSchemaId(null); setTab('registrar') }}
              className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="w-3.5 h-3.5" />
              Registrar incidencia
            </Button>
          </div>
        </div>
      </div>

      {/* Bustrax sync indicator */}
      <div className="flex items-center gap-2">
        {bustraxLoading && (
          <div className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Sincronizando con Bustrax…
          </div>
        )}
        {!bustraxLoading && bustraxUpdatedAt && (
          <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-100 px-3 py-1.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            Bustrax · actualizado {bustraxUpdatedAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            <button onClick={cargarBustrax} className="ml-1 hover:text-green-900 transition-colors" title="Recargar">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        )}
        {!bustraxLoading && bustraxError && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            Error al conectar con Bustrax
            <button onClick={cargarBustrax} className="ml-1 hover:text-red-900 transition-colors" title="Reintentar">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label:'Total HC Operadores', val:statsHoy.activos,   sub:'Activos en nómina',  icon:Users,        color:'text-indigo-600', bg:'bg-indigo-50', border:'border-indigo-100', pct:undefined },
          { label:'Operaron hoy',        val:statsHoy.operaron,  sub:'Hicieron viaje',     icon:CheckCircle2, color:'text-green-600',  bg:'bg-green-50',  border:'border-green-100',  pct:statsHoy.pct },
          { label:'No operaron',         val:statsHoy.noOperaron,sub:'Ausencias del día',  icon:XCircle,      color:'text-red-500',    bg:'bg-red-50',    border:'border-red-100',    pct:undefined },
          { label:'% Operativo',         val:`${statsHoy.pct}%`, sub:'Meta ≥ 90%',        icon:TrendingUp,
            color:statsHoy.pct>=90?'text-green-600':statsHoy.pct>=85?'text-yellow-600':'text-red-600',
            bg:statsHoy.pct>=90?'bg-green-50':'bg-yellow-50',
            border:statsHoy.pct>=90?'border-green-100':'border-yellow-100', pct:undefined },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className={`bg-white rounded-xl border ${s.border} shadow-sm p-4`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">{s.label}</p>
                  <p className={`text-3xl font-extrabold ${s.color}`}>{s.val}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
              </div>
              {s.pct !== undefined && (
                <div className="mt-2">
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all"
                      style={{ width:`${s.pct}%`, background:s.pct>=90?'#10B981':s.pct>=85?'#F59E0B':'#EF4444' }} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          { id: 'cierre'         as Tab, label: 'Cierre del Día',           badge: null },
          { id: 'registrar'      as Tab, label: 'Registrar Incidencia',      badge: null },
          { id: 'historial'      as Tab, label: 'Historial 6 meses',         badge: null },
          ...(rol !== null ? [{ id: 'autorizaciones' as Tab, label: 'Autorizaciones Vacaciones',
            badge: solicitudesVac.filter(s => s.status === 'solicitud_pendiente' || s.status === 'respuesta_colaborador' || s.status === 'pendiente_auth').length }] : []),
        ]).map(({ id, label, badge }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full transition-colors ${tab===id?'bg-indigo-600 text-white':'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {label}
            {badge !== null && badge > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab===id?'bg-white/30 text-white':'bg-orange-100 text-orange-600'}`}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'cierre' && (
        <CierreDelDia
          registros={registros}
          operadores={operadores}
          opMap={opMap}
          rol={rol}
          solicitudesVac={solicitudesVac}
          onIrAutorizaciones={() => setTab('autorizaciones')}
          onAutorizarJT={handleAutorizarJTPage}
          onRechazarJT={handleRechazarJTPage}
          clavesConViajeProp={clavesConViaje}
          bustraxLoadingProp={bustraxLoading}
          onRegistrar={(opId) => { setPreOpId(opId); setSchemaId(null); setTab('registrar') }}
        />
      )}

      {tab === 'registrar' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          {!schema ? (
            <SelectorTipo onSelect={id => setSchemaId(id)} />
          ) : (
            <FormIncidencia
              schema={schema}
              registros={allRegs}
              operadores={operadores}
              opMap={opMap}
              onGuardar={handleGuardar}
              onCancel={() => { setSchemaId(null); setPreOpId(undefined) }}
              initialOpId={preOpId}
            />
          )}
        </div>
      )}

      {tab === 'historial' && <HistorialTab />}

      {tab === 'autorizaciones' && rol !== null && (
        <AutorizacionesTab
          solicitudes={solicitudesVac}
          onEditar={handleEditarVac}
          rol={rol}
          emails={emails}
          onAddEmail={handleAddEmail}
          onMarcarEmailLeido={handleMarcarEmailLeido}
          userName={userName}
          opMap={opMap}
        />
      )}
    </div>
  )
}
