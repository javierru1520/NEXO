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

    // 1. Resolver unidad en NEXO — error explícito si no existe
    const unidades = await sql`
      SELECT id_unidad_negocio, descripcion FROM unidades_negocios
      WHERE clave = ${unidad}
         OR id_unidad_negocio::text = ${unidad}
      LIMIT 1
    `

    if (unidades.length === 0) {
      return NextResponse.json(
        { error: `Unidad '${unidad}' no encontrada en NEXO` },
        { status: 400 }
      )
    }

    const { id_unidad_negocio, descripcion: unidad_negocio_nombre } = unidades[0]

    // 2. Traer faltas del periodo desde Bustrax
    const bustraxUrl = `https://recibosrh.lidcorp.mx/bustrax-0.0.1/api/bustrax/faltas/empleados/${unidad}/${fechai}/${fechaf}`
    const bustraxRes = await fetch(bustraxUrl, { cache: 'no-store' })

    if (!bustraxRes.ok) {
      return NextResponse.json({ error: 'Error al consultar faltas en Bustrax' }, { status: 502 })
    }

    const faltasBustrax: BustraxFalta[] = await bustraxRes.json()

    if (!Array.isArray(faltasBustrax) || faltasBustrax.length === 0) {
      return NextResponse.json({
        unidad, unidad_negocio: unidad_negocio_nombre, fechai, fechaf,
        total: 0, excluidos: { vacaciones: 0, incapacidades: 0 }, faltas: [],
      })
    }

    const nominas = faltasBustrax.map(f => f.noEmpleado).filter(Boolean)
    const faltasMap = new Map(faltasBustrax.map(f => [f.noEmpleado, f]))

    // 3. Empleados de NEXO: intersección entre nóminas de Bustrax y la unidad solicitada
    const empleados = await sql`
      SELECT
        e.id_empleado,
        e.nomina,
        e.rfc,
        e.nombres,
        e.apellido_paterno,
        e.apellido_materno,
        un.descripcion AS unidad_negocio
      FROM empleados e
      JOIN usuarios u                    ON u.id_empleado = e.id_empleado AND u.activo = 1
      JOIN usuarios_unidades_negocio uun ON uun.id_usuario = u.id_usuario AND uun.activo = 1
      JOIN unidades_negocios un          ON un.id_unidad_negocio = uun.id_unidad_negocio
      WHERE e.nomina = ANY(${nominas})
        AND uun.id_unidad_negocio = ${id_unidad_negocio}
    `

    if (empleados.length === 0) {
      return NextResponse.json({
        unidad, unidad_negocio: unidad_negocio_nombre, fechai, fechaf,
        total: 0, excluidos: { vacaciones: 0, incapacidades: 0 }, faltas: [],
      })
    }

    const idEmpleados = empleados.map(e => e.id_empleado)

    // 4a. Vacaciones autorizadas que se solapan con el periodo
    const vacExcluir = await sql`
      SELECT DISTINCT id_empleado FROM solicitudes_vacaciones
      WHERE id_empleado = ANY(${idEmpleados})
        AND activo = 1
        AND estatus = 'autorizado_jt'
        AND fecha_inicio <= ${fechaf}::date
        AND fecha_fin    >= ${fechai}::date
    `

    // 4b. Incapacidades pendientes o autorizadas que se solapan con el periodo
    const incExcluir = await sql`
      SELECT DISTINCT id_empleado FROM empleados_incapacidades
      WHERE id_empleado = ANY(${idEmpleados})
        AND activo = 1
        AND estatus != 'rechazado'
        AND fecha_inicio <= ${fechaf}::date
        AND fecha_fin    >= ${fechai}::date
    `

    const excluirVac = new Set(vacExcluir.map(v => v.id_empleado))
    const excluirInc = new Set(incExcluir.map(i => i.id_empleado))
    const excluirTodos = new Set([...excluirVac, ...excluirInc])

    // 5. Faltas injustificadas: empleados de la unidad sin ausencia autorizada en el periodo
    const faltas = empleados
      .filter(emp => !excluirTodos.has(emp.id_empleado))
      .map(emp => ({
        id_empleado:      emp.id_empleado,
        nomina:           emp.nomina,
        rfc:              emp.rfc,
        nombres:          emp.nombres,
        apellido_paterno: emp.apellido_paterno,
        apellido_materno: emp.apellido_materno,
        unidad_negocio:   emp.unidad_negocio,
        total_faltas:     parseInt(faltasMap.get(emp.nomina)?.totalFaltas ?? '0', 10),
        fecha_inicio:     fechai,
        fecha_fin:        fechaf,
      }))

    return NextResponse.json({
      unidad,
      unidad_negocio: unidad_negocio_nombre,
      fechai,
      fechaf,
      total: faltas.length,
      excluidos: {
        vacaciones:    excluirVac.size,
        incapacidades: excluirInc.size,
      },
      faltas,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
