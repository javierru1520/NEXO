"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Shield, BarChart3, Users, ClipboardCheck, UserPlus, UserMinus, RotateCcw, ArrowRight, Lock } from 'lucide-react'
import Image from 'next/image'
import { LIVDM_USUARIOS } from '@/lib/livdm-usuarios'

const USUARIOS_ADMIN = [
  { email: 'j.ramirez@traxion.com.mx',   password: 'Nexo2026',   nombre: 'Javier Ramírez',       rol: 'Administrador',              rolCode: 'ADMIN', nomina: '' },
  { email: 'adp.garcia@traxion.com.mx',  password: 'Adp2026!',   nombre: 'ADP García',            rol: 'Admon. de Personal',         rolCode: 'ADP',   nomina: '' },
  { email: 'rl.torres@traxion.com.mx',   password: 'RelLab26',   nombre: 'RL Torres',             rol: 'Relaciones Laborales',       rolCode: 'RL',    nomina: '' },
]

const USUARIOS = [...USUARIOS_ADMIN, ...LIVDM_USUARIOS]

const MODULES = [
  { icon: BarChart3,    label: 'Dashboard',    desc: 'KPIs y métricas en tiempo real' },
  { icon: ClipboardCheck, label: 'Asistencia', desc: 'Control de ausentismo diario' },
  { icon: Users,        label: 'Empleados',    desc: 'Expediente completo de personal' },
  { icon: UserPlus,     label: 'Altas',        desc: 'Ingreso y onboarding' },
  { icon: UserMinus,    label: 'Bajas',        desc: 'Proceso de desvinculación' },
  { icon: RotateCcw,    label: 'Reingresos',   desc: 'Recontrataciones' },
]

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const [showSplash, setShowSplash] = useState(true)
  const [splashOut, setSplashOut] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setSplashOut(true), 3200)
    const t2 = setTimeout(() => setShowSplash(false), 4000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Por favor ingresa tu correo y contraseña.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: email, contrasena: password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Correo o contraseña incorrectos.')
        return
      }
      localStorage.setItem('nexo_auth', JSON.stringify({ ts: Date.now() }))
      localStorage.setItem('nexo_user', JSON.stringify({
        id_usuario:  data.user.id_usuario,
        nombre:      data.user.usuario,
        email:       data.user.correo,
        rol:         data.user.rol,
        rolCode:     data.user.rolCode,
        nomina:      data.user.nomina,
        id_empleado: data.user.id_empleado,
      }))
      router.push('/dashboard')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    {/* ── SPLASH SCREEN ──────────────────────────────────────────────────────── */}
    {showSplash && (
      <>
        <style>{`
          @keyframes slideInLeft {
            from { transform: translateX(-100%); }
            to   { transform: translateX(0); }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(28px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes revealRight {
            from { clip-path: inset(0 100% 0 0); }
            to   { clip-path: inset(0 0% 0 0); }
          }
          @keyframes expandLetters {
            from { opacity: 0; letter-spacing: -0.02em; }
            to   { opacity: 1; letter-spacing: 0.28em; }
          }
          @keyframes splashExit {
            0%   { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(-60px) scale(0.97); }
          }
          @keyframes pulseRing {
            0%, 100% { opacity: 0.15; transform: scale(1); }
            50%       { opacity: 0.35; transform: scale(1.05); }
          }
          .sp-panel    { animation: slideInLeft 0.8s cubic-bezier(0.16,1,0.3,1) 0.05s both; }
          .sp-tag      { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.6s both; }
          .sp-conect   { animation: revealRight 0.9s cubic-bezier(0.16,1,0.3,1) 1.1s both; }
          .sp-dest     { animation: expandLetters 0.9s cubic-bezier(0.16,1,0.3,1) 1.9s both; }
          .sp-prop     { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 2.3s both; }
          .sp-ring     { animation: pulseRing 3s ease-in-out infinite; }
          .sp-exit     { animation: splashExit 0.75s cubic-bezier(0.7,0,0.84,0) forwards; }
        `}</style>

        <div className={`fixed inset-0 z-50 flex overflow-hidden${splashOut ? ' sp-exit' : ''}`}>
          {/* Left yellow panel */}
          <div className="sp-panel relative w-[28%] bg-[#c8e000] flex flex-col justify-end p-10 shrink-0 overflow-hidden">
            {/* decorative rings */}
            <div className="sp-ring absolute -top-20 -left-20 w-64 h-64 rounded-full border-2 border-[#0f1117]/20 pointer-events-none" />
            <div className="sp-ring absolute -bottom-16 -right-16 w-48 h-48 rounded-full border-2 border-[#0f1117]/15 pointer-events-none" style={{ animationDelay: '0.5s' }} />
            <div className="sp-prop">
              <p className="text-[#0f1117]/60 text-xl font-light mb-1">Nuestro</p>
              <p className="text-[#0f1117] text-3xl font-black leading-tight">propósito</p>
            </div>
          </div>

          {/* Right dark panel */}
          <div className="flex-1 bg-[#3d4149] flex flex-col items-center justify-center gap-7 px-16 relative overflow-hidden">
            {/* subtle bg texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />

            {/* Tag */}
            <div className="sp-tag flex items-center gap-2 border border-white/40 rounded-full px-7 py-2.5">
              <span className="text-white/90 text-lg font-light tracking-wide">Movemos lo más valioso</span>
            </div>

            {/* CONECTAMOS */}
            <div className="sp-conect overflow-hidden">
              <h1 className="text-[clamp(3rem,8vw,7rem)] font-black text-[#c8e000] leading-none tracking-tight select-none">
                CONECTAMOS
              </h1>
            </div>

            {/* DESTINOS */}
            <div className="sp-dest overflow-hidden">
              <h2 className="text-[clamp(2.5rem,6.5vw,6rem)] font-black text-white leading-none select-none" style={{ letterSpacing: '0.28em' }}>
                DESTINOS
              </h2>
            </div>

            {/* Bottom line */}
            <div className="sp-prop absolute bottom-8 right-10 flex items-center gap-2 opacity-40">
              <div className="w-8 h-px bg-white" />
              <span className="text-white text-xs tracking-widest uppercase">Traxión · 2026</span>
            </div>
          </div>
        </div>
      </>
    )}

    <div className="min-h-screen flex bg-[#f4f6fa]">

      {/* ── LEFT PANEL ─────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[58%] flex-col bg-[#c8e000] relative overflow-hidden">

        {/* Decorative circles */}
        <div className="absolute inset-0 pointer-events-none">
          {[320, 520, 720, 920].map((size, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-[#0f1117]/8"
              style={{ width: size, height: size, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
            />
          ))}
          {/* Accent blob */}
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#0f1117]/5 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col h-full p-12">

          {/* Traxion logo + NEXO */}
          <div className="flex items-center gap-5">
            <Image
              src="/traxion-logo-verde.png"
              alt="Traxion"
              width={130}
              height={32}
              className="object-contain shrink-0"
              priority
            />
            <div className="h-10 w-px bg-[#0f1117]/20" />
            <div>
              <p className="text-[#0f1117] font-black tracking-widest text-base uppercase">NEXO</p>
              <p className="text-[#0f1117]/60 text-[10px] uppercase tracking-[0.3em] font-medium">Capital Humano</p>
            </div>
          </div>

          {/* Propósito Traxión */}
          <div className="mt-7 mb-2 border-t border-[#0f1117]/15 pt-6">
            <div className="inline-flex items-center gap-2 border border-[#0f1117]/30 rounded-full px-4 py-1.5 mb-4">
              <span className="text-[#0f1117]/80 text-xs font-medium tracking-widest uppercase">Movemos lo más valioso</span>
            </div>
            <p className="text-4xl font-black text-white leading-none drop-shadow-sm">CONECTAMOS</p>
            <p className="text-3xl font-black text-[#0f1117] mt-1.5" style={{ letterSpacing: '0.22em' }}>DESTINOS</p>
          </div>

          {/* Hero text */}
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <div className="inline-flex items-center gap-2 bg-[#0f1117]/8 border border-[#0f1117]/15 rounded-full px-3 py-1 mb-6 w-fit">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0f1117] animate-pulse" />
              <span className="text-[#0f1117] text-[11px] font-semibold tracking-wider uppercase">Fase 1 — Activo</span>
            </div>

            <h1 className="text-5xl font-black text-[#0f1117] leading-[1.1] mb-5">
              Sistema de<br />
              <span className="text-white drop-shadow-sm">Recursos</span><br />
              Humanos
            </h1>
            <p className="text-[#0f1117]/60 text-sm leading-relaxed">
              Plataforma integral para la gestión de capital humano de Traxion.
              Control total de empleados, asistencia, nómina y procesos de personal.
            </p>

            {/* Module grid */}
            <div className="mt-8 grid grid-cols-3 gap-2.5">
              {MODULES.map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="bg-white/25 border border-white/40 rounded-xl p-3 hover:bg-white/40 transition-colors"
                >
                  <Icon className="w-4 h-4 text-[#0f1117] mb-2" />
                  <p className="text-[#0f1117] text-xs font-semibold">{label}</p>
                  <p className="text-[#0f1117]/55 text-[10px] mt-0.5 leading-snug">{desc}</p>
                </div>
              ))}
            </div>

          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <p className="text-[#0f1117]/40 text-[11px]">© 2026 Traxion · NEXO Capital Humano</p>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-[#0f1117]/40" />
              <span className="text-[#0f1117]/40 text-[11px]">Acceso restringido</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — LOGIN ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#f4f6fa]">
        <div className="w-full max-w-[380px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="bg-white rounded-xl px-3 py-1.5 shadow-sm border border-gray-100">
              <Image src="/traxion-logo-verde.png" alt="Traxion" width={90} height={30} className="object-contain" />
            </div>
            <div>
              <p className="font-black text-gray-900 text-sm tracking-wider">NEXO</p>
              <p className="text-gray-400 text-[10px] uppercase tracking-widest">Capital Humano</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100/80 overflow-hidden">

            {/* Card top accent */}
            <div className="h-1 bg-gradient-to-r from-[#c8e000] via-[#a0b800] to-[#c8e000]" />

            <div className="p-8">
              {/* Header */}
              <div className="mb-7">
                <div className="w-11 h-11 rounded-xl bg-[#c8e000] flex items-center justify-center mb-4">
                  <Lock className="w-5 h-5 text-[#0f1117]" />
                </div>
                <h2 className="text-xl font-black text-gray-900">Iniciar sesión</h2>
                <p className="text-sm text-gray-500 mt-1">Acceso al sistema NEXO · Traxion</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="usuario@traxion.com.mx"
                    className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c8e000]/40 focus:border-[#a0b800] transition-all placeholder:text-gray-400"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c8e000]/40 focus:border-[#a0b800] transition-all pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember / Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 rounded border-gray-300 accent-[#a0b800]"
                    />
                    <span className="text-xs text-gray-600">Recordarme</span>
                  </label>
                  <button type="button" className="text-xs text-gray-500 hover:text-gray-800 font-medium transition-colors">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                    <p className="text-xs text-red-600">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#0f1117] hover:bg-[#1a1f2e] disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 group"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Verificando...
                    </>
                  ) : (
                    <>
                      Entrar al sistema
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider info */}
              <div className="mt-6 pt-5 border-t border-gray-100 text-center">
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Acceso restringido a personal autorizado.<br />
                  Si tienes problemas para ingresar, contacta a TI.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-5 flex items-center justify-center gap-3">
            <div className="bg-white rounded-lg px-3 py-1.5 shadow-sm border border-gray-100">
              <Image src="/traxion-logo-verde.png" alt="Traxion" width={60} height={20} className="object-contain opacity-60" />
            </div>
            <p className="text-[11px] text-gray-400">NEXO · Sistema de Recursos Humanos · 2026</p>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
