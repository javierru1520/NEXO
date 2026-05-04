import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

const fmt = (d: Date | string) => new Date(d).toISOString().slice(0, 10)

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
            COALESCE(e.nomina, u.nomina)                                          AS nomina,
            CONCAT_WS(' ', e.apellido_paterno, e.apellido_materno, e.nombres)     AS nombre,
            ei.folio_imss                                                          AS folio,
            ei.num_dias                                                            AS dias_ocupados,
            ei.fecha_inicio,
            ei.fecha_fin,
            ti.descripcion                                                         AS concepto,
            ei.descripcion                                                         AS detalle
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
            COALESCE(e.nomina, u.nomina)                                          AS nomina,
            CONCAT_WS(' ', e.apellido_paterno, e.apellido_materno, e.nombres)     AS nombre,
            ei.folio_imss                                                          AS folio,
            ei.num_dias                                                            AS dias_ocupados,
            ei.fecha_inicio,
            ei.fecha_fin,
            ti.descripcion                                                         AS concepto,
            ei.descripcion                                                         AS detalle
          FROM empleados_incapacidades ei
          JOIN empleados e ON e.id_empleado = ei.id_empleado
          JOIN cat_tipos_incapacidad ti ON ti.id_tipo_incapacidad = ei.id_tipo_incapacidad
          LEFT JOIN usuarios u ON u.id_empleado = e.id_empleado AND u.activo = 1
          JOIN usuarios_unidades_negocio uun ON uun.id_usuario = u.id_usuario AND uun.activo = 1
          WHERE ei.activo = 1
            AND ei.estatus = 'autorizado_jt'
            AND ei.fecha_inicio <= ${fechaf}::date
            AND ei.fecha_fin    >= ${fechai}::date
          ORDER BY ei.fecha_inicio`

    return NextResponse.json(rows.map(r => ({
      nomina:             r.nomina,
      nombre:             r.nombre,
      folio:              r.folio,
      diasOcupados:       r.dias_ocupados,
      fInicioIncapacidad: fmt(r.fecha_inicio),
      fFinIncapacidad:    fmt(r.fecha_fin),
      concepto:           r.concepto,
      detalle:            r.detalle,
    })))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
