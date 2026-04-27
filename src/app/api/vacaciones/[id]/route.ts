import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// PATCH — JT autoriza o rechaza una solicitud
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { estatus, autorizado_por, motivo_rechazo } = body

    const estados = ['aprobado_coordinador', 'autorizado_jt', 'rechazado']
    if (!estatus || !estados.includes(estatus)) {
      return NextResponse.json({ error: `estatus debe ser: ${estados.join(', ')}` }, { status: 400 })
    }

    const result = await pool.query(
      `UPDATE solicitudes_vacaciones SET
        estatus = $1,
        autorizado_por = COALESCE($2, autorizado_por),
        fecha_autorizacion = CASE WHEN $1 = 'autorizado_jt' THEN NOW() ELSE fecha_autorizacion END,
        motivo_rechazo = COALESCE($3, motivo_rechazo),
        fecha_actualizacion = NOW()
       WHERE id_solicitud_vacacion = $4
       RETURNING *`,
      [estatus, autorizado_por ?? null, motivo_rechazo ?? null, Number(id)]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, solicitud: result.rows[0] })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
