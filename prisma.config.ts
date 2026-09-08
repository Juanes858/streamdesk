import { defineConfig, env } from 'prisma/config'

// Node 20.12+ carga .env sin dependencias; el CLI de Prisma 7 ya no lo hace solo.
try {
  process.loadEnvFile()
} catch {
  // sin .env: se usan las variables ya presentes en el entorno
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DATABASE_URL') },
})
