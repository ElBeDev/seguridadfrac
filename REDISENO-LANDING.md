# Rediseño de Landing — workflow tasteskill (2026-09-02)

Registro del ejercicio con el skill `design-taste-frontend` (tasteskill v2,
instalado en `.agents/skills/`). Alcance: **solo la Landing pública**
(`/` y `/login`). Las pantallas internas son product UI y el propio skill
las declara fuera de su dominio (Sección 13).

## Brief

- **Site:** SeguridadFrac — repo local + https://seguridadfrac-hazel.vercel.app
- **Mode:** Redesign — **Preserve** (la identidad "Aurora residencial" es
  deliberada y reciente)
- **Audience:** residentes/admins que vienen a loguearse + administraciones
  de fraccionamientos evaluando el producto
- **Design Read:** landing/login B2B2C de seguridad residencial, audiencia
  trust-first mexicana, lenguaje dark-tech cálido (aurora + esmeralda),
  CSS nativo con tokens propios
- **Dials:** actual 6/5/4 → target preserve 6/**6**/4 (motion +1 por tabla 1.A)
- **SEO constraint:** rutas `/` y `/login` intactas; `<h1>` y `<title>`
  sin cambios; el form de login no pierde ni renombra campos existentes

## Paso 1 — Auditoría (resumen; completa en el hilo de trabajo)

**Preservar:** aurora + blobs + skyline SVG (firma), login card glass,
stat con dato vivo del API, logo escudo+casa, gradiente esmeralda→cian
(override del LILA RULE: la marca ya es esta), voz es-MX.

**Retirar (tells detectados):**
1. Em-dash en el subtexto del hero (viola 9.G, ban total)
2. Hero sobrecargado: eyebrow + headline + subtexto + lista de 5 features
   + strip de 4 stats (viola máx 4 elementos del hero)
3. Subtexto de ~30 palabras (cap: 20)
4. `prefers-reduced-motion` ignorado (viola 6.B, mandatorio)
5. Placeholder-as-label en el login, sin `name`/`autocomplete` (viola 4.6)
6. "Datos 100% seguros" (claim fake-precise, 9.D)
7. Google Fonts vía `<link>` (el skill exige self-host + `font-display: swap`)
8. Falta meta description / OG tags (SEO baseline pobre; sitio recién
   deployado, riesgo de migración ≈ 0)

## Paso 2 — Modo y palancas (Sección 11.D, en orden)

**Modo declarado: Redesign — Preserve.**

| # | Palanca | Qué se hace aquí |
|---|---|---|
| 1 | Typography refresh | Self-host de Plus Jakarta Sans + Inter (@fontsource, `font-display: swap`); sin cambiar el stack — la marca se queda |
| 2 | Spacing & rhythm | Hero baja a ≤ `6rem` de padding superior (cap del skill); la página pasa de "todo embutido en un viewport" a hero limpio + secciones con ritmo propio |
| 3 | Color recalibration | Ninguna: paleta ya validada y bloqueada (Color Consistency Lock ya se cumple) |
| 4 | Motion layer | `prefers-reduced-motion` global; reveal-on-scroll (IntersectionObserver, jamás `scroll` listener) para las secciones que salen del hero — esto es el +1 de motion |
| 5 | Hero recomposition | Hero queda con exactamente: eyebrow + headline + subtexto (≤20 palabras, sin em-dash) + login card (el CTA). Features (5) y stats (4) se mueven a secciones propias debajo, mismo tema oscuro (Page Theme Lock) |
| 6 | Full block replacement | No aplica — nada está insalvable |

**Decisiones registradas:**
- Iconos siguen en `react-icons/fa`: cambiar la familia solo en la landing
  rompería "one family per project" contra el resto de la app (fuera de
  alcance). Desviación aceptada y documentada.
- Skyline SVG hand-rolled se conserva: es asset de marca existente
  (regla de preservación > preferencia del skill).
- Login form: se AGREGAN `<label>`, `name` y `autocomplete` (hoy no
  existen, así que no se renombra nada existente; es la corrección del
  tell #5). Los dos campos siguen siendo email + password.
- Al final de las features se agrega un CTA de contacto para el prospecto
  comprador (mailto al SUPPORT_EMAIL de branding) — cierra el gap de
  conversión detectado en la auditoría sin crear páginas nuevas.

## Paso 3 — Implementación (checklist)

- [x] Fonts self-host (`@fontsource/*`), quitar `<link>` de Google Fonts
- [x] Meta description + OG tags en `index.html` (title intacto)
- [x] Hero: subtexto de 17 palabras sin em-dash; padding-top 6rem; `100dvh`
- [x] Features (grid asimetrico 3+2) y stats fuera del hero, secciones
      oscuras propias (Page Theme Lock respetado, sin flip de tema)
- [x] Login: labels arriba del input, `name` + `autocomplete` correctos
- [x] "Datos 100% seguros" → "Conexión cifrada (HTTPS)"
- [x] `prefers-reduced-motion`: aurora, blobs, reveals y transiciones a estatico
- [x] Reveal-on-scroll con IntersectionObserver; sin JS todo queda visible
- [x] CTA de prospecto (mailto a SUPPORT_EMAIL) — intent "contacto", unico
- [x] `tsc` limpio + build OK + verificacion Playwright (CTA visible sin
      scroll a 1400x900, labels presentes, login funcional, 0 errores)

## Paso 4 — Auditorías de cierre

### Em-dash audit — PASS
Grep de `—`/`–` sobre Landing.tsx, Landing.css, index.html y branding.ts:
- 1 hit en comentario de codigo de branding.ts (no visible al usuario)
- 1 hit en el fallback de carga del stat (`'—'`) → **corregido a `'…'`**
- Resultado final: cero em/en-dashes visibles en la pagina.

### Pre-Flight Check (Sección 14, casillas aplicables) — PASS
- Brief inference declarado ✓ · Dials razonados (6/6/4 preserve) ✓
- Aesthetic honesto (CSS nativo, sin sistema oficial; glass etiquetado) ✓
- Redesign mode detectado + auditoria previa ✓
- Zero em-dashes visibles ✓ · Page Theme Lock (todo oscuro) ✓
- Color Consistency Lock (esmeralda→cian unico acento, tambien en CTA
  nuevo) ✓ · Shape Lock (radios soft consistentes) ✓
- Button contrast: texto blanco sobre gradiente esmeralda ≥ AA large ✓
- CTA sin wrap a desktop ✓ · Sin CTAs de intent duplicado (login ≠
  contacto) ✓ · Form contrast (labels #94A3B8 sobre #0F172A ≈ 5.9:1) ✓
- Hero: headline 2 lineas, subtexto 17 palabras, CTA visible sin scroll,
  padding-top 6rem, ≤ 4 elementos ✓
- Eyebrow count: 1 eyebrow / 4 secciones (cap: 2) ✓
- Sin split-header, sin zigzag, 4 familias de layout distintas (split
  hero / grid asimetrico / tiles / CTA centrado) ✓
- Motion motivado (reveals = jerarquia de entrada; aurora = firma de
  marca) ✓ · Sin marquees ✓ · Nav 1 linea ≤ 80px ✓
- Sin scroll listeners (IntersectionObserver) ✓ · Reduced motion ✓
- Mobile collapse explicito (features → 1 col) ✓ · `100dvh` ✓
- Estados: login con error/loading/disabled ✓
- Sin tells de Seccion 9 (sin dots decorativos, sin scroll cues, sin
  version labels, sin locale strips, sin fake numbers) ✓

**Desviaciones aceptadas y documentadas** (no son Fail: preservacion de
marca > preferencia del skill, y ambas registradas en Paso 2):
- Iconos `react-icons/fa` (consistencia con la app completa)
- Skyline SVG hand-rolled (asset de firma existente)
- Sin fotografia real: el "asset" del hero es la login card funcional;
  agregar fotografia queda propuesto como iteracion futura si se quiere

### Preservation audit — VACIO salvo lo aprobado
- URLs cambiadas: **ninguna** (`/` y `/login` intactas)
- Nav labels cambiados: **ninguno**
- `<h1>` y `<title>`: **intactos**
- Anchors: no existian, no se crearon con ID
- Form fields: **cero renombrados**; se AGREGARON `name="email"`,
  `name="password"`, `autoComplete` y `<label>` (aprobado en el plan;
  antes los campos no tenian name)
- Logo y legal copy: **intactos**

### Brand fidelity audit — PASS
- Acento: gradiente esmeralda `#10B981` → cian `#0EA5E9` presente en
  eyebrow, headline-grad, boton de login, feature chips y CTA nuevo ✓
- Type stack: Plus Jakarta Sans + Inter (mismas familias, ahora
  self-hosted con `font-display: swap`) ✓
- Logo: escudo+casa sin tocar, mismo tratamiento en navbar ✓
- Skyline y aurora: sobreviven como firma ✓

**Resultado: ningún Fail. Workflow completado.**
