import type { Rol } from '../../dominio/modelo/Usuario'
import type { UsuarioDAO } from '../../dominio/puertos'

export class ResumenUsuariosPorRol {
  constructor(private readonly usuarios: UsuarioDAO) {}

  async ejecutar(): Promise<Record<Rol, number>> {
    return await this.usuarios.obtenerResumenPorRol()
  }
}