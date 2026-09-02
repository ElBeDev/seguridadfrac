# Personalizar para un nuevo cliente/fraccionamiento

Checklist de lo que hay que tocar cada vez que se instala este sistema
para un cliente nuevo. Nada de esto requiere tocar la lógica de negocio.

## 1. Nombre de marca

- `backend/src/config/branding.js` → `APP_NAME`, `SUPPORT_EMAIL`.
- `frontend/src/config/branding.ts` → `APP_NAME`.
- `frontend/index.html` → `<title>`.

## 2. Colores

Todo el theming vive en variables CSS en `frontend/src/index.css`
(bloque `:root`). Los más importantes:

- `--color-primary` — color principal (sidebar activo, botones, acentos).
- `--color-accent` — color secundario/dorado del diseño original.
- `--color-bg`, `--color-bg-dark` — fondos.

No hace falta tocar ningún componente para cambiar la paleta.

## 3. Logo

- Reemplazar `frontend/public/logo.svg` por el logo real del cliente
  (puede ser `.svg` o `.png` — si es `.png`, actualizar las referencias en
  `Sidebar.tsx`, `Landing.tsx` e `index.html`).
- El fondo del login (`Landing.css`, clase `.hero-section`) hoy es un
  degradé CSS. Si el cliente quiere una foto real de su fraccionamiento,
  agregarla a `frontend/public/` y volver a poner
  `background-image: url(/tu-foto.jpg)` ahí.

## 4. Zonas / sectores

`frontend/src/config/branding.ts` → array `ZONAS`. Se usa tanto en el
formulario de registro de empleado como en el de reporte de incidentes
(en el original estas dos listas estaban duplicadas y desincronizadas —
acá ya quedan unificadas en una sola fuente).

## 5. Catálogo de servicios

`backend/config/servicesMap.js` tiene las 12 categorías (plomero,
electricista, niñera, etc.). Es genérico y normalmente no hace falta
tocarlo por cliente, pero se puede editar/ampliar ahí.

## 6. Base de datos

Cada cliente = su propia base Postgres. Correr
`backend/sql/schema.sql` contra la base nueva y configurar
`DATABASE_URL` en `backend/.env`.

## 7. Primer usuario admin

No hay forma de crear el primer admin desde la UI (a propósito: solo un
admin puede crear usuarios). Correr:

```bash
cd backend
npm run create-admin -- admin@cliente.com password123 "Nombre del Admin"
```

## 8. Antes de vender esto en serio

Ver la sección "Bugs / inconsistencias heredadas" en
[CONTEXTO-SISTEMA.md](CONTEXTO-SISTEMA.md) — la mayoría de la
funcionalidad de UI sin conectar ya se resolvió (alta/edición/verificación
de usuarios desde Admin, el desajuste de campos en el registro de
empleados). Quedan pendientes, y son decisión de producto no de
branding: notificaciones reales y que "Configuración del Sistema" en
Admin persista algo.

## 9. Identificador de empleado (DNI / CURP / etc.)

El campo interno se llama `dni` (columna en `empleados`, prop en el
código) y se mantiene así entre clientes para no tener que tocar
backend/schema por cliente. Lo que cambia por país es solo el label que
ve el usuario: en este clon está en español de México y dice "CURP" en
los formularios y tablas de `Inicio.tsx` y `Empleados.tsx`. Para otro
país, es un buscar-y-reemplazar de esas strings de UI — no requiere
tocar la base de datos ni las rutas.
