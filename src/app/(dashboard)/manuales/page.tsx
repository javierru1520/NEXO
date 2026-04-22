"use client"

import { useState } from 'react'
import {
  UserPlus, UserMinus, Banknote, CalendarDays, HeartPulse,
  BookOpen, BarChart3, Zap, ShieldCheck, BookMarked,
  Search, Download, ExternalLink, X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Manual {
  id: number
  titulo: string
  descripcion: string
  categoria: string
  tipo: string
  paginas: number
  version: string
  fecha: string
  icono: string
}

const MANUALES: Manual[] = [
  { id: 1, titulo: "Manual de Alta de Empleados", descripcion: "Guía paso a paso para registrar nuevos empleados en el sistema", categoria: "Personal", tipo: "PDF", paginas: 24, version: "3.2", fecha: "2024-01-15", icono: "UserPlus" },
  { id: 2, titulo: "Manual de Baja de Empleados", descripcion: "Procedimiento completo para registrar bajas y rescisiones", categoria: "Personal", tipo: "PDF", paginas: 18, version: "2.1", fecha: "2024-01-15", icono: "UserMinus" },
  { id: 3, titulo: "Control de Sueldos y Percepciones", descripcion: "Guía para gestión de salarios, incrementos y percepciones", categoria: "Sueldos", tipo: "PDF", paginas: 32, version: "4.0", fecha: "2024-02-01", icono: "Banknote" },
  { id: 4, titulo: "Registro de Vacaciones", descripcion: "Procedimiento para captura y cálculo de vacaciones", categoria: "Beneficios", tipo: "PDF", paginas: 15, version: "2.5", fecha: "2024-01-20", icono: "CalendarDays" },
  { id: 5, titulo: "Incapacidades y Licencias", descripcion: "Manejo de incapacidades, modos y conceptos", categoria: "Beneficios", tipo: "PDF", paginas: 20, version: "2.0", fecha: "2024-01-10", icono: "HeartPulse" },
  { id: 6, titulo: "Sistema de Capacitación (SICI)", descripcion: "Guía completa del sistema integral de capacitación", categoria: "Capacitación", tipo: "PDF", paginas: 28, version: "1.8", fecha: "2024-02-10", icono: "BookOpen" },
  { id: 7, titulo: "HC y Control de Rotación", descripcion: "Manejo de headcount, plantilla y reportes de rotación", categoria: "Organización", tipo: "PDF", paginas: 22, version: "3.1", fecha: "2024-01-25", icono: "BarChart3" },
  { id: 8, titulo: "Integración con Talentrax", descripcion: "Configuración y manejo de la integración con Talentrax", categoria: "Integraciones", tipo: "PDF", paginas: 16, version: "1.5", fecha: "2024-02-15", icono: "Zap" },
  { id: 9, titulo: "Cambio de Contraseña y Accesos", descripcion: "Gestión de usuarios, roles y contraseñas del sistema", categoria: "Sistema", tipo: "PDF", paginas: 10, version: "1.2", fecha: "2024-01-05", icono: "ShieldCheck" },
  { id: 10, titulo: "Guía Rápida del Sistema SCRH", descripcion: "Referencia rápida con los procesos más frecuentes", categoria: "Sistema", tipo: "PDF", paginas: 8, version: "5.0", fecha: "2024-03-01", icono: "BookMarked" },
]

const ICON_MAP: Record<string, LucideIcon> = {
  UserPlus, UserMinus, Banknote, CalendarDays, HeartPulse,
  BookOpen, BarChart3, Zap, ShieldCheck, BookMarked,
}

const CATEGORIA_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  Personal:      { bg: 'bg-blue-50',   text: 'text-blue-700',   accent: '#3b82f6' },
  Sueldos:       { bg: 'bg-green-50',  text: 'text-green-700',  accent: '#10b981' },
  Beneficios:    { bg: 'bg-purple-50', text: 'text-purple-700', accent: '#8b5cf6' },
  Capacitación:  { bg: 'bg-amber-50',  text: 'text-amber-700',  accent: '#f59e0b' },
  Organización:  { bg: 'bg-orange-50', text: 'text-orange-700', accent: '#f97316' },
  Sistema:       { bg: 'bg-gray-50',   text: 'text-gray-700',   accent: '#6b7280' },
  Integraciones: { bg: 'bg-teal-50',   text: 'text-teal-700',   accent: '#14b8a6' },
}

const ALL_CATS = ['Todos', 'Personal', 'Sueldos', 'Beneficios', 'Capacitación', 'Organización', 'Sistema', 'Integraciones']

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Mock modal content ────────────────────────────────────────────────────────

function buildMockContent(manual: Manual): string {
  return `
## ${manual.titulo}
### Versión ${manual.version} — ${fmtDate(manual.fecha)}

---

### Introducción
Este manual describe el procedimiento detallado para llevar a cabo correctamente las operaciones relacionadas con "${manual.titulo}" en el Sistema SCRH de Traxion Capital Humano.

### Audiencia
Este documento está dirigido al personal de Recursos Humanos, administradores del sistema y usuarios autorizados del módulo correspondiente.

### Alcance
El presente manual cubre las funcionalidades principales del módulo, incluyendo la captura de datos, validaciones del sistema, flujos de aprobación y generación de reportes.

### Requisitos Previos
- Acceso activo al sistema SCRH
- Permisos configurados para el módulo correspondiente
- Navegador web compatible (Chrome, Edge o Firefox)

### Procedimiento Principal
1. Ingresar al sistema con las credenciales asignadas.
2. Navegar al módulo indicado en el menú lateral.
3. Seleccionar la opción correspondiente y completar el formulario requerido.
4. Verificar la información antes de confirmar la operación.
5. Guardar el registro y obtener el número de folio del sistema.

### Notas Importantes
- Todos los campos marcados con (*) son obligatorios.
- Los cambios registrados quedan sujetos a auditoría.
- En caso de error, contactar al administrador del sistema.

### Soporte
Para cualquier duda o aclaración, comuníquese con el área de soporte técnico de Traxion.
  `.trim()
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function useToast() {
  const [msg, setMsg] = useState<string | null>(null)
  const show = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(null), 3000)
  }
  return { msg, show }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ManualesPage() {
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('Todos')
  const [modalManual, setModalManual] = useState<Manual | null>(null)
  const { msg: toastMsg, show: showToast } = useToast()

  const filtered = MANUALES.filter(m => {
    const matchesCat = activeCat === 'Todos' || m.categoria === activeCat
    const matchesSearch = m.titulo.toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manuales del Sistema</h1>
        <p className="text-gray-500 text-sm mt-1">Guías de usuario y documentación</p>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Buscar manual..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ALL_CATS.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCat(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCat === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(manual => {
          const catStyle = CATEGORIA_COLORS[manual.categoria] ?? CATEGORIA_COLORS['Sistema']
          const Icon = ICON_MAP[manual.icono] ?? BookMarked

          return (
            <div
              key={manual.id}
              className="rounded-xl border bg-white shadow-sm overflow-hidden"
              style={{ borderTop: `4px solid ${catStyle.accent}` }}
            >
              <div className="p-5">
                {/* Icon + Title */}
                <div className="flex items-start gap-3 mb-2">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: catStyle.accent + '20' }}
                  >
                    <Icon size={20} style={{ color: catStyle.accent }} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm leading-tight">{manual.titulo}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{manual.descripcion}</p>
                  </div>
                </div>

                {/* Footer row */}
                <div className="flex flex-wrap items-center gap-2 mt-4 text-xs text-gray-500">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${catStyle.bg} ${catStyle.text}`}>
                    {manual.categoria}
                  </span>
                  <span>v{manual.version}</span>
                  <span>{manual.paginas} págs.</span>
                  <span>{fmtDate(manual.fecha)}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => showToast(`Descargando ${manual.titulo}...`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-700 transition-colors"
                  >
                    <Download size={13} /> Descargar
                  </button>
                  <button
                    onClick={() => setModalManual(manual)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-medium text-white transition-colors"
                  >
                    <ExternalLink size={13} /> Ver en línea
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center py-12 text-gray-400 text-sm">
          No se encontraron manuales.
        </p>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg z-50">
          {toastMsg}
        </div>
      )}

      {/* Modal */}
      {modalManual && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-900 text-base">{modalManual.titulo}</h2>
              <button
                onClick={() => setModalManual(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            {/* Modal body */}
            <div className="overflow-y-auto p-6 text-sm text-gray-700 leading-relaxed whitespace-pre-line flex-1">
              {buildMockContent(modalManual)}
            </div>
            {/* Modal footer */}
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button
                onClick={() => showToast(`Descargando ${modalManual.titulo}...`)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700"
              >
                <Download size={14} /> Descargar
              </button>
              <button
                onClick={() => setModalManual(null)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-medium text-white"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
