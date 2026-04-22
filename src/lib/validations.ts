// ── RFC ──────────────────────────────────────────────────────────────────────
// Formato: 4 letras + 6 dígitos fecha + 3 homoclave (persona física)
//          3 letras + 6 dígitos fecha + 3 homoclave (persona moral)
const RFC_REGEX = /^[A-Z&Ñ]{3,4}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{3}$/

export function validarRFC(rfc: string): boolean {
  return RFC_REGEX.test(rfc.toUpperCase().trim())
}

export function mensajeRFC(rfc: string): string | null {
  const v = rfc.toUpperCase().trim()
  if (!v) return 'El RFC es requerido'
  if (v.length < 12) return 'El RFC debe tener al menos 12 caracteres'
  if (v.length > 13) return 'El RFC no puede tener más de 13 caracteres'
  if (!RFC_REGEX.test(v)) return 'Formato de RFC inválido (ej: GOAM850101ABC)'
  return null
}

// ── CURP ─────────────────────────────────────────────────────────────────────
const CURP_REGEX = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{2}[BCDFGHJKLMNÑPQRSTVWXYZ]{3}[A-Z0-9][0-9]$/

export function validarCURP(curp: string): boolean {
  return CURP_REGEX.test(curp.toUpperCase().trim())
}

// ── IMSS ─────────────────────────────────────────────────────────────────────
export function validarIMSS(nss: string): boolean {
  return /^[0-9]{11}$/.test(nss.trim())
}

// ── FECHAS ───────────────────────────────────────────────────────────────────
export function esFechaFutura(fecha: string): boolean {
  if (!fecha) return false
  return new Date(fecha) > new Date()
}

export function esFechaPasada(fecha: string, diasMargen = 0): boolean {
  if (!fecha) return false
  const limite = new Date()
  limite.setDate(limite.getDate() - diasMargen)
  return new Date(fecha) < limite
}

export function fechaEnRango(fecha: string, desde: string, hasta: string): boolean {
  if (!fecha || !desde || !hasta) return false
  const f = new Date(fecha)
  return f >= new Date(desde) && f <= new Date(hasta)
}

// ── SUELDO ───────────────────────────────────────────────────────────────────
export function validarSueldo(sueldo: number): string | null {
  if (!sueldo || sueldo <= 0) return 'El sueldo debe ser mayor a 0'
  if (sueldo < 100) return 'Sueldo muy bajo — verifique que sea mensual'
  if (sueldo > 500_000) return 'Sueldo muy alto — verifique el monto'
  return null
}

// ── TELÉFONO ─────────────────────────────────────────────────────────────────
export function validarTelefono(tel: string): boolean {
  return /^[0-9]{10}$/.test(tel.replace(/[\s\-().]/g, ''))
}

// ── SESSION ──────────────────────────────────────────────────────────────────
const SESSION_HOURS = 10

export function guardarSesion(data: object) {
  localStorage.setItem('nexo_auth', JSON.stringify({
    ts: Date.now(),
    ...data,
  }))
}

export function sesionValida(): boolean {
  try {
    const raw = localStorage.getItem('nexo_auth')
    if (!raw) return false
    // backwards compat: si es solo 'true' (string) aceptar pero marcar como sin ts
    if (raw === 'true') return true
    const { ts } = JSON.parse(raw)
    if (!ts) return true
    const horasTranscurridas = (Date.now() - ts) / (1000 * 60 * 60)
    return horasTranscurridas < SESSION_HOURS
  } catch {
    return false
  }
}
