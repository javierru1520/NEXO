"use client"

import { useState, useMemo } from 'react'
import { useSCRHStore } from '@/store'
import {
  UserCheck, Users, Link2, AlertCircle, CheckCircle,
  Plus, Eye, XCircle, Edit2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Asignacion {
  id: number
  tipo: 'Supervisor-Servicio' | 'Operador-Ruta' | 'Prefecto-Área'
  clave_emp: string
  servicio_cliente: string
  fecha_inicio: string
  fecha_fin?: string
  activa: boolean
  observaciones?: string
  usuario: string
}

interface Cliente {
  id: number
  nombre: string
  tipo: 'Comercial' | 'Industrial' | 'Gobierno' | 'Educativo'
  contacto: string
  activo: boolean
}

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_ASIGNACIONES: Asignacion[] = [
  { id: 1, tipo: 'Supervisor-Servicio', clave_emp: '1001', servicio_cliente: 'Grupo Industrial Norte', fecha_inicio: '2024-01-10', activa: true, usuario: 'ADMIN' },
  { id: 2, tipo: 'Supervisor-Servicio', clave_emp: '1002', servicio_cliente: 'Comercializadora del Centro', fecha_inicio: '2024-02-15', activa: true, usuario: 'ADMIN' },
  { id: 3, tipo: 'Operador-Ruta', clave_emp: '1003', servicio_cliente: 'Ruta 12 Norte', fecha_inicio: '2024-03-01', activa: true, usuario: 'ADMIN' },
  { id: 4, tipo: 'Operador-Ruta', clave_emp: '1004', servicio_cliente: 'Ruta 5 Sur', fecha_inicio: '2024-03-10', activa: true, usuario: 'ADMIN' },
  { id: 5, tipo: 'Prefecto-Área', clave_emp: '1005', servicio_cliente: 'Área Almacén A', fecha_inicio: '2024-04-01', activa: true, usuario: 'ADMIN' },
  { id: 6, tipo: 'Prefecto-Área', clave_emp: '1006', servicio_cliente: 'Área Producción B', fecha_inicio: '2024-04-15', activa: true, usuario: 'ADMIN' },
  { id: 7, tipo: 'Supervisor-Servicio', clave_emp: '1007', servicio_cliente: 'Institución Educativa SEP', fecha_inicio: '2024-05-01', activa: true, usuario: 'ADMIN' },
  { id: 8, tipo: 'Operador-Ruta', clave_emp: '1008', servicio_cliente: 'Ruta 8 Oriente', fecha_inicio: '2024-05-20', activa: true, usuario: 'ADMIN' },
  { id: 9, tipo: 'Supervisor-Servicio', clave_emp: '1009', servicio_cliente: 'Gobierno Municipal', fecha_inicio: '2024-06-01', fecha_fin: '2024-12-31', activa: false, usuario: 'ADMIN', observaciones: 'Contrato finalizado' },
  { id: 10, tipo: 'Operador-Ruta', clave_emp: '1010', servicio_cliente: 'Ruta 3 Centro', fecha_inicio: '2024-06-15', fecha_fin: '2025-01-15', activa: false, usuario: 'ADMIN' },
  { id: 11, tipo: 'Prefecto-Área', clave_emp: '1011', servicio_cliente: 'Área Carga C', fecha_inicio: '2024-07-01', activa: true, usuario: 'ADMIN' },
  { id: 12, tipo: 'Supervisor-Servicio', clave_emp: '1012', servicio_cliente: 'Grupo Comercial Oeste', fecha_inicio: '2024-07-20', activa: true, usuario: 'ADMIN' },
  { id: 13, tipo: 'Operador-Ruta', clave_emp: '1013', servicio_cliente: 'Ruta 15 Poniente', fecha_inicio: '2024-08-01', fecha_fin: '2025-02-28', activa: false, usuario: 'ADMIN' },
  { id: 14, tipo: 'Prefecto-Área', clave_emp: '1014', servicio_cliente: 'Área Distribución D', fecha_inicio: '2024-09-01', activa: true, usuario: 'ADMIN' },
  { id: 15, tipo: 'Supervisor-Servicio', clave_emp: '1015', servicio_cliente: 'Empresa Gobierno Federal', fecha_inicio: '2024-10-01', activa: true, usuario: 'ADMIN' },
]

const MOCK_CLIENTES: Cliente[] = [
  { id: 1, nombre: 'Grupo Industrial Norte', tipo: 'Industrial', contacto: 'Ing. Roberto Sánchez — (81) 1234-5678', activo: true },
  { id: 2, nombre: 'Comercializadora del Centro', tipo: 'Comercial', contacto: 'Lic. María López — (55) 2345-6789', activo: true },
  { id: 3, nombre: 'Institución Educativa SEP', tipo: 'Educativo', contacto: 'Mtra. Ana García — (33) 3456-7890', activo: true },
  { id: 4, nombre: 'Gobierno Municipal', tipo: 'Gobierno', contacto: 'C. Pedro Martínez — (81) 4567-8901', activo: true },
  { id: 5, nombre: 'Grupo Comercial Oeste', tipo: 'Comercial', contacto: 'Ing. Luis Torres — (33) 5678-9012', activo: true },
  { id: 6, nombre: 'Empresa Gobierno Federal', tipo: 'Gobierno', contacto: 'Lic. Carmen Díaz — (55) 6789-0123', activo: true },
  { id: 7, nombre: 'Planta Industrial Sur', tipo: 'Industrial', contacto: 'Ing. Jorge Ramírez — (81) 7890-1234', activo: false },
  { id: 8, nombre: 'Colegio Particular Norte', tipo: 'Educativo', contacto: 'Dra. Sofía Herrera — (81) 8901-2345', activo: true },
]

// ── Helper components ──────────────────────────────────────────────────────────

type MainTab = 'activas' | 'por-tipo' | 'clientes' | 'historial'
type SubTab = 'supervisores' | 'operadores' | 'prefectos'

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
        active
          ? 'border-indigo-600 text-indigo-700 bg-white'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  )
}

function TipoBadge({ tipo }: { tipo: Asignacion['tipo'] }) {
  const map: Record<Asignacion['tipo'], string> = {
    'Supervisor-Servicio': 'bg-indigo-100 text-indigo-700',
    'Operador-Ruta': 'bg-amber-100 text-amber-700',
    'Prefecto-Área': 'bg-teal-100 text-teal-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[tipo]}`}>
      {tipo}
    </span>
  )
}

function StatusBadge({ activa }: { activa: boolean }) {
  return activa
    ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Activa</span>
    : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">Finalizada</span>
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AsignacionesPage() {
  const { empleados, getPuestoNombre, getEmpleado } = useSCRHStore()

  const [tab, setTab] = useState<MainTab>('activas')
  const [subTab, setSubTab] = useState<SubTab>('supervisores')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Local state for asignaciones & clientes
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>(MOCK_ASIGNACIONES)
  const [clientes, setClientes] = useState<Cliente[]>(MOCK_CLIENTES)

  // Nueva asignación sheet
  const [showNuevaSheet, setShowNuevaSheet] = useState(false)
  const [formTipo, setFormTipo] = useState<Asignacion['tipo']>('Supervisor-Servicio')
  const [formClave, setFormClave] = useState('')
  const [formServicio, setFormServicio] = useState('')
  const [formFechaInicio, setFormFechaInicio] = useState('')
  const [formFechaFin, setFormFechaFin] = useState('')
  const [formObs, setFormObs] = useState('')
  const [formEmpleado, setFormEmpleado] = useState<ReturnType<typeof getEmpleado>>(undefined)
  const [formNotFound, setFormNotFound] = useState(false)

  // Finalizar dialog
  const [finalizarId, setFinalizarId] = useState<number | null>(null)

  // Nuevo cliente dialog
  const [showNuevoCliente, setShowNuevoCliente] = useState(false)
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTipo, setClienteTipo] = useState<Cliente['tipo']>('Comercial')
  const [clienteContacto, setClienteContacto] = useState('')

  // Stats
  const activas = useMemo(() => asignaciones.filter(a => a.activa), [asignaciones])
  const supervisoresAsignados = useMemo(() => activas.filter(a => a.tipo === 'Supervisor-Servicio').length, [activas])
  const operadoresAsignados = useMemo(() => activas.filter(a => a.tipo === 'Operador-Ruta').length, [activas])
  const clavesAsignadas = useMemo(() => new Set(activas.map(a => a.clave_emp)), [activas])
  const sinAsignacion = useMemo(
    () => empleados.filter(e => e.st === 1 && !clavesAsignadas.has(e.clave)).length,
    [empleados, clavesAsignadas],
  )

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  function buscarEmpleado() {
    const emp = getEmpleado(formClave.trim())
    if (emp && emp.st === 1) {
      setFormEmpleado(emp)
      setFormNotFound(false)
    } else {
      setFormEmpleado(undefined)
      setFormNotFound(true)
    }
  }

  function handleGuardarAsignacion() {
    if (!formClave || !formServicio || !formFechaInicio) {
      showToast('error', 'Complete los campos obligatorios')
      return
    }
    const newId = Math.max(...asignaciones.map(a => a.id), 0) + 1
    setAsignaciones(prev => [
      ...prev,
      {
        id: newId,
        tipo: formTipo,
        clave_emp: formClave.trim(),
        servicio_cliente: formServicio,
        fecha_inicio: formFechaInicio,
        fecha_fin: formFechaFin || undefined,
        activa: true,
        observaciones: formObs || undefined,
        usuario: 'ADMIN',
      },
    ])
    setShowNuevaSheet(false)
    resetNuevaForm()
    showToast('success', 'Asignación guardada correctamente')
  }

  function resetNuevaForm() {
    setFormTipo('Supervisor-Servicio')
    setFormClave('')
    setFormServicio('')
    setFormFechaInicio('')
    setFormFechaFin('')
    setFormObs('')
    setFormEmpleado(undefined)
    setFormNotFound(false)
  }

  function handleFinalizar() {
    if (finalizarId === null) return
    const today = new Date().toISOString().split('T')[0]
    setAsignaciones(prev =>
      prev.map(a =>
        a.id === finalizarId ? { ...a, activa: false, fecha_fin: today } : a,
      ),
    )
    setFinalizarId(null)
    showToast('success', 'Asignación finalizada')
  }

  function handleGuardarCliente() {
    if (!clienteNombre || !clienteContacto) {
      showToast('error', 'Complete los campos obligatorios')
      return
    }
    const newId = Math.max(...clientes.map(c => c.id), 0) + 1
    setClientes(prev => [...prev, { id: newId, nombre: clienteNombre, tipo: clienteTipo, contacto: clienteContacto, activo: true }])
    setShowNuevoCliente(false)
    setClienteNombre('')
    setClienteTipo('Comercial')
    setClienteContacto('')
    showToast('success', 'Cliente registrado correctamente')
  }

  function getEmpleadoInfo(clave: string) {
    const emp = empleados.find(e => e.clave === clave)
    return emp ? { nombre: emp.nombre_completo, puesto: getPuestoNombre(emp.puesto) } : { nombre: clave, puesto: '—' }
  }

  function calcDias(inicio: string, fin?: string): number {
    const d1 = new Date(inicio)
    const d2 = fin ? new Date(fin) : new Date()
    return Math.max(0, Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)))
  }

  // Filtered by subTab
  const asignacionesPorSubTab = useMemo(() => {
    const map: Record<SubTab, Asignacion['tipo']> = {
      supervisores: 'Supervisor-Servicio',
      operadores: 'Operador-Ruta',
      prefectos: 'Prefecto-Área',
    }
    return asignaciones.filter(a => a.tipo === map[subTab])
  }, [asignaciones, subTab])

  const subTabStats = useMemo(() => {
    const map: Record<SubTab, Asignacion['tipo']> = {
      supervisores: 'Supervisor-Servicio',
      operadores: 'Operador-Ruta',
      prefectos: 'Prefecto-Área',
    }
    const assigned = new Set(asignaciones.filter(a => a.activa && a.tipo === map[subTab]).map(a => a.clave_emp))
    return {
      asignados: assigned.size,
      sinAsignar: empleados.filter(e => e.st === 1 && !assigned.has(e.clave)).length,
    }
  }, [asignaciones, subTab, empleados])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asignaciones</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de asignaciones supervisor-servicio</p>
        </div>
        <Button onClick={() => setShowNuevaSheet(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva Asignación
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-1">
        <TabBtn active={tab === 'activas'} onClick={() => setTab('activas')}>Asignaciones Activas</TabBtn>
        <TabBtn active={tab === 'por-tipo'} onClick={() => setTab('por-tipo')}>Por Tipo</TabBtn>
        <TabBtn active={tab === 'clientes'} onClick={() => setTab('clientes')}>Clientes / Servicios</TabBtn>
        <TabBtn active={tab === 'historial'} onClick={() => setTab('historial')}>Historial</TabBtn>
      </div>

      {/* ── TAB: Asignaciones Activas ── */}
      {tab === 'activas' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Link2} label="Total activas" value={activas.length} color="bg-indigo-500" />
            <StatCard icon={UserCheck} label="Supervisores asignados" value={supervisoresAsignados} color="bg-teal-500" />
            <StatCard icon={Users} label="Operadores asignados" value={operadoresAsignados} color="bg-amber-500" />
            <StatCard icon={AlertCircle} label="Sin asignación" value={sinAsignacion} color="bg-rose-500" />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nómina</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre Empleado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Puesto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Servicio/Cliente/Ruta</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">F.Inicio</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">F.Fin</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {activas.map((a, i) => {
                    const info = getEmpleadoInfo(a.clave_emp)
                    return (
                      <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3"><TipoBadge tipo={a.tipo} /></td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{a.clave_emp}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{info.nombre}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{info.puesto}</td>
                        <td className="px-4 py-3 text-gray-700">{a.servicio_cliente}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{a.fecha_inicio}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{a.fecha_fin ?? '—'}</td>
                        <td className="px-4 py-3"><StatusBadge activa={a.activa} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-indigo-600" title="Ver detalle">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600" title="Finalizar asignación" onClick={() => setFinalizarId(a.id)}>
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                            <button className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-amber-600" title="Editar">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {activas.length === 0 && (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No hay asignaciones activas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Por Tipo ── */}
      {tab === 'por-tipo' && (
        <div className="space-y-5">
          <div className="flex gap-1 border-b border-gray-200">
            {(['supervisores', 'operadores', 'prefectos'] as SubTab[]).map(st => (
              <TabBtn key={st} active={subTab === st} onClick={() => setSubTab(st)}>
                {st.charAt(0).toUpperCase() + st.slice(1)}
              </TabBtn>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Asignados</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{subTabStats.asignados}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Sin asignar</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{subTabStats.sinAsignar}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nómina</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Servicio/Ruta</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">F.Inicio</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {asignacionesPorSubTab.map((a, i) => {
                    const info = getEmpleadoInfo(a.clave_emp)
                    return (
                      <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{a.clave_emp}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{info.nombre}</td>
                        <td className="px-4 py-3 text-gray-700">{a.servicio_cliente}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{a.fecha_inicio}</td>
                        <td className="px-4 py-3"><StatusBadge activa={a.activa} /></td>
                      </tr>
                    )
                  })}
                  {asignacionesPorSubTab.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin registros para este tipo</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Clientes / Servicios ── */}
      {tab === 'clientes' && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <Button onClick={() => setShowNuevoCliente(true)} className="gap-2" variant="outline">
              <Plus className="w-4 h-4" />
              Nuevo Cliente
            </Button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Contacto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Empleados asignados</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Activo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c, i) => {
                    const asignCount = asignaciones.filter(a => a.activa && a.servicio_cliente === c.nombre).length
                    return (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{c.nombre}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">{c.tipo}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{c.contacto}</td>
                        <td className="px-4 py-3 text-center font-bold text-gray-700">{asignCount}</td>
                        <td className="px-4 py-3">
                          {c.activo
                            ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Activo</span>
                            : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">Inactivo</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-indigo-600" title="Ver asignaciones">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-amber-600" title="Editar">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600"
                              title="Desactivar"
                              onClick={() => setClientes(prev => prev.map(cl => cl.id === c.id ? { ...cl, activo: !cl.activo } : cl))}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Historial ── */}
      {tab === 'historial' && (
        <div className="space-y-5">
          <div className="flex gap-3 items-end">
            <div>
              <Label className="text-xs text-gray-500">Desde</Label>
              <input type="date" className="mt-1 block px-3 py-2 text-sm border border-gray-200 rounded-md" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Hasta</Label>
              <input type="date" className="mt-1 block px-3 py-2 text-sm border border-gray-200 rounded-md" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Periodo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Empleado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Servicio</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Días activo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {asignaciones.map((a, i) => {
                    const info = getEmpleadoInfo(a.clave_emp)
                    return (
                      <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-xs text-gray-600">{a.fecha_inicio} — {a.fecha_fin ?? 'vigente'}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{info.nombre}</td>
                        <td className="px-4 py-3"><TipoBadge tipo={a.tipo} /></td>
                        <td className="px-4 py-3 text-gray-700">{a.servicio_cliente}</td>
                        <td className="px-4 py-3 text-gray-500">{calcDias(a.fecha_inicio, a.fecha_fin)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{a.usuario}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Sheet: Nueva Asignación ── */}
      <Sheet open={showNuevaSheet} onOpenChange={setShowNuevaSheet}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Nueva Asignación</SheetTitle>
            <SheetDescription>Registre una nueva asignación de empleado a servicio, ruta o área.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <Label>Tipo de asignación *</Label>
              <select
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-md"
                value={formTipo}
                onChange={e => setFormTipo(e.target.value as Asignacion['tipo'])}
              >
                <option value="Supervisor-Servicio">Supervisor-Servicio</option>
                <option value="Operador-Ruta">Operador-Ruta</option>
                <option value="Prefecto-Área">Prefecto-Área</option>
              </select>
            </div>
            <div>
              <Label>Número de nómina *</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="Ingrese nómina"
                  value={formClave}
                  onChange={e => setFormClave(e.target.value)}
                />
                <Button variant="outline" onClick={buscarEmpleado} type="button">Buscar</Button>
              </div>
              {formEmpleado && (
                <div className="mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md text-sm">
                  <p className="font-medium text-green-800">{formEmpleado.nombre_completo}</p>
                  <p className="text-xs text-green-600">{getPuestoNombre(formEmpleado.puesto)}</p>
                </div>
              )}
              {formNotFound && (
                <p className="mt-1 text-xs text-red-600">Empleado no encontrado o no está activo.</p>
              )}
            </div>
            <div>
              <Label>Servicio / Cliente / Ruta *</Label>
              <Input
                className="mt-1"
                placeholder="Nombre del servicio o cliente"
                value={formServicio}
                onChange={e => setFormServicio(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha inicio *</Label>
                <input
                  type="date"
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-md"
                  value={formFechaInicio}
                  onChange={e => setFormFechaInicio(e.target.value)}
                />
              </div>
              <div>
                <Label>Fecha fin</Label>
                <input
                  type="date"
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-md"
                  value={formFechaFin}
                  onChange={e => setFormFechaFin(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Observaciones</Label>
              <Textarea
                className="mt-1"
                rows={3}
                placeholder="Notas adicionales..."
                value={formObs}
                onChange={e => setFormObs(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowNuevaSheet(false); resetNuevaForm() }}>Cancelar</Button>
              <Button onClick={handleGuardarAsignacion}>Guardar asignación</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Dialog: Finalizar ── */}
      <Dialog open={finalizarId !== null} onOpenChange={open => !open && setFinalizarId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar asignación</DialogTitle>
            <DialogDescription>
              ¿Confirma que desea finalizar esta asignación? Se registrará la fecha de hoy como fecha fin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizarId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleFinalizar}>Finalizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Nuevo Cliente ── */}
      <Dialog open={showNuevoCliente} onOpenChange={setShowNuevoCliente}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Cliente / Servicio</DialogTitle>
            <DialogDescription>Registre un nuevo cliente o servicio en el catálogo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nombre *</Label>
              <Input className="mt-1" value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} />
            </div>
            <div>
              <Label>Tipo *</Label>
              <select
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-md"
                value={clienteTipo}
                onChange={e => setClienteTipo(e.target.value as Cliente['tipo'])}
              >
                <option value="Comercial">Comercial</option>
                <option value="Industrial">Industrial</option>
                <option value="Gobierno">Gobierno</option>
                <option value="Educativo">Educativo</option>
              </select>
            </div>
            <div>
              <Label>Contacto *</Label>
              <Input className="mt-1" value={clienteContacto} onChange={e => setClienteContacto(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNuevoCliente(false)}>Cancelar</Button>
            <Button onClick={handleGuardarCliente}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
