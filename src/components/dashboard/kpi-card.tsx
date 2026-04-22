"use client"

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

interface KpiCardProps {
  title: string
  value: number
  subtitle?: string
  trend?: 'up' | 'down'
  trendValue?: string
  color?: string
  icon?: LucideIcon
  prefix?: string
  suffix?: string
  formatValue?: (v: number) => string
}

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return count
}

export default function KpiCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  color = '#6366f1',
  icon: Icon,
  prefix = '',
  suffix = '',
  formatValue,
}: KpiCardProps) {
  const count = useCountUp(value)

  const displayValue = formatValue
    ? formatValue(count)
    : `${prefix}${count.toLocaleString('es-MX')}${suffix}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 relative overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Left color border */}
      <div
        className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
        style={{ backgroundColor: color }}
      />

      {/* Icon background decoration */}
      {Icon && (
        <div
          className="absolute right-4 top-4 w-10 h-10 rounded-xl flex items-center justify-center opacity-15"
          style={{ backgroundColor: color }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      )}

      <div className="pl-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{title}</p>
        <motion.p
          className="text-2xl font-bold text-gray-900 leading-tight"
          style={{ color: 'inherit' }}
        >
          {displayValue}
        </motion.p>

        {subtitle && (
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        )}

        {trend && trendValue && (
          <div className={`flex items-center gap-1 mt-2 ${trend === 'up' ? 'text-green-600' : 'text-red-500'}`}>
            {trend === 'up' ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span className="text-xs font-semibold">{trendValue}</span>
            <span className="text-xs text-gray-400">vs mes anterior</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
