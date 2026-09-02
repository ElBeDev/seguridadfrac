# Rediseño visual — "demo chingona" (2026-08)

Registro y checklist del facelift visual. Referencias: tendencias SaaS 2026
(bento grids, glassmorphism sutil, aurora gradients, dark sidebar, micro-
interacciones) — ver fuentes al final.

## Concepto

**"Aurora residencial"** — sidebar oscuro (slate profundo) con acento
esmeralda→cian en gradiente, contenido claro con tarjetas bento de sombra
suave, landing con fondo aurora animado + skyline SVG de casitas, logo
nuevo (escudo gradiente con casa), tipografía Plus Jakarta Sans (títulos)
+ Inter (cuerpo) vía Google Fonts.

Todo sigue saliendo de variables CSS en `frontend/src/index.css` para no
romper la historia de marca blanca (ver CONFIGURACION.md).

## Checklist

### Fundación
- [x] `index.css` — reescribir tokens (paleta slate+esmeralda, tipografía,
      sombras suaves, radios); matar los restos del template de Vite
      (body flex centrado, background #242424, botones oscuros).
- [x] `index.html` — cargar Google Fonts (Plus Jakarta Sans + Inter),
      title ya dice SeguridadFrac.
- [x] `App.css` — fondo del contenido con patrón de puntos sutil.

### Assets SVG
- [x] `public/logo.svg` — logo nuevo: escudo con gradiente esmeralda→cian
      y casa en blanco (reemplaza el "S" genérico).
- [x] `public/skyline.svg` — silueta de fraccionamiento (casas/árboles)
      para el pie del hero de la landing.
- [x] Empty state con SVG inline en Notificaciones.

### Páginas
- [x] `Landing` — hero aurora animado, navbar slim glass (logo chico, no
      el de 150px), blobs de luz, skyline al pie, stats con datos reales
      (`/api/empleados`), features con iconos en chips de color.
- [x] `Sidebar` — modo oscuro, logo+wordmark, item activo con pill
      gradiente, usuario real desde localStorage (hoy dice "Administrador"
      hardcodeado aunque entres como propietario).
- [x] `Inicio` — strip de stats bento arriba (empleados totales,
      disponibles, calificados, servicios), action cards con acento de
      color propio por tarjeta, formularios pulidos, quitar las
      animaciones épicas de las estrellas (starShimmer/ratingGlow giran
      y brillan demasiado).
- [x] `Empleados` — avatares con iniciales (gradiente por nombre),
      tablas pulidas, badges consistentes.
- [x] `Admin` — header con chip de icono, tarjetas y modales alineados
      al nuevo sistema.
- [x] `Notificaciones` — tarjetas pulidas + empty state ilustrado.

### Verificación
- [x] `tsc -b` limpio
- [x] Tour Playwright con capturas de todas las páginas
- [x] Sin errores de consola

## Decisiones

- El acento verde `#33b398` heredado se sube a un gradiente
  esmeralda (#10B981) → cian (#0EA5E9); sigue siendo "el color de la
  marca" pero con más vida.
- Sidebar pasa de claro a oscuro (#0F172A): contraste fuerte con el
  contenido claro, look 2026, y hace que el acento gradiente truene.
- Las fuentes van por Google Fonts en `index.html`; el CSP de
  producción en `backend/src/app.js` ya permite fonts.googleapis.com.
- No se toca lógica de negocio ni endpoints — solo presentación (la
  única excepción: Landing/Inicio leen `/api/empleados` público para
  stats reales, y Sidebar lee el user de localStorage).

## Fuentes de inspiración

- [7 SaaS UI Design Trends for 2026](https://www.saasui.design/blog/7-saas-ui-design-trends-2026)
- [UI Design Trends for 2026 — Midrocket](https://midrocket.com/en/guides/ui-design-trends-2026/)
- [Glassmorphism UI: best practices](https://www.designstudiouiux.com/blog/what-is-glassmorphism-ui-trend/)
- [AppsGate — society management UI kit](https://codecanyon.net/item/4-app-template-society-management-app-appsgate/40524917) (referencia de producto similar)
- [Dark admin dashboards — Colorlib](https://colorlib.com/wp/dark-admin-dashboard-templates/)

---

# Fase 2 — completar funcionalidad (2026-08-28)

"Que quede completo": lo que faltaba de funcionalidad real, ya con el
sistema visual nuevo.

## Checklist

### Backend
- [x] `GET /api/stats` — agregados para Estadísticas (totales, promedios
      de rating, por servicio, por mes, reportes por tipo). Auth:
      propietario verificado o admin; solo números, sin datos personales.
- [x] `GET /api/notificaciones` — derivadas de actividad real (altas de
      empleados 30 días, reportes pendientes para admin / moderados
      propios para propietario, empleados sin calificar). Sin tabla nueva.
- [x] Tabla `system_settings` + `GET/PUT /api/settings` (admin) — los
      checkboxes de Configuración por fin persisten.

### Frontend
- [x] Página **Estadísticas** (`/system-stats`) — la ruta del sidebar que
      no existía. KPI row + 5 gráficas SVG hechas a mano (sin libs).
      Colores validados con el validador de paleta del skill dataviz:
      trío categórico #059669/#0284C7/#D97706 (CVD PASS, contraste ≥3:1)
      y ramp ordinal de severidad #FB923C→#EA580C→#9A3412. Tooltips al
      hover, leyendas, tabla alternativa (`<details>`), empty states.
- [x] **Notificaciones** reales — fetch a la API, fechas relativas,
      "marcar todas como leídas", leídas por dispositivo en localStorage.
- [x] **Admin**: Configuración del Sistema conectada (optimista, con
      rollback si falla) + panel de **Moderación de Reportes**
      (aprobar/rechazar, filtro pendientes/todos, borde por severidad).
- [x] **Empleados**: botón "Ver" → modal de detalle con ratings; botón
      "Editar" → modal solo-admin contra `PUT /api/admin/empleados/:id`
      (oculto para propietarios).

### Verificación (Playwright, e2e real)
- [x] Stats: 4 KPIs + 5 charts renderizan para admin y propietario
- [x] Moderar reporte: aprobar desde la UI funciona (toast ✓)
- [x] Settings persisten tras reload de la página
- [x] Notificaciones: 5 items reales derivados de la actividad
- [x] Ver/Editar empleado funcionan; Editar oculto para propietario
- [x] 0 errores de consola, `tsc -b` limpio, build de producción OK

## Pendiente consciente
- Los valores de `system_settings` se guardan pero nada los consume aún
  (p.ej. `maintenance_mode` no bloquea logins). Conectar efectos es
  decisión de producto.
- Notificaciones no tienen push/tiempo real — se calculan al cargar la
  página.

---

# Fase 3 visual — "Pro pass" estilo Azure Security (2026-09-02)

Referencia del usuario: dribbble.com/shots/23535219 (Microsoft Azure
Security Management). Su verde vivo mapea directo a nuestro esmeralda.

- Sidebar reescrito a claro (blanco): buscador de secciones funcional
  (filtra la navegación), grid 2x2 de accesos rápidos con el activo en
  esmeralda sólido, listas compactas por sección, y tarjeta de usuario
  con avatar + email + logout. Ancho 240→260px.
- Headers de página: breadcrumb (APP_NAME · Sección) + chip de icono
  tintado junto al título, sobre un lavado pastel multicolor
  (esmeralda/violeta/cian) también aplicado al tope del contenido.
- Look más flat: bordes casi invisibles (#EBEEF2), sombras finas, glow
  de botones reducido a 2-4px en todo el panel (la landing conserva su
  drama porque es marketing).
- Vigilancia: un solo tile grande de Accesos, sin secciones.

## Inicio como Overview real (2026-09-02)

La página de Inicio era el mayor "AI tell" restante: 4 tarjetas idénticas
centradas como launcher. Rediseñada como dashboard de overview siguiendo
los patrones estándar (KPI strip arriba + grid de contexto + drill-down):

- Saludo con fecha larga ("Hola, {nombre}") en lugar de página muda.
- Grid de 3 tarjetas: **gauge semidonut** con la calificación global de
  la comunidad (hue única #059669 validada), **Actividad reciente** (top
  5 del feed real de /api/notificaciones con link a Ver todo) y **Tu
  comunidad** (próximo evento + último aviso, link a Comunidad).
- Los 4 flujos (Registrar/Buscar/Servicio/Reportar) pasaron de tarjetas
  gigantes al patrón estándar de tabs del panel; los formularios quedan
  intactos debajo.
- CSS muerto de action-cards eliminado.
