export default function LegalPage() {
  return (
    <div style={{ height: 'calc(100vh - 56px)' }}>
      <iframe
        src="/legal-app/index.html"
        className="w-full h-full border-0"
        title="Legal Dashboard"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  )
}
