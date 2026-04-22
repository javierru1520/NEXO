import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const unidad = searchParams.get('unidad') ?? '8'
  const fechaini = searchParams.get('fechaini')
  const fechafin = searchParams.get('fechafin')

  if (!fechaini || !fechafin) {
    return NextResponse.json({ error: 'fechaini y fechafin requeridos' }, { status: 400 })
  }

  const url = `https://recibosrh.lidcorp.mx/bustrax-0.0.1/api/bustrax/faltas/empleados/${unidad}/${fechaini}/${fechafin}`

  try {
    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Error al consultar faltas' }, { status: 500 })
  }
}
