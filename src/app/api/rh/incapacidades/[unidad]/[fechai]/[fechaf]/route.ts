import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ unidad: string; fechai: string; fechaf: string }> }
) {
  try {
    const { unidad, fechai, fechaf } = await params

    const unidades = await sql`
      SELECT id_unidad_negocio FROM unidades_negocios
      WHERE clave = ${unidad} OR id_unidad_negocio::text = ${unidad} OR LOWER(descripcion) LIKE ${'%' + unidad.toLowerCase() + '%'}
      LIMIT 1
    `

    const rows = unidades.length > 0
      ? await sql`
          SELECT
            ei.id_empleado_incapacidad,
            ei.id_empleado,
            COALESCE(e.nomina, u.nomina) AS nomina,
            e.rfc,
            e.nombres,
            e.apellido_paterno,
            e.apellido_materno,
            ti.descripcion        AS tipo_incapacidad,
            ei.fecha_inicio,
            ei.fecha_fin,
            ei.fecha_regreso,
            ei.num_dias,
            ei.folio_imss,
            ei.aplica_descuento_nomina,
            ei.descripcion,
            ei.estatus,
            ei.autoriza,
            ei.fecha_actualizacion
          FROM empleados_incapacidades ei
          JOIN empleados e ON e.id_empleado = ei.id_empleado
          JOIN cat_tipos_incapacidad ti ON ti.id_tipo_incapacidad = ei.id_tipo_incapacidad
          LEFT JOIN usuarios u ON u.id_empleado = e.id_empleado AND u.activo = 1
          JOIN usuarios_unidades_negocio uun ON uun.id_usuario = u.id_usuario AND uun.activo = 1
          WHERE ei.activo = 1
            AND ei.estatus = 'autorizado_jt'
            AND uun.id_unidad_negocio = ${unidades[0].id_unidad_negocio}
            AND ei.fecha_inicio <= ${fechaf}::date
            AND ei.fecha_fin    >= ${fechai}::date
          ORDER BY ei.fecha_inicio`
      : await sql`
          SELECT
            ei.id_empleado_incapacidad,
            ei.id_empleado,
            COALESCE(e.nomina, u.nomina) AS nomina,
            e.rfc,
            e.nombres,
            e.apellido_paterno,
            e.apellido_materno,
            ti.descripcion        AS tipo_incapacidad,
            ei.fecha_inicio,
            ei.fecha_fin,
            ei.fecha_regreso,
            ei.num_dias,
            ei.folio_imss,
            ei.aplica_descuento_nomina,
            ei.descripcion,
            ei.estatus,
            ei.autoriza,
            ei.fecha_actualizacion
          FROM empleados_incapacidades ei
          JOIN empleados e ON e.id_empleado = ei.id_empleado
          JOIN cat_tipos_incapacidad ti ON ti.id_tipo_incapacidad = ei.id_tipo_incapacidad
          LEFT JOIN usuarios u ON u.id_empleado = e.id_empleado AND u.activo = 1
          WHERE ei.activo = 1
            AND ei.estatus = 'autorizado_jt'
            AND ei.fecha_inicio <= ${fechaf}::date
            AND ei.fecha_fin    >= ${fechai}::date
          ORDER BY ei.fecha_inicio`

    return NextResponse.json({ unidad, fechai, fechaf, total: rows.length, incapacidades: rows })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
