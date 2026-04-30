import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id_empleado, nomina, fecha_inicio, fecha_fin, num_dias, observaciones } = body

    if (!id_empleado && !nomina) {
      return NextResponse.json({ error: 'Debes proveer id_empleado o nomina' }, { status: 400 })
    }

    if (!fecha_inicio || !fecha_fin) {
      return NextResponse.json(
        { error: 'fecha_inicio y fecha_fin son requeridos' },
        { status: 400 }
      )
    }

    const fi = new Date(fecha_inicio)
    const ff = new Date(fecha_fin)

    if (fi > ff) {
      return NextResponse.json(
        { error: 'fecha_inicio no puede ser mayor que fecha_fin' },
        { status: 400 }
      )
    }

    const dias_calculados = Math.floor((ff.getTime() - fi.getTime()) / (1000 * 60 * 60 * 24)) + 1

    if (num_dias !== undefined && num_dias <= 0) {
      return NextResponse.json({ error: 'num_dias debe ser mayor a 0' }, { status: 400 })
    }

    const dias_finales = num_dias ?? dias_calculados

    const emp = id_empleado
      ? await sql`SELECT id_empleado FROM empleados WHERE id_empleado = ${id_empleado} LIMIT 1`
      : await sql`SELECT id_empleado FROM empleados WHERE nomina = ${String(nomina)} LIMIT 1`

    if (emp.length === 0) {
      return NextResponse.json(
        { error: 'Empleado no encontrado en NEXO. Verifica id_empleado o nomina con tu administrador.' },
        { status: 404 }
      )
    }

    const id_real = emp[0].id_empleado

    const rows = await sql`
      INSERT INTO solicitudes_vacaciones (id_empleado, fecha_inicio, fecha_fin, num_dias, observaciones, estatus, activo)
      VALUES (${id_real}, ${fecha_inicio}, ${fecha_fin}, ${dias_finales}, ${observaciones ?? null}, 'pendiente', 1)
      RETURNING *
    `

    return NextResponse.json({ ok: true, solicitud: rows[0] }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
