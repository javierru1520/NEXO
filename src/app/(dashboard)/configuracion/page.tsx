"use client"

import { useState, useMemo } from 'react'
import { useSCRHStore } from '@/store'
import type { Empresa, Departamento, Puesto, CentroCostos, UnidadNegocio, TipoBaja, MotivoBaja, CausaBaja } from '@/types'
import {
  Settings, Database, Users, Plug, ImageIcon,
  Edit2, Plus, CheckCircle, X, RefreshCw, Loader2,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

// ── Types ─────────────────────────────────────────────────────────────────────
type MainTab = 'catalogos' | 'parametros' | 'usuarios' | 'integraciones' | 'imagenes'
type CatalogoTab = 'empresas' | 'departamentos' | 'puestos' | 'ccentros' | 'unidades' | 'bajas'

interface Usuario {
  id: number
  nomina: string
  nombre: string
  tipo: 'Administrador' | 'Supervisor' | 'Capturista'
  nivel: 1 | 2 | 3
  empresa: number
  activo: boolean
  ultimo_acceso: string
}

interface Parametro {
  id: number
  proceso: string
  descripcion: string
  valor_min: number
  valor_max: number
  editando?: boolean
  valor_min_edit?: string
  valor_max_edit?: string
}

// ── Mock users ────────────────────────────────────────────────────────────────
const MOCK_USUARIOS: Usuario[] = [
  { id: 1, nomina: 'ADM001', nombre: 'Gerardo Ramírez Torres',     tipo: 'Administrador', nivel: 1, empresa: 1, activo: true,  ultimo_acceso: '2026-03-29 08:14' },
  { id: 2, nomina: 'ADM002', nombre: 'Patricia Leal Contreras',    tipo: 'Administrador', nivel: 1, empresa: 2, activo: true,  ultimo_acceso: '2026-03-28 17:52' },
  { id: 3, nomina: 'SUP001', nombre: 'Marco Antonio Pérez Ibáñez', tipo: 'Supervisor',    nivel: 2, empresa: 1, activo: true,  ultimo_acceso: '2026-03-30 09:01' },
  { id: 4, nomina: 'SUP002', nombre: 'Diana Rojas Mendez',         tipo: 'Supervisor',    nivel: 2, empresa: 3, activo: true,  ultimo_acceso: '2026-03-27 14:33' },
  { id: 5, nomina: 'CAP001', nombre: 'Héctor Vázquez Soto',        tipo: 'Capturista',    nivel: 3, empresa: 1, activo: true,  ultimo_acceso: '2026-03-30 10:22' },
  { id: 6, nomina: 'CAP002', nombre: 'Lorena Fuentes Cruz',        tipo: 'Capturista',    nivel: 3, empresa: 2, activo: false, ultimo_acceso: '2026-03-10 11:45' },
  { id: 7, nomina: 'CAP003', nombre: 'Roberto Salinas Garza',      tipo: 'Capturista',    nivel: 3, empresa: 1, activo: true,  ultimo_acceso: '2026-03-29 16:08' },
  { id: 8, nomina: 'SUP003', nombre: 'Claudia Montoya Reyes',      tipo: 'Supervisor',    nivel: 2, empresa: 3, activo: true,  ultimo_acceso: '2026-03-28 08:55' },
]

const MOCK_PARAMETROS: Parametro[] = [
  { id: 1, proceso: 'Control autorizaciones', descripcion: 'Estado del sistema: 1=Abierto, 2=Fuera de horario, 3=Feriado', valor_min: 1, valor_max: 1 },
  { id: 2, proceso: 'Límite fecha baja', descripcion: 'Días hacia atrás permitidos para registrar una baja', valor_min: 0, valor_max: 30 },
  { id: 3, proceso: 'Prima vacacional', descripcion: 'Porcentaje de prima vacacional (default LFT 25%)', valor_min: 25, valor_max: 100 },
  { id: 4, proceso: 'UMA vigente', descripcion: 'Unidad de Medida y Actualización vigente', valor_min: 108, valor_max: 108 },
  { id: 5, proceso: 'Factor catorcenal', descripcion: 'Factor de conversión sueldo mensual a catorcenal', valor_min: 30, valor_max: 31 },
  { id: 6, proceso: 'Factor semanal', descripcion: 'Factor de conversión sueldo mensual a semanal', valor_min: 30, valor_max: 30 },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium rounded-t-md border-b-2 transition-colors whitespace-nowrap ${
        active ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  )
}

function CatTabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
        active ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ConfiguracionPage() {
  const { empresas: storeEmpresas, departamentos: storeDepts, puestos: storePuestos, centrosCostos: storeCC, unidadesNegocio: storeUN, tiposBaja: storeTB, motivosBaja: storeMB, causasBaja: storeCB, getEmpresaNombre } = useSCRHStore()

  const [mainTab, setMainTab] = useState<MainTab>('catalogos')
  const [catTab, setCatTab] = useState<CatalogoTab>('empresas')
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // ── Local catalog state ───────────────────────────────────────────────────
  const [empresas, setEmpresas] = useState<Empresa[]>(() => storeEmpresas)
  const [deptos, setDeptos] = useState<Departamento[]>(() => storeDepts)
  const [puestos, setPuestos] = useState<Puesto[]>(() => storePuestos)
  const [ccostos, setCCostos] = useState<CentroCostos[]>(() => storeCC)
  const [unidades, setUnidades] = useState<UnidadNegocio[]>(() => storeUN)
  const [tiposBaja, setTiposBaja] = useState<TipoBaja[]>(() => storeTB)
  const [motivosBaja, setMotivosBaja] = useState<MotivoBaja[]>(() => storeMB)
  const [causasBaja, setCausasBaja] = useState<CausaBaja[]>(() => storeCB)

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [dialogType, setDialogType] = useState<CatalogoTab>('empresas')
  const [dialogItem, setDialogItem] = useState<Record<string, string | number | boolean>>({})

  // ── Usuarios state ────────────────────────────────────────────────────────
  const [usuarios, setUsuarios] = useState<Usuario[]>(MOCK_USUARIOS)
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [userDialogMode, setUserDialogMode] = useState<'create' | 'edit'>('create')
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [userForm, setUserForm] = useState({ nomina: '', nombre: '', tipo: 'Capturista' as Usuario['tipo'], nivel: 3 as 1 | 2 | 3, empresa: 1, password: '' })

  // ── Parametros state ──────────────────────────────────────────────────────
  const [parametros, setParametros] = useState<Parametro[]>(MOCK_PARAMETROS)

  // ── Integrations state ────────────────────────────────────────────────────
  const [syncLoading, setSyncLoading] = useState(false)
  const [lastSync, setLastSync] = useState('2026-03-30 06:00')

  // ── Dialog helpers ────────────────────────────────────────────────────────
  function openCreate(type: CatalogoTab) {
    setDialogType(type)
    setDialogMode('create')
    setDialogItem({})
    setDialogOpen(true)
  }

  function openEdit(type: CatalogoTab, item: Record<string, string | number | boolean>) {
    setDialogType(type)
    setDialogMode('edit')
    setDialogItem({ ...item })
    setDialogOpen(true)
  }

  function saveDialog() {
    setDialogOpen(false)
    showToast('Guardado correctamente')

    if (dialogType === 'empresas') {
      if (dialogMode === 'create') {
        const newItem: Empresa = {
          clave: Math.max(...empresas.map(e => e.clave)) + 1,
          razon_social: String(dialogItem.razon_social || ''),
          descripcion: String(dialogItem.descripcion || ''),
          periodo_pago: (dialogItem.periodo_pago as 'catorcenal' | 'semanal') || 'catorcenal',
          status: 1,
        }
        setEmpresas(p => [...p, newItem])
      } else {
        setEmpresas(p => p.map(e => e.clave === dialogItem.clave ? { ...e, ...dialogItem } as Empresa : e))
      }
    } else if (dialogType === 'departamentos') {
      if (dialogMode === 'create') {
        const newItem: Departamento = {
          clave: Math.max(...deptos.map(d => d.clave)) + 1,
          descripcion: String(dialogItem.descripcion || ''),
          status: 1,
        }
        setDeptos(p => [...p, newItem])
      } else {
        setDeptos(p => p.map(d => d.clave === dialogItem.clave ? { ...d, ...dialogItem } as Departamento : d))
      }
    } else if (dialogType === 'puestos') {
      if (dialogMode === 'create') {
        const newItem: Puesto = {
          clave: Math.max(...puestos.map(p => p.clave)) + 1,
          descripcion: String(dialogItem.descripcion || ''),
          st: 1,
        }
        setPuestos(p => [...p, newItem])
      } else {
        setPuestos(p => p.map(pt => pt.clave === dialogItem.clave ? { ...pt, ...dialogItem } as Puesto : pt))
      }
    } else if (dialogType === 'ccentros') {
      if (dialogMode === 'create') {
        const newItem: CentroCostos = {
          clave: Math.max(...ccostos.map(c => c.clave)) + 1,
          descripcion: String(dialogItem.descripcion || ''),
          desc_corta: String(dialogItem.desc_corta || ''),
        }
        setCCostos(p => [...p, newItem])
      } else {
        setCCostos(p => p.map(c => c.clave === dialogItem.clave ? { ...c, ...dialogItem } as CentroCostos : c))
      }
    } else if (dialogType === 'unidades') {
      if (dialogMode === 'create') {
        const newItem: UnidadNegocio = {
          clave: Math.max(...unidades.map(u => u.clave)) + 1,
          descripcion: String(dialogItem.descripcion || ''),
        }
        setUnidades(p => [...p, newItem])
      } else {
        setUnidades(p => p.map(u => u.clave === dialogItem.clave ? { ...u, ...dialogItem } as UnidadNegocio : u))
      }
    }
  }

  // ── User helpers ──────────────────────────────────────────────────────────
  function openUserCreate() {
    setUserDialogMode('create')
    setEditingUser(null)
    setUserForm({ nomina: '', nombre: '', tipo: 'Capturista', nivel: 3, empresa: 1, password: '' })
    setUserDialogOpen(true)
  }

  function openUserEdit(u: Usuario) {
    setUserDialogMode('edit')
    setEditingUser(u)
    setUserForm({ nomina: u.nomina, nombre: u.nombre, tipo: u.tipo, nivel: u.nivel, empresa: u.empresa, password: '' })
    setUserDialogOpen(true)
  }

  function saveUser() {
    if (userDialogMode === 'create') {
      const nu: Usuario = {
        id: Math.max(...usuarios.map(u => u.id)) + 1,
        ...userForm,
        activo: true,
        ultimo_acceso: '—',
      }
      setUsuarios(p => [...p, nu])
    } else if (editingUser) {
      setUsuarios(p => p.map(u => u.id === editingUser.id ? { ...u, ...userForm } : u))
    }
    setUserDialogOpen(false)
    showToast('Usuario guardado')
  }

  function toggleUsuario(id: number) {
    setUsuarios(p => p.map(u => u.id === id ? { ...u, activo: !u.activo } : u))
    showToast('Estado actualizado')
  }

  // ── Parametros helpers ────────────────────────────────────────────────────
  function startEdit(id: number) {
    setParametros(p => p.map(pr => pr.id === id
      ? { ...pr, editando: true, valor_min_edit: String(pr.valor_min), valor_max_edit: String(pr.valor_max) }
      : pr
    ))
  }

  function saveParam(id: number) {
    setParametros(p => p.map(pr => {
      if (pr.id !== id) return pr
      return {
        ...pr,
        editando: false,
        valor_min: parseFloat(pr.valor_min_edit ?? String(pr.valor_min)) || pr.valor_min,
        valor_max: parseFloat(pr.valor_max_edit ?? String(pr.valor_max)) || pr.valor_max,
      }
    }))
    showToast('Parámetro actualizado')
  }

  function cancelEdit(id: number) {
    setParametros(p => p.map(pr => pr.id === id ? { ...pr, editando: false } : pr))
  }

  // ── Sync ──────────────────────────────────────────────────────────────────
  function sincronizarTalentrax() {
    setSyncLoading(true)
    setTimeout(() => {
      setSyncLoading(false)
      setLastSync(new Date().toLocaleString('es-MX'))
      showToast('Sincronización completada exitosamente')
    }, 2000)
  }

  const nivelColors: Record<number, string> = {
    1: 'bg-purple-100 text-purple-700',
    2: 'bg-blue-100 text-blue-700',
    3: 'bg-gray-100 text-gray-700',
  }

  // ── Dialog form renderer ──────────────────────────────────────────────────
  function renderDialogForm() {
    if (dialogType === 'empresas') {
      return (
        <div className="space-y-3">
          <div>
            <Label>Razón Social *</Label>
            <Input value={String(dialogItem.razon_social || '')} onChange={e => setDialogItem(p => ({ ...p, razon_social: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label>Descripción</Label>
            <Input value={String(dialogItem.descripcion || '')} onChange={e => setDialogItem(p => ({ ...p, descripcion: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label>Período de pago</Label>
            <select value={String(dialogItem.periodo_pago || 'catorcenal')} onChange={e => setDialogItem(p => ({ ...p, periodo_pago: e.target.value }))} className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white">
              <option value="catorcenal">Catorcenal</option>
              <option value="semanal">Semanal</option>
            </select>
          </div>
        </div>
      )
    }
    if (dialogType === 'departamentos' || dialogType === 'puestos') {
      return (
        <div>
          <Label>Descripción *</Label>
          <Input value={String(dialogItem.descripcion || '')} onChange={e => setDialogItem(p => ({ ...p, descripcion: e.target.value }))} className="mt-1" />
        </div>
      )
    }
    if (dialogType === 'ccentros') {
      return (
        <div className="space-y-3">
          <div>
            <Label>Descripción *</Label>
            <Input value={String(dialogItem.descripcion || '')} onChange={e => setDialogItem(p => ({ ...p, descripcion: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label>Descripción corta</Label>
            <Input value={String(dialogItem.desc_corta || '')} onChange={e => setDialogItem(p => ({ ...p, desc_corta: e.target.value }))} className="mt-1" maxLength={6} />
          </div>
        </div>
      )
    }
    if (dialogType === 'unidades') {
      return (
        <div>
          <Label>Descripción *</Label>
          <Input value={String(dialogItem.descripcion || '')} onChange={e => setDialogItem(p => ({ ...p, descripcion: e.target.value }))} className="mt-1" />
        </div>
      )
    }
    return null
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium bg-green-50 border border-green-200 text-green-800">
          <CheckCircle className="w-4 h-4" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex border-b border-gray-200 px-4 pt-2 gap-1 overflow-x-auto">
          <TabBtn active={mainTab === 'catalogos'} onClick={() => setMainTab('catalogos')}><Database className="w-3.5 h-3.5 inline mr-1" />Catálogos</TabBtn>
          <TabBtn active={mainTab === 'parametros'} onClick={() => setMainTab('parametros')}><Settings className="w-3.5 h-3.5 inline mr-1" />Parámetros</TabBtn>
          <TabBtn active={mainTab === 'usuarios'} onClick={() => setMainTab('usuarios')}><Users className="w-3.5 h-3.5 inline mr-1" />Usuarios</TabBtn>
          <TabBtn active={mainTab === 'integraciones'} onClick={() => setMainTab('integraciones')}><Plug className="w-3.5 h-3.5 inline mr-1" />Integraciones</TabBtn>
          <TabBtn active={mainTab === 'imagenes'} onClick={() => setMainTab('imagenes')}><ImageIcon className="w-3.5 h-3.5 inline mr-1" />Imágenes</TabBtn>
        </div>

        {/* ── CATÁLOGOS ── */}
        {mainTab === 'catalogos' && (
          <div className="p-5">
            <div className="flex flex-wrap gap-1.5 mb-5">
              <CatTabBtn active={catTab === 'empresas'} onClick={() => setCatTab('empresas')}>Empresas</CatTabBtn>
              <CatTabBtn active={catTab === 'departamentos'} onClick={() => setCatTab('departamentos')}>Departamentos</CatTabBtn>
              <CatTabBtn active={catTab === 'puestos'} onClick={() => setCatTab('puestos')}>Puestos</CatTabBtn>
              <CatTabBtn active={catTab === 'ccentros'} onClick={() => setCatTab('ccentros')}>Centros de Costos</CatTabBtn>
              <CatTabBtn active={catTab === 'unidades'} onClick={() => setCatTab('unidades')}>Unidades de Negocio</CatTabBtn>
              <CatTabBtn active={catTab === 'bajas'} onClick={() => setCatTab('bajas')}>Tipos/Motivos/Causas Baja</CatTabBtn>
            </div>

            {/* Empresas */}
            {catTab === 'empresas' && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Empresas ({empresas.length})</h3>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => openCreate('empresas')}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Nueva empresa
                  </Button>
                </div>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left bg-gray-50">
                    {['Clave', 'Razón Social', 'Descripción', 'Período pago', 'Status', ''].map(h => <th key={h} className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {empresas.map(e => (
                      <tr key={e.clave} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 font-mono text-xs">{e.clave}</td>
                        <td className="py-2 px-3 font-medium">{e.razon_social}</td>
                        <td className="py-2 px-3 text-xs text-gray-500">{e.descripcion}</td>
                        <td className="py-2 px-3 text-xs">{e.periodo_pago}</td>
                        <td className="py-2 px-3">
                          <button onClick={() => { setEmpresas(p => p.map(x => x.clave === e.clave ? { ...x, status: x.status === 1 ? 0 : 1 } : x)); showToast('Estado actualizado') }}>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${e.status === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                              {e.status === 1 ? 'Activo' : 'Inactivo'}
                            </span>
                          </button>
                        </td>
                        <td className="py-2 px-3">
                          <Button size="sm" variant="ghost" onClick={() => openEdit('empresas', e as unknown as Record<string, string | number | boolean>)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Departamentos */}
            {catTab === 'departamentos' && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Departamentos ({deptos.length})</h3>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => openCreate('departamentos')}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Nuevo
                  </Button>
                </div>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left bg-gray-50">
                    {['Clave', 'Descripción', 'Status', ''].map(h => <th key={h} className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {deptos.map(d => (
                      <tr key={d.clave} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 font-mono text-xs">{d.clave}</td>
                        <td className="py-2 px-3">{d.descripcion}</td>
                        <td className="py-2 px-3">
                          <button onClick={() => { setDeptos(p => p.map(x => x.clave === d.clave ? { ...x, status: x.status === 1 ? 0 : 1 } : x)); showToast('Estado actualizado') }}>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${d.status === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                              {d.status === 1 ? 'Activo' : 'Inactivo'}
                            </span>
                          </button>
                        </td>
                        <td className="py-2 px-3">
                          <Button size="sm" variant="ghost" onClick={() => openEdit('departamentos', d as unknown as Record<string, string | number | boolean>)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Puestos */}
            {catTab === 'puestos' && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Puestos ({puestos.length})</h3>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => openCreate('puestos')}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Nuevo
                  </Button>
                </div>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left bg-gray-50">
                    {['Clave', 'Descripción', 'Status', ''].map(h => <th key={h} className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {puestos.map(p => (
                      <tr key={p.clave} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 font-mono text-xs">{p.clave}</td>
                        <td className="py-2 px-3">{p.descripcion}</td>
                        <td className="py-2 px-3">
                          <button onClick={() => { setPuestos(prev => prev.map(x => x.clave === p.clave ? { ...x, st: x.st === 1 ? 0 : 1 } : x)); showToast('Estado actualizado') }}>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.st === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                              {p.st === 1 ? 'Activo' : 'Inactivo'}
                            </span>
                          </button>
                        </td>
                        <td className="py-2 px-3">
                          <Button size="sm" variant="ghost" onClick={() => openEdit('puestos', p as unknown as Record<string, string | number | boolean>)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Centros de Costos */}
            {catTab === 'ccentros' && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Centros de Costos ({ccostos.length})</h3>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => openCreate('ccentros')}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Nuevo
                  </Button>
                </div>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left bg-gray-50">
                    {['Clave', 'Descripción', 'Desc. Corta', ''].map(h => <th key={h} className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {ccostos.map(c => (
                      <tr key={c.clave} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 font-mono text-xs">{c.clave}</td>
                        <td className="py-2 px-3">{c.descripcion}</td>
                        <td className="py-2 px-3"><span className="px-2 py-0.5 bg-gray-100 rounded font-mono text-xs">{c.desc_corta}</span></td>
                        <td className="py-2 px-3">
                          <Button size="sm" variant="ghost" onClick={() => openEdit('ccentros', c as unknown as Record<string, string | number | boolean>)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Unidades de Negocio */}
            {catTab === 'unidades' && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Unidades de Negocio ({unidades.length})</h3>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => openCreate('unidades')}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Nuevo
                  </Button>
                </div>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left bg-gray-50">
                    {['Clave', 'Descripción', ''].map(h => <th key={h} className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {unidades.map(u => (
                      <tr key={u.clave} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 font-mono text-xs">{u.clave}</td>
                        <td className="py-2 px-3">{u.descripcion}</td>
                        <td className="py-2 px-3">
                          <Button size="sm" variant="ghost" onClick={() => openEdit('unidades', u as unknown as Record<string, string | number | boolean>)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tipos/Motivos/Causas Baja */}
            {catTab === 'bajas' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tipos */}
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Tipos de Baja</h4>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-100 text-left">
                      <th className="py-1.5 px-2 text-xs text-gray-400">Desc.</th>
                      <th className="py-1.5 px-2 text-xs text-gray-400">Status</th>
                    </tr></thead>
                    <tbody>
                      {tiposBaja.map(t => (
                        <tr key={t.clave} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-1.5 px-2 text-xs">{t.descripcion}</td>
                          <td className="py-1.5 px-2">
                            <button onClick={() => { setTiposBaja(p => p.map(x => x.clave === t.clave ? { ...x, status: x.status === 1 ? 0 : 1 } : x)); showToast('Guardado') }}>
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${t.status === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                {t.status === 1 ? 'A' : 'I'}
                              </span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Motivos */}
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Motivos de Baja</h4>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-100 text-left">
                      <th className="py-1.5 px-2 text-xs text-gray-400">Desc.</th>
                      <th className="py-1.5 px-2 text-xs text-gray-400">Status</th>
                    </tr></thead>
                    <tbody>
                      {motivosBaja.map(m => (
                        <tr key={m.clave} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-1.5 px-2 text-xs">{m.descripcion}</td>
                          <td className="py-1.5 px-2">
                            <button onClick={() => { setMotivosBaja(p => p.map(x => x.clave === m.clave ? { ...x, status: x.status === 1 ? 0 : 1 } : x)); showToast('Guardado') }}>
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${m.status === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                {m.status === 1 ? 'A' : 'I'}
                              </span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Causas */}
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Causas de Baja</h4>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-100 text-left">
                      <th className="py-1.5 px-2 text-xs text-gray-400">Desc.</th>
                      <th className="py-1.5 px-2 text-xs text-gray-400">Status</th>
                    </tr></thead>
                    <tbody>
                      {causasBaja.map(c => (
                        <tr key={c.clave} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-1.5 px-2 text-xs">{c.descripcion}</td>
                          <td className="py-1.5 px-2">
                            <button onClick={() => { setCausasBaja(p => p.map(x => x.clave === c.clave ? { ...x, status: x.status === 1 ? 0 : 1 } : x)); showToast('Guardado') }}>
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${c.status === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                {c.status === 1 ? 'A' : 'I'}
                              </span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PARÁMETROS ── */}
        {mainTab === 'parametros' && (
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Parámetros del Sistema</h3>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 text-left bg-gray-50">
                {['Proceso', 'Descripción', 'Valor mínimo', 'Valor máximo', ''].map(h => (
                  <th key={h} className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {parametros.map(pr => (
                  <tr key={pr.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium text-sm">{pr.proceso}</td>
                    <td className="py-3 px-3 text-xs text-gray-500 max-w-xs">{pr.descripcion}</td>
                    <td className="py-3 px-3">
                      {pr.editando
                        ? <Input type="number" value={pr.valor_min_edit} onChange={e => setParametros(p => p.map(x => x.id === pr.id ? { ...x, valor_min_edit: e.target.value } : x))} className="w-24 h-7 text-sm" />
                        : <span className="font-mono text-sm font-semibold text-indigo-700">{pr.valor_min}</span>
                      }
                    </td>
                    <td className="py-3 px-3">
                      {pr.editando
                        ? <Input type="number" value={pr.valor_max_edit} onChange={e => setParametros(p => p.map(x => x.id === pr.id ? { ...x, valor_max_edit: e.target.value } : x))} className="w-24 h-7 text-sm" />
                        : <span className="font-mono text-sm font-semibold text-indigo-700">{pr.valor_max}</span>
                      }
                    </td>
                    <td className="py-3 px-3">
                      {pr.editando ? (
                        <div className="flex gap-1">
                          <Button size="sm" className="h-7 text-xs bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => saveParam(pr.id)}>Guardar</Button>
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => cancelEdit(pr.id)}><X className="w-3 h-3" /></Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => startEdit(pr.id)}><Edit2 className="w-3.5 h-3.5" /></Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── USUARIOS ── */}
        {mainTab === 'usuarios' && (
          <div className="p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Usuarios del Sistema ({usuarios.length})</h3>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={openUserCreate}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Nuevo usuario
              </Button>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 text-left bg-gray-50">
                {['Nómina', 'Nombre', 'Tipo', 'Nivel', 'Empresa', 'Activo', 'Último acceso', 'Acciones'].map(h => (
                  <th key={h} className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs">{u.nomina}</td>
                    <td className="py-2 px-3 whitespace-nowrap">{u.nombre}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${nivelColors[u.nivel]}`}>
                        {u.tipo}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-gray-600">{u.nivel}</td>
                    <td className="py-2 px-3 text-xs text-gray-600">{getEmpresaNombre(u.empresa)}</td>
                    <td className="py-2 px-3">
                      <Switch
                        checked={u.activo}
                        onCheckedChange={() => toggleUsuario(u.id)}
                      />
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-400 whitespace-nowrap">{u.ultimo_acceso}</td>
                    <td className="py-2 px-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openUserEdit(u)}><Edit2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── INTEGRACIONES ── */}
        {mainTab === 'integraciones' && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Talentrax */}
            <div className="border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-800">Talentrax</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Plataforma de gestión de talento</p>
                </div>
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 rounded-full text-xs font-semibold text-green-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Conectado
                </span>
              </div>
              <div>
                <Label className="text-xs text-gray-500">URL del servicio</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input value="https://api.talentrax.com/v2/•••••••••" readOnly className="text-xs text-gray-400 bg-gray-50" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Último sincronizado:</span>
                <span className="font-medium text-gray-700">{lastSync}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={sincronizarTalentrax}
                  disabled={syncLoading}
                >
                  {syncLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                  {syncLoading ? 'Sincronizando...' : 'Sincronizar ahora'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => showToast('Cola de procesos: ver /talentrax')}>
                  <ExternalLink className="w-3.5 h-3.5 mr-1" /> Ver cola de procesos
                </Button>
              </div>
            </div>

            {/* Ramsal */}
            <div className="border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-800">Ramsal</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Sistema de nómina y CFDI</p>
                </div>
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 rounded-full text-xs font-semibold text-green-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Activo
                </span>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Empresa Ramsal</Label>
                <Input defaultValue="LIPU_TRAX_PROD" className="mt-1 text-sm" />
              </div>
              <div className="pt-2">
                <Button size="sm" variant="outline" onClick={() => showToast('Redirigiendo a /ramsal...')}>
                  <ExternalLink className="w-3.5 h-3.5 mr-1" /> Ver equivalencias
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── IMÁGENES ── */}
        {mainTab === 'imagenes' && (
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Imágenes del Sistema</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Logo principal', desc: 'Header de la aplicación', updated: '2026-01-15' },
                { label: 'Logo gafete', desc: 'Para impresión de credenciales', updated: '2026-01-15' },
                { label: 'Imagen de inicio', desc: 'Pantalla de bienvenida', updated: '2025-12-01' },
                { label: 'Firma digital', desc: 'Documentos oficiales', updated: '2026-02-10' },
              ].map(img => (
                <div key={img.label} className="border border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-indigo-400 transition-colors">
                  <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">{img.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 mb-3">{img.desc}</p>
                  <p className="text-[10px] text-gray-400 mb-3">Actualizado: {img.updated}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => showToast(`Función de subida de imágenes próximamente`)}
                  >
                    Subir imagen
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── CATALOG DIALOG ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'Nuevo registro' : 'Editar registro'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {renderDialogForm()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={saveDialog}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── USER DIALOG ── */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {userDialogMode === 'create' ? 'Nuevo usuario' : 'Editar usuario'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div>
              <Label>Nómina *</Label>
              <Input value={userForm.nomina} onChange={e => setUserForm(p => ({ ...p, nomina: e.target.value }))} className="mt-1" placeholder="Ej: CAP004" />
            </div>
            <div>
              <Label>Nombre completo *</Label>
              <Input value={userForm.nombre} onChange={e => setUserForm(p => ({ ...p, nombre: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de usuario</Label>
                <select
                  value={userForm.tipo}
                  onChange={e => {
                    const tipo = e.target.value as Usuario['tipo']
                    const nivel = tipo === 'Administrador' ? 1 : tipo === 'Supervisor' ? 2 : 3
                    setUserForm(p => ({ ...p, tipo, nivel }))
                  }}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Capturista">Capturista</option>
                </select>
              </div>
              <div>
                <Label>Nivel</Label>
                <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600">
                  {userForm.nivel}
                </div>
              </div>
            </div>
            <div>
              <Label>Empresa</Label>
              <select
                value={userForm.empresa}
                onChange={e => setUserForm(p => ({ ...p, empresa: Number(e.target.value) }))}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
              >
                {storeEmpresas.map(e => <option key={e.clave} value={e.clave}>{e.razon_social}</option>)}
              </select>
            </div>
            <div>
              <Label>Contraseña {userDialogMode === 'edit' && '(dejar vacío para no cambiar)'}</Label>
              <Input type="password" value={userForm.password} onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} className="mt-1" placeholder="••••••••" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={saveUser}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
