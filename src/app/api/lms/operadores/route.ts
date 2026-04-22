import { NextRequest, NextResponse } from 'next/server'
import { LIVDM_EMPLEADOS, LIVDM_DEPTOS, LIVDM_PUESTOS } from '@/lib/livdm-data'

// Cursos pendientes por defecto (se remplazarán cuando haya datos reales de capacitación)
const PENDING_DEFAULT = [
  { cap: 'Manejo defensivo en carretera', prog: 0, dl: '7 días',  s: 'crit' },
  { cap: 'Checklist preoperacional',       prog: 0, dl: '14 días', s: 'risk' },
  { cap: 'NOM-087 Seguridad vial',         prog: 0, dl: '21 días', s: 'warn' },
]

function deriveStatus(pct: number): string {
  if (pct >= 90) return 'ok'
  if (pct >= 70) return 'warn'
  if (pct >= 40) return 'risk'
  if (pct === 0)  return 'nostart'
  return 'crit'
}

function derivePending(pct: number) {
  return PENDING_DEFAULT
    .slice(0, pct === 0 ? 3 : pct < 50 ? 2 : 1)
    .map(c => ({
      ...c,
      prog: pct > 0 ? Math.min(pct, c.prog + pct) : 0,
    }))
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const nomina = searchParams.get('nomina') || ''

  if (!nomina) {
    return NextResponse.json({ error: 'Parámetro nomina requerido' }, { status: 400 })
  }

  const operadores = LIVDM_EMPLEADOS
    .filter(e => e.jefe_inmed === nomina && e.st === 1)
    .map(e => {
      const depto  = LIVDM_DEPTOS.find(d => d.clave === e.depto)
      const puesto = LIVDM_PUESTOS.find(p => p.clave === e.puesto)

      // Porcentaje simulado hasta conectar datos reales de capacitación
      const seed = parseInt(e.clave.slice(-2), 10) || 0
      const pct  = seed % 5 === 0 ? 0 : Math.min(95, (seed * 7) % 100)
      const status = deriveStatus(pct)

      return {
        id:      e.clave,
        name:    e.nombre_completo,
        coord:   e.jefe_inmed,
        dep:     depto?.descripcion  ?? `Depto ${e.depto}`,
        nivel:   puesto?.descripcion ?? 'Operador',
        pct,
        status,
        pending: derivePending(pct),
      }
    })

  return NextResponse.json(operadores)
}
