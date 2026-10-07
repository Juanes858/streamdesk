-- CreateTable
CREATE TABLE "Plataforma" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Plataforma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plataforma_nombre_key" ON "Plataforma"("nombre");

-- AddForeignKey
ALTER TABLE "Cuenta" ADD CONSTRAINT "Cuenta_plataformaId_fkey" FOREIGN KEY ("plataformaId") REFERENCES "Plataforma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
