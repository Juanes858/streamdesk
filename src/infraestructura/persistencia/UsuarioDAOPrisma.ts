import type { PrismaClient, Prisma, Usuario as FilaUsuario, $Enums } from './generado/index'
import type { CambiosUsuario, Rol, Usuario, UsuarioNuevo } from '../../dominio/modelo/Usuario'
import type { UsuarioDAO } from '../../dominio/puertos'

const aDominio = (fila: FilaUsuario): Usuario => ({
  id: fila.id,
  nombre: fila.nombre,
  correo: fila.correo,
  claveHash: fila.claveHash,
  rol: fila.rol as Rol,
  activo: fila.activo,
})

export class UsuarioDAOPrisma implements UsuarioDAO {
  constructor(private readonly prisma: PrismaClient) {}

  async guardar(usuario: UsuarioNuevo): Promise<Usuario> {
    // Prisma usa enums propios; el adaptador traduce entre Prisma y dominio.
    return aDominio(await this.prisma.usuario.create({
      data: { ...usuario, rol: usuario.rol as $Enums.Rol },
    }))
  }
  
  async porCorreo(correo: string): Promise<Usuario | null> {
    const fila = await this.prisma.usuario.findUnique({ where: { correo } })
    return fila && aDominio(fila)
  }

  async porId(id: string): Promise<Usuario | null> {
    const fila = await this.prisma.usuario.findUnique({ where: { id } })
    return fila && aDominio(fila)
  }

  async listarTodos(rol?: Rol, q?: string): Promise<Usuario[]> {
  const opciones: Parameters<typeof this.prisma.usuario.findMany>[0] = {}
  const where: Prisma.UsuarioWhereInput = {}

  if (rol) {
    where.rol = rol as $Enums.Rol
  }

  if (q) {
    where.OR = [
      { nombre: { contains: q, mode: 'insensitive' } },
      { correo: { contains: q, mode: 'insensitive' } },
    ]
  }

  if (Object.keys(where).length > 0) {
    opciones.where = where
  }

  const filas = await this.prisma.usuario.findMany(opciones)
  return filas.map(aDominio)
}

  async obtenerResumenPorRol(): Promise<Record<Rol, number>> {
  const conteo = await this.prisma.usuario.groupBy({
    by: ['rol'],
    _count: {
      _all: true,
    },
  })

  const resumen: Record<Rol, number> = {
    ADMINISTRADOR: 0,
    ASESOR: 0,
    CLIENTE: 0,
  }

  for (const item of conteo) {
    const rolDominio = item.rol as Rol
    resumen[rolDominio] = item._count._all
  }

  return resumen
}

  async actualizar(id: string, cambios: CambiosUsuario): Promise<Usuario> {
    return aDominio(await this.prisma.usuario.update({
      where: { id },
      data: cambios as unknown as Prisma.UsuarioUpdateInput,
    }))
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.usuario.delete({ where: { id } })
  }
}
