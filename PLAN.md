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

## Fase 4 — Pendientes (en orden sugerido)

1. [ ] **Git init + commit inicial** — todo el proyecto sigue sin control
   de versiones. Primer paso antes de cualquier otra cosa.
2. [ ] **Rol `vigilancia`** — hoy la caseta usa la cuenta admin. Agregar
   tercer rol con acceso SOLO a Accesos (validar códigos, registrar
   paquetes/entradas/salidas). Toca: `users.rol`, middleware nuevo
   `verifyVigilancia` o permisos por rol, sidebar condicional, y el
   script create-admin generalizado.
3. [ ] **Consumir `system_settings`** — que `maintenance_mode` bloquee
   login de propietarios (admin pasa), y que `email_notifications`
   controle algo real cuando haya correo.
4. [ ] **Pasarela de pagos en línea** (Vivook: "Pagos en Línea") — Stripe
   o Conekta (México: OXXO/SPEI). El modelo de `cuotas` ya soporta:
   agregar `checkout` que marque la cuota pagada vía webhook. Requiere
   cuenta del cliente y llaves por despliegue (variables de entorno).
5. [ ] **Facturación CFDI** (Vivook: "Facturación CFDI") — requiere
   contratar un PAC (Facturama/SW Sapien). Diseñar tabla `facturas`
   ligada a cuotas pagadas. No intentar sin PAC de por medio.
6. [ ] **Adjuntos/archivos** — compartir documentos (reglamento, actas)
   en avisos; multer + carpeta uploads o S3 según despliegue.
7. [ ] **Tiempo real** — notificaciones push/WebSocket (hoy se calculan
   al cargar). Candidato: SSE simple desde Express.
8. [ ] **Reservas de amenidades** — casa club, asadores, canchas
   (calendario con choques). Vivook no lo destaca pero todo
   fraccionamiento lo pide.
9. [ ] **Deploy del primer cliente** — VPS + dominio + SSL + Postgres
   gestionado; revisar CSP/HSTS en `app.js` y rate limits.

## Reglas del proyecto (no romper)

- Marca blanca: branding SOLO en `branding.ts`/`branding.js`/`index.css`.
- Columna `dni` se queda con ese nombre interno; el label del país va en UI
  (México: CURP). Ver CONFIGURACION.md §9.
- Sin borrado duro de usuarios (FKs sin CASCADE): suspender, no eliminar.
- Colores de gráficas: solo los validados (o validar nuevos con el
  validador antes de usarlos).
- Cada instalación de cliente = su propia DB Postgres.
