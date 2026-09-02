# PLAN.md — Plan maestro y workflow de SeguridadFrac

Documento de control del proyecto. Aquí se registra **qué se ha hecho, qué
sigue y en qué orden**, y el workflow a seguir para cualquier módulo nuevo.
Actualizar este archivo en cada sesión de trabajo — es la fuente de verdad
del avance (el detalle de diseño visual vive en REDISENO.md, el detalle
técnico del sistema en CONTEXTO-SISTEMA.md).

## Visión

Clon de marca blanca que empezó como sistema de **referencias laborales**
(SistemaGuardian) y se está convirtiendo en una **plataforma integral de
administración de fraccionamientos** al estilo [Vivook](https://www.vivook.com/):
comunicación, seguridad/accesos, finanzas y gestión de personal doméstico,
para revenderse por cliente con branding propio.

## Workflow para cualquier módulo nuevo (seguir en este orden)

1. **Schema** — agregar tablas a `backend/sql/schema.sql` (siempre
   `CREATE TABLE IF NOT EXISTS` para que la instalación fresca siga
   funcionando) y aplicar a la DB local con `psql seguridadfrac -f ...`.
2. **Backend** — un archivo por recurso en `backend/src/routes/`,
   registrarlo en `src/app.js`. Auth: `verifyPropietario` (propietario
   verificado o admin) para lectura/acciones de residente, `verifyAdmin`
   para gestión.
3. **Smoke test + seed** — probar cada endpoint con `curl` sembrando datos
   de demo realistas (sirve de test y de datos para la UI).
4. **Frontend** — página en `frontend/src/pages/` (patrón: header-card +
   unified-card con tabs + table-cards; reutilizar clases de
   `Modulos.css`/`Empleados.css`/`Admin.css`). Ruta en `App.tsx`, entrada
   en `Sidebar.tsx` (sección que corresponda). Distinguir vista
   admin/propietario con el rol de localStorage (la seguridad real está
   en el backend, el rol en el front es solo UX).
5. **Gráficas** — si el módulo lleva charts, validar colores con el
   validador de paleta ANTES de escribirlas (ver REDISENO.md fase 2 para
   los colores ya validados).
6. **Verificación** — `npx tsc -b` limpio, e2e con Playwright (script en
   scratchpad, patrón de tour3.mjs) cubriendo el flujo feliz de ambos
   roles, 0 errores de consola, `npm run build` OK.
7. **Docs** — actualizar CONTEXTO-SISTEMA.md (tablas/endpoints/páginas) y
   palomear el checklist aquí en PLAN.md.

## Registro de fases

### ✅ Fase 0 — Entorno local + bugs heredados (2026-08-27)
- [x] DB Postgres local + schema + admin seed; backend :4000, frontend :5173
- [x] Los 6 bugs heredados del original corregidos (registro de empleado
      desalineado, Admin sin conectar, tabs placeholder, etc.)
- [x] Localización a México: labels CURP, campos zona/email en empleados

### ✅ Fase 1 — Rediseño visual "Aurora residencial" (2026-08-27)
- [x] Design tokens, dark sidebar, landing aurora + skyline SVG, logo
      nuevo, tipografía Google Fonts — detalle completo en REDISENO.md

### ✅ Fase 2 — Funcionalidad completa del sistema base (2026-08-28)
- [x] Página Estadísticas con gráficas validadas, notificaciones reales,
      settings persistentes, moderación de reportes, Ver/Editar empleado
      — detalle en REDISENO.md fase 2

### ✅ Fase 3 — Módulos Vivook (2026-08-28)

Feature-set integrado desde el análisis de vivook.com (Administración,
Comunicación y Seguridad; ver "Fase 4" para lo que quedó de Pagos/CFDI).

**Backend** (9 tablas nuevas, 7 routers):
- [x] `avisos` — comunicados con prioridad (normal/importante/urgente)
- [x] `eventos` — calendario comunitario
- [x] `encuestas` + `encuesta_opciones` + `encuesta_votos` — votación con
      unicidad por propietario y cierre por admin
- [x] `solicitudes_admin` — tickets del residente a administración con
      respuesta y estados (abierta/en_proceso/resuelta)
- [x] `cuotas` + `egresos` — cargos (individuales o masivos a todos los
      verificados), registro manual de pagos, egresos por categoría, y
      `GET /api/finanzas/resumen` (recaudado/por cobrar/vencido/egresos,
      series por mes, egresos por categoría)
- [x] `visitas` — pases con código único legible (V-XXXXXX, alfabeto sin
      ambiguos), validación en caseta, entrada/salida/cancelación
- [x] `paquetes` — recepción en caseta y entrega
- [x] Notificaciones enriquecidas: avisos nuevos, paquete en caseta,
      cuota por vencer/vencida, visitante que ingresó (propietario);
      solicitudes abiertas (admin)

**Frontend** (3 páginas nuevas, sidebar con secciones):
- [x] **Comunidad** (`/comunidad`) — tabs Avisos / Eventos / Encuestas /
      Solicitudes; crear/eliminar (admin), votar con resultados en
      barras, responder solicitudes
- [x] **Accesos** (`/accesos`) — pases de visita con **QR real**
      (lib `qrcode`), tab "Validar Código" para caseta (solo admin) con
      registro de entrada/salida, paquetería con notificación al residente
- [x] **Finanzas** (`/finanzas`) — estado de cuenta del propietario con
      banner de adeudo, gestión de cargos/pagos y egresos (admin), y
      Resumen con KPIs + gráfica ingresos vs egresos por mes (colores
      validados #059669/#D97706) + egresos por categoría
- [x] Sidebar reorganizado en secciones (Principal / Comunidad / Sistema),
      Admin oculto para propietarios

**Verificación e2e (Playwright)**:
- [x] Propietario: ve avisos/eventos, encuesta muestra resultados tras
      votar, genera pase con QR, banner de adeudo correcto
- [x] Admin: responde solicitud, valida código en caseta y registra
      entrada, resumen financiero con 4 KPIs y 2 charts
- [x] `tsc -b` limpio, build de producción OK, 0 errores de consola

### ✅ Fase 4 — Roles, settings reales, reservas y adjuntos (2026-08-28)

1. [x] **Git init + commit inicial** — repo creado, `.env` y
   `backend/uploads/` ignorados, baseline de 74 archivos.
2. [x] **Rol `vigilancia`** — middlewares `verifyCaseta` (admin|vigilancia)
   y `verifyAcceso` (caseta o propietario verificado); la caseta valida
   códigos, registra entradas/salidas y paquetes, ve la lista mínima de
   propietarios (`GET /api/usuarios/propietarios`, sin emails/teléfonos),
   y recibe **403 en todo lo demás** (verificado). Alta desde el modal
   "Nuevo Usuario" del Admin (select de rol; vigilancia nace `verified`).
   Login redirige a `/accesos` y el sidebar muestra SOLO Accesos.
   Usuario demo: `caseta@example.com` / `caseta123`.
3. [x] **`system_settings` consumido** — `maintenance_mode=true` bloquea
   el login de todo rol excepto admin con 503 y mensaje claro (probado
   desde la UI: toggle en Admin → propietario bloqueado → restaurado).
   `email_notifications` queda para cuando exista mailer.
4. [x] **Reservas de amenidades** — tablas `amenidades` (seed: Casa club,
   Asadores, Cancha) y `reservas`; `POST /api/reservas` con **chequeo de
   traslape** (409 si el horario choca); tab "Reservas" en Comunidad con
   catálogo, tabla de próximas y cancelación (dueño o admin).
5. [x] **Adjuntos en avisos** — multer (PDF/imagen, 5MB) a
   `backend/uploads` servido en `/uploads` (proxy de Vite incluido);
   file input en el modal de aviso y chip de descarga en la card.

### Fase 5 — Pendientes (bloqueados por terceros o infra)

1. [ ] **Pasarela de pagos en línea** (Vivook: "Pagos en Línea") — Stripe
   o Conekta (México: OXXO/SPEI). El modelo de `cuotas` ya soporta:
   agregar `checkout` que marque la cuota pagada vía webhook. **Bloqueado
   por**: cuenta y llaves del cliente (variables de entorno por deploy).
2. [ ] **Facturación CFDI** (Vivook: "Facturación CFDI") — **bloqueado
   por**: contratar un PAC (Facturama/SW Sapien). Diseñar tabla
   `facturas` ligada a cuotas pagadas. No intentar sin PAC de por medio.
3. [ ] **Tiempo real** — notificaciones push/WebSocket (hoy se calculan
   al cargar). Candidato: SSE simple desde Express. Sin bloqueo externo,
   solo priorización.
4. [~] **Deploy** — repo en GitHub (ElBeDev/seguridadfrac) y proyecto
   **Vercel-ready**: `vercel.json` (API serverless + front estático),
   pool con TLS para Postgres hosteado, uploads configurables
   (`UPLOADS_DIR=/tmp/uploads`). Pasos y limitaciones en **DEPLOY.md**.
   Falta del lado del usuario: crear la DB (Neon), setear env vars en
   Vercel y correr schema + create-admin contra la DB de prod.
5. [ ] **Adjuntos persistentes en prod** — en Vercel van a /tmp
   (efímero); migrar a Vercel Blob o S3 cuando el deploy quede.

## Reglas del proyecto (no romper)

- Marca blanca: branding SOLO en `branding.ts`/`branding.js`/`index.css`.
- Columna `dni` se queda con ese nombre interno; el label del país va en UI
  (México: CURP). Ver CONFIGURACION.md §9.
- Sin borrado duro de usuarios (FKs sin CASCADE): suspender, no eliminar.
- Colores de gráficas: solo los validados (o validar nuevos con el
  validador antes de usarlos).
- Cada instalación de cliente = su propia DB Postgres.
