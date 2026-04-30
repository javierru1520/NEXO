import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { estatus, autoriza, motivo_rechazo } = await req.json()

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
      UPDATE empleados_incapacidades SET
        estatus             = ${estatus},
        autoriza            = COALESCE(${autoriza ?? null}, autoriza),
        fecha_actualizacion = NOW()
      WHERE id_empleado_incapacidad = ${Number(id)}
      RETURNING *
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Incapacidad no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, incapacidad: rows[0] })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
