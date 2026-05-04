"use client"

import { Bell, Search, ChevronDown, User, LogOut, Settings, Lock, Eye, EyeOff } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
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
  const [userNomina, setUserNomina] = useState('')
  const [pendingCount, setPendingCount] = useState(0)
  const router = useRouter()

  const [changePwOpen, setChangePwOpen] = useState(false)
  const [pwActual, setPwActual] = useState('')
  const [pwNueva, setPwNueva] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [showActual, setShowActual] = useState(false)
  const [showNueva, setShowNueva] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const pwActualRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem('nexo_user')
    let rolCode = ''
    if (stored) {
      try {
        const u = JSON.parse(stored)
        if (u.nombre) setUserName(u.nombre)
        if (u.email) setUserEmail(u.email)
        if (u.rol) setUserRol(u.rol)
        if (u.nomina) setUserNomina(u.nomina)
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

  const openChangePw = () => {
    setUserOpen(false)
    setPwActual(''); setPwNueva(''); setPwConfirm('')
    setPwError(''); setPwSuccess(false)
    setChangePwOpen(true)
    setTimeout(() => pwActualRef.current?.focus(), 100)
  }

  const handleChangePw = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    if (!pwActual || !pwNueva || !pwConfirm) { setPwError('Todos los campos son requeridos.'); return }
    if (pwNueva.length < 6) { setPwError('La nueva contraseña debe tener al menos 6 caracteres.'); return }
    if (pwNueva !== pwConfirm) { setPwError('Las contraseñas nuevas no coinciden.'); return }
    if (pwNueva === pwActual) { setPwError('La nueva contraseña debe ser diferente a la actual.'); return }
    setPwLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: userEmail, contrasenaActual: pwActual, contrasenaNueva: pwNueva }),
      })
      const data = await res.json()
      if (!res.ok) { setPwError(data.error || 'Error al cambiar contraseña.'); return }
      setPwSuccess(true)
      setTimeout(() => setChangePwOpen(false), 2000)
    } catch {
      setPwError('Error de conexión. Intenta de nuevo.')
    } finally {
      setPwLoading(false)
    }
  }

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
            <p className="text-[10px] text-gray-400">
              {userRol || 'Usuario'}{userNomina ? ` · ${userNomina}` : ''}
            </p>
          </div>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>

        {userOpen && (
          <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-800">{userName}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{userEmail}</p>
              {userNomina && <p className="text-[10px] text-gray-400">Nómina: {userNomina}</p>}
            </div>
            <div className="py-1">
              <button className="w-full flex items-center gap-3 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                <User className="w-3.5 h-3.5 text-gray-400" />
                Mi perfil
              </button>
              <button
                onClick={openChangePw}
                className="w-full flex items-center gap-3 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Lock className="w-3.5 h-3.5 text-gray-400" />
                Cambiar contraseña
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

      {/* Modal cambiar contraseña */}
      {changePwOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !pwLoading && setChangePwOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Cambiar contraseña</h2>
            <p className="text-xs text-gray-400 mb-5">Ingresa tu contraseña actual y elige una nueva.</p>

            {pwSuccess ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-sm font-medium text-green-700">¡Contraseña actualizada!</p>
              </div>
            ) : (
              <form onSubmit={handleChangePw} className="flex flex-col gap-4">
                {/* Contraseña actual */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-700">Contraseña actual</label>
                  <div className="relative">
                    <input
                      ref={pwActualRef}
                      type={showActual ? 'text' : 'password'}
                      value={pwActual}
                      onChange={e => setPwActual(e.target.value)}
                      className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8e000]/40 focus:border-[#a0b800]"
                      placeholder="••••••••"
                      disabled={pwLoading}
                    />
                    <button type="button" onClick={() => setShowActual(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showActual ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Nueva contraseña */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-700">Nueva contraseña</label>
                  <div className="relative">
                    <input
                      type={showNueva ? 'text' : 'password'}
                      value={pwNueva}
                      onChange={e => setPwNueva(e.target.value)}
                      className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8e000]/40 focus:border-[#a0b800]"
                      placeholder="Mínimo 6 caracteres"
                      disabled={pwLoading}
                    />
                    <button type="button" onClick={() => setShowNueva(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showNueva ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar nueva contraseña */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-700">Confirmar nueva contraseña</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={pwConfirm}
                      onChange={e => setPwConfirm(e.target.value)}
                      className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8e000]/40 focus:border-[#a0b800]"
                      placeholder="Repite la nueva contraseña"
                      disabled={pwLoading}
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {pwError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{pwError}</p>}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setChangePwOpen(false)}
                    disabled={pwLoading}
                    className="flex-1 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="flex-1 py-2 text-xs font-medium text-black bg-[#c8e000] hover:bg-[#b0c800] rounded-lg transition-colors disabled:opacity-50"
                  >
                    {pwLoading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
