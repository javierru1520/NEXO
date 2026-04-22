"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSCRHStore } from '@/store'
import { sesionValida } from '@/lib/validations'
import {
  TIPOS_BAJA, MOTIVOS_BAJA, CAUSAS_BAJA, CAUSAS_IMSS,
  EMPRESAS, departamentos as DEPARTAMENTOS, puestos as PUESTOS,
  centrosCostos as CENTROS_COSTOS, UNIDADES_NEGOCIO,
} from '@/lib/mock-data'
import Sidebar from './sidebar'
import Header from './header'

interface MainLayoutProps {
  children: React.ReactNode
  breadcrumb?: string
}

export default function MainLayout({ children, breadcrumb }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [checked, setChecked] = useState(false)
  const router = useRouter()
  const setCurrentUser = useSCRHStore(s => s.setCurrentUser)

  useEffect(() => {
    // Always sync catalogs from mock-data, overriding any stale localStorage cache
    useSCRHStore.setState({
      tiposBaja:       TIPOS_BAJA,
      motivosBaja:     MOTIVOS_BAJA,
      causasBaja:      CAUSAS_BAJA,
      causasIMSS:      CAUSAS_IMSS,
      empresas:        EMPRESAS,
      departamentos:   DEPARTAMENTOS,
      puestos:         PUESTOS,
      centrosCostos:   CENTROS_COSTOS,
      unidadesNegocio: UNIDADES_NEGOCIO,
    })

    if (!sesionValida()) {
      localStorage.removeItem('nexo_auth')
      localStorage.removeItem('nexo_user')
      window.location.replace('/login')
    } else {
      try {
        const u = JSON.parse(localStorage.getItem('nexo_user') || '{}')
        setCurrentUser(u.nombre || u.nomina || 'SISTEMA')
      } catch {}
      setChecked(true)
    }
  }, [router, setCurrentUser])

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f1117]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#c8e000] border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 text-xs tracking-widest uppercase">Verificando acceso...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#f8f9fc] overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header breadcrumb={breadcrumb} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
