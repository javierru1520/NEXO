import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// POST — App operadores registra incapacidad
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
      return NextResponse.json(
        { error: 'id_empleado, id_tipo_incapacidad, fecha_inicio y fecha_fin son requeridos' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      `INSERT INTO empleados_incapacidades (
        id_empleado, id_clasificacion, id_tipo_incapacidad,
        aplica_descuento_nomina, fecha, fecha_inicio, fecha_fin,
        fecha_regreso, num_dias, folio_imss, descripcion,
        en_jornada_laboral, id_rol_registra, nombre_registra,
        observaciones, estatus, activo, fecha_creacion, fecha_actualizacion
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'pendiente',1,NOW(),NOW())
       RETURNING *`,
      [
        id_empleado, id_clasificacion ?? null, id_tipo_incapacidad,
        aplica_descuento_nomina ?? 0, fecha ?? null, fecha_inicio, fecha_fin,
        fecha_regreso ?? null, num_dias ?? null, folio_imss ?? null, descripcion ?? null,
        en_jornada_laboral ?? 0, id_rol_registra ?? null, nombre_registra ?? null,
        observaciones ?? null
      ]
    )

    return NextResponse.json({ ok: true, incapacidad: result.rows[0] }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// GET — NEXO consulta incapacidades pendientes para el JT
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const estatus = searchParams.get('estatus') ?? 'pendiente'
    const id_empleado = searchParams.get('id_empleado')

    let query = `
      SELECT ei.*,
             e.nombres, e.apellido_paterno, e.apellido_materno,
             ti.descripcion AS tipo_incapacidad
      FROM empleados_incapacidades ei
      JOIN empleados e ON e.id_empleado = ei.id_empleado
      LEFT JOIN cat_tipos_incapacidad ti ON ti.id_tipo_incapacidad = ei.id_tipo_incapacidad
      WHERE ei.activo = 1 AND ei.estatus = $1
    `
    const params: (string | number)[] = [estatus]

    if (id_empleado) {
      query += ` AND ei.id_empleado = $2`
      params.push(Number(id_empleado))
    }

    query += ` ORDER BY ei.fecha_creacion DESC`

    const result = await pool.query(query, params)
    return NextResponse.json(result.rows)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
