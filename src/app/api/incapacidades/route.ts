import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      id_empleado, id_clasificacion, id_tipo_incapacidad,
      fecha, fecha_inicio, fecha_fin, fecha_regreso,
      num_dias, folio_imss, descripcion, observaciones,
      aplica_descuento_nomina, en_jornada_laboral,
      nombre_registra, id_rol_registra
    } = body

    if (!id_empleado || !id_tipo_incapacidad || !fecha_inicio || !fecha_fin) {
      return NextResponse.json({ error: 'id_empleado, id_tipo_incapacidad, fecha_inicio y fecha_fin son requeridos' }, { status: 400 })
    }

    const rows = await sql`
      INSERT INTO empleados_incapacidades (
        id_empleado, id_clasificacion, id_tipo_incapacidad,
        aplica_descuento_nomina, fecha, fecha_inicio, fecha_fin,
        fecha_regreso, num_dias, folio_imss, descripcion,
        en_jornada_laboral, id_rol_registra, nombre_registra,
        observaciones, estatus, activo, fecha_creacion, fecha_actualizacion
      ) VALUES (
        ${id_empleado}, ${id_clasificacion ?? null}, ${id_tipo_incapacidad},
        ${aplica_descuento_nomina ?? 0}, ${fecha ?? null}, ${fecha_inicio}, ${fecha_fin},
        ${fecha_regreso ?? null}, ${num_dias ?? null}, ${folio_imss ?? null}, ${descripcion ?? null},
        ${en_jornada_laboral ?? 0}, ${id_rol_registra ?? null}, ${nombre_registra ?? null},
        ${observaciones ?? null}, 'pendiente', 1, NOW(), NOW()
      ) RETURNING *
    `

    return NextResponse.json({ ok: true, incapacidad: rows[0] }, { status: 201 })
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
          SELECT ei.*, e.nombres, e.apellido_paterno, e.apellido_materno,
                 ti.descripcion AS tipo_incapacidad
          FROM empleados_incapacidades ei
          JOIN empleados e ON e.id_empleado = ei.id_empleado
          LEFT JOIN cat_tipos_incapacidad ti ON ti.id_tipo_incapacidad = ei.id_tipo_incapacidad
          WHERE ei.activo = 1 AND ei.estatus = ${estatus} AND ei.id_empleado = ${Number(id_empleado)}
          ORDER BY ei.fecha_creacion DESC`
      : await sql`
          SELECT ei.*, e.nombres, e.apellido_paterno, e.apellido_materno,
                 ti.descripcion AS tipo_incapacidad
          FROM empleados_incapacidades ei
          JOIN empleados e ON e.id_empleado = ei.id_empleado
          LEFT JOIN cat_tipos_incapacidad ti ON ti.id_tipo_incapacidad = ei.id_tipo_incapacidad
          WHERE ei.activo = 1 AND ei.estatus = ${estatus}
          ORDER BY ei.fecha_creacion DESC`

    return NextResponse.json(rows)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
