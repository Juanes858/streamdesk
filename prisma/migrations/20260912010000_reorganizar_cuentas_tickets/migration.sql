-- Alinea cuentas y tickets con el modelo funcional solicitado.
BEGIN;

ALTER TYPE "EstadoCuenta" RENAME VALUE 'SUSPENDIDA' TO 'REPORTADA';
ALTER TYPE "EstadoCuenta" RENAME VALUE 'CANCELADA' TO 'VENCIDA';

ALTER TABLE "Cuenta" RENAME COLUMN "clienteId" TO "usuarioId";
ALTER TABLE "Cuenta" RENAME COLUMN "plataforma" TO "plataformaId";
ALTER TABLE "Cuenta" RENAME COLUMN "correoAcceso" TO "correo";
ALTER TABLE "Cuenta" ADD COLUMN "claveHash" TEXT NOT NULL DEFAULT 'MIGRACION_PENDIENTE';
ALTER TABLE "Cuenta" ADD COLUMN "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Cuenta" ADD COLUMN "fechaFin" TIMESTAMP(3) NOT NULL DEFAULT '2099-12-31 00:00:00';
ALTER TABLE "Cuenta" DROP COLUMN "creadoEn";

ALTER TABLE "Ticket" RENAME COLUMN "solicitanteId" TO "usuarioId";
ALTER TABLE "Ticket" RENAME COLUMN "agenteId" TO "asesorId";
ALTER TABLE "Ticket" DROP COLUMN "asunto";
ALTER TABLE "Ticket" ADD COLUMN "cuentaId" TEXT NOT NULL;

ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_solicitanteId_fkey";
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_agenteId_fkey";
ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_asesorId_fkey"
  FOREIGN KEY ("asesorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_cuentaId_fkey"
  FOREIGN KEY ("cuentaId") REFERENCES "Cuenta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;