import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id_empleado, fecha_inicio, fecha_fin, num_dias, observaciones } = body

    if (!id_empleado || !fecha_inicio || !fecha_fin || !num_dias) {
      return NextResponse.json({ error: 'id_empleado, fecha_inicio, fecha_fin y num_dias son requeridos' }, { status: 400 })
    }

    const rows = await sql`
      INSERT INTO solicitudes_vacaciones (id_empleado, fecha_inicio, fecha_fin, num_dias, observaciones)
      VALUES (${id_empleado}, ${fecha_inicio}, ${fecha_fin}, ${num_dias}, ${observaciones ?? null})
      RETURNING *
    `

    return NextResponse.json({ ok: true, solicitud: rows[0] }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const estatus = searchParams.get('estatus') ?? 'pendiente'
    const id_empleado = searchParams.get('id_empleado')

    const rows = id_empleado
      ? await sql`
          SELECT sv.*, e.nombres, e.apellido_paterno, e.apellido_materno
          FROM solicitudes_vacaciones sv
          JOIN empleados e ON e.id_empleado = sv.id_empleado
          WHERE sv.activo = 1 AND sv.estatus = ${estatus} AND sv.id_empleado = ${Number(id_empleado)}
          ORDER BY sv.fecha_creacion DESC`
      : await sql`
          SELECT sv.*, e.nombres, e.apellido_paterno, e.apellido_materno
          FROM solicitudes_vacaciones sv
          JOIN empleados e ON e.id_empleado = sv.id_empleado
          WHERE sv.activo = 1 AND sv.estatus = ${estatus}
          ORDER BY sv.fecha_creacion DESC`

    return NextResponse.json(rows)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
