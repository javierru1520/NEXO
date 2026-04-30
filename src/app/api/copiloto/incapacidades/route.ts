import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      id_empleado, id_tipo_incapacidad, fecha_inicio, fecha_fin,
      num_dias, folio_imss, descripcion, nombre_registra,
    } = body

    if (!id_empleado || !id_tipo_incapacidad || !fecha_inicio || !fecha_fin) {
      return NextResponse.json(
        { error: 'id_empleado, id_tipo_incapacidad, fecha_inicio y fecha_fin son requeridos' },
        { status: 400 }
      )
    }

    if (id_tipo_incapacidad < 1 || id_tipo_incapacidad > 7) {
      return NextResponse.json(
        { error: 'id_tipo_incapacidad debe estar entre 1 y 7' },
        { status: 400 }
      )
    }

    if (num_dias !== undefined && num_dias <= 0) {
      return NextResponse.json({ error: 'num_dias debe ser mayor a 0' }, { status: 400 })
    }

    if (new Date(fecha_inicio) > new Date(fecha_fin)) {
      return NextResponse.json(
        { error: 'fecha_inicio no puede ser mayor que fecha_fin' },
        { status: 400 }
      )
    }

    const emp = await sql`SELECT id_empleado FROM empleados WHERE id_empleado = ${id_empleado} LIMIT 1`
    if (emp.length === 0) {
      return NextResponse.json({ error: `Empleado ${id_empleado} no encontrado` }, { status: 404 })
    }

    const rows = await sql`
      INSERT INTO empleados_incapacidades (
        id_empleado, id_tipo_incapacidad, fecha_inicio, fecha_fin,
        num_dias, folio_imss, descripcion, nombre_registra,
        estatus, activo, fecha_creacion, fecha_actualizacion
      ) VALUES (
        ${id_empleado}, ${id_tipo_incapacidad}, ${fecha_inicio}, ${fecha_fin},
        ${num_dias ?? null}, ${folio_imss ?? null}, ${descripcion ?? null}, ${nombre_registra ?? null},
        'pendiente', 1, NOW(), NOW()
      )
      RETURNING *
    `

    return NextResponse.json({ ok: true, incapacidad: rows[0] }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
