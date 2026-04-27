import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// GET /api/rh/vacaciones/{unidad}/{fechai}/{fechaf}
// Odoo/prenomina consume este endpoint para extraer vacaciones autorizadas por unidad y rango de fechas
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ unidad: string; fechai: string; fechaf: string }> }
) {
  try {
    const { unidad, fechai, fechaf } = await params

    const result = await pool.query(
      `SELECT
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
        un.clave   AS unidad_clave,
        un.descripcion AS unidad_descripcion
       FROM solicitudes_vacaciones sv
       JOIN empleados e ON e.id_empleado = sv.id_empleado
       JOIN usuarios_unidades_negocio uun ON uun.id_empleado = e.id_empleado AND uun.activo = 1
       JOIN unidades_negocios un ON un.id_unidad_negocio = uun.id_unidad_negocio
       WHERE sv.activo = 1
         AND sv.estatus = 'autorizado_jt'
         AND (un.clave = $1 OR un.id_unidad_negocio::text = $1)
         AND sv.fecha_inicio <= $3::date
         AND sv.fecha_fin   >= $2::date
       ORDER BY sv.fecha_inicio`,
      [unidad, fechai, fechaf]
    )

    return NextResponse.json({
      unidad,
      fechai,
      fechaf,
      total: result.rowCount,
      vacaciones: result.rows,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
