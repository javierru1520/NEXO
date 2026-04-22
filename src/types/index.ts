// CATALOGS
export interface Empresa { clave: number; razon_social: string; descripcion: string; periodo_pago: 'catorcenal' | 'semanal'; status: number }
export interface Departamento { clave: number; descripcion: string; status: number }
export interface Puesto { clave: number; descripcion: string; st: number }
export interface CentroCostos { clave: number; descripcion: string; desc_corta: string }
export interface UnidadNegocio { clave: number; descripcion: string }
export interface TipoBaja { clave: number; descripcion: string; status: number }
export interface MotivoBaja { clave: number; descripcion: string; status: number }
export interface CausaBaja { clave: number; descripcion: string; tipo: number; motivo: number; status: number }
export interface CausaIMSS { clave: number; descripcion: string }
export interface ModoIncap { clave: number; descripcion: string }
export interface ConcIncap { clave: number; descripcion: string; colorcode: string }
export interface CategoriaCurso { clave: number; descripcion: string }
export interface EtapaCapacitacion { clave: number; descripcion: string }
export interface ModalidadCurso { clave: number; descripcion: string }

// EMPLOYEE MASTER
export interface Empleado {
  clave: string
  a_paterno: string
  a_materno: string
  nombre: string
  nombre_completo: string
  rfc: string
  imss: string
  curp: string
  sexo: 'M' | 'F'
  f_nacimiento: string
  edad: number
  telefono: string
  tel_contacto: string
  contacto: string
  calle: string
  colonia: string
  cp: string
  localidad: string
  estado: string
  rh: string
  email_corp?: string
  email_personal?: string
  foto_url?: string
  // Labor
  st: 1 | 2 | 5  // 1=Activo, 2=Inactivo, 5=Baja
  alta: string
  empresa: number
  depto: number
  puesto: number
  ccostos: number
  unidad_negocios: number
  jefe_inmed: string
  fecha_baja?: string
  causas_baja?: string
  // Salary
  sueldo_mensual: number
  sdo_mensual: number
  sd: number
  sdi: number
  despensa: number
  asistencia: number
  puntualidad: number
  antiguedad: number
  s_catorcenal: number
  cuenta_bancaria?: string
  banco?: string
  clabe?: string
  // Social
  f_nacimiento_loc?: string
  edo_civil?: string
  nivel_estudios?: string
  // Puesto catalog
  grado_salarial?: string
  tipo_costo?: string
  nivel_puesto?: string
  // Contract
  fecha_contrato?: string
  tipo_contrato?: string
  // Tracking
  usuario: string
  ult_mod: string
}

// PROVISIONALS (Alta provisional)
export interface AltaProvisional {
  numero: number
  clave: string
  nombre_completo: string
  a_paterno: string
  a_materno: string
  nombre: string
  f_nacimiento: string
  sexo: 'M' | 'F'
  rfc: string
  empresa: number
  depto: number
  puesto: number
  ccostos: number
  unidad_negocios: number
  sueldo_mensual: number
  ayuda_mensual: number
  fecha_ingreso: string
  fecha_contrato: string
  solicito: string
  autorizo: string
  grado_salarial?: string
  tipo_costo?: string
  nivel_puesto?: string
  observaciones: string
  fecha_captura: string
  fecha_procesada?: string
  status: 1 | 2 | 3  // 1=Aprobado, 2=Provisional, 3=Procesando
  usuario: string

  // Step 1 extras
  curp?: string
  imss?: string
  grupo_sanguineo?: string
  estado_civil?: string
  telefono?: string
  celular?: string
  email_personal?: string
  calle?: string
  colonia?: string
  cp?: string
  ciudad?: string
  estado?: string
  contacto_emergencia?: string
  tel_emergencia?: string

  // Step 2 - Physical data
  tipo_empleado?: 'Sindicalizado' | 'Confianza'
  altura?: string
  peso?: string
  complexion?: string
  color_cabello?: string
  color_ojos?: string
  talla_ropa?: string
  talla_zapato?: string
  senas_particulares?: string

  // Step 3 extras
  jefe_inmediato?: string
  tipo_contrato?: string
  horario?: string
  unidad_negocio_desc?: string

  // Step 5 - Socioeconomic
  num_dependientes?: number
  tipo_vivienda?: string
  tiene_vehiculo?: boolean
  marca_vehiculo?: string
  nivel_estudios_alta?: string
  ocupacion_anterior?: string
  nombre_escuela?: string
  promedio?: string

  // Step 6 - Recommendation
  fue_recomendado?: boolean
  recomendado_por?: string
  relacion_recomendador?: string

  // Step 7 - License
  tiene_licencia?: boolean
  tipo_licencia?: string
  num_licencia?: string
  vence_licencia?: string
  licencia_federal?: boolean

  // Bancarios (capturados en alta, transferidos al aprobar)
  banco?: string
  cuenta_bancaria?: string
  clabe?: string

  // Step 8 - Documents
  doc_apto_medico?: 'pendiente' | 'cargado'
  doc_socioeconomico?: 'pendiente' | 'cargado'
  doc_carta_oferta?: 'pendiente' | 'cargado'
  doc_csf?: 'pendiente' | 'cargado'
  doc_psicometrico?: 'pendiente' | 'cargado'
  doc_foto?: 'pendiente' | 'cargado'

  // Completion tracking
  paso_actual?: number
}

// TERMINATIONS
export interface Baja {
  numero: number
  clave: string
  fecha_baja: string
  jefe_actual: string
  servicio?: string          // unidad/ruta del operador
  tipo_baja: number
  motivo_baja: number
  causa_baja: number
  causa_detalle: string
  categoria: string
  rotacion_controlable: boolean
  tipo_rotacion: string
  causaimss: number
  cbr: string
  firmorenuncia: boolean
  recontratable: boolean
  prestamo_pdt: boolean
  dev_uniforme: boolean
  dev_radio: boolean
  marca_radio?: string
  serie_radio?: string
  vb_jefe: boolean
  baja_negociada: boolean
  // baja negociada expansion
  negocio?: string
  autorizo_neg?: string
  monto_negociado?: number
  det_negociacion?: string
  observaciones: string
  usuario: string
  fecha_captura: string
}

// REHIRE
export interface SolicitudReingreso {
  numero: number
  clave: string
  empresa: number
  depto: number
  puesto: number
  ccostos: number
  unidad_negocios: number
  sueldo_mensual: number
  mant_antiq: boolean
  tipo_contrato?: 'determinado' | 'indeterminado'
  turno?: string
  motivo_reingreso?: string
  solicito: string
  observaciones: string
  f_reingreso: string
  f_contrato: string
  f_solicitud: string
  // Reclutado / referido (GIRON: reing02a.php)
  fue_reclutado?: boolean
  empresa_reclutadora?: string
  reclutador?: string
  clave_ref?: string
  nombre_ref?: string
  status: 1 | 2 | 3
  usuario: string
}

// VACATIONS
export interface Vacacion {
  numero: number
  clave: string
  year: number
  periodo: string
  catorcena: string
  prima: number
  dias_vac: number
  dias_lab: number
  f_inicial: string
  f_final: string
  desc_sab: boolean
  desc_dom: boolean
  vop: 'V' | 'P'
  glob_catna: number
  base_catna: number
  dias_catna: number
  glob_diario: number
  base_diario: number
  porc_prima: number
  prima_glob: number
  prima_vac: number
  comp_prima: number
  d_vacaciones: number
  p_dias_vac: number
  p_dias_lab: number
  usuario: string
  fecha_captura: string
}

// INCAPACIDADES
export interface Incapacidad {
  numero: number
  clave: string
  folio: string
  concepto: number
  modo: number
  f_inicial: string
  f_final: string
  dias: number
  observaciones: string
  catorcena: string
  usuario: string
  fecha_captura: string
}

// LICENCIAS
export interface Licencia {
  numero: number
  clave: string
  tipo: string
  licencia: string
  vence: string
  federal: boolean
  estatal: boolean
  antidop?: string
}

// CAPACITACION
export interface CursoCatalogo {
  clave: number
  nombre: string
  nombre_corto: string
  categoria: number
  etapa: number
  modalidad: number
  objetivo: string
  duracion_horas: number
  costo: number
  calificacion_minima: number
  audiencia_max: number
  status: number
}

export interface CursoPrograma {
  numero: number
  curso: number
  fecha: string
  instructor: string
  costo_real: number
  audiencia_estimada: number
  status: 'programado' | 'en_curso' | 'terminado' | 'cancelado'
  observaciones: string
  usuario: string
}

export interface AsistenteCurso {
  numero: number
  curso_programa: number
  clave_emp: string
  asistio: boolean
  aprobado: boolean
  calificacion?: number
  usuario: string
}

// HISTORIAL
export interface HistorialPersonal {
  numero: number
  clave: string
  fecha: string
  movimiento: 1 | 2 | 3 | 4  // 1=Alta, 2=Baja, 3=Cambio puesto, 4=Cambio sueldo
  sueldo_inicial: number
  sueldo_final: number
  puesto_inicial: number
  puesto_final: number
  depto_inicial: number
  depto_final: number
  observaciones: string
  usuario: string
}

// EMPLEADOS ANTERIORES
export interface EmpleoAnterior {
  numero: number
  clave: string
  empresa: string
  f_inicio: string
  f_fin: string
  years: number
  months: number
  puesto_anterior: string
}

// PROSPECTOS BAJA
export interface ProspectoBaja {
  id: number
  clave: string
  reporto: string
  tipo: string
  causa_probable: string
  notas: string
  status: 'Revisado' | 'Pendiente'
  fecha: string
  usuario: string
}

// REGISTRO ASISTENCIA
export interface RegistroAsistencia {
  id: string          // clave-fecha
  clave: string
  fecha: string
  tipo: 'asistio' | 'falta' | 'descanso' | 'vacaciones' | 'incapacidad' | 'permiso'
  justificado: boolean
  notas: string
  capturadoPor: string
}

// USER
export interface Usuario {
  nomina: string
  nombre: string
  tipo: string
  nivel: number
  empresa: number
  activo: boolean
}
