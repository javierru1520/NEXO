import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id_empleado, fecha_inicio, fecha_fin, observaciones } = body

    if (!id_empleado || !fecha_inicio || !fecha_fin) {
      return NextResponse.json(
        { error: 'id_empleado, fecha_inicio y fecha_fin son requeridos' },
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

    const dias_calculados = Math.round((ff.getTime() - fi.getTime()) / 86400000) + 1

    const emp = await sql`SELECT id_empleado FROM empleados WHERE id_empleado = ${id_empleado} LIMIT 1`
    if (emp.length === 0) {
      return NextResponse.json({ error: `Empleado ${id_empleado} no encontrado` }, { status: 404 })
    }

    const rows = await sql`
      INSERT INTO solicitudes_vacaciones (id_empleado, fecha_inicio, fecha_fin, num_dias, observaciones, estatus, activo)
      VALUES (${id_empleado}, ${fecha_inicio}, ${fecha_fin}, ${dias_calculados}, ${observaciones ?? null}, 'pendiente', 1)
      RETURNING *
    `

    return NextResponse.json({ ok: true, solicitud: rows[0] }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
