# SeguridadFrac

Clon de marca blanca de **SistemaGuardian** (sistema de gestión de
referencias laborales de personal doméstico/servicios para comunidades
residenciales), pensado para revenderse a distintos fraccionamientos con
branding propio por cliente.

Antes de trabajar en este proyecto, leer:

- **PLAN.md** — plan maestro: registro de fases, workflow a seguir para
  módulos nuevos, backlog en orden y reglas del proyecto. Empezar aquí.
- **CONTEXTO-SISTEMA.md** — qué hace el sistema, modelo de datos,
  endpoints, flujos de frontend.
- **CONFIGURACION.md** — qué archivos tocar para personalizar
  branding/colores/zonas por cliente.
- **REDISENO.md** — bitácora del sistema visual (tokens, paleta de
  gráficas validada, decisiones de diseño).

El sistema ya no es solo referencias laborales: integra módulos de
administración de fraccionamiento estilo Vivook (avisos, eventos,
encuestas, solicitudes, cuotas/egresos, visitas con QR, paquetería).

Stack: Node.js/Express + PostgreSQL (backend), React + TypeScript + Vite
(frontend). No hay VPS ni dominio configurado todavía — cada cliente se
despliega por separado.
