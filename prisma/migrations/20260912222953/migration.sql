-- AlterTable
ALTER TABLE "Cuenta" ALTER COLUMN "claveHash" DROP DEFAULT,
ALTER COLUMN "fechaInicio" DROP DEFAULT,
ALTER COLUMN "fechaFin" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "Cuenta" RENAME CONSTRAINT "Cuenta_clienteId_fkey" TO "Cuenta_usuarioId_fkey";
