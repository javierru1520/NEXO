export default function AcademiaPage() {
  return (
    <div style={{ height: 'calc(100vh - 56px)' }}>
      <iframe
        src="/lms/index.html"
        className="w-full h-full border-0"
        title="Academia del Operador"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  )
}
