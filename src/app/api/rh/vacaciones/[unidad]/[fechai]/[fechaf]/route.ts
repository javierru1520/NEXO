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
        sv.id_solicitud_vacacion,
        sv.id_empleado,
        e.rfc,
        e.nombres,
        e.apellido_paterno,
        e.apellido_materno,
        sv.fecha_inicio,
        sv.fecha_fin,
        sv.num_dias,
        sv.estatus,
        sv.autorizado_por,
        sv.fecha_autorizacion,
        sv.observaciones,
        un.clave        AS unidad_clave,
        un.descripcion  AS unidad_descripcion
      FROM solicitudes_vacaciones sv
      JOIN empleados e ON e.id_empleado = sv.id_empleado
      JOIN usuarios_unidades_negocio uun ON uun.id_empleado = e.id_empleado AND uun.activo = 1
      JOIN unidades_negocios un ON un.id_unidad_negocio = uun.id_unidad_negocio
      WHERE sv.activo = 1
        AND sv.estatus = 'autorizado_jt'
        AND (un.clave = ${unidad} OR un.id_unidad_negocio::text = ${unidad})
        AND sv.fecha_inicio <= ${fechaf}::date
        AND sv.fecha_fin   >= ${fechai}::date
      ORDER BY sv.fecha_inicio
    `

    return NextResponse.json({ unidad, fechai, fechaf, total: rows.length, vacaciones: rows })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
