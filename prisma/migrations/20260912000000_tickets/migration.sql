-- Agrega el ciclo de vida básico de los tickets de soporte.
BEGIN;

CREATE TYPE "EstadoTicket" AS ENUM ('NUEVO', 'ASIGNADO', 'EN_PROCESO', 'ESPERA_INFORMACION', 'RESUELTO', 'CERRADO');
CREATE TYPE "Prioridad" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');

CREATE TABLE "Ticket" (
  "id" TEXT NOT NULL,
  "asunto" TEXT NOT NULL,
  "descripcion" TEXT NOT NULL,
  "estado" "EstadoTicket" NOT NULL DEFAULT 'NUEVO',
  "prioridad" "Prioridad" NOT NULL DEFAULT 'MEDIA',
  "solicitanteId" TEXT NOT NULL,
  "agenteId" TEXT,
  CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_solicitanteId_fkey"
  FOREIGN KEY ("solicitanteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_agenteId_fkey"
  FOREIGN KEY ("agenteId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;