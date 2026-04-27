import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import sql from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { usuario, contrasena } = body as { usuario: string; contrasena: string }

    if (!usuario || !contrasena) {
      return NextResponse.json({ error: 'Credenciales requeridas.' }, { status: 400 })
    }

    const rows = await sql`
      SELECT * FROM usuarios WHERE correo = ${usuario.trim().toLowerCase()} LIMIT 1
    `

    // Mismo mensaje para usuario no encontrado o contraseña incorrecta (evita enumeración)
    const INVALID = 'Correo o contraseña incorrectos.'

    if (rows.length === 0) {
      return NextResponse.json({ error: INVALID }, { status: 401 })
    }

    const user = rows[0]
    const valid = await bcrypt.compare(contrasena, user.contrasena as string)

    if (!valid) {
      return NextResponse.json({ error: INVALID }, { status: 401 })
    }

    return NextResponse.json({
      nombre:  user.nombre,
      email:   user.correo,
      rol:     user.rol,
      rolCode: user.rol_code ?? user.rolcode ?? '',
      nomina:  user.nomina ?? '',
    })
  } catch (err) {
    console.error('[auth/login]', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Error interno del servidor.', detail }, { status: 500 })
  }
}
