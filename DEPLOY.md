# Deploy en Vercel

El repo ya trae `vercel.json` en formato **multi-servicio**: el servicio
`frontend` (root `frontend/`, framework Vite — usa el script
`vercel-build`, que saca el build a `frontend/dist`) y el servicio
`backend` (root `backend/`, con las funciones en `backend/api/` que
exportan la app de Express). Los rewrites mandan `/api/*` al backend y
todo lo demás al frontend; los adjuntos se sirven por `/api/uploads/*`
para pasar por el mismo servicio. Solo falta la base de datos y las
variables de entorno.

## 1. Base de datos (Postgres hosteado)

Vercel no incluye Postgres propio: crea una base en
[Neon](https://neon.tech) (gratis, es lo que ofrece el marketplace de
Vercel) o Supabase. Copia el connection string — debe incluir
`?sslmode=require` (el pool ya activa TLS cuando lo ve).

Con la base creada, desde tu máquina corre el schema y crea el admin:

```bash
psql "postgres://...tu-connection-string...?sslmode=require" -f backend/sql/schema.sql

cd backend
DATABASE_URL="postgres://...?sslmode=require" npm run create-admin -- admin@tucliente.com tu-password "Nombre Admin"
```

## 2. Importar el proyecto en Vercel

1. **Add New → Project** → importa `ElBeDev/seguridadfrac`. El
   `vercel.json` define los dos servicios — no configures Root Directory.
2. En **Environment Variables** agrega (si el dashboard pide asignarlas
   por servicio, van al servicio **backend**):

| Variable | Valor |
|---|---|
| `DATABASE_URL` | el connection string de Neon (con `sslmode=require`) |
| `JWT_SECRET` | una cadena aleatoria larga (`openssl rand -hex 32`) — **ya configurada por CLI en este proyecto** |

(`UPLOADS_DIR` es opcional: en Vercel el default ya es `/tmp/uploads`.)

4. Deploy.

## 3. Verificar

- `https://tu-app.vercel.app/` → landing con login.
- Entra con el admin que creaste en el paso 1; crea un propietario de
  prueba desde Admin y verifícalo.

## Adjuntos: Vercel Blob

Los adjuntos de avisos viven en un **Blob store privado** (creado desde
Storage → Blob y conectado al proyecto — eso inyecta `BLOB_STORE_ID` y
el SDK autentica por OIDC; la integración nueva ya no da
`BLOB_READ_WRITE_TOKEN`). El backend hace `put(access: 'private')` al
publicar, los sirve por streaming en `GET /api/uploads/<nombre>` y hace
`del()` al eliminar el aviso. Sin store (dev local) todo cae a disco en
`backend/uploads/` con la misma forma de URL. Límite: 4MB por archivo
(las funciones de Vercel capan el body a ~4.5MB).

## Limitaciones conocidas en serverless
- **Rate limiting**: `express-rate-limit` en memoria es por instancia;
  con varias instancias el límite efectivo es más laxo. Para endurecerlo:
  store en Redis/Upstash.
- **Cold starts**: la primera petición tras inactividad tarda ~1-2s.

Nota: los passwords usan `bcryptjs` (JS puro) en vez de `bcrypt` nativo —
npm bloquea los install scripts no aprobados en el build de Vercel y el
binario nativo nunca se descargaba. Los hashes son compatibles entre ambos.

## Desarrollo local

Nada cambió: `npm run dev` en backend (:4000) y frontend (:5173), con la
DB local. El build local (`npm run build`) sigue generando
`backend/public/` para servirlo con Express en un VPS clásico — ese
camino sigue disponible si un cliente prefiere no usar Vercel.
