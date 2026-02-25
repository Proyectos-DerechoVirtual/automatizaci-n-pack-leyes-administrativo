# Automatizacion Pack Leyes Administrativo

Automatizacion que gestiona el ciclo de vida de los alumnos del **Pack Leyes Administrativo** (bundle 746945 de Teachable): enrolamiento automatico tras el pago en Stripe y desenrolamiento al cumplirse 1 ano de suscripcion.

## Flujo

1. Un alumno paga a traves del [payment link de Stripe](https://buy.stripe.com/9B64gy1I62DFgHj9YB3Nn0r) (35EUR - "Extension Pack Andrea")
2. El cron `check-payments` (cada 15 min) detecta el pago completado
3. Busca o crea al usuario en Teachable por email
4. Lo enrolla en los **11 cursos** del bundle
5. Guarda el registro en Supabase con fecha de expiracion (enrolled_at + 1 ano)
6. El cron `check-expirations` (diario a las 3:00) revisa enrollments vencidos
7. Desenrola al alumno de los 11 cursos y marca el registro como `expired`

## Cursos del bundle

| ID | Curso |
|---|---|
| 2665379 | Ley de Jurisdiccion Contencioso Administrativa |
| 2550305 | La Ley Organica del Tribunal Constitucional |
| 2556827 | Ley de Contratos del Sector Publico |
| 2550289 | Las Leyes de Igualdad |
| 2559560 | Ley 39/2015 + Ley 40/2015 |
| 2945063 | Ley de Prevencion de Riesgos Laborales |
| 2550250 | La Constitucion Espanola |
| 2665372 | Ley Reguladora de las Bases del Regimen Local |
| 2665376 | Ley de Enjuiciamiento Civil |
| 2945064 | Ley General Presupuestaria |
| 2550313 | Estatuto Basico del Empleado Publico |

## Estructura

```
api/
  health.js                     # Health check
  cron/
    check-payments.js           # Detecta pagos nuevos y enrolla
    check-expirations.js        # Detecta expirados y desenrola
lib/
  stripe.js                     # Cliente Stripe + filtro por payment link
  teachable.js                  # Enroll/unenroll en los 11 cursos
  supabase.js                   # Cliente Supabase
setup/
  migration.sql                 # Schema de la tabla
  run-migration.js              # Ejecutor de migracion
  test-connections.js           # Test de conexiones (Supabase, Stripe, Teachable)
```

## Endpoints

| Endpoint | Descripcion |
|---|---|
| `GET /api/health` | Health check |
| `GET /api/cron/check-payments?key=CRON_SECRET` | Procesa pagos nuevos |
| `GET /api/cron/check-expirations?key=CRON_SECRET` | Procesa expirados |

## Variables de entorno

| Variable | Descripcion |
|---|---|
| `SUPABASE_URL` | URL de la instancia Supabase |
| `SUPABASE_SERVICE_KEY` | Service key de Supabase |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe |
| `TEACHABLE_API_KEY` | API key de Teachable |
| `CRON_SECRET` | Clave de autenticacion para los cron jobs |
| `DRY_RUN` | `true` para simular sin ejecutar acciones reales |

## Despliegue

- **Hosting:** Vercel
- **Base de datos:** Supabase (self-hosted)
- **Cron jobs:** cron-job.org (check-payments cada 15 min, check-expirations diario a las 3:00)

## Setup

1. Clonar el repositorio
2. `npm install`
3. Copiar `.env.example` a `.env` y rellenar las variables
4. Ejecutar `setup/migration.sql` en el SQL Editor de Supabase
5. `npm run test:connections` para verificar conectividad
6. Desplegar en Vercel: `vercel --prod`
7. Configurar variables de entorno en Vercel
8. Crear los 2 cron jobs en cron-job.org
