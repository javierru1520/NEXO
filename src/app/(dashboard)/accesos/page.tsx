"use client"

import { useState, useMemo } from 'react'
import { useSCRHStore } from '@/store'
import {
  ShieldCheck, Users, Activity, ClipboardList, Key,
  Search, Plus, Eye, EyeOff, Edit2, RotateCcw, Ban, CheckCircle2,
  Filter, Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

// ── Types ──────────────────────────────────────────────────────────────────────

interface SysUser {
  nomina: string
  nombre: string
  tipo: 'A' | 'B' | 'C'
  nivel: 1 | 2 | 3
  empresa: number
  activo: boolean
  ultimo_acceso: string
  permisos: string[]
}

interface AccessLog {
  id: number
  fecha: string
  hora: string
  nomina: string
  nombre: string
  accion: 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW'
  modulo: string
  ip: string
  resultado: 'Exitoso' | 'Fallido' | 'Bloqueado'
}

interface AuditLog {
  id: number
  fecha: string
  nomina: string
  nombre: string
  tabla: string
  campo: string
  valor_anterior: string
  valor_nuevo: string
  modulo: string
  tipo_op: 'INSERT' | 'UPDATE' | 'DELETE'
}

interface PeriodoConfig {
  hc_activo_al: string
  periodo_nomina: string
  catorcena: string
  estado_sistema: 'Abierto' | 'Fuera de horario' | 'Mantenimiento'
}

// ── Mock data ──────────────────────────────────────────────────────────────────

const MODULOS_LISTA = [
  'Empleados', 'Altas', 'Bajas', 'Reingresos', 'Sueldos', 'Vacaciones',
  'Incapacidades', 'Licencias', 'HC y Rotación', 'Capacitación',
  'Transferencias', 'Reportes', 'Configuración',
]

const INITIAL_USERS: SysUser[] = [
  { nomina: '166',  nombre: 'Javier Ramírez Torres',    tipo: 'A', nivel: 1, empresa: 1, activo: true,  ultimo_acceso: '2024-03-15 09:23', permisos: ['all'] },
  { nomina: '264',  nombre: 'María López Hernández',    tipo: 'A', nivel: 1, empresa: 1, activo: true,  ultimo_acceso: '2024-03-15 08:45', permisos: ['all'] },
  { nomina: '3071', nombre: 'Carlos Mendoza Ruiz',      tipo: 'B', nivel: 2, empresa: 2, activo: true,  ultimo_acceso: '2024-03-14 17:30', permisos: ['Empleados','Sueldos','Reportes'] },
  { nomina: '4102', nombre: 'Ana Gutiérrez Pérez',      tipo: 'B', nivel: 2, empresa: 1, activo: true,  ultimo_acceso: '2024-03-14 16:00', permisos: ['Empleados','Altas','Bajas','Reingresos'] },
  { nomina: '5230', nombre: 'Roberto Sánchez Castro',   tipo: 'C', nivel: 3, empresa: 3, activo: true,  ultimo_acceso: '2024-03-13 14:20', permisos: ['Empleados','Altas'] },
  { nomina: '6015', nombre: 'Laura Martínez Flores',    tipo: 'C', nivel: 3, empresa: 2, activo: true,  ultimo_acceso: '2024-03-13 11:55', permisos: ['Vacaciones','Incapacidades','Licencias'] },
  { nomina: '7841', nombre: 'Miguel Torres Vega',       tipo: 'B', nivel: 2, empresa: 1, activo: false, ultimo_acceso: '2024-02-28 10:10', permisos: ['Empleados','Sueldos'] },
  { nomina: '8903', nombre: 'Patricia Ríos Montes',     tipo: 'C', nivel: 3, empresa: 3, activo: true,  ultimo_acceso: '2024-03-12 09:30', permisos: ['Altas'] },
  { nomina: '9112', nombre: 'Fernando Díaz Salinas',    tipo: 'A', nivel: 1, empresa: 1, activo: false, ultimo_acceso: '2024-01-20 15:00', permisos: ['all'] },
  { nomina: '1047', nombre: 'Claudia Herrera Reyes',    tipo: 'C', nivel: 3, empresa: 2, activo: true,  ultimo_acceso: '2024-03-15 07:55', permisos: ['Reportes'] },
]

const ACCESS_LOGS: AccessLog[] = [
  { id:1,  fecha:'2024-03-15', hora:'09:23', nomina:'166',  nombre:'Javier Ramírez Torres',  accion:'LOGIN',  modulo:'Sistema',      ip:'192.168.1.10', resultado:'Exitoso' },
  { id:2,  fecha:'2024-03-15', hora:'09:25', nomina:'166',  nombre:'Javier Ramírez Torres',  accion:'VIEW',   modulo:'Empleados',    ip:'192.168.1.10', resultado:'Exitoso' },
  { id:3,  fecha:'2024-03-15', hora:'08:45', nomina:'264',  nombre:'María López Hernández',  accion:'LOGIN',  modulo:'Sistema',      ip:'192.168.1.12', resultado:'Exitoso' },
  { id:4,  fecha:'2024-03-15', hora:'08:50', nomina:'264',  nombre:'María López Hernández',  accion:'CREATE', modulo:'Altas',        ip:'192.168.1.12', resultado:'Exitoso' },
  { id:5,  fecha:'2024-03-15', hora:'07:55', nomina:'1047', nombre:'Claudia Herrera Reyes',  accion:'LOGIN',  modulo:'Sistema',      ip:'10.0.0.55',    resultado:'Exitoso' },
  { id:6,  fecha:'2024-03-15', hora:'07:58', nomina:'1047', nombre:'Claudia Herrera Reyes',  accion:'VIEW',   modulo:'Reportes',     ip:'10.0.0.55',    resultado:'Exitoso' },
  { id:7,  fecha:'2024-03-14', hora:'17:30', nomina:'3071', nombre:'Carlos Mendoza Ruiz',    accion:'LOGOUT', modulo:'Sistema',      ip:'192.168.1.20', resultado:'Exitoso' },
  { id:8,  fecha:'2024-03-14', hora:'16:45', nomina:'3071', nombre:'Carlos Mendoza Ruiz',    accion:'UPDATE', modulo:'Sueldos',      ip:'192.168.1.20', resultado:'Exitoso' },
  { id:9,  fecha:'2024-03-14', hora:'16:00', nomina:'4102', nombre:'Ana Gutiérrez Pérez',    accion:'CREATE', modulo:'Bajas',        ip:'192.168.1.31', resultado:'Exitoso' },
  { id:10, fecha:'2024-03-14', hora:'15:10', nomina:'5230', nombre:'Roberto Sánchez Castro', accion:'LOGIN',  modulo:'Sistema',      ip:'10.0.1.100',   resultado:'Fallido' },
  { id:11, fecha:'2024-03-14', hora:'15:11', nomina:'5230', nombre:'Roberto Sánchez Castro', accion:'LOGIN',  modulo:'Sistema',      ip:'10.0.1.100',   resultado:'Fallido' },
  { id:12, fecha:'2024-03-14', hora:'15:12', nomina:'5230', nombre:'Roberto Sánchez Castro', accion:'LOGIN',  modulo:'Sistema',      ip:'10.0.1.100',   resultado:'Bloqueado' },
  { id:13, fecha:'2024-03-13', hora:'14:20', nomina:'5230', nombre:'Roberto Sánchez Castro', accion:'LOGIN',  modulo:'Sistema',      ip:'192.168.2.5',  resultado:'Exitoso' },
  { id:14, fecha:'2024-03-13', hora:'14:25', nomina:'5230', nombre:'Roberto Sánchez Castro', accion:'CREATE', modulo:'Altas',        ip:'192.168.2.5',  resultado:'Exitoso' },
  { id:15, fecha:'2024-03-13', hora:'11:55', nomina:'6015', nombre:'Laura Martínez Flores',  accion:'VIEW',   modulo:'Vacaciones',   ip:'10.0.0.60',    resultado:'Exitoso' },
  { id:16, fecha:'2024-03-13', hora:'10:00', nomina:'166',  nombre:'Javier Ramírez Torres',  accion:'DELETE', modulo:'Incapacidades',ip:'192.168.1.10', resultado:'Exitoso' },
  { id:17, fecha:'2024-03-12', hora:'09:30', nomina:'8903', nombre:'Patricia Ríos Montes',   accion:'CREATE', modulo:'Altas',        ip:'10.0.2.15',    resultado:'Exitoso' },
  { id:18, fecha:'2024-03-12', hora:'09:05', nomina:'8903', nombre:'Patricia Ríos Montes',   accion:'LOGIN',  modulo:'Sistema',      ip:'10.0.2.15',    resultado:'Exitoso' },
  { id:19, fecha:'2024-03-11', hora:'16:30', nomina:'264',  nombre:'María López Hernández',  accion:'UPDATE', modulo:'Empleados',    ip:'192.168.1.12', resultado:'Exitoso' },
  { id:20, fecha:'2024-03-11', hora:'13:00', nomina:'4102', nombre:'Ana Gutiérrez Pérez',    accion:'VIEW',   modulo:'Reingresos',   ip:'192.168.1.31', resultado:'Exitoso' },
  { id:21, fecha:'2024-03-10', hora:'11:20', nomina:'166',  nombre:'Javier Ramírez Torres',  accion:'UPDATE', modulo:'Configuración', ip:'192.168.1.10', resultado:'Exitoso' },
  { id:22, fecha:'2024-03-10', hora:'10:45', nomina:'3071', nombre:'Carlos Mendoza Ruiz',    accion:'VIEW',   modulo:'Sueldos',      ip:'192.168.1.20', resultado:'Exitoso' },
  { id:23, fecha:'2024-03-09', hora:'08:00', nomina:'166',  nombre:'Javier Ramírez Torres',  accion:'LOGIN',  modulo:'Sistema',      ip:'192.168.1.10', resultado:'Exitoso' },
  { id:24, fecha:'2024-03-08', hora:'17:59', nomina:'264',  nombre:'María López Hernández',  accion:'LOGOUT', modulo:'Sistema',      ip:'192.168.1.12', resultado:'Exitoso' },
  { id:25, fecha:'2024-03-08', hora:'14:30', nomina:'6015', nombre:'Laura Martínez Flores',  accion:'UPDATE', modulo:'Licencias',    ip:'10.0.0.60',    resultado:'Exitoso' },
  { id:26, fecha:'2024-03-07', hora:'12:10', nomina:'1047', nombre:'Claudia Herrera Reyes',  accion:'VIEW',   modulo:'Reportes',     ip:'10.0.0.55',    resultado:'Exitoso' },
  { id:27, fecha:'2024-03-07', hora:'09:45', nomina:'4102', nombre:'Ana Gutiérrez Pérez',    accion:'DELETE', modulo:'Bajas',        ip:'192.168.1.31', resultado:'Exitoso' },
  { id:28, fecha:'2024-03-06', hora:'16:00', nomina:'3071', nombre:'Carlos Mendoza Ruiz',    accion:'VIEW',   modulo:'Empleados',    ip:'192.168.1.20', resultado:'Exitoso' },
  { id:29, fecha:'2024-03-05', hora:'10:30', nomina:'166',  nombre:'Javier Ramírez Torres',  accion:'CREATE', modulo:'Transferencias', ip:'192.168.1.10', resultado:'Exitoso' },
  { id:30, fecha:'2024-03-05', hora:'08:15', nomina:'8903', nombre:'Patricia Ríos Montes',   accion:'LOGIN',  modulo:'Sistema',      ip:'10.0.2.15',    resultado:'Exitoso' },
]

const AUDIT_LOGS: AuditLog[] = [
  { id:1,  fecha:'2024-03-15 09:25', nomina:'166',  nombre:'Javier Ramírez Torres', tabla:'empleados', campo:'puesto',         valor_anterior:'Operador',     valor_nuevo:'Supervisor',       modulo:'Empleados',    tipo_op:'UPDATE' },
  { id:2,  fecha:'2024-03-15 08:50', nomina:'264',  nombre:'María López Hernández', tabla:'altas_prov', campo:'status',        valor_anterior:'2',            valor_nuevo:'1',                modulo:'Altas',        tipo_op:'UPDATE' },
  { id:3,  fecha:'2024-03-14 16:45', nomina:'3071', nombre:'Carlos Mendoza Ruiz',   tabla:'empleados', campo:'sueldo_mensual', valor_anterior:'8500.00',      valor_nuevo:'9200.00',          modulo:'Sueldos',      tipo_op:'UPDATE' },
  { id:4,  fecha:'2024-03-14 16:00', nomina:'4102', nombre:'Ana Gutiérrez Pérez',   tabla:'bajas',     campo:'—',              valor_anterior:'—',            valor_nuevo:'Nuevo registro',   modulo:'Bajas',        tipo_op:'INSERT' },
  { id:5,  fecha:'2024-03-13 14:25', nomina:'5230', nombre:'Roberto Sánchez Castro', tabla:'altas_prov', campo:'—',            valor_anterior:'—',            valor_nuevo:'Nuevo registro',   modulo:'Altas',        tipo_op:'INSERT' },
  { id:6,  fecha:'2024-03-13 11:55', nomina:'6015', nombre:'Laura Martínez Flores', tabla:'vacaciones', campo:'f_final',       valor_anterior:'2024-03-20',   valor_nuevo:'2024-03-22',       modulo:'Vacaciones',   tipo_op:'UPDATE' },
  { id:7,  fecha:'2024-03-13 10:00', nomina:'166',  nombre:'Javier Ramírez Torres', tabla:'incapacidades', campo:'—',          valor_anterior:'Registro #45', valor_nuevo:'—',               modulo:'Incapacidades',tipo_op:'DELETE' },
  { id:8,  fecha:'2024-03-12 09:30', nomina:'8903', nombre:'Patricia Ríos Montes',  tabla:'altas_prov', campo:'—',             valor_anterior:'—',            valor_nuevo:'Nuevo registro',   modulo:'Altas',        tipo_op:'INSERT' },
  { id:9,  fecha:'2024-03-11 16:30', nomina:'264',  nombre:'María López Hernández', tabla:'empleados', campo:'depto',          valor_anterior:'3',            valor_nuevo:'2',                modulo:'Empleados',    tipo_op:'UPDATE' },
  { id:10, fecha:'2024-03-11 13:00', nomina:'4102', nombre:'Ana Gutiérrez Pérez',   tabla:'reingresos', campo:'status',        valor_anterior:'2',            valor_nuevo:'1',                modulo:'Reingresos',   tipo_op:'UPDATE' },
  { id:11, fecha:'2024-03-10 11:20', nomina:'166',  nombre:'Javier Ramírez Torres', tabla:'config',    campo:'periodo_nomina', valor_anterior:'2024-02',      valor_nuevo:'2024-03',          modulo:'Configuración',tipo_op:'UPDATE' },
  { id:12, fecha:'2024-03-10 10:45', nomina:'3071', nombre:'Carlos Mendoza Ruiz',   tabla:'empleados', campo:'empresa',        valor_anterior:'1',            valor_nuevo:'2',                modulo:'Empleados',    tipo_op:'UPDATE' },
  { id:13, fecha:'2024-03-09 15:00', nomina:'264',  nombre:'María López Hernández', tabla:'licencias', campo:'—',              valor_anterior:'—',            valor_nuevo:'Nuevo registro',   modulo:'Licencias',    tipo_op:'INSERT' },
  { id:14, fecha:'2024-03-08 14:30', nomina:'6015', nombre:'Laura Martínez Flores', tabla:'licencias', campo:'vence',          valor_anterior:'2024-06-01',   valor_nuevo:'2024-12-01',       modulo:'Licencias',    tipo_op:'UPDATE' },
  { id:15, fecha:'2024-03-08 12:00', nomina:'4102', nombre:'Ana Gutiérrez Pérez',   tabla:'empleados', campo:'telefono',       valor_anterior:'6646001234',   valor_nuevo:'6641239876',       modulo:'Empleados',    tipo_op:'UPDATE' },
  { id:16, fecha:'2024-03-07 12:10', nomina:'1047', nombre:'Claudia Herrera Reyes', tabla:'empleados', campo:'email_corp',     valor_anterior:'—',            valor_nuevo:'c.herrera@trx.mx', modulo:'Empleados',   tipo_op:'UPDATE' },
  { id:17, fecha:'2024-03-07 09:45', nomina:'4102', nombre:'Ana Gutiérrez Pérez',   tabla:'bajas',     campo:'—',              valor_anterior:'Registro #12', valor_nuevo:'—',               modulo:'Bajas',        tipo_op:'DELETE' },
  { id:18, fecha:'2024-03-06 16:00', nomina:'3071', nombre:'Carlos Mendoza Ruiz',   tabla:'empleados', campo:'jefe_inmed',     valor_anterior:'166',          valor_nuevo:'264',              modulo:'Empleados',    tipo_op:'UPDATE' },
  { id:19, fecha:'2024-03-05 10:30', nomina:'166',  nombre:'Javier Ramírez Torres', tabla:'transferencias', campo:'—',         valor_anterior:'—',            valor_nuevo:'Nuevo registro',   modulo:'Transferencias',tipo_op:'INSERT' },
  { id:20, fecha:'2024-03-04 09:00', nomina:'264',  nombre:'María López Hernández', tabla:'cursos',    campo:'—',              valor_anterior:'—',            valor_nuevo:'Nuevo registro',   modulo:'Capacitación', tipo_op:'INSERT' },
  { id:21, fecha:'2024-03-03 14:50', nomina:'166',  nombre:'Javier Ramírez Torres', tabla:'usuarios',  campo:'activo',         valor_anterior:'true',         valor_nuevo:'false',            modulo:'Accesos',      tipo_op:'UPDATE' },
  { id:22, fecha:'2024-03-02 11:30', nomina:'166',  nombre:'Javier Ramírez Torres', tabla:'usuarios',  campo:'—',              valor_anterior:'—',            valor_nuevo:'Nuevo usuario',    modulo:'Accesos',      tipo_op:'INSERT' },
  { id:23, fecha:'2024-03-01 16:00', nomina:'264',  nombre:'María López Hernández', tabla:'empleados', campo:'nivel_estudios', valor_anterior:'Preparatoria', valor_nuevo:'Licenciatura',     modulo:'Empleados',    tipo_op:'UPDATE' },
  { id:24, fecha:'2024-02-29 10:20', nomina:'3071', nombre:'Carlos Mendoza Ruiz',   tabla:'incapacidades', campo:'dias',       valor_anterior:'3',            valor_nuevo:'5',               modulo:'Incapacidades',tipo_op:'UPDATE' },
  { id:25, fecha:'2024-02-28 15:45', nomina:'166',  nombre:'Javier Ramírez Torres', tabla:'config',    campo:'catorcena',      valor_anterior:'2024-04',      valor_nuevo:'2024-05',          modulo:'Configuración',tipo_op:'UPDATE' },
]

// ── Helper components ──────────────────────────────────────────────────────────

type MainTab = 'usuarios' | 'log' | 'cambios' | 'periodos'

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

const TIPO_LABEL: Record<string, string> = { A: 'Admin', B: 'Supervisor', C: 'Capturista' }
const TIPO_COLOR: Record<string, string> = { A: 'bg-purple-100 text-purple-700', B: 'bg-blue-100 text-blue-700', C: 'bg-gray-100 text-gray-700' }
const ACCION_COLOR: Record<string, string> = {
  LOGIN: 'bg-green-100 text-green-700', LOGOUT: 'bg-gray-100 text-gray-600',
  CREATE: 'bg-blue-100 text-blue-700', UPDATE: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700', VIEW: 'bg-indigo-100 text-indigo-700',
}
const RESULTADO_COLOR: Record<string, string> = {
  Exitoso: 'bg-green-100 text-green-700', Fallido: 'bg-red-100 text-red-700', Bloqueado: 'bg-orange-100 text-orange-700',
}
const OP_ROW: Record<string, string> = {
  INSERT: 'bg-green-50', UPDATE: 'bg-yellow-50', DELETE: 'bg-red-50',
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AccesosPage() {
  const { empresas } = useSCRHStore()

  const [tab, setTab] = useState<MainTab>('usuarios')
  const [usuarios, setUsuarios] = useState<SysUser[]>(INITIAL_USERS)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // New user sheet
  const [showNew, setShowNew] = useState(false)
  const [newUser, setNewUser] = useState({ nomina: '', tipo: 'C', nivel: '3', empresa: '1', password: '', permisos: [] as string[] })
  const [showPass, setShowPass] = useState(false)

  // Edit permissions sheet
  const [editUser, setEditUser] = useState<SysUser | null>(null)
  const [editPermisos, setEditPermisos] = useState<string[]>([])
  const [editActivo, setEditActivo] = useState(true)

  // Log filters
  const [logModulo, setLogModulo] = useState('')
  const [logAccion, setLogAccion] = useState('')
  const [logResultado, setLogResultado] = useState('')
  const [logSearch, setLogSearch] = useState('')

  // Audit filters
  const [auditModulo, setAuditModulo] = useState('')
  const [auditUsuario, setAuditUsuario] = useState('')

  // Periodo
  const [periodo, setPeriodo] = useState<PeriodoConfig>({
    hc_activo_al: '2024-03-01',
    periodo_nomina: '2024-03',
    catorcena: '2024-05',
    estado_sistema: 'Abierto',
  })

  // ── Stats ────────────────────────────────────────────────────────────────
  const activos = useMemo(() => usuarios.filter(u => u.activo).length, [usuarios])
  const nivel1 = useMemo(() => usuarios.filter(u => u.nivel === 1).length, [usuarios])

  // ── Helpers ──────────────────────────────────────────────────────────────
  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  function togglePermiso(mod: string, list: string[], setList: (l: string[]) => void) {
    setList(list.includes(mod) ? list.filter(m => m !== mod) : [...list, mod])
  }

  function saveNewUser() {
    if (!newUser.nomina) return showToast('Ingresa un número de nómina', 'error')
    const exists = usuarios.find(u => u.nomina === newUser.nomina)
    if (exists) return showToast('Ya existe un usuario con esa nómina', 'error')
    const u: SysUser = {
      nomina: newUser.nomina,
      nombre: `Usuario ${newUser.nomina}`,
      tipo: newUser.tipo as 'A' | 'B' | 'C',
      nivel: parseInt(newUser.nivel) as 1 | 2 | 3,
      empresa: parseInt(newUser.empresa),
      activo: true,
      ultimo_acceso: '—',
      permisos: newUser.tipo === 'A' ? ['all'] : newUser.permisos,
    }
    setUsuarios(prev => [...prev, u])
    setShowNew(false)
    setNewUser({ nomina: '', tipo: 'C', nivel: '3', empresa: '1', password: '', permisos: [] })
    showToast('Usuario creado exitosamente')
  }

  function saveEditUser() {
    if (!editUser) return
    setUsuarios(prev => prev.map(u =>
      u.nomina === editUser.nomina
        ? { ...u, permisos: editUser.tipo === 'A' ? ['all'] : editPermisos, activo: editActivo }
        : u
    ))
    setEditUser(null)
    showToast('Permisos actualizados correctamente')
  }

  function resetPassword(nomina: string) {
    showToast(`Contraseña temporal enviada a usuario ${nomina}`)
  }

  function toggleActivo(nomina: string) {
    setUsuarios(prev => prev.map(u => u.nomina === nomina ? { ...u, activo: !u.activo } : u))
    const u = usuarios.find(x => x.nomina === nomina)
    showToast(u ? (u.activo ? 'Usuario desactivado' : 'Usuario activado') : '')
  }

  function openEdit(u: SysUser) {
    setEditUser(u)
    setEditPermisos(u.permisos.includes('all') ? MODULOS_LISTA : u.permisos)
    setEditActivo(u.activo)
  }

  // ── Filtered lists ────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase()
    return usuarios.filter(u =>
      u.nombre.toLowerCase().includes(q) || u.nomina.includes(q)
    )
  }, [usuarios, search])

  const filteredLogs = useMemo(() => {
    return ACCESS_LOGS.filter(l => {
      if (logModulo && l.modulo !== logModulo) return false
      if (logAccion && l.accion !== logAccion) return false
      if (logResultado && l.resultado !== logResultado) return false
      if (logSearch && !l.nombre.toLowerCase().includes(logSearch.toLowerCase()) && !l.nomina.includes(logSearch)) return false
      return true
    })
  }, [logModulo, logAccion, logResultado, logSearch])

  const filteredAudit = useMemo(() => {
    return AUDIT_LOGS.filter(l => {
      if (auditModulo && l.modulo !== auditModulo) return false
      if (auditUsuario && !l.nombre.toLowerCase().includes(auditUsuario.toLowerCase()) && !l.nomina.includes(auditUsuario)) return false
      return true
    })
  }, [auditModulo, auditUsuario])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Control de Accesos</h1>
            <p className="text-sm text-gray-500">Gestión de usuarios y permisos del sistema</p>
          </div>
        </div>
        <Button onClick={() => setShowNew(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nuevo Usuario
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users}        label="Usuarios activos"          value={activos}    color="bg-green-500" />
        <StatCard icon={Activity}     label="Sesiones hoy"              value={12}         color="bg-blue-500" />
        <StatCard icon={ClipboardList} label="Cambios registrados hoy"  value={47}         color="bg-yellow-500" />
        <StatCard icon={Key}          label="Usuarios acceso completo"  value={nivel1}     color="bg-purple-500" />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200 bg-gray-50 px-4 pt-3 gap-1">
          <TabBtn active={tab === 'usuarios'} onClick={() => setTab('usuarios')}>Usuarios del Sistema</TabBtn>
          <TabBtn active={tab === 'log'}      onClick={() => setTab('log')}>Log de Accesos</TabBtn>
          <TabBtn active={tab === 'cambios'}  onClick={() => setTab('cambios')}>Cambios del Sistema</TabBtn>
          <TabBtn active={tab === 'periodos'} onClick={() => setTab('periodos')}>Períodos del Sistema</TabBtn>
        </div>

        {/* Tab: Usuarios */}
        {tab === 'usuarios' && (
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Buscar por nómina o nombre..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="text-left py-2 px-3">Nómina</th>
                    <th className="text-left py-2 px-3">Nombre</th>
                    <th className="text-left py-2 px-3">Tipo</th>
                    <th className="text-left py-2 px-3">Nivel</th>
                    <th className="text-left py-2 px-3">Empresa</th>
                    <th className="text-left py-2 px-3">Último acceso</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.nomina} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-mono text-gray-700">{u.nomina}</td>
                      <td className="py-2.5 px-3 font-medium text-gray-900">{u.nombre}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${TIPO_COLOR[u.tipo]}`}>
                          {TIPO_LABEL[u.tipo]}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">{u.nivel === 1 ? 'Alto' : u.nivel === 2 ? 'Medio' : 'Básico'}</td>
                      <td className="py-2.5 px-3 text-gray-600">{empresas.find(e => e.clave === u.empresa)?.descripcion ?? `Empresa ${u.empresa}`}</td>
                      <td className="py-2.5 px-3 text-gray-500 text-xs">{u.ultimo_acceso}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${u.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium"
                          >
                            <Edit2 className="w-3 h-3 inline mr-1" />Editar permisos
                          </button>
                          <button
                            onClick={() => resetPassword(u.nomina)}
                            className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100 font-medium"
                          >
                            <RotateCcw className="w-3 h-3 inline mr-1" />Resetear
                          </button>
                          <button
                            onClick={() => toggleActivo(u.nomina)}
                            className={`text-xs px-2 py-1 rounded font-medium ${u.activo ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                          >
                            <Ban className="w-3 h-3 inline mr-1" />{u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Log de Accesos */}
        {tab === 'log' && (
          <div className="p-4">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52"
                  placeholder="Buscar nómina o nombre..."
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                />
              </div>
              <select
                value={logModulo}
                onChange={e => setLogModulo(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todos los módulos</option>
                {['Sistema', ...MODULOS_LISTA].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                value={logAccion}
                onChange={e => setLogAccion(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todas las acciones</option>
                {['LOGIN','LOGOUT','CREATE','UPDATE','DELETE','VIEW'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select
                value={logResultado}
                onChange={e => setLogResultado(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todos los resultados</option>
                {['Exitoso','Fallido','Bloqueado'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <span className="text-xs text-gray-400">{filteredLogs.length} registros</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="text-left py-2 px-3">Fecha / Hora</th>
                    <th className="text-left py-2 px-3">Nómina</th>
                    <th className="text-left py-2 px-3">Nombre</th>
                    <th className="text-left py-2 px-3">Acción</th>
                    <th className="text-left py-2 px-3">Módulo</th>
                    <th className="text-left py-2 px-3">IP</th>
                    <th className="text-left py-2 px-3">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(l => (
                    <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 text-xs text-gray-500 whitespace-nowrap">{l.fecha} {l.hora}</td>
                      <td className="py-2 px-3 font-mono text-gray-700">{l.nomina}</td>
                      <td className="py-2 px-3 text-gray-800">{l.nombre}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${ACCION_COLOR[l.accion]}`}>
                          {l.accion}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-600">{l.modulo}</td>
                      <td className="py-2 px-3 font-mono text-xs text-gray-500">{l.ip}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${RESULTADO_COLOR[l.resultado]}`}>
                          {l.resultado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Cambios del Sistema */}
        {tab === 'cambios' && (
          <div className="p-4">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52"
                  placeholder="Buscar usuario..."
                  value={auditUsuario}
                  onChange={e => setAuditUsuario(e.target.value)}
                />
              </div>
              <select
                value={auditModulo}
                onChange={e => setAuditModulo(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todos los módulos</option>
                {MODULOS_LISTA.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <span className="text-xs text-gray-400">{filteredAudit.length} cambios</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="text-left py-2 px-3">Fecha</th>
                    <th className="text-left py-2 px-3">Usuario</th>
                    <th className="text-left py-2 px-3">Módulo</th>
                    <th className="text-left py-2 px-3">Tabla</th>
                    <th className="text-left py-2 px-3">Campo</th>
                    <th className="text-left py-2 px-3">Valor anterior</th>
                    <th className="text-left py-2 px-3">Valor nuevo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAudit.map(l => (
                    <tr key={l.id} className={`border-b border-gray-100 ${OP_ROW[l.tipo_op]}`}>
                      <td className="py-2 px-3 text-xs text-gray-600 whitespace-nowrap">{l.fecha}</td>
                      <td className="py-2 px-3">
                        <div className="text-gray-800 font-medium text-xs">{l.nombre}</div>
                        <div className="text-gray-400 text-[10px] font-mono">{l.nomina}</div>
                      </td>
                      <td className="py-2 px-3 text-gray-600">{l.modulo}</td>
                      <td className="py-2 px-3 font-mono text-xs text-gray-600">{l.tabla}</td>
                      <td className="py-2 px-3 text-gray-600">{l.campo}</td>
                      <td className="py-2 px-3 text-xs text-gray-500 max-w-[120px] truncate">{l.valor_anterior}</td>
                      <td className="py-2 px-3 text-xs text-gray-700 font-medium max-w-[120px] truncate">{l.valor_nuevo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Períodos del Sistema */}
        {tab === 'periodos' && (
          <div className="p-6 max-w-lg space-y-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">HC Activo al</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="date"
                    value={periodo.hc_activo_al}
                    onChange={e => setPeriodo(p => ({ ...p, hc_activo_al: e.target.value }))}
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={() => showToast('Fecha HC actualizada')}>
                    <Calendar className="w-4 h-4 mr-1" /> Actualizar
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Período nómina actual</Label>
                <Input
                  className="mt-1"
                  value={periodo.periodo_nomina}
                  onChange={e => setPeriodo(p => ({ ...p, periodo_nomina: e.target.value }))}
                  placeholder="YYYY-MM"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Catorcena actual</Label>
                <Input
                  className="mt-1"
                  value={periodo.catorcena}
                  onChange={e => setPeriodo(p => ({ ...p, catorcena: e.target.value }))}
                  placeholder="YYYY-CC"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Estado del sistema</Label>
                <select
                  value={periodo.estado_sistema}
                  onChange={e => setPeriodo(p => ({ ...p, estado_sistema: e.target.value as PeriodoConfig['estado_sistema'] }))}
                  className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Abierto">Abierto</option>
                  <option value="Fuera de horario">Fuera de horario</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                </select>
              </div>
            </div>
            <Button onClick={() => showToast('Cambios aplicados correctamente')}>
              Aplicar cambios
            </Button>
          </div>
        )}
      </div>

      {/* Sheet: Nuevo Usuario */}
      <Sheet open={showNew} onOpenChange={setShowNew}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Nuevo Usuario</SheetTitle>
            <SheetDescription>Crear acceso al sistema SCRH</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <Label>Número de nómina *</Label>
              <Input
                className="mt-1"
                value={newUser.nomina}
                onChange={e => setNewUser(p => ({ ...p, nomina: e.target.value }))}
                placeholder="Ej. 1234"
              />
            </div>
            <div>
              <Label>Tipo de usuario</Label>
              <select
                value={newUser.tipo}
                onChange={e => setNewUser(p => ({ ...p, tipo: e.target.value }))}
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="A">A — Administrador</option>
                <option value="B">B — Supervisor</option>
                <option value="C">C — Capturista</option>
              </select>
            </div>
            <div>
              <Label>Nivel de acceso</Label>
              <select
                value={newUser.nivel}
                onChange={e => setNewUser(p => ({ ...p, nivel: e.target.value }))}
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="1">1 — Alto</option>
                <option value="2">2 — Medio</option>
                <option value="3">3 — Básico</option>
              </select>
            </div>
            <div>
              <Label>Empresa principal</Label>
              <select
                value={newUser.empresa}
                onChange={e => setNewUser(p => ({ ...p, empresa: e.target.value }))}
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {empresas.map(e => (
                  <option key={e.clave} value={String(e.clave)}>{e.razon_social}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Contraseña temporal</Label>
              <div className="relative mt-1">
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={newUser.password}
                  onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                  placeholder="Contraseña temporal"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {newUser.tipo !== 'A' && (
              <div>
                <Label className="mb-2 block">Módulos con acceso</Label>
                <div className="grid grid-cols-2 gap-2">
                  {MODULOS_LISTA.map(mod => (
                    <label key={mod} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <Checkbox
                        checked={newUser.permisos.includes(mod)}
                        onCheckedChange={() => togglePermiso(mod, newUser.permisos, perms => setNewUser(p => ({ ...p, permisos: perms })))}
                      />
                      {mod}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={saveNewUser}>Crear usuario</Button>
              <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet: Editar permisos */}
      <Sheet open={!!editUser} onOpenChange={open => { if (!open) setEditUser(null) }}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar permisos</SheetTitle>
            <SheetDescription>{editUser?.nombre} — Nómina {editUser?.nomina}</SheetDescription>
          </SheetHeader>
          {editUser && (
            <div className="mt-6 space-y-5">
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{editUser.nombre}</p>
                  <p className="text-xs text-gray-500">Tipo: {TIPO_LABEL[editUser.tipo]} · Nivel: {editUser.nivel}</p>
                </div>
              </div>
              {editUser.tipo !== 'A' && (
                <div>
                  <Label className="mb-2 block text-sm font-medium">Módulos habilitados</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {MODULOS_LISTA.map(mod => (
                      <label key={mod} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <Checkbox
                          checked={editPermisos.includes(mod)}
                          onCheckedChange={() => togglePermiso(mod, editPermisos, setEditPermisos)}
                        />
                        {mod}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {editUser.tipo === 'A' && (
                <p className="text-sm text-gray-500 bg-purple-50 border border-purple-100 px-3 py-2 rounded-lg">
                  Los administradores tienen acceso completo a todos los módulos.
                </p>
              )}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">Estado del usuario</p>
                  <p className="text-xs text-gray-500">{editActivo ? 'Activo — puede iniciar sesión' : 'Inactivo — sin acceso al sistema'}</p>
                </div>
                <Switch checked={editActivo} onCheckedChange={setEditActivo} />
              </div>
              <div className="flex gap-3">
                <Button className="flex-1" onClick={saveEditUser}>Guardar cambios</Button>
                <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
