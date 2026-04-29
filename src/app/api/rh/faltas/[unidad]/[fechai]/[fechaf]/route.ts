import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

interface BustraxFalta {
  keyidUn: string
  unidadNegocio: string
  noEmpleado: string
  totalFaltas: string
}

// Cache in-memory con TTL de 5 minutos. Llave: `${fechai}_${fechaf}`
const cache = new Map<string, { data: BustraxFalta[]; ts: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000
const BUSTRAX_IDS = Array.from({ length: 50 }, (_, i) => i + 1)
const BUSTRAX_TIMEOUT_MS = 3000
const BUSTRAX_BASE = 'https://recibosrh.lidcorp.mx/bustrax-0.0.1/api/bustrax/faltas/empleados'

async function fetchAllBustraxFaltas(fechai: string, fechaf: string): Promise<BustraxFalta[]> {
  const key = `${fechai}_${fechaf}`
  const cached = cache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data

  const results = await Promise.allSettled(
    BUSTRAX_IDS.map(async (id) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), BUSTRAX_TIMEOUT_MS)
      try {
        const res = await fetch(`${BUSTRAX_BASE}/${id}/${fechai}/${fechaf}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!res.ok) return []
        const data = await res.json()
        return Array.isArray(data) ? (data as BustraxFalta[]) : []
      } catch {
        return []
      } finally {
        clearTimeout(timer)
      }
    })
  )

  // Consolidar y deduplicar por noEmpleado (máximo totalFaltas)
  const map = new Map<string, BustraxFalta>()
  for (const result of results) {
    if (result.status === 'rejected') continue
    for (const falta of result.value) {
      if (!falta.noEmpleado) continue
      const existing = map.get(falta.noEmpleado)
      if (!existing || parseInt(falta.totalFaltas) > parseInt(existing.totalFaltas)) {
        map.set(falta.noEmpleado, falta)
      }
    }
  }

  const data = Array.from(map.values())
  cache.set(key, { data, ts: Date.now() })
  return data
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

    // 2. Obtener TODAS las faltas de Bustrax (todos los IDs, con cache)
    const faltasBustrax = await fetchAllBustraxFaltas(fechai, fechaf)

    if (faltasBustrax.length === 0) {
      return NextResponse.json({
        unidad, unidad_negocio: unidad_negocio_nombre, fechai, fechaf,
        total: 0, excluidos: { vacaciones: 0, incapacidades: 0 }, faltas: [],
      })
    }

    const nominas = faltasBustrax.map(f => f.noEmpleado)
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
