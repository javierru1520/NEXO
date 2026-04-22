// Calculate salary components from gross salary
export function calcularSalario(sueldoBruto: number, periodoPago: 'catorcenal' | 'semanal' = 'catorcenal') {
  const uma = 108.57  // UMA 2024
  const limiteUma = uma * 25
  const factor = periodoPago === 'catorcenal' ? 30.42 : 30

  const sd = sueldoBruto / factor
  const despensa = sueldoBruto <= limiteUma ? sueldoBruto * 0.10 : 0
  const asistencia = sueldoBruto * 0.06
  const puntualidad = sueldoBruto * 0.03
  const sdoMensual = sueldoBruto + despensa + asistencia + puntualidad
  const sCatorcenal = sdoMensual / (periodoPago === 'catorcenal' ? 2 : 4)
  const sdi = (sdoMensual / factor) + (sueldoBruto * 0.1528 / factor) // SDI approximation

  return {
    sueldo_mensual: sueldoBruto,
    sdo_mensual: parseFloat(sdoMensual.toFixed(2)),
    sd: parseFloat(sd.toFixed(2)),
    sdi: parseFloat(sdi.toFixed(2)),
    despensa: parseFloat(despensa.toFixed(2)),
    asistencia: parseFloat(asistencia.toFixed(2)),
    puntualidad: parseFloat(puntualidad.toFixed(2)),
    s_catorcenal: parseFloat(sCatorcenal.toFixed(2)),
    antiguedad: 0,
  }
}

// Calculate vacation days by seniority (LFT Mexico)
export function calcularDiasVacaciones(fechaAlta: string, fechaRef: string = new Date().toISOString().split('T')[0]): number {
  const alta = new Date(fechaAlta)
  const ref = new Date(fechaRef)
  const years = Math.floor((ref.getTime() - alta.getTime()) / (365.25 * 24 * 60 * 60 * 1000))

  if (years < 1) return 0
  if (years === 1) return 12
  if (years === 2) return 14
  if (years === 3) return 16
  if (years === 4) return 18
  if (years === 5) return 20
  if (years <= 9) return 22
  if (years <= 14) return 24
  if (years <= 19) return 26
  if (years <= 24) return 28
  return 30
}

// Calculate vacation prima (25% minimum by LFT)
export function calcularPrima(diasVac: number, sd: number, porcPrima: number = 25): number {
  return parseFloat((diasVac * sd * (porcPrima / 100)).toFixed(2))
}

// Calculate working days between dates (excluding weekends)
export function calcularDiasHabiles(fInicial: string, fFinal: string, descSab: boolean, descDom: boolean): number {
  const start = new Date(fInicial)
  const end = new Date(fFinal)
  let days = 0
  const current = new Date(start)

  while (current <= end) {
    const dow = current.getDay()
    if (descSab && dow === 6) { current.setDate(current.getDate() + 1); continue }
    if (descDom && dow === 0) { current.setDate(current.getDate() + 1); continue }
    days++
    current.setDate(current.getDate() + 1)
  }
  return days
}

// Format currency MXN
export function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
}

// Get employee status label
export function getStatusLabel(st: number): { label: string; color: string } {
  switch (st) {
    case 1: return { label: 'Activo', color: 'green' }
    case 2: return { label: 'Inactivo', color: 'yellow' }
    case 5: return { label: 'Baja', color: 'red' }
    default: return { label: 'Desconocido', color: 'gray' }
  }
}

// Generate employee key (nómina number)
export function generarClave(existingClaves: string[]): string {
  const nums = existingClaves.map(c => parseInt(c)).filter(n => !isNaN(n))
  const max = nums.length > 0 ? Math.max(...nums) : 1000
  return String(max + 1)
}
