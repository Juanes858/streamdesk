import type { Rol, UsuarioDTO } from '../../dominio/modelo/Usuario'
import { aUsuarioDTO } from '../../dominio/modelo/Usuario'
import type { UsuarioDAO } from '../../dominio/puertos'

export class ListarUsuarios {
  constructor (private readonly usuarios: UsuarioDAO) {}

  async ejecutar(rol?: Rol, q?: string): Promise<UsuarioDTO[]> {
    const todos = await this.usuarios.listarTodos(rol, q)
    return todos.map(aUsuarioDTO)
  }
}