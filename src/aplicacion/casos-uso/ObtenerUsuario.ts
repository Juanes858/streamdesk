import { aUsuarioDTO, type UsuarioDTO } from '../../dominio/modelo/Usuario'
import type { UsuarioDAO } from '../../dominio/puertos'

export class UsuarioNoEncontrado extends Error {
  constructor(id: string) {
    super(`No existe un usuario con id ${id}`)
  }
}

export class ObtenerUsuario {
  constructor(private readonly usuarios: UsuarioDAO) {}

  async ejecutar(id: string): Promise<UsuarioDTO> {
    const usuario = await this.usuarios.porId(id)
    if (!usuario) throw new UsuarioNoEncontrado(id)
    return aUsuarioDTO(usuario)
  }
}