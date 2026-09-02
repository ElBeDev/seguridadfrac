# SeguridadFrac

Sistema de gestión de referencias laborales para personal doméstico y de
servicios en comunidades/fraccionamientos residenciales. Es un clon de
marca blanca de **SistemaGuardian** — ver [CONTEXTO-SISTEMA.md](CONTEXTO-SISTEMA.md)
para entender qué hace el sistema, y [CONFIGURACION.md](CONFIGURACION.md)
para lo que hay que personalizar antes de entregarlo a un cliente nuevo.

## Stack

- **Backend:** Node.js + Express + PostgreSQL (`pg`), JWT para auth.
- **Frontend:** React + TypeScript + Vite.

## Desarrollo local

### 1. Base de datos

Crear una base PostgreSQL y correr el schema:

```bash
createdb seguridadfrac
psql seguridadfrac -f backend/sql/schema.sql
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Editar .env: DATABASE_URL, JWT_SECRET
npm run create-admin -- admin@tudominio.com tu-password "Nombre Admin"
npm run dev        # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev         # http://localhost:5173, con proxy a localhost:4000
```

### Build para producción

```bash
cd frontend && npm run build
# Genera backend/public/ (servido como estático por Express)
```

## Deploy

No hay infraestructura preconfigurada — cada cliente/fraccionamiento se
despliega en su propio servidor (VPS, PaaS, lo que corresponda). El
`app.js` ya soporta `trust proxy` en producción y sirve el frontend
buildeado como estático desde `backend/public`.
