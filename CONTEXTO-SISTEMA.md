# Contexto del sistema (origen: SistemaGuardian)

Este proyecto es un clon de marca blanca de **SistemaGuardian**, un sistema
ya en producción para una comunidad residencial (Nordelta, Argentina). Este
documento describe qué hace el sistema original y cómo funciona, para que
cualquier trabajo futuro en `SeguridadFrac` parta de un entendimiento
completo del producto que se está personalizando/vendiendo. El nombre real
del cliente original, sus zonas y su dominio se dejaron fuera de este clon
a propósito (ver [CONFIGURACION.md](CONFIGURACION.md)) — se mencionan aquí
solo como referencia histórica del sistema del que proviene el código.

## Qué problema resuelve

Plataforma para que los propietarios de una comunidad cerrada registren,
busquen y califiquen empleados domésticos y prestadores de servicios
(plomeros, electricistas, niñeras, jardineros, etc.), y reporten incidentes
(robos, mal comportamiento) para que queden como antecedente visible al
resto de la comunidad. El objetivo es dar trazabilidad y referencias reales
sobre el personal que entra a las casas de la comunidad.

## Roles

- **admin** — gestiona usuarios (verifica/suspende propietarios), modera
  reportes, puede editar cualquier empleado, y opera todos los módulos.
- **propietario** — solo puede operar (registrar empleados, reportar,
  ver historial) una vez que su cuenta está en estado `verified` (un admin
  lo aprueba manualmente después del alta). Mientras está `pending` puede
  loguearse pero no realizar acciones que requieren `verifyPropietario`.
- **vigilancia** — la caseta. Solo el módulo de Accesos: validar códigos,
  registrar entradas/salidas y paquetería, y la lista mínima de
  propietarios (`GET /api/usuarios/propietarios`, sin datos de contacto).
  Nace `verified` (no pasa por verificación de vecino), su login redirige
  a `/accesos` y el sidebar le muestra solo ese módulo. Middlewares:
  `verifyCaseta` (admin|vigilancia) y `verifyAcceso` (caseta o
  propietario verificado) en `src/middlewares/auth.js`.

No existe registro público: los crea un admin vía
`POST /api/auth/create-propietario` (protegido, requiere ser admin;
acepta `rol: propietario|vigilancia`). Esto es intencional: solo la
administración de la comunidad da de alta cuentas.

Además, si `system_settings.maintenance_mode = 'true'`, el login devuelve
503 para todo rol excepto admin.

## Modelo de datos (PostgreSQL)

Ver el DDL completo en `backend/sql/schema.sql`. Resumen:

- **users** — cuenta de login. `rol` (admin/propietario), `estado`
  (pending/verified/suspended/rejected). El campo `direccion` (llamado
  `direccion_nordelta` en el original) guarda el domicilio del propietario
  dentro de la comunidad.
- **empleados** — la persona que presta el servicio. Identificada por
  `dni` (único; el nombre de columna quedó así entre clientes, aunque en
  clientes de México el frontend lo muestra como "CURP"). `estado_actual`
  (disponible/trabajando/inactiva), `servicio` (texto libre, alineado al
  catálogo de `backend/config/servicesMap.js`). También tiene `email` y
  `zona` (opcionales, capturados en el alta desde Inicio).
- **ratings** — una fila por cada calificación que un propietario deja a
  un empleado (puntualidad, limpieza, personalidad, calidad_servicio, cada
  una 1-5). El promedio se calcula en las queries de listado, no se
  guarda un agregado.
- **reportes** — incidentes reportados por un propietario sobre un
  empleado. `tipo_reporte` (advertencia_leve/moderada/grave),
  `estado_moderacion` (pendiente/aprobado/rechazado) — un admin decide si
  el reporte se publica.
- **historial_laboral** — registro de cuándo un propietario empleó a un
  empleado y cuándo/por qué terminó esa relación laboral.
- **solicitudes_servicio** — un propietario pide que le consigan un
  servicio (sin encontrar aún un empleado específico); queda pendiente/en
  proceso/completado.
- **system_settings** — key/value para el panel "Configuración del
  Sistema" del Admin (claves permitidas fijas en
  `backend/src/routes/settings.js`).

## Endpoints (backend)

Auth = `verifyAdmin` o `verifyPropietario` (definidos en
`src/middlewares/auth.js`, leen el JWT y consultan `users` en cada
request — no hay sesión ni cache de permisos).

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| POST | `/api/auth/login` | — | Login, devuelve JWT (7 días) |
| GET | `/api/auth/verify` | token | Valida el token actual |
| POST | `/api/auth/create-propietario` | admin | Alta de un nuevo propietario (`estado: pending`) |
| GET | `/api/empleados` | — | Lista empleados con promedio de ratings |
| POST | `/api/empleados` | propietario | Registra un empleado (+ rating inicial opcional) |
| GET | `/api/empleados/buscar?q=` | propietario | Autocompletado por DNI/nombre |
| GET | `/api/empleados/:dni` | propietario | Detalle + promedio de ratings |
| GET | `/api/admin/empleados` | admin | Lista completa (sin promedios) |
| PUT | `/api/admin/empleados/:id` | admin | Edita un empleado |
| GET | `/api/usuarios` | admin | Lista propietarios/admins |
| PATCH | `/api/usuarios/:id/verificar` | admin | Aprueba/rechaza un propietario |
| PUT | `/api/usuarios/:id` | admin | Edita datos de un usuario |
| PATCH | `/api/usuarios/:id/suspender` | admin | Suspende/reactiva |
| POST | `/api/reportes` | propietario | Crea un reporte de incidente |
| GET | `/api/reportes` | admin | Lista reportes (filtro opcional `?empleada_id=`) |
| PATCH | `/api/reportes/:id/moderar` | admin | Aprueba/rechaza un reporte |
| POST | `/api/historial` | propietario | Registra inicio de relación laboral |
| PUT | `/api/historial/:id/finalizar` | propietario | Cierra la relación laboral |
| GET | `/api/historial/empleada/:empleada_id` | — | Historial de un empleado |
| GET | `/api/historial/propietario/:propietario_id` | propietario | Historial de un propietario |
| POST | `/api/solicitudes-servicio` | propietario | Pide un servicio sin empleado asignado |
| GET | `/api/services` | — | Catálogo de 12 categorías de servicio (deduplicado) |
| GET | `/api/stats` | propietario | Agregados para la página de Estadísticas (solo números) |
| GET | `/api/notificaciones` | propietario | Notificaciones derivadas de actividad real (altas recientes, reportes; el admin ve pendientes de moderación, el propietario el resultado de sus reportes). Leída/no-leída vive en localStorage del cliente |
| GET | `/api/settings` | admin | Configuración del sistema (tabla `system_settings`) |
| PUT | `/api/settings` | admin | Actualiza configuración (objeto parcial, claves permitidas fijas) |

### Módulos de comunidad (fase 3 — ver PLAN.md)

Prefijos montados en `app.js`; convención: GET de lectura con
`verifyPropietario` (el propietario ve lo suyo, el admin todo), gestión
con `verifyAdmin`:

| Prefijo | Recurso | Rutas principales |
|---|---|---|
| `/api/avisos` | Comunicados | GET · POST (admin) · DELETE /:id (admin) |
| `/api/eventos` | Calendario | GET (próximos) · POST (admin) · DELETE /:id (admin) |
| `/api/encuestas` | Votaciones | GET (con opciones/conteos/mi_voto) · POST (admin) · POST /:id/votar (1 por usuario) · PATCH /:id/cerrar (admin) |
| `/api/solicitudes-admin` | Tickets a administración | GET · POST (propietario) · PATCH /:id (admin: estado+respuesta) |
| `/api/finanzas` | Cuotas/egresos | GET/POST /cuotas (POST admin; sin `propietario_id` = cargo masivo) · PATCH /cuotas/:id/pagar (admin) · GET/POST /egresos (admin) · GET /resumen (admin) |
| `/api/visitas` | Control de acceso | GET (`?hoy=1`) · POST (propietario, genera código `V-XXXXXX`) · GET /validar/:codigo (admin) · PATCH /:id/entrada·salida (admin) · PATCH /:id/cancelar |
| `/api/paquetes` | Paquetería | GET (caseta ve todos) · POST (caseta) · PATCH /:id/entregar (caseta) |
| `/api/reservas` | Amenidades | GET /amenidades · GET (confirmadas próximas) · POST (con chequeo de traslape, 409 si choca) · PATCH /:id/cancelar (dueño o admin) |

Los avisos aceptan un adjunto multipart opcional (campo `adjunto`, PDF o
imagen máx 5MB) que se guarda en `backend/uploads/` y se sirve en
`/uploads` (proxy de Vite configurado en dev).

Tablas correspondientes en `schema.sql`: `avisos`, `eventos`, `encuestas`,
`encuesta_opciones`, `encuesta_votos`, `solicitudes_admin`, `cuotas`,
`egresos`, `visitas`, `paquetes`, `amenidades` (con seed de 3), `reservas`.

Páginas frontend: **Comunidad** (`/comunidad`), **Accesos** (`/accesos`,
con QR vía lib `qrcode` y validador de caseta para admin) y **Finanzas**
(`/finanzas`, resumen con gráficas solo admin). Sidebar en secciones;
Admin oculto para propietarios (la autorización real es del backend).

## Frontend (React + Vite)

Rutas: `/login` y `/` → Landing (login). Todo lo demás va detrás de
`ProtectedRoute` (valida el token contra `/api/auth/verify` en cada carga,
si falla redirige a `/`):

- **Inicio** (`/inicio`) — strip de stats (datos de `/api/empleados`) y 4
  acciones en tarjetas: Registrar Empleado (formulario con CURP, datos,
  servicio, zona y ratings por estrellas), Buscar Empleado (por CURP),
  Buscar Servicio (catálogo filtrable), Reportar Problema (busca empleado
  por CURP, tipifica el incidente, texto libre).
- **Empleados** (`/empleados`) — tabla con todos los empleados (avatar,
  zona, rating promedio), filtro por servicio, pestaña Buscar conectada a
  `/api/empleados/buscar`, modal "Ver" con el detalle, y modal "Editar"
  (solo admin, `PUT /api/admin/empleados/:id`).
- **Estadísticas** (`/system-stats`) — KPIs y gráficas (empleados por
  servicio, estados, registros por mes, rating por criterio, reportes por
  severidad) desde `GET /api/stats`. Los colores de las gráficas están
  validados para daltonismo/contraste — ver comentario en
  `SystemStats.tsx` antes de cambiarlos por cliente.
- **Admin** (`/admin`) — gestión de usuarios (crear/editar/verificar/
  suspender), panel de Moderación de Reportes (aprobar/rechazar,
  filtro pendientes/todos) y Configuración del Sistema persistida en
  `system_settings`.
- **Notificaciones** (`/notificaciones`) — actividad real desde
  `GET /api/notificaciones`; leída/no-leída se guarda en localStorage.

El login guarda `token` y `user` en `localStorage`; no hay refresh token,
a los 7 días el usuario tiene que volver a loguearse.

## Theming

Los colores viven como variables CSS en `frontend/src/index.css`
(`--color-primary`, `--color-accent`, `--color-bg`, etc.) — es el único
lugar que hay que tocar para cambiar la paleta de un cliente. El nombre de
marca y las zonas del fraccionamiento están en
`frontend/src/config/branding.ts` (frontend) y
`backend/src/config/branding.js` (backend). Ver **CONFIGURACION.md**.

## Bugs / inconsistencias heredadas

Se documentaban tal cual existían en el sistema original porque
corregirlas era una decisión de producto, no de rebranding. La mayoría ya
se corrigió en este clon (2026-08) porque bloqueaban funcionalidad core;
quedan anotadas igual para que se sepa qué cambió y por qué.

1. ~~**Registro de empleado desde `Inicio.tsx` no coincidía con el
   backend.**~~ **Corregido.** El formulario mandaba `nombre`, `apellido`,
   `email` sueltos y ratings como campos top-level (remanente de cuando el
   modelo era Mongo); ahora manda `nombre_completo`, `estado_actual`,
   `motivo` y `ratings` anidado, alineado con lo que espera
   `POST /api/empleados`. De paso se agregaron columnas `email` y `zona`
   a `empleados` para no perder esos datos del form, y se corrigió
   `empleado._id` (Mongo) → `empleado.id` (Postgres) en el flujo de
   "Reportar Problema", y el cálculo de rating promedio en "Buscar
   Empleado" (leía un campo `.ratings` que no existe; el backend devuelve
   `avg_puntualidad`/`avg_limpieza`/etc. sueltos).
2. ~~**Botón "Nuevo Usuario" en Admin no hace nada**~~ **Corregido** — abre
   un modal y crea el propietario vía `POST /api/auth/create-propietario`.
   De paso se agregaron acciones Verificar/Rechazar para propietarios en
   estado `pending` (el endpoint `PATCH /:id/verificar` ya existía pero
   ningún botón lo llamaba — sin esto un propietario nuevo se quedaba
   pending para siempre).
3. ~~**Editar/Eliminar en Admin no están conectados**~~ **Corregido** —
   Editar abre modal → `PUT /api/usuarios/:id`. Eliminar se mapeó a
   **Suspender** (`PATCH /:id/suspender`) en vez de un borrado duro: no
   existe endpoint de DELETE y agregar uno es riesgoso porque
   empleados/ratings/reportes/historial_laboral tienen FK a `users(id)`
   sin `ON DELETE CASCADE`.
4. ~~**Sección "Configuración del Sistema" en Admin es decorativa**~~
   **Corregido** — los checkboxes persisten en la tabla `system_settings`
   vía `GET/PUT /api/settings` (solo admin). Ojo: los valores se guardan
   pero nada los consume aún (p.ej. `maintenance_mode` no bloquea el
   acceso); conectar efectos reales sigue siendo decisión de producto.
5. ~~**Notificaciones es 100% mock**~~ **Corregido** — `GET
   /api/notificaciones` deriva notificaciones de la actividad real
   (altas de empleados de los últimos 30 días, reportes pendientes para
   admin / resultado de moderación para propietario, empleados sin
   calificar). No hay tabla propia: se construyen al vuelo, y el estado
   leída/no-leída es por-dispositivo en localStorage.
6. ~~Las pestañas "Buscar/Registrar/Servicios" dentro de `/empleados`
   eran placeholders~~ **Corregido** — Buscar pega contra
   `/api/empleados/buscar`, Registrar linkea al form de Inicio (no se
   duplicó), Servicios lista las categorías con conteo de empleados.

Si en algún momento se decide vender esto en serio a varios clientes, los
puntos 4 y 5 son el backlog obvio antes de un lanzamiento real.
