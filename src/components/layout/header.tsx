"use client"

import { Bell, Search, ChevronDown, User, LogOut, Settings } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface HeaderProps {
  breadcrumb?: string
}

export default function Header({ breadcrumb = 'Dashboard' }: HeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [userName, setUserName] = useState('Javier Ramírez')
  const [userEmail, setUserEmail] = useState('j.ramirez@traxion.com')
  const [userRol, setUserRol] = useState('')
  const [pendingCount, setPendingCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('nexo_user')
    let rolCode = ''
    if (stored) {
      try {
        const u = JSON.parse(stored)
        if (u.nombre) setUserName(u.nombre)
        if (u.email) setUserEmail(u.email)
        if (u.rol) setUserRol(u.rol)
        rolCode = u.rolCode || ''
      } catch {}
    }
    // Calcular pendientes según rol
    const vac = localStorage.getItem('nexo_solicitudes_vac')
    if (vac && (rolCode === 'C' || rolCode === 'JT')) {
      try {
        const solic = JSON.parse(vac) as Array<{ status: string }>
        if (rolCode === 'C') {
          setPendingCount(solic.filter(s => s.status === 'solicitud_pendiente' || s.status === 'respuesta_colaborador').length)
        } else if (rolCode === 'JT') {
          setPendingCount(solic.filter(s => s.status === 'pendiente_auth').length)
        }
      } catch {}
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('nexo_auth')
    localStorage.removeItem('nexo_user')
    router.push('/login')
  }

  const initials = userName.split(' ').slice(0, 2).map((n: string) => n[0]).join('')

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 shrink-0 z-20">

      {/* Traxion logo + breadcrumb */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="shrink-0 hidden sm:block">
          <Image
            src="/traxion-logo-verde.png"
            alt="Traxion"
            width={80}
            height={20}
            className="object-contain"
          />
        </div>
        <div className="hidden sm:block h-5 w-px bg-gray-200" />
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-gray-400 shrink-0">NEXO</span>
          <span className="text-xs text-gray-300">/</span>
          <span className="text-xs font-semibold text-gray-700 truncate">{breadcrumb}</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative hidden md:flex items-center">
        <Search className="absolute left-3 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar empleado..."
          className="pl-8 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8e000]/40 focus:border-[#a0b800] w-48 transition-all"
        />
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => { setNotifOpen(!notifOpen); setUserOpen(false) }}
          className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Bell size={18} />
          {pendingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[9px] font-extrabold rounded-full px-0.5 border border-white">
              {pendingCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">Notificaciones</span>
              {pendingCount > 0 && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">{pendingCount} pendientes</span>
              )}
            </div>
            <div className="divide-y divide-gray-50">
              {pendingCount > 0 ? (
                <div className="flex items-start gap-3 px-4 py-3 bg-blue-50/50">
                  <span className="text-base">📅</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 font-medium leading-snug">
                      {pendingCount} solicitud{pendingCount > 1 ? 'es' : ''} de vacaciones pendiente{pendingCount > 1 ? 's' : ''}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Ir a Asistencia → Autorizaciones Vacaciones</p>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-xs text-gray-400">Sin notificaciones pendientes</div>
              )}
            </div>
            <div className="px-4 py-2 border-t border-gray-100">
              <button className="text-xs text-[#a0b800] font-medium hover:text-[#7a8a00]">Ver todas</button>
            </div>
          </div>
        )}
      </div>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => { setUserOpen(!userOpen); setNotifOpen(false) }}
          className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-[#0f1117] flex items-center justify-center">
            <span className="text-[10px] font-bold text-[#c8e000]">{initials}</span>
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-gray-800 leading-tight">{userName}</p>
            <p className="text-[10px] text-gray-400">{userRol || 'Usuario'}</p>
          </div>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>

        {userOpen && (
          <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-800">{userName}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{userEmail}</p>
            </div>
            <div className="py-1">
              <button className="w-full flex items-center gap-3 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                <User className="w-3.5 h-3.5 text-gray-400" />
                Mi perfil
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                <Settings className="w-3.5 h-3.5 text-gray-400" />
                Configuración
              </button>
            </div>
            <div className="border-t border-gray-100 py-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Backdrop */}
      {(notifOpen || userOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setNotifOpen(false); setUserOpen(false) }}
        />
      )}
    </header>
  )
}
