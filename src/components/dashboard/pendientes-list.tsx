"use client"

import { noOperaronHoy as pendientesRegistro } from '@/lib/mock-data'
import { Clock } from 'lucide-react'

const AVATAR_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-sky-500',
]

function getInitials(nombre: string): string {
  const parts = nombre.split(' ')
  return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : nombre.slice(0, 2).toUpperCase()
}

export default function PendientesList() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pendientes de registrar</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{pendientesRegistro.length} empleados</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
          <Clock className="w-4 h-4 text-amber-600" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
        {pendientesRegistro.map((emp, idx) => (
          <div
            key={emp.clave}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <div
              className={`w-9 h-9 rounded-full ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} flex items-center justify-center shrink-0`}
            >
              <span className="text-xs font-bold text-white">{getInitials(emp.nombre)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{emp.nombre}</p>
              <p className="text-[10px] text-gray-500 truncate">
                Turno {emp.turno} · {emp.motivo}
              </p>
            </div>
            <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
              Pendiente
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
