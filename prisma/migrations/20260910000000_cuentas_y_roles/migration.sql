-- Alinea los roles del dominio con el modelo actual y agrega las cuentas de plataforma.
BEGIN;

CREATE TYPE "Rol_nuevo" AS ENUM ('ADMINISTRADOR', 'ASESOR', 'CLIENTE');

ALTER TABLE "Usuario" ALTER COLUMN "rol" DROP DEFAULT;
ALTER TABLE "Usuario"
  ALTER COLUMN "rol" TYPE "Rol_nuevo"
  USING (
    CASE "rol"::text
      WHEN 'ADMINISTRADOR' THEN 'ADMINISTRADOR'
      WHEN 'AGENTE' THEN 'ASESOR'
      WHEN 'COORDINADOR' THEN 'ASESOR'
      WHEN 'SOLICITANTE' THEN 'CLIENTE'
    END
  )::"Rol_nuevo";

DROP TYPE "Rol";
ALTER TYPE "Rol_nuevo" RENAME TO "Rol";
ALTER TABLE "Usuario" ALTER COLUMN "rol" SET DEFAULT 'CLIENTE';

CREATE TYPE "EstadoCuenta" AS ENUM ('ACTIVA', 'SUSPENDIDA', 'CANCELADA');

CREATE TABLE "Cuenta" (
  "id" TEXT NOT NULL,
  "clienteId" TEXT NOT NULL,
  "plataforma" TEXT NOT NULL,
  "correoAcceso" TEXT NOT NULL,
  "estado" "EstadoCuenta" NOT NULL DEFAULT 'ACTIVA',
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Cuenta_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Cuenta"
  ADD CONSTRAINT "Cuenta_clienteId_fkey"
  FOREIGN KEY ("clienteId") REFERENCES "Usuario"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;