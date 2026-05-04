import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import sql from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { correo, contrasenaActual, contrasenaNueva } = body as {
      correo: string
      contrasenaActual: string
      contrasenaNueva: string
    }

    if (!correo || !contrasenaActual || !contrasenaNueva) {
      return NextResponse.json({ error: 'Todos los campos son requeridos.' }, { status: 400 })
    }

    if (contrasenaNueva.length < 6) {
      return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
    }

    const rows = await sql`SELECT id_usuario, contrasena FROM usuarios WHERE correo = ${correo.trim().toLowerCase()} AND activo = 1 LIMIT 1`

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })
    }

    const valid = await bcrypt.compare(contrasenaActual, rows[0].contrasena as string)
    if (!valid) {
      return NextResponse.json({ error: 'La contraseña actual es incorrecta.' }, { status: 401 })
    }

    const hash = await bcrypt.hash(contrasenaNueva, 10)
    await sql`UPDATE usuarios SET contrasena = ${hash}, fecha_actualizacion = NOW() WHERE id_usuario = ${rows[0].id_usuario}`

    return NextResponse.json({ ok: true })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Error interno del servidor.', detail }, { status: 500 })
  }
}
