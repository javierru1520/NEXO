import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ unidad: string; fechai: string; fechaf: string }> }
) {
  try {
    const { unidad, fechai, fechaf } = await params

    const rows = await sql`
      SELECT
        ei.id_empleado_incapacidad,
        ei.id_empleado,
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
        ei.fecha_actualizacion,
        un.clave              AS unidad_clave,
        un.descripcion        AS unidad_descripcion
      FROM empleados_incapacidades ei
      JOIN empleados e ON e.id_empleado = ei.id_empleado
      JOIN cat_tipos_incapacidad ti ON ti.id_tipo_incapacidad = ei.id_tipo_incapacidad
      JOIN usuarios_unidades_negocio uun ON uun.id_empleado = e.id_empleado AND uun.activo = 1
      JOIN unidades_negocios un ON un.id_unidad_negocio = uun.id_unidad_negocio
      WHERE ei.activo = 1
        AND ei.estatus = 'autorizado_jt'
        AND (un.clave = ${unidad} OR un.id_unidad_negocio::text = ${unidad})
        AND ei.fecha_inicio <= ${fechaf}::date
        AND ei.fecha_fin    >= ${fechai}::date
      ORDER BY ei.fecha_inicio
    `

    return NextResponse.json({ unidad, fechai, fechaf, total: rows.length, incapacidades: rows })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
