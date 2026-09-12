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

  async listarTodos(): Promise<Usuario[]> {
    const filas = await this.prisma.usuario.findMany()
    return filas.map(aDominio)
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
