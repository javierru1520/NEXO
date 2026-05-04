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
            uun.id_unidad_negocio,
            un.descripcion AS unidad_negocio,
            COALESCE(e.nomina, u.nomina) AS nomina,
            sv.num_dias
          FROM solicitudes_vacaciones sv
          JOIN empleados e ON e.id_empleado = sv.id_empleado
          LEFT JOIN usuarios u ON u.id_empleado = e.id_empleado AND u.activo = 1
          JOIN usuarios_unidades_negocio uun ON uun.id_usuario = u.id_usuario AND uun.activo = 1
          JOIN unidades_negocios un ON un.id_unidad_negocio = uun.id_unidad_negocio
          WHERE sv.activo = 1
            AND sv.estatus = 'autorizado_jt'
            AND uun.id_unidad_negocio = ${unidades[0].id_unidad_negocio}
            AND sv.fecha_inicio <= ${fechaf}::date
            AND sv.fecha_fin   >= ${fechai}::date
          ORDER BY sv.fecha_inicio`
      : await sql`
          SELECT
            uun.id_unidad_negocio,
            un.descripcion AS unidad_negocio,
            COALESCE(e.nomina, u.nomina) AS nomina,
            sv.num_dias
          FROM solicitudes_vacaciones sv
          JOIN empleados e ON e.id_empleado = sv.id_empleado
          LEFT JOIN usuarios u ON u.id_empleado = e.id_empleado AND u.activo = 1
          JOIN usuarios_unidades_negocio uun ON uun.id_usuario = u.id_usuario AND uun.activo = 1
          JOIN unidades_negocios un ON un.id_unidad_negocio = uun.id_unidad_negocio
          WHERE sv.activo = 1
            AND sv.estatus = 'autorizado_jt'
            AND sv.fecha_inicio <= ${fechaf}::date
            AND sv.fecha_fin   >= ${fechai}::date
          ORDER BY sv.fecha_inicio`

    const vacaciones = rows.map(r => ({
      keyidUn:       r.id_unidad_negocio,
      unidadNegocio: r.unidad_negocio,
      noEmpleado:    r.nomina,
      totalFaltas:   r.num_dias,
    }))

    return NextResponse.json(vacaciones)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
