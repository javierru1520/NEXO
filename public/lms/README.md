# Traxión Academia del Operador — LMS+

Prototipo funcional completo. Versión 1.0

## Inicio rápido

```bash
# Abrir directo (sin servidor)
open index.html

# O con servidor local
npx serve .          # → http://localhost:3000
python3 -m http.server 3000
```

## Estructura

```
traxion_lms/
├── index.html              ← App completa standalone
├── assets/
│   ├── css/styles.css      ← Estilos (paleta Traxión)
│   └── js/
│       ├── app.js          ← Lógica + datos dummy
│       ├── embed.js        ← Script de integración
│       └── body.html.js    ← Fragmento HTML como módulo JS
├── embed_examples.html     ← Guía de integración con ejemplos
└── README.md
```

## Embeber en otro sistema

**Más simple (iframe):**
```html
<iframe src="./traxion_lms/index.html"
  style="width:100%;height:100vh;border:none;">
</iframe>
```

Ver `embed_examples.html` para todos los casos: React, Vue, Angular, Netlify, GitHub Pages.

## Pantallas incluidas

### Vista RRHH
- Dashboard con KPIs y cumplimiento por coordinador
- Organigrama jerárquico Gerente → Coordinadores → Operadores
- Tabla de operadores — filtros, búsqueda, detalle individual
- Catálogo de 10 capacitaciones con métricas
- Creador de curso — 5 pasos estilo Lapzo (Información, Contenido, Audiencia, Config, Publicar)
- Centro de alertas priorizadas
- Notificaciones y Perfil HR

### App Móvil del Operador
- Inicio con lección del día, racha y posición en ranking
- Catálogo de cursos con progreso
- Lección con video + quiz interactivo + pantalla de resultado con puntos
- Tabla de posiciones (depósito / regional / nacional)
- Checklist preoperacional interactivo (17 ítems)
- Tienda de recompensas con canje real de puntos
- Perfil con badges y certificaciones

## Especificaciones técnicas

- **195 botones funcionales** con navegación y datos dummy
- **Single-file** — todo inline, sin dependencias locales
- Única dependencia externa: Google Fonts (Barlow) via CDN
- Compatible con Chrome 90+, Edge 90+, Safari 14+, Firefox 88+
- Sin cookies, sin localStorage, sin tracking

## Paleta oficial Traxión

| Variable | Pantone | Hex |
|---|---|---|
| `--lima` | Pantone 389C | `#D0DF00` |
| `--lima2` | Pantone 387C | `#E3E935` |
| `--oliva` | Pantone 390C | `#B5BD00` |
| `--gdk` | Cool Gray 8C | `#63666A` |
| `--gmd` | Cool Gray 6C | `#97999B` |
| `--glt` | Cool Gray 3C | `#D0D0CE` |
