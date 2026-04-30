"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  UserMinus,
  UserCheck,
  Banknote,
  CalendarDays,
  HeartPulse,
  CreditCard,
  BarChart3,
  BookOpen,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Truck,
  Zap,
  Bus,
  Network,
  FileBarChart,
  ArrowLeftRight,
  ShieldCheck,
  Settings,
  Link2,
  ShieldAlert,
  Cake,
  Trophy,
  BookMarked,
  ClipboardCheck,
  Lock,
  Scale,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Módulos disponibles en Fase 1
const FASE1_ROUTES = new Set([
  '/dashboard',
  '/asistencia',
  '/empleados',
  '/altas',
  '/bajas',
  '/reingresos',
  '/mi-equipo',
  '/orgchart',
  '/lipu',
  '/legal',
  '/academia',
])

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const topItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
]

const navGroups: NavGroup[] = [
  {
    label: 'Operaciones',
    items: [
      { label: 'Rewards',   href: '/lipu',       icon: Bus },
      { label: 'Legal',     href: '/legal',      icon: Scale },
      { label: 'Asistencia', href: '/asistencia', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Personal',
    items: [
      { label: 'Empleados',   href: '/empleados',   icon: Users },
      { label: 'Altas',       href: '/altas',       icon: UserPlus },
      { label: 'Bajas',       href: '/bajas',       icon: UserMinus },
      { label: 'Reingresos',  href: '/reingresos',  icon: UserCheck },
      { label: 'Mi Equipo',   href: '/mi-equipo',   icon: Users },
      { label: 'Asignaciones', href: '/asignaciones', icon: Link2 },
      { label: 'Capacitaciones', href: '/academia',  icon: BookOpen },
    ],
  },
  {
    label: 'Compensaciones',
    items: [
      { label: 'Sueldos',       href: '/sueldos',       icon: Banknote },
      { label: 'Vacaciones',    href: '/vacaciones',    icon: CalendarDays },
      { label: 'Incapacidades', href: '/incapacidades', icon: HeartPulse },
      { label: 'Licencias',     href: '/licencias',     icon: CreditCard },
    ],
  },
  {
    label: 'Organización',
    items: [
      { label: 'HC y Rotación',   href: '/hc-rotacion',    icon: BarChart3 },
      { label: 'Capacitación',    href: '/capacitacion',   icon: BookMarked },
      { label: 'Orgchart',        href: '/orgchart',       icon: Network },
      { label: 'Control Interno', href: '/control-interno', icon: ShieldAlert },
    ],
  },
  {
    label: 'Avisos',
    items: [
      { label: 'Cumpleaños',  href: '/cumpleanos',  icon: Cake },
      { label: 'Aniversarios', href: '/aniversarios', icon: Trophy },
      { label: 'Manuales',    href: '/manuales',    icon: BookMarked },
      { label: 'Credenciales', href: '/credenciales', icon: CreditCard },
    ],
  },
  {
    label: 'Integraciones',
    items: [
      { label: 'Talentrax', href: '/talentrax', icon: Zap },
      { label: 'Ramsal',    href: '/ramsal',    icon: Network },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { label: 'Reportes',       href: '/reportes',       icon: FileBarChart },
      { label: 'Transferencias', href: '/transferencias', icon: ArrowLeftRight },
      { label: 'Accesos',        href: '/accesos',        icon: ShieldCheck },
      { label: 'Configuración',  href: '/configuracion',  icon: Settings },
    ],
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

function NavLink({
  item,
  isActive,
  collapsed,
  locked,
}: {
  item: NavItem
  isActive: boolean
  collapsed: boolean
  locked: boolean
}) {
  const Icon = item.icon

  if (locked) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg relative group cursor-not-allowed',
          'text-[#0f1117]/30',
        )}
        title="Disponible en Fase 2"
      >
        <Icon className="shrink-0 text-[#0f1117]/25" size={18} />
        {!collapsed && (
          <span className="text-sm font-medium flex-1 truncate">{item.label}</span>
        )}
        {!collapsed && (
          <span className="flex items-center gap-1 text-[10px] text-[#0f1117]/35 bg-[#0f1117]/8 border border-[#0f1117]/15 px-1.5 py-0.5 rounded-full shrink-0">
            <Lock size={8} />
            F2
          </span>
        )}
        {collapsed && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-[#0f1117] text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 border border-white/10 flex items-center gap-1">
            <Lock size={9} />
            {item.label} · Fase 2
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 relative group',
        isActive
          ? 'bg-[#0f1117] text-white shadow-sm'
          : 'text-[#0f1117]/70 hover:bg-[#0f1117]/10 hover:text-[#0f1117]',
      )}
    >
      <Icon
        className={cn('shrink-0', isActive ? 'text-[#c8e000]' : '')}
        size={18}
      />
      {!collapsed && (
        <span className="text-sm font-medium flex-1 truncate">{item.label}</span>
      )}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-[#0f1117] text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 border border-white/10">
          {item.label}
        </div>
      )}
    </Link>
  )
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  const handleLogout = () => {
    localStorage.removeItem('nexo_auth')
    localStorage.removeItem('nexo_user')
    router.push('/login')
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-[#c8e000] transition-all duration-300 ease-in-out shrink-0',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* Logo area */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[#0f1117]/10 shrink-0">
        {!collapsed ? (
          <div className="flex flex-col w-full gap-0.5">
            <Image
              src="/traxion-logo-dark.png"
              alt="Traxion"
              width={100}
              height={24}
              className="object-contain object-left"
            />
            <p className="text-[9px] text-[#0f1117]/60 uppercase tracking-widest pl-0.5">Capital Humano · NEXO</p>
          </div>
        ) : (
          <div className="w-full flex items-center justify-center">
            <div className="w-9 h-9 rounded-lg bg-[#0f1117] flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-[#c8e000]" strokeWidth={2.5} />
            </div>
          </div>
        )}
      </div>

      {/* Phase badge */}
      {!collapsed && (
        <div className="mx-3 mt-2 mb-1">
          <div className="flex items-center gap-1.5 bg-[#0f1117]/8 border border-[#0f1117]/15 rounded-full px-2.5 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#0f1117] animate-pulse shrink-0" />
            <span className="text-[10px] font-semibold text-[#0f1117] tracking-wider">FASE 1 ACTIVA</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin scrollbar-thumb-[#0f1117]/15">
        {/* Top standalone items */}
        <ul className="space-y-0.5 px-2 mb-3">
          {topItems.map((item) => (
            <li key={item.href}>
              <NavLink
                item={item}
                isActive={isActive(item.href)}
                collapsed={collapsed}
                locked={false}
              />
            </li>
          ))}
        </ul>

        {/* Grouped items */}
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <p className="px-5 mb-1 text-[10px] font-bold text-[#0f1117]/45 uppercase tracking-widest">
                {group.label}
              </p>
            )}
            {collapsed && (
              <div className="px-2 mb-1">
                <div className="border-t border-[#0f1117]/15" />
              </div>
            )}
            <ul className="space-y-0.5 px-2">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    item={item}
                    isActive={isActive(item.href)}
                    collapsed={collapsed}
                    locked={!FASE1_ROUTES.has(item.href)}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom: Logout + Collapse */}
      <div className="border-t border-[#0f1117]/15 shrink-0">
        {/* Logout */}
        <div className="px-2 pt-2">
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 w-full',
              'text-[#0f1117]/60 hover:bg-red-600/15 hover:text-red-700',
            )}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && (
              <span className="text-sm font-medium flex-1 text-left truncate">Cerrar sesión</span>
            )}
            {collapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#0f1117] text-white text-xs rounded whitespace-nowrap pointer-events-none z-50 border border-white/10 hidden group-hover:block">
                Cerrar sesión
              </div>
            )}
          </button>
        </div>

        {/* Collapse button */}
        <div className="p-3">
          <button
            onClick={onToggle}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#0f1117]/60 hover:bg-[#0f1117]/10 hover:text-[#0f1117] transition-all duration-150"
          >
            {collapsed ? (
              <ChevronRight size={16} className="mx-auto" />
            ) : (
              <>
                <ChevronLeft size={16} />
                <span className="text-xs font-medium">Colapsar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  )
}
