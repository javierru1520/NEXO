import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { usuario, contrasena } = await req.json()

    if (!usuario || !contrasena) {
      return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 })
    }

    // Busca por usuario o correo
    const result = await pool.query(
      `SELECT u.id_usuario, u.usuario, u.correo, u.contrasena, u.id_rol,
              u.id_empleado, u.nomina, r.nombre AS rol_nombre
       FROM usuarios u
       JOIN cat_roles r ON r.id_rol = u.id_rol
       WHERE (u.usuario = $1 OR u.correo = $1) AND u.activo = 1
       LIMIT 1`,
      [usuario]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    const user = result.rows[0]
    const valid = await bcrypt.compare(contrasena, user.contrasena)

    if (!valid) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    // Mapeo de rol a rolCode que usan las páginas
    const rolCodeMap: Record<string, string> = {
      admin:        'ADMIN',
      rrhh:         'ADP',
      jt:           'JT',
      coordinador:  'C',
      empleado:     'EMP',
    }

    return NextResponse.json({
      ok: true,
      user: {
        id_usuario:  user.id_usuario,
        usuario:     user.usuario,
        correo:      user.correo,
        id_rol:      user.id_rol,
        rol:         user.rol_nombre,
        rolCode:     rolCodeMap[user.rol_nombre] ?? user.rol_nombre.toUpperCase(),
        nomina:      user.nomina ?? '',
        id_empleado: user.id_empleado,
      },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
