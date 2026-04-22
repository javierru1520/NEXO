"use client"

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

interface CredencialCardProps {
  nombre: string
  puesto: string
  departamento: string
  clave: string
  empresa: string
}

function getInitials(nombre: string): string {
  const parts = nombre.split(' ')
  return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : nombre.slice(0, 2).toUpperCase()
}

// Simulated barcode visual using thin/thick bars
function BarcodeVisual({ value }: { value: string }) {
  // Generate a deterministic bar pattern from the value string
  const bars: number[] = []
  for (let i = 0; i < 60; i++) {
    const charCode = value.charCodeAt(i % value.length)
    bars.push(((charCode + i * 7) % 3) + 1)
  }
  return (
    <div className="flex items-end gap-[1px] h-8">
      {bars.map((w, i) => (
        <div
          key={i}
          className="bg-gray-800"
          style={{ width: w === 3 ? 3 : w === 2 ? 2 : 1, height: i % 5 === 0 ? '100%' : '75%' }}
        />
      ))}
    </div>
  )
}

export default function CredencialCard({ nombre, puesto, departamento, clave, empresa }: CredencialCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const content = cardRef.current?.outerHTML
    if (!content) return
    const printWin = window.open('', '_blank', 'width=400,height=280')
    if (!printWin) return
    printWin.document.write(`
      <html><head><title>Credencial — ${nombre}</title>
      <style>
        body { margin: 0; padding: 20px; font-family: sans-serif; }
        .card { width: 340px; border: 1px solid #ccc; border-radius: 8px; overflow: hidden; }
        .header { background: #1e3a5f; color: white; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; }
        .header-logo { font-size: 18px; font-weight: 900; letter-spacing: 2px; color: #f59e0b; }
        .header-sub { font-size: 9px; color: #94a3b8; }
        .body { padding: 12px; display: flex; gap: 10px; }
        .avatar { width: 56px; height: 72px; background: #6366f1; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: 700; flex-shrink: 0; }
        .info { flex: 1; }
        .emp-name { font-size: 12px; font-weight: 700; margin-bottom: 2px; }
        .emp-puesto { font-size: 10px; color: #555; }
        .emp-depto { font-size: 9px; color: #888; }
        .emp-num { font-size: 9px; font-family: monospace; margin-top: 4px; background: #f1f5f9; padding: 2px 6px; border-radius: 3px; display: inline-block; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; }
        .barcode { display: flex; align-items: flex-end; gap: 1px; height: 28px; }
        .bar { background: #1e293b; }
        @media print { body { padding: 0; } }
      </style></head><body>
      ${content}
      </body></html>
    `)
    printWin.document.close()
    setTimeout(() => { printWin.print(); printWin.close() }, 300)
  }

  const colorIdx = parseInt(clave || '0') % 6
  const avatarColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9']

  return (
    <div className="space-y-3">
      <div
        ref={cardRef}
        className="w-[340px] rounded-xl overflow-hidden shadow-lg border border-gray-200"
        style={{ fontFamily: 'sans-serif' }}
      >
        {/* Header */}
        <div className="px-3 py-2 flex items-center justify-between" style={{ background: '#1e3a5f' }}>
          <div>
            <div className="text-lg font-black tracking-widest" style={{ color: '#f59e0b' }}>TRAXION</div>
            <div className="text-[9px]" style={{ color: '#94a3b8' }}>{empresa}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-semibold" style={{ color: '#cbd5e1' }}>CREDENCIAL DE</div>
            <div className="text-[9px] font-semibold" style={{ color: '#cbd5e1' }}>EMPLEADO</div>
          </div>
        </div>

        {/* Body */}
        <div className="px-3 py-3 flex gap-3 bg-white">
          {/* Photo/Avatar */}
          <div
            className="w-14 h-18 rounded flex items-center justify-center text-white text-xl font-bold shrink-0"
            style={{
              width: 56,
              height: 72,
              background: avatarColors[colorIdx],
              borderRadius: 4,
            }}
          >
            {getInitials(nombre)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-gray-900 leading-tight truncate">{nombre}</div>
            <div className="text-[10px] text-gray-600 truncate mt-0.5">{puesto}</div>
            <div className="text-[9px] text-gray-400 truncate">{departamento}</div>
            <div className="mt-2 inline-block bg-slate-100 text-slate-700 text-[9px] font-mono px-1.5 py-0.5 rounded">
              N° {clave}
            </div>
          </div>
        </div>

        {/* Footer / Barcode */}
        <div className="px-3 py-2 flex items-center justify-between bg-slate-50 border-t border-slate-100">
          <div className="text-[8px] text-gray-400">www.traxion.com.mx</div>
          <BarcodeVisual value={clave} />
        </div>
      </div>

      <Button size="sm" variant="outline" className="gap-1.5 text-xs w-[340px]" onClick={handlePrint}>
        <Printer className="w-3.5 h-3.5" />
        Imprimir credencial
      </Button>
    </div>
  )
}
