import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ unidad: string; fechai: string; fechaf: string }> }
) {
  try {
    const { unidad, fechai, fechaf } = await params

    // Buscar id_unidad_negocio por clave o por id
    const unidades = await sql`
      SELECT id_unidad_negocio FROM unidades_negocios
      WHERE clave = ${unidad} OR id_unidad_negocio::text = ${unidad} OR LOWER(descripcion) LIKE ${'%' + unidad.toLowerCase() + '%'}
      LIMIT 1
    `

    // Si no encuentra la unidad, devuelve todo (sin filtro de unidad)
    const rows = unidades.length > 0
      ? await sql`
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
            sv.observaciones
          FROM solicitudes_vacaciones sv
          JOIN empleados e ON e.id_empleado = sv.id_empleado
          JOIN usuarios u ON u.id_empleado = e.id_empleado AND u.activo = 1
          JOIN usuarios_unidades_negocio uun ON uun.id_usuario = u.id_usuario AND uun.activo = 1
          WHERE sv.activo = 1
            AND sv.estatus = 'autorizado_jt'
            AND uun.id_unidad_negocio = ${unidades[0].id_unidad_negocio}
            AND sv.fecha_inicio <= ${fechaf}::date
            AND sv.fecha_fin   >= ${fechai}::date
          ORDER BY sv.fecha_inicio`
      : await sql`
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
            sv.observaciones
          FROM solicitudes_vacaciones sv
          JOIN empleados e ON e.id_empleado = sv.id_empleado
          WHERE sv.activo = 1
            AND sv.estatus = 'autorizado_jt'
            AND sv.fecha_inicio <= ${fechaf}::date
            AND sv.fecha_fin   >= ${fechai}::date
          ORDER BY sv.fecha_inicio`

    return NextResponse.json({ unidad, fechai, fechaf, total: rows.length, vacaciones: rows })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
