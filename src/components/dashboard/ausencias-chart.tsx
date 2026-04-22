"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { ausenciasMotivos } from '@/lib/mock-data'

export default function AusenciasChart() {
  const total = ausenciasMotivos.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-full">
      <div className="mb-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Motivos registrados hoy</p>
        <p className="text-lg font-bold text-gray-900 mt-1">{total} ausencias</p>
      </div>

      <div className="flex items-center justify-center">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={ausenciasMotivos}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={3}
              dataKey="value"
            >
              {ausenciasMotivos.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: '12px',
              }}
              formatter={(value) => [`${value} personas`, String(value)]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-2 space-y-1.5">
        {ausenciasMotivos.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-gray-600">{item.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-800">{item.value}</span>
              <span className="text-[10px] text-gray-400 w-8 text-right">
                {((item.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
