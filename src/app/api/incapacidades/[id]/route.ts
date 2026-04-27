import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// PATCH — JT autoriza o rechaza una incapacidad
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { estatus, autoriza } = body

    const estados = ['autorizado_jt', 'rechazado']
    if (!estatus || !estados.includes(estatus)) {
      return NextResponse.json({ error: `estatus debe ser: ${estados.join(', ')}` }, { status: 400 })
    }

    const result = await pool.query(
      `UPDATE empleados_incapacidades SET
        estatus = $1,
        autoriza = COALESCE($2, autoriza),
        fecha_actualizacion = NOW()
       WHERE id_empleado_incapacidad = $3
       RETURNING *`,
      [estatus, autoriza ?? null, Number(id)]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Incapacidad no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, incapacidad: result.rows[0] })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
