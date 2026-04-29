import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

interface BustraxFalta {
  keyidUn: string
  unidadNegocio: string
  noEmpleado: string
  totalFaltas: string
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ unidad: string; fechai: string; fechaf: string }> }
) {
  try {
    const { unidad, fechai, fechaf } = await params

    const bustraxUrl = `https://recibosrh.lidcorp.mx/bustrax-0.0.1/api/bustrax/faltas/empleados/${unidad}/${fechai}/${fechaf}`
    const bustraxRes = await fetch(bustraxUrl, { cache: 'no-store' })

    if (!bustraxRes.ok) {
      return NextResponse.json({ error: 'Error al consultar faltas en Bustrax' }, { status: 502 })
    }

    const faltasBustrax: BustraxFalta[] = await bustraxRes.json()

    if (!Array.isArray(faltasBustrax) || faltasBustrax.length === 0) {
      return NextResponse.json({ unidad, fechai, fechaf, total: 0, faltas: [] })
    }

    const claves = faltasBustrax.map(f => f.noEmpleado).filter(Boolean)

    const empleados = await sql`
      SELECT
        e.clave,
        COALESCE(e.nomina, u.nomina) AS nomina,
        e.rfc,
        e.nombres,
        e.apellido_paterno,
        e.apellido_materno,
        un.descripcion AS unidad_negocio
      FROM empleados e
      LEFT JOIN usuarios u      ON u.id_empleado = e.id_empleado AND u.activo = 1
      LEFT JOIN usuarios_unidades_negocio uun ON uun.id_usuario = u.id_usuario AND uun.activo = 1
      LEFT JOIN unidades_negocios un ON un.id_unidad_negocio = uun.id_unidad_negocio
      WHERE e.clave = ANY(${claves})
    `

    const empMap = new Map(empleados.map(e => [e.clave, e]))

    const faltas = faltasBustrax.map(f => {
      const emp = empMap.get(f.noEmpleado)
      return {
        no_empleado: f.noEmpleado,
        nomina: emp?.nomina ?? null,
        rfc: emp?.rfc ?? null,
        nombres: emp?.nombres ?? null,
        apellido_paterno: emp?.apellido_paterno ?? null,
        apellido_materno: emp?.apellido_materno ?? null,
        unidad_negocio: emp?.unidad_negocio ?? f.unidadNegocio,
        total_faltas: parseInt(f.totalFaltas, 10),
        fecha_inicio: fechai,
        fecha_fin: fechaf,
      }
    })

    return NextResponse.json({ unidad, fechai, fechaf, total: faltas.length, faltas })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
