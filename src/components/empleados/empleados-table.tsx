"use client"

import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table'
import { useState, useMemo } from 'react'
import { empleados, departamentos, puestos } from '@/lib/mock-data'
import { Empleado } from '@/types'
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Download, UserPlus } from 'lucide-react'

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-violet-500', 'bg-sky-500',
  'bg-teal-500', 'bg-orange-500', 'bg-pink-500',
]

function getInitials(nombre: string): string {
  const parts = nombre.split(' ')
  return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : nombre.slice(0, 2).toUpperCase()
}

function getDeptName(id: number): string {
  return departamentos.find(d => d.clave === id)?.descripcion ?? '-'
}

function getPuestoName(id: number): string {
  return puestos.find(p => p.clave === id)?.descripcion ?? '-'
}

interface EmpleadosTableProps {
  onNuevo?: () => void
  onRowClick?: (emp: Empleado) => void
}

export default function EmpleadosTable({ onNuevo, onRowClick }: EmpleadosTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const columns = useMemo<ColumnDef<Empleado>[]>(() => [
    {
      id: 'row',
      header: '#',
      cell: ({ row }) => (
        <span className="text-xs text-gray-400 font-mono">{row.index + 1}</span>
      ),
      size: 40,
    },
    {
      id: 'nombre',
      accessorKey: 'nombre_completo',
      header: 'Empleado',
      cell: ({ row, getValue }) => {
        const nombre = getValue() as string
        const idx = row.index % AVATAR_COLORS.length
        return (
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full ${AVATAR_COLORS[idx]} flex items-center justify-center shrink-0`}>
              <span className="text-[10px] font-bold text-white">{getInitials(nombre)}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800">{nombre}</p>
              <p className="text-[10px] text-gray-400">{row.original.email_corp ?? row.original.email_personal ?? ''}</p>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'clave',
      header: 'ID',
      cell: ({ getValue }) => (
        <span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
          {getValue() as string}
        </span>
      ),
      size: 80,
    },
    {
      id: 'puesto',
      accessorKey: 'puesto',
      header: 'Puesto',
      cell: ({ getValue }) => (
        <span className="text-xs text-gray-600">{getPuestoName(getValue() as number)}</span>
      ),
    },
    {
      id: 'depto',
      accessorKey: 'depto',
      header: 'Departamento',
      cell: ({ getValue }) => (
        <span className="text-xs text-gray-600">{getDeptName(getValue() as number)}</span>
      ),
    },
    {
      accessorKey: 'sueldo_mensual',
      header: 'Sueldo',
      cell: ({ getValue }) => (
        <span className="text-xs font-semibold text-gray-800">
          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(getValue() as number)}
        </span>
      ),
      size: 110,
    },
    {
      accessorKey: 'st',
      header: 'Status',
      cell: ({ getValue }) => {
        const st = getValue() as string
        const map: Record<string, { label: string; cls: string }> = {
          A: { label: 'Activo', cls: 'bg-green-100 text-green-700' },
          B: { label: 'Baja', cls: 'bg-red-100 text-red-600' },
          S: { label: 'Suspendido', cls: 'bg-yellow-100 text-yellow-700' },
        }
        const s = map[st] ?? { label: st, cls: 'bg-gray-100 text-gray-600' }
        return (
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${s.cls}`}>
            {s.label}
          </span>
        )
      },
      size: 90,
    },
    {
      accessorKey: 'alta',
      header: 'Fecha Alta',
      cell: ({ getValue }) => (
        <span className="text-xs text-gray-500">
          {new Date(getValue() as string).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      ),
      size: 100,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={(e) => { e.stopPropagation(); onRowClick?.(row.original) }}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
        >
          Ver
        </button>
      ),
      size: 60,
    },
  ], [onRowClick])

  const table = useReactTable({
    data: empleados,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Buscar empleado..."
            className="pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 w-56 bg-gray-50"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5" />
            Exportar
          </button>
          <button
            onClick={onNuevo}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Nuevo empleado
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="bg-gray-50 border-b border-gray-100">
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                    style={{ width: header.column.columnDef.size }}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="flex flex-col gap-0.5">
                          <ChevronUp className={`w-2.5 h-2.5 ${header.column.getIsSorted() === 'asc' ? 'text-indigo-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`w-2.5 h-2.5 ${header.column.getIsSorted() === 'desc' ? 'text-indigo-600' : 'text-gray-300'}`} />
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-50">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-gray-400">
                  No se encontraron empleados
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className="hover:bg-indigo-50/30 cursor-pointer transition-colors"
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
        <span className="text-xs text-gray-500">
          Mostrando {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
          {' '}-{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{' '}
          de {table.getFilteredRowModel().rows.length} empleados
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          {Array.from({ length: table.getPageCount() }, (_, i) => i).map(page => (
            <button
              key={page}
              onClick={() => table.setPageIndex(page)}
              className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${
                table.getState().pagination.pageIndex === page
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {page + 1}
            </button>
          ))}
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  )
}
