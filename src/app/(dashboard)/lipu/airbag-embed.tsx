"use client"

import MainLayout from '@/components/layout/main-layout'

export default function AirbagEmbed({ html }: { html: string }) {
  return (
    <MainLayout breadcrumb="Airbag — Movilidad de Personas">
      <div style={{ height: 'calc(100vh - 56px)' }}>
        <iframe
          srcDoc={html}
          className="w-full h-full border-0"
          title="Airbag Sistema Integral"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </MainLayout>
  )
}
