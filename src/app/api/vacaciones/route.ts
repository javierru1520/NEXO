import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// POST — App operadores crea solicitud de vacaciones
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id_empleado, fecha_inicio, fecha_fin, num_dias, observaciones } = body

    if (!id_empleado || !fecha_inicio || !fecha_fin || !num_dias) {
      return NextResponse.json({ error: 'id_empleado, fecha_inicio, fecha_fin y num_dias son requeridos' }, { status: 400 })
    }

    const result = await pool.query(
      `INSERT INTO solicitudes_vacaciones (id_empleado, fecha_inicio, fecha_fin, num_dias, observaciones)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id_empleado, fecha_inicio, fecha_fin, num_dias, observaciones ?? null]
    )

    return NextResponse.json({ ok: true, solicitud: result.rows[0] }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// GET — NEXO consulta solicitudes (JT ve pendientes)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const estatus = searchParams.get('estatus') ?? 'pendiente'
    const id_empleado = searchParams.get('id_empleado')

    let query = `
      SELECT sv.*,
             e.nombres, e.apellido_paterno, e.apellido_materno
      FROM solicitudes_vacaciones sv
      JOIN empleados e ON e.id_empleado = sv.id_empleado
      WHERE sv.activo = 1 AND sv.estatus = $1
    `
    const params: (string | number)[] = [estatus]

    if (id_empleado) {
      query += ` AND sv.id_empleado = $2`
      params.push(Number(id_empleado))
    }

    query += ` ORDER BY sv.fecha_creacion DESC`

    const result = await pool.query(query, params)
    return NextResponse.json(result.rows)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
