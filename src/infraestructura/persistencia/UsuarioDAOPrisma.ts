import type { PrismaClient } from './generado/client'
import type { UsuarioModel as FilaUsuario } from './generado/models'
import type { Rol, Usuario, UsuarioNuevo } from '../../dominio/modelo/Usuario'
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
    return aDominio(await this.prisma.usuario.create({ data: usuario }))
  }

  async porCorreo(correo: string): Promise<Usuario | null> {
    const fila = await this.prisma.usuario.findUnique({ where: { correo } })
    return fila && aDominio(fila)
  }

  async porId(id: string): Promise<Usuario | null> {
    const fila = await this.prisma.usuario.findUnique({ where: { id } })
    return fila && aDominio(fila)
  }
}
