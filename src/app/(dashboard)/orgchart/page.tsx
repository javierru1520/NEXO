"use client"

import { useState, useMemo } from 'react'
import { useSCRHStore } from '@/store'
import { ChevronRight, ChevronDown, Users, Search } from 'lucide-react'
import { LIVDM_EMPLEADOS } from '@/lib/livdm-data'

// ─── types ────────────────────────────────────────────────────────────────────

interface TreeNode {
  clave: string
  nombre: string
  puesto: string
  jefe_inmed: string
  children: TreeNode[]
}

// ─── puesto catalog (inline for speed) ───────────────────────────────────────

const PUESTO_MAP: Record<number, string> = {
  100:'ALMACENISTA', 101:'ANALISTA', 102:'ANALISTA C', 103:'AUDITOR', 104:'AUXILIAR',
  105:'BECARIO', 106:'CAJERO', 107:'CAPTURISTA', 108:'CARROCERO A', 109:'CARROCERO B',
  110:'CARROCERO C', 111:'COORDINADOR', 112:'DELEGADO', 113:'DIRECTOR', 114:'DIRECTOR REGIONAL',
  115:'EJECUTIVO', 116:'ELECTRICO C', 117:'ELECTROMECANICO A', 118:'ELECTROMECANICO C',
  119:'ESPECIALISTA', 120:'GERENTE', 121:'GESTOR', 122:'IMPLANT', 123:'INSTRUCTOR',
  124:'JEFE', 125:'MECANICO B', 126:'MECANICO C', 127:'MENSAJERO', 128:'MONITORISTA',
  129:'OPERADOR A', 130:'OPERADOR B', 131:'OPERADOR C', 132:'PREFECTA/O', 133:'RESCATISTA',
  134:'SUBDIRECTOR', 135:'TECNICO',
}

const LEVEL_COLORS: Record<string, string> = {
  'DIRECTOR':         'bg-purple-100 border-purple-300 text-purple-800',
  'DIRECTOR REGIONAL':'bg-purple-100 border-purple-300 text-purple-800',
  'SUBDIRECTOR':      'bg-indigo-100 border-indigo-300 text-indigo-800',
  'GERENTE':          'bg-blue-100 border-blue-300 text-blue-800',
  'JEFE':             'bg-sky-100 border-sky-300 text-sky-800',
  'COORDINADOR':      'bg-teal-100 border-teal-300 text-teal-800',
  'EJECUTIVO':        'bg-emerald-100 border-emerald-300 text-emerald-800',
  'OPERADOR A':       'bg-gray-100 border-gray-300 text-gray-700',
  'OPERADOR B':       'bg-gray-100 border-gray-300 text-gray-700',
  'OPERADOR C':       'bg-gray-100 border-gray-300 text-gray-700',
}

function getColor(puesto: string) {
  return LEVEL_COLORS[puesto] || 'bg-gray-50 border-gray-200 text-gray-600'
}

// ─── recursive tree node ──────────────────────────────────────────────────────

function OrgNode({ node, depth = 0, search }: { node: TreeNode; depth?: number; search: string }) {
  const [open, setOpen] = useState(depth < 2)

  const hasChildren = node.children.length > 0
  const highlight = search.length >= 2 && node.nombre.toLowerCase().includes(search.toLowerCase())

  return (
    <div className="ml-5" style={{ borderLeft: depth > 0 ? '1px solid #e5e7eb' : 'none' }}>
      <div className="flex items-center gap-1 py-0.5 pl-2">
        {hasChildren ? (
          <button
            onClick={() => setOpen(o => !o)}
            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-700 shrink-0"
          >
            {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${getColor(node.puesto)} ${highlight ? 'ring-2 ring-yellow-400' : ''}`}>
          <span className="font-semibold truncate max-w-[200px]" title={node.nombre}>
            {node.nombre}
          </span>
          <span className={`text-[10px] opacity-60 shrink-0`}>{node.puesto}</span>
          {hasChildren && (
            <span className="text-[10px] opacity-50 shrink-0">
              · {node.children.length}
            </span>
          )}
        </div>
      </div>

      {open && hasChildren && (
        <div>
          {node.children.map(child => (
            <OrgNode key={child.clave} node={child} depth={depth + 1} search={search} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function OrgchartPage() {
  const [search, setSearch] = useState('')

  // Build tree from LIVDM data
  const { roots, totalNodes } = useMemo(() => {
    const emps = LIVDM_EMPLEADOS
    const claveSet = new Set(emps.map(e => e.clave))

    // Build a map of clave → children
    const childMap: Record<string, typeof emps> = {}
    for (const e of emps) {
      if (e.jefe_inmed && claveSet.has(e.jefe_inmed)) {
        if (!childMap[e.jefe_inmed]) childMap[e.jefe_inmed] = []
        childMap[e.jefe_inmed].push(e)
      }
    }

    // Roots: employees whose jefe_inmed is not in the dataset
    const rootEmps = emps.filter(e => !e.jefe_inmed || !claveSet.has(e.jefe_inmed))

    function buildTree(emp: typeof emps[0]): TreeNode {
      const kids = childMap[emp.clave] || []
      return {
        clave: emp.clave,
        nombre: emp.nombre_completo,
        puesto: PUESTO_MAP[(emp as any).puesto] || String((emp as any).puesto),
        jefe_inmed: emp.jefe_inmed,
        children: kids
          .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo))
          .map(buildTree),
      }
    }

    const roots = rootEmps
      .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo))
      .map(buildTree)

    return { roots, totalNodes: emps.length }
  }, [])

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Organigrama</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Jerarquía — Lipu Valle de México</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalNodes} empleados · árbol de jefe inmediato</p>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-2">
        {[
          ['DIRECTOR', 'bg-purple-100 border-purple-300 text-purple-800'],
          ['SUBDIRECTOR', 'bg-indigo-100 border-indigo-300 text-indigo-800'],
          ['GERENTE', 'bg-blue-100 border-blue-300 text-blue-800'],
          ['JEFE', 'bg-sky-100 border-sky-300 text-sky-800'],
          ['COORDINADOR', 'bg-teal-100 border-teal-300 text-teal-800'],
          ['EJECUTIVO', 'bg-emerald-100 border-emerald-300 text-emerald-800'],
          ['OPERADOR', 'bg-gray-100 border-gray-200 text-gray-700'],
        ].map(([label, cls]) => (
          <span key={label} className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${cls}`}>
            {label}
          </span>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar persona..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300/40"
        />
      </div>

      {/* Tree */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 overflow-x-auto">
        <div className="min-w-[500px]">
          {roots.map(root => (
            <OrgNode key={root.clave} node={root} depth={0} search={search} />
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Haz clic en ▶ para expandir / ▼ para colapsar. Los nodos con número indican cuántos reportes directos tienen.
        Los nodos sin jefe asignado en NEXO aparecen como raíces.
      </p>
    </div>
  )
}
