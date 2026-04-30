import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { estatus, autorizado_por, motivo_rechazo } = await req.json()

    const estados = ['aprobado_coordinador', 'autorizado_jt', 'rechazado']
    if (!estatus || !estados.includes(estatus)) {
      return NextResponse.json(
        { error: `estatus debe ser: ${estados.join(', ')}` },
        { status: 400 }
      )
    }

    if (estatus === 'rechazado' && !motivo_rechazo) {
      return NextResponse.json(
        { error: 'motivo_rechazo es requerido cuando estatus es rechazado' },
        { status: 400 }
      )
    }

    const rows = await sql`
      UPDATE solicitudes_vacaciones SET
        estatus            = ${estatus},
        autorizado_por     = COALESCE(${autorizado_por ?? null}, autorizado_por),
        motivo_rechazo     = COALESCE(${motivo_rechazo ?? null}, motivo_rechazo),
        fecha_autorizacion = CASE WHEN ${estatus} = 'autorizado_jt' THEN NOW() ELSE fecha_autorizacion END,
        fecha_actualizacion = NOW()
      WHERE id_solicitud_vacacion = ${Number(id)}
      RETURNING *
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, solicitud: rows[0] })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
