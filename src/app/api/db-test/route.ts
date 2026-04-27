import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET() {
  try {
    const rows = await sql`SELECT NOW() AS time, current_database() AS db`
    return NextResponse.json({ ok: true, ...rows[0] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
