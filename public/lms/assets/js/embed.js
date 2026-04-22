/**
 * Traxión Academia del Operador — embed.js
 * Inyecta el LMS completo en cualquier sistema host.
 *
 * USO MÁS SIMPLE (iframe):
 *   <iframe src="./index.html" style="width:100%;height:100vh;border:none;"></iframe>
 *
 * USO COMO COMPONENTE INYECTADO:
 *   <div id="traxion-lms"></div>
 *   <script src="assets/js/embed.js" data-target="#traxion-lms"></script>
 *
 * USO EN REACT / VUE / ANGULAR:
 *   import { mountTraxionLMS } from './assets/js/embed.js';
 *   mountTraxionLMS(document.getElementById('lms-container'));
 *
 * OPCIONES:
 *   data-target    Selector del contenedor. Default: body
 *   data-mode      "hr" (RRHH) | "operator" (App móvil). Default: hr
 *   data-lang      "es" | "en". Default: es
 */

(function () {
  'use strict';

  const SCRIPT_EL = document.currentScript;
  const BASE_URL = SCRIPT_EL
    ? SCRIPT_EL.src.replace(/\/[^/]+$/, '/')
    : './assets/js/';
  const ROOT_URL = BASE_URL.replace('assets/js/', '');

  const target = (SCRIPT_EL && SCRIPT_EL.dataset.target) || 'body';
  const initMode = (SCRIPT_EL && SCRIPT_EL.dataset.mode) || 'hr';

  /**
   * Opción A: montar vía iframe (más aislado, recomendado para embeber en sistemas externos)
   */
  function mountIframe(container) {
    const iframe = document.createElement('iframe');
    iframe.src = ROOT_URL + 'index.html';
    iframe.style.cssText = 'width:100%;height:100%;min-height:700px;border:none;display:block;';
    iframe.title = 'Traxión Academia del Operador';
    iframe.allow = 'fullscreen';
    container.style.position = container.style.position || 'relative';
    container.appendChild(iframe);

    // Bridge: escuchar mensajes del iframe (para integración avanzada)
    window.addEventListener('message', function (e) {
      if (e.data && e.data.source === 'traxion-lms') {
        container.dispatchEvent(new CustomEvent('traxion-lms-event', { detail: e.data }));
      }
    });

    return iframe;
  }

  /**
   * Opción B: inyectar HTML + CSS + JS directamente en el DOM del host
   * (más integrado, requiere que no haya conflictos de CSS)
   */
  function mountInline(container) {
    // Load CSS
    if (!document.getElementById('traxion-lms-css')) {
      const link = document.createElement('link');
      link.id = 'traxion-lms-css';
      link.rel = 'stylesheet';
      link.href = ROOT_URL + 'assets/css/styles.css';
      document.head.appendChild(link);
    }

    // Load Google Fonts if not present
    if (!document.querySelector('link[href*="Barlow"]')) {
      const gf = document.createElement('link');
      gf.rel = 'stylesheet';
      gf.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Barlow:wght@300;400;500;600&display=swap';
      document.head.appendChild(gf);
    }

    // Load body fragment then JS
    fetch(ROOT_URL + 'assets/js/body.html.js')
      .then(r => r.text())
      .then(src => {
        // Execute to get window.__TRAXION_BODY__
        // eslint-disable-next-line no-new-func
        new Function(src)();
        container.innerHTML = window.__TRAXION_BODY__;

        // Load app.js
        const script = document.createElement('script');
        script.src = ROOT_URL + 'assets/js/app.js';
        script.onload = function () {
          if (typeof navTo === 'function') {
            navTo(initMode === 'operator' ? 'app-operador' : 'dashboard');
          }
        };
        document.body.appendChild(script);
      })
      .catch(function () {
        // Fallback: just show iframe
        console.warn('[Traxión LMS] Inline mount failed, falling back to iframe.');
        container.innerHTML = '';
        mountIframe(container);
      });
  }

  /**
   * API pública
   */
  window.TraxionLMS = {
    /**
     * Monta el LMS en un contenedor
     * @param {HTMLElement|string} containerOrSelector
     * @param {{ mode?: 'iframe'|'inline', initPage?: string }} options
     */
    mount: function (containerOrSelector, options) {
      options = options || {};
      const container = typeof containerOrSelector === 'string'
        ? document.querySelector(containerOrSelector)
        : containerOrSelector;

      if (!container) {
        console.error('[Traxión LMS] Container not found:', containerOrSelector);
        return;
      }

      if (options.mode === 'inline') {
        mountInline(container);
      } else {
        // Default: iframe (más seguro para sistemas externos)
        mountIframe(container);
      }
    },

    /** Navegar a una sección (solo funciona en modo inline) */
    navigate: function (page) {
      if (typeof navTo === 'function') navTo(page);
    },

    version: '1.0.0',
  };

  // Auto-mount si hay data-target
  if (SCRIPT_EL && SCRIPT_EL.dataset.target) {
    document.addEventListener('DOMContentLoaded', function () {
      const container = document.querySelector(SCRIPT_EL.dataset.target);
      if (container) mountIframe(container);
    });
  }
})();
