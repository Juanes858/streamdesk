import type { PrismaClient, Cuenta as FilaCuenta, Prisma, $Enums } from './generado/index'
import type { Cuenta, CuentaNueva, EstadoCuenta } from '../../dominio/modelo/Cuenta'
import type { CambiosCuenta, CuentaDAO } from '../../dominio/puertos'

// Traduce la fila cruda de la base de datos al tipo del dominio.
const aDominio = (fila: FilaCuenta): Cuenta => ({
  id: fila.id,
  usuarioId: fila.usuarioId,
  plataformaId: fila.plataformaId,
  correo: fila.correo,
  claveHash: fila.claveHash,
  fechaInicio: fila.fechaInicio,
  fechaFin: fila.fechaFin,
  estado: fila.estado as EstadoCuenta,
})

export class CuentaDAOPrisma implements CuentaDAO {
  constructor(private readonly prisma: PrismaClient) {}

  async guardar(cuenta: CuentaNueva): Promise<Cuenta> {
    return aDominio(await this.prisma.cuenta.create({
      data: { ...cuenta, estado: cuenta.estado as $Enums.EstadoCuenta },
    }))
  }

  async porId(id: string): Promise<Cuenta | null> {
    const fila = await this.prisma.cuenta.findUnique({ where: { id } })
    return fila && aDominio(fila)
  }

  async porUsuario(usuarioId: string): Promise<Cuenta[]> {
    const filas = await this.prisma.cuenta.findMany({ where: { usuarioId } })
    return filas.map(aDominio)
  }

  async actualizar(id: string, cambios: CambiosCuenta): Promise<Cuenta> {
    // El hash puede cambiar, pero el DTO público siempre lo elimina mediante
    // aCuentaDTO antes de entregar la respuesta HTTP.
    return aDominio(await this.prisma.cuenta.update({
      where: { id },
      data: {
        ...cambios,
        ...(cambios.estado !== undefined && { estado: cambios.estado as $Enums.EstadoCuenta }),
      } as Prisma.CuentaUpdateInput,
    }))
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.cuenta.delete({ where: { id } })
  }
}