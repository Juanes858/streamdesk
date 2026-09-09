import type { PrismaClient } from './generado/client'
import type { CuentaModel as FilaCuenta } from './generado/models'
import type { Cuenta, CuentaNueva, EstadoCuenta } from '../../dominio/modelo/Cuenta'
import type { CuentaDAO } from '../../dominio/puertos'

// Traduce la fila cruda de la base de datos al tipo del dominio.
const aDominio = (fila: FilaCuenta): Cuenta => ({
  id: fila.id,
  clienteId: fila.clienteId,
  plataforma: fila.plataforma,
  correoAcceso: fila.correoAcceso,
  estado: fila.estado as EstadoCuenta,
  creadoEn: fila.creadoEn,
})

export class CuentaDAOPrisma implements CuentaDAO {
  constructor(private readonly prisma: PrismaClient) {}

  async guardar(cuenta: CuentaNueva): Promise<Cuenta> {
    return aDominio(await this.prisma.cuenta.create({ data: cuenta }))
  }

  async porId(id: string): Promise<Cuenta | null> {
    const fila = await this.prisma.cuenta.findUnique({ where: { id } })
    return fila && aDominio(fila)
  }

  async porCliente(clienteId: string): Promise<Cuenta[]> {
    const filas = await this.prisma.cuenta.findMany({ where: { clienteId } })
    return filas.map(aDominio)
  }
}