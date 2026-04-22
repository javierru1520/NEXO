"use client"

import { useState } from 'react'
import { Empleado } from '@/types'
import { departamentos, puestos, vacaciones, incapacidades } from '@/lib/mock-data'
import { X, Edit2, Mail, Phone, Building2, Briefcase, Calendar, DollarSign, FileText, Activity } from 'lucide-react'

function getDeptName(id: number): string {
  return departamentos.find(d => d.clave === id)?.descripcion ?? '-'
}

function getPuestoName(id: number): string {
  return puestos.find(p => p.clave === id)?.descripcion ?? '-'
}

function getInitials(nombre: string): string {
  const parts = nombre.split(' ')
  return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : nombre.slice(0, 2).toUpperCase()
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  A: { label: 'Activo', cls: 'bg-green-100 text-green-700 border-green-200' },
  B: { label: 'Baja', cls: 'bg-red-100 text-red-600 border-red-200' },
  S: { label: 'Suspendido', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
}

const TABS = [
  { key: 'generales', label: 'Generales', icon: FileText },
  { key: 'laborales', label: 'Laborales', icon: Briefcase },
  { key: 'salariales', label: 'Salariales', icon: DollarSign },
  { key: 'vacaciones', label: 'Vacaciones', icon: Calendar },
  { key: 'incapacidades', label: 'Incapacidades', icon: Activity },
  { key: 'documentos', label: 'Documentos', icon: FileText },
]

interface EmpleadoDetailProps {
  empleado: Empleado
  onClose?: () => void
}

export default function EmpleadoDetail({ empleado, onClose }: EmpleadoDetailProps) {
  const [activeTab, setActiveTab] = useState('generales')
  const status = STATUS_MAP[empleado.st] ?? { label: empleado.st, cls: 'bg-gray-100 text-gray-600 border-gray-200' }

  const empVacaciones = vacaciones.filter(v => v.clave === empleado.clave)
  const empIncapacidades = incapacidades.filter(i => i.clave === empleado.clave)

  const dtClass = "text-[10px] text-gray-500"
  const ddClass = "text-xs font-semibold text-gray-800"

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-600 to-violet-600">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-white">{getInitials(empleado.nombre_completo)}</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">{empleado.nombre_completo}</h2>
              <p className="text-indigo-200 text-xs mt-0.5">{getPuestoName(empleado.puesto)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">
                  {empleado.clave}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status.cls}`}>
                  {status.label}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4.5 h-4.5" size={18} />
          </button>
        </div>

        {/* Quick info */}
        <div className="flex items-center gap-4 mt-4">
          {empleado.email_corp && (
            <div className="flex items-center gap-1.5 text-indigo-200">
              <Mail className="w-3 h-3" />
              <span className="text-[10px]">{empleado.email_corp}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-indigo-200">
            <Phone className="w-3 h-3" />
            <span className="text-[10px]">{empleado.telefono}</span>
          </div>
          <div className="flex items-center gap-1.5 text-indigo-200">
            <Building2 className="w-3 h-3" />
            <span className="text-[10px]">{getDeptName(empleado.depto)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-gray-100 px-4 bg-white overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* Generales */}
        {activeTab === 'generales' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700">Información Personal</h3>
              <button className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 transition-colors">
                <Edit2 className="w-3 h-3" /> Editar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 rounded-xl p-4">
              {[
                ['Nombre Completo', empleado.nombre_completo],
                ['RFC', empleado.rfc],
                ['CURP', empleado.curp],
                ['NSS (IMSS)', empleado.imss],
                ['Sexo', empleado.sexo === 'M' ? 'Masculino' : 'Femenino'],
                ['Fecha Nacimiento', new Date(empleado.f_nacimiento + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })],
                ['Edad', `${empleado.edad} años`],
                ['Teléfono', empleado.telefono],
                ['Email', empleado.email_corp ?? '-'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className={dtClass}>{k}</dt>
                  <dd className={ddClass}>{v}</dd>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Laborales */}
        {activeTab === 'laborales' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700">Información Laboral</h3>
              <button className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 transition-colors">
                <Edit2 className="w-3 h-3" /> Editar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 rounded-xl p-4">
              {[
                ['Clave Empleado', empleado.clave],
                ['Status', STATUS_MAP[empleado.st]?.label ?? empleado.st],
                ['Fecha Alta', new Date(empleado.alta + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })],
                ['Departamento', getDeptName(empleado.depto)],
                ['Puesto', getPuestoName(empleado.puesto)],
                ['Jefe Inmediato', empleado.jefe_inmed || '-'],
                ['Empresa', `Empresa #${empleado.empresa}`],
                ['Centro de Costos', `CC-${empleado.ccostos}`],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className={dtClass}>{k}</dt>
                  <dd className={ddClass}>{v}</dd>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Salariales */}
        {activeTab === 'salariales' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700">Información Salarial</h3>
              <button className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 transition-colors">
                <Edit2 className="w-3 h-3" /> Editar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Sueldo Mensual', value: empleado.sueldo_mensual, color: 'bg-indigo-50 border-indigo-100' },
                { label: 'Salario Diario', value: empleado.sd, color: 'bg-blue-50 border-blue-100' },
                { label: 'SDI', value: empleado.sdi, color: 'bg-violet-50 border-violet-100' },
              ].map(item => (
                <div key={item.label} className={`rounded-xl p-4 border ${item.color}`}>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{item.label}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(item.value)}
                  </p>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-xs font-bold text-gray-600 mb-3">Datos Bancarios</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className={dtClass}>Banco</dt>
                  <dd className={ddClass}>{empleado.banco ?? '-'}</dd>
                </div>
                <div>
                  <dt className={dtClass}>Cuenta / CLABE</dt>
                  <dd className={ddClass}>{empleado.cuenta_bancaria ? `****${empleado.cuenta_bancaria.slice(-4)}` : '-'}</dd>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vacaciones */}
        {activeTab === 'vacaciones' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700">Historial de Vacaciones</h3>
            {empVacaciones.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Sin registros de vacaciones</div>
            ) : (
              <div className="space-y-2">
                {empVacaciones.map(v => (
                  <div key={v.numero} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-800">
                        {new Date(v.f_inicial + 'T00:00:00').toLocaleDateString('es-MX')} - {new Date(v.f_final + 'T00:00:00').toLocaleDateString('es-MX')}
                      </p>
                      <p className="text-[10px] text-gray-500">{v.dias_vac} días · Periodo {v.periodo}</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                      Aprobado
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Incapacidades */}
        {activeTab === 'incapacidades' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700">Incapacidades</h3>
            {empIncapacidades.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Sin registros de incapacidades</div>
            ) : (
              <div className="space-y-2">
                {empIncapacidades.map(inc => (
                  <div key={inc.numero} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{inc.concepto}</p>
                        <p className="text-[10px] text-gray-500">
                          {new Date(inc.f_inicial + 'T00:00:00').toLocaleDateString('es-MX')} - {new Date(inc.f_final + 'T00:00:00').toLocaleDateString('es-MX')}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{inc.observaciones}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-red-600">{inc.dias} días</span>
                        <p className="text-[10px] text-gray-400">{inc.modo}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Documentos */}
        {activeTab === 'documentos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700">Documentos del Expediente</h3>
              <button className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 transition-colors">
                + Agregar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Acta de Nacimiento', status: 'Entregado' },
                { name: 'CURP', status: 'Entregado' },
                { name: 'Comprobante de Domicilio', status: 'Entregado' },
                { name: 'RFC', status: 'Entregado' },
                { name: 'NSS (IMSS)', status: 'Entregado' },
                { name: 'Contrato Laboral', status: 'Entregado' },
                { name: 'Carta de No Antecedentes', status: 'Pendiente' },
                { name: 'Examen Médico', status: 'Pendiente' },
              ].map(doc => (
                <div key={doc.name} className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${doc.status === 'Entregado' ? 'bg-green-500' : 'bg-yellow-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-gray-700 truncate">{doc.name}</p>
                    <p className={`text-[9px] ${doc.status === 'Entregado' ? 'text-green-600' : 'text-yellow-600'}`}>{doc.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
