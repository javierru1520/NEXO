"use client"

import { useState, useMemo } from 'react'
import { useSCRHStore } from '@/store'
import {
  Network, Edit2, CheckCircle2, AlertCircle, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ── Types ──────────────────────────────────────────────────────────────────────

interface RamsalEquiv {
  scrh_clave: number
  scrh_desc: string
  ramsal_clave: string
  ramsal_desc: string
  mapeado: boolean
}

interface RamsalEquivPuesto {
  scrh_clave: number
  scrh_desc: string
  ramsal_clave: string
  ramsal_desc: string
  mapeado: boolean
}

interface SyncLog {
  id: number
  fecha: string
  tipo: 'Altas' | 'Bajas' | 'Cambios'
  enviados: number
  aceptados: number
  rechazados: number
  usuario: string
  status: 'OK' | 'Parcial' | 'Error'
}

// ── Mock mappings ──────────────────────────────────────────────────────────────

const DEPTO_RAMSAL_INITIAL: Record<number, { clave: string; desc: string }> = {
  1: { clave: 'RAM-OPE-001', desc: 'Operations & Logistics' },
  2: { clave: 'RAM-ADM-001', desc: 'Administration' },
  3: { clave: 'RAM-RH-001',  desc: 'Human Resources' },
  4: { clave: 'RAM-FIN-001', desc: 'Finance & Accounting' },
}

const PUESTO_RAMSAL_INITIAL: Record<number, { clave: string; desc: string }> = {
  1:  { clave: 'RAM-DRV-001', desc: 'Driver — Federal Transport' },
  2:  { clave: 'RAM-COO-001', desc: 'Operations Coordinator' },
  3:  { clave: 'RAM-HRM-001', desc: 'HR Manager' },
  9:  { clave: 'RAM-SUP-001', desc: 'Supervisor' },
  10: { clave: 'RAM-DIR-001', desc: 'Director' },
}

const SYNC_LOGS: SyncLog[] = [
  { id:1,  fecha:'2024-03-15 08:05', tipo:'Altas',  enviados:3,  aceptados:3,  rechazados:0, usuario:'166', status:'OK' },
  { id:2,  fecha:'2024-03-14 17:00', tipo:'Bajas',  enviados:1,  aceptados:1,  rechazados:0, usuario:'264', status:'OK' },
  { id:3,  fecha:'2024-03-13 10:30', tipo:'Cambios',enviados:5,  aceptados:4,  rechazados:1, usuario:'166', status:'Parcial' },
  { id:4,  fecha:'2024-03-12 09:00', tipo:'Altas',  enviados:2,  aceptados:2,  rechazados:0, usuario:'3071',status:'OK' },
  { id:5,  fecha:'2024-03-11 16:00', tipo:'Cambios',enviados:8,  aceptados:8,  rechazados:0, usuario:'166', status:'OK' },
  { id:6,  fecha:'2024-03-10 11:00', tipo:'Bajas',  enviados:2,  aceptados:1,  rechazados:1, usuario:'264', status:'Parcial' },
  { id:7,  fecha:'2024-03-08 14:00', tipo:'Altas',  enviados:4,  aceptados:0,  rechazados:4, usuario:'166', status:'Error' },
  { id:8,  fecha:'2024-03-07 09:30', tipo:'Cambios',enviados:3,  aceptados:3,  rechazados:0, usuario:'3071',status:'OK' },
  { id:9,  fecha:'2024-03-06 16:45', tipo:'Altas',  enviados:1,  aceptados:1,  rechazados:0, usuario:'264', status:'OK' },
  { id:10, fecha:'2024-03-05 10:00', tipo:'Cambios',enviados:6,  aceptados:5,  rechazados:1, usuario:'166', status:'Parcial' },
]

// ── Mock Ramsal headcount by dept (for comparativo) ─────────────────────────

const RAMSAL_HC: Record<number, number> = {
  1: 45, 2: 12, 3: 8, 4: 6, 5: 3, 6: 20, 7: 15, 8: 10, 9: 7, 10: 4, 11: 2, 12: 5,
}

// ── Helper components ──────────────────────────────────────────────────────────

type MainTab = 'deptos' | 'puestos' | 'comparativo' | 'log'

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
        active
          ? 'border-teal-600 text-teal-700 bg-white'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  )
}

function MapeadoBadge({ mapeado }: { mapeado: boolean }) {
  if (mapeado) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
      <CheckCircle2 className="w-2.5 h-2.5" /> Mapeado
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-600">
      <AlertCircle className="w-2.5 h-2.5" /> Sin equivalencia
    </span>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function RamsalPage() {
  const { departamentos, puestos, empleados } = useSCRHStore()

  const [tab, setTab] = useState<MainTab>('deptos')
  const [toast, setToast] = useState<string | null>(null)
  const [showDiff, setShowDiff] = useState(false)

  // Depto mappings
  const [deptoMap, setDeptoMap] = useState<Record<number, { clave: string; desc: string }>>(DEPTO_RAMSAL_INITIAL)
  const [editDepto, setEditDepto] = useState<{ clave: number; desc_scrh: string } | null>(null)
  const [editDeptoClave, setEditDeptoClave] = useState('')
  const [editDeptoDesc, setEditDeptoDesc] = useState('')

  // Puesto mappings
  const [puestoMap, setPuestoMap] = useState<Record<number, { clave: string; desc: string }>>(PUESTO_RAMSAL_INITIAL)
  const [editPuesto, setEditPuesto] = useState<{ clave: number; desc_scrh: string } | null>(null)
  const [editPuestoClave, setEditPuestoClave] = useState('')
  const [editPuestoDesc, setEditPuestoDesc] = useState('')

  // ── Helpers ──────────────────────────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function saveDeptoMap() {
    if (!editDepto || !editDeptoClave) return
    setDeptoMap(prev => ({ ...prev, [editDepto.clave]: { clave: editDeptoClave, desc: editDeptoDesc } }))
    setEditDepto(null)
    showToast('Equivalencia de departamento actualizada')
  }

  function savePuestoMap() {
    if (!editPuesto || !editPuestoClave) return
    setPuestoMap(prev => ({ ...prev, [editPuesto.clave]: { clave: editPuestoClave, desc: editPuestoDesc } }))
    setEditPuesto(null)
    showToast('Equivalencia de puesto actualizada')
  }

  // ── Comparativo data ──────────────────────────────────────────────────────
  const comparativo = useMemo(() => {
    return departamentos.map(d => {
      const scrhCount = empleados.filter(e => e.st === 1 && e.depto === d.clave).length
      const ramsalCount = RAMSAL_HC[d.clave] ?? 0
      const diff = scrhCount - ramsalCount
      return { clave: d.clave, desc: d.descripcion, scrh: scrhCount, ramsal: ramsalCount, diff }
    })
  }, [departamentos, empleados])

  const coincidencias = comparativo.filter(r => r.diff === 0).length
  const diferencias   = comparativo.filter(r => r.diff !== 0 && r.ramsal > 0).length
  const noEncontrados = comparativo.filter(r => r.ramsal === 0).length

  const STATUS_LOG: Record<string, string> = {
    OK:'bg-green-100 text-green-700', Parcial:'bg-yellow-100 text-yellow-700', Error:'bg-red-100 text-red-700',
  }
  const TIPO_LOG: Record<string, string> = {
    Altas:'bg-blue-100 text-blue-700', Bajas:'bg-red-100 text-red-700', Cambios:'bg-yellow-100 text-yellow-700',
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium bg-green-50 border border-green-200 text-green-800">
          <CheckCircle2 className="w-4 h-4" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-teal-600">
          <Network className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integración Ramsal</h1>
          <p className="text-sm text-gray-500">Taxonomía y equivalencias RH-Ramsal</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200 bg-gray-50 px-4 pt-3 gap-1">
          <TabBtn active={tab === 'deptos'}      onClick={() => setTab('deptos')}>Equivalencias por Departamento</TabBtn>
          <TabBtn active={tab === 'puestos'}     onClick={() => setTab('puestos')}>Equivalencias por Puesto</TabBtn>
          <TabBtn active={tab === 'comparativo'} onClick={() => setTab('comparativo')}>Comparativo SCRH vs Ramsal</TabBtn>
          <TabBtn active={tab === 'log'}         onClick={() => setTab('log')}>Log de Sincronización</TabBtn>
        </div>

        {/* Tab: Departamentos */}
        {tab === 'deptos' && (
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="text-left py-2 px-3">SCRH Depto</th>
                    <th className="text-left py-2 px-3">Clave Ramsal</th>
                    <th className="text-left py-2 px-3">Descripción Ramsal</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {departamentos.map(d => {
                    const map = deptoMap[d.clave]
                    return (
                      <tr key={d.clave} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-gray-800">{d.descripcion}</span>
                          <span className="text-xs text-gray-400 ml-2">#{d.clave}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-gray-600">{map?.clave ?? '—'}</td>
                        <td className="py-2.5 px-3 text-gray-600">{map?.desc ?? '—'}</td>
                        <td className="py-2.5 px-3"><MapeadoBadge mapeado={!!map} /></td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => {
                              setEditDepto({ clave: d.clave, desc_scrh: d.descripcion })
                              setEditDeptoClave(map?.clave ?? '')
                              setEditDeptoDesc(map?.desc ?? '')
                            }}
                            className="text-xs px-2 py-1 rounded bg-teal-50 text-teal-600 hover:bg-teal-100 font-medium flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" /> Editar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Puestos */}
        {tab === 'puestos' && (
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="text-left py-2 px-3">SCRH Puesto</th>
                    <th className="text-left py-2 px-3">Clave Ramsal</th>
                    <th className="text-left py-2 px-3">Descripción Ramsal</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {puestos.map(p => {
                    const map = puestoMap[p.clave]
                    return (
                      <tr key={p.clave} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-gray-800">{p.descripcion}</span>
                          <span className="text-xs text-gray-400 ml-2">#{p.clave}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-gray-600">{map?.clave ?? '—'}</td>
                        <td className="py-2.5 px-3 text-gray-600">{map?.desc ?? '—'}</td>
                        <td className="py-2.5 px-3"><MapeadoBadge mapeado={!!map} /></td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => {
                              setEditPuesto({ clave: p.clave, desc_scrh: p.descripcion })
                              setEditPuestoClave(map?.clave ?? '')
                              setEditPuestoDesc(map?.desc ?? '')
                            }}
                            className="text-xs px-2 py-1 rounded bg-teal-50 text-teal-600 hover:bg-teal-100 font-medium flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" /> Editar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Comparativo */}
        {tab === 'comparativo' && (
          <div className="p-4 space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{coincidencias}</p>
                <p className="text-xs text-green-600 font-medium">Coincidencias</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-yellow-700">{diferencias}</p>
                <p className="text-xs text-yellow-600 font-medium">Diferencias</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-600">{noEncontrados}</p>
                <p className="text-xs text-gray-500 font-medium">No encontrados en Ramsal</p>
              </div>
            </div>

            {/* Side by side table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="text-left py-2 px-3">Departamento</th>
                    <th className="text-right py-2 px-3">SCRH</th>
                    <th className="text-right py-2 px-3">Ramsal</th>
                    <th className="text-right py-2 px-3">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {comparativo.map(row => {
                    const hasDiff = row.diff !== 0
                    return (
                      <tr
                        key={row.clave}
                        className={`border-b border-gray-50 ${hasDiff ? (row.ramsal === 0 ? 'bg-gray-50' : 'bg-yellow-50') : ''}`}
                      >
                        <td className="py-2 px-3 font-medium text-gray-800">{row.desc}</td>
                        <td className="py-2 px-3 text-right font-mono text-gray-700">{row.scrh}</td>
                        <td className="py-2 px-3 text-right font-mono text-gray-500">{row.ramsal === 0 ? '—' : row.ramsal}</td>
                        <td className="py-2 px-3 text-right">
                          {row.ramsal === 0 ? (
                            <span className="text-xs text-gray-400">N/A</span>
                          ) : row.diff === 0 ? (
                            <span className="text-xs text-green-600 font-semibold">0</span>
                          ) : (
                            <span className={`text-xs font-bold ${row.diff > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {row.diff > 0 ? '+' : ''}{row.diff}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Ver detalles diferencias */}
            <button
              onClick={() => setShowDiff(v => !v)}
              className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-800 font-medium"
            >
              {showDiff ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Ver detalles diferencias
            </button>

            {showDiff && (
              <div className="border border-yellow-200 rounded-xl overflow-hidden">
                <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-200">
                  <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide">Detalles de discrepancias</p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-yellow-100 text-xs text-gray-500 uppercase tracking-wide bg-white">
                      <th className="text-left py-2 px-3">Departamento</th>
                      <th className="text-right py-2 px-3">Activos SCRH</th>
                      <th className="text-right py-2 px-3">Ramsal reporta</th>
                      <th className="text-left py-2 px-3">Diagnóstico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparativo.filter(r => r.diff !== 0 && r.ramsal > 0).map(row => (
                      <tr key={row.clave} className="border-b border-yellow-50 bg-yellow-50">
                        <td className="py-2 px-3 font-medium text-gray-800">{row.desc}</td>
                        <td className="py-2 px-3 text-right font-mono text-gray-700">{row.scrh}</td>
                        <td className="py-2 px-3 text-right font-mono text-gray-500">{row.ramsal}</td>
                        <td className="py-2 px-3 text-xs text-gray-600">
                          {row.diff > 0
                            ? `${row.diff} empleado(s) en SCRH no reflejado(s) en Ramsal`
                            : `${Math.abs(row.diff)} empleado(s) en Ramsal sin registro en SCRH`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Log de Sincronización */}
        {tab === 'log' && (
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="text-left py-2 px-3">Fecha</th>
                    <th className="text-left py-2 px-3">Tipo</th>
                    <th className="text-right py-2 px-3">Enviados</th>
                    <th className="text-right py-2 px-3">Aceptados</th>
                    <th className="text-right py-2 px-3">Rechazados</th>
                    <th className="text-left py-2 px-3">Usuario</th>
                    <th className="text-left py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {SYNC_LOGS.map(l => (
                    <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 px-3 text-xs text-gray-500 whitespace-nowrap">{l.fecha}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${TIPO_LOG[l.tipo]}`}>{l.tipo}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-gray-700">{l.enviados}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-green-600">{l.aceptados}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-red-500">{l.rechazados}</td>
                      <td className="py-2.5 px-3 font-mono text-xs text-gray-600">{l.usuario}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_LOG[l.status]}`}>{l.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Dialog: Editar equivalencia departamento */}
      {editDepto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900">Editar equivalencia</h3>
            <p className="text-sm text-gray-500">SCRH: <span className="font-semibold text-gray-800">{editDepto.desc_scrh}</span></p>
            <div>
              <Label className="text-sm">Clave Ramsal</Label>
              <Input
                className="mt-1"
                value={editDeptoClave}
                onChange={e => setEditDeptoClave(e.target.value)}
                placeholder="Ej. RAM-OPE-001"
              />
            </div>
            <div>
              <Label className="text-sm">Descripción Ramsal</Label>
              <Input
                className="mt-1"
                value={editDeptoDesc}
                onChange={e => setEditDeptoDesc(e.target.value)}
                placeholder="Descripción en Ramsal"
              />
            </div>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={saveDeptoMap}>Guardar</Button>
              <Button variant="outline" onClick={() => setEditDepto(null)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog: Editar equivalencia puesto */}
      {editPuesto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900">Editar equivalencia de puesto</h3>
            <p className="text-sm text-gray-500">SCRH: <span className="font-semibold text-gray-800">{editPuesto.desc_scrh}</span></p>
            <div>
              <Label className="text-sm">Clave Ramsal</Label>
              <Input
                className="mt-1"
                value={editPuestoClave}
                onChange={e => setEditPuestoClave(e.target.value)}
                placeholder="Ej. RAM-DRV-001"
              />
            </div>
            <div>
              <Label className="text-sm">Descripción Ramsal</Label>
              <Input
                className="mt-1"
                value={editPuestoDesc}
                onChange={e => setEditPuestoDesc(e.target.value)}
                placeholder="Descripción en Ramsal"
              />
            </div>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={savePuestoMap}>Guardar</Button>
              <Button variant="outline" onClick={() => setEditPuesto(null)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
