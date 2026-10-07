import type { PlataformaDAO, CambiosPlataforma } from '../../dominio/puertos'
import type { Plataforma, PlataformaNueva } from '../../dominio/modelo/Plataforma'
import type { PrismaClient, Plataforma as FilaPlataforma } from './generado/index'

// Traduce la fila cruda de la base de datos al tipo del dominio.
const aDominio = (fila: FilaPlataforma): Plataforma => ({
  id: fila.id,
  nombre: fila.nombre,
  activa: fila.activa,
})

export class PlataformaDAOPrisma implements PlataformaDAO {
  constructor(private readonly prisma: PrismaClient) {}

  async guardar(plataforma: PlataformaNueva): Promise<Plataforma> {
    return aDominio(await this.prisma.plataforma.create({ data: plataforma }))
  }

  async porId(id: string): Promise<Plataforma | null> {
    const fila = await this.prisma.plataforma.findUnique({ where: { id } })
    return fila && aDominio(fila)
  }

  async porNombre(nombre: string): Promise<Plataforma | null> {
    const fila = await this.prisma.plataforma.findUnique({ where: { nombre } })
    return fila && aDominio(fila)
  }

  async listarTodas(): Promise<Plataforma[]> {
    const filas = await this.prisma.plataforma.findMany({ orderBy: { nombre: 'asc' } })
    return filas.map(aDominio)
  }

  async actualizar(id: string, cambios: CambiosPlataforma): Promise<Plataforma> {
    return aDominio(await this.prisma.plataforma.update({ where: { id }, data: cambios }))
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.plataforma.delete({ where: { id } })
  }
}