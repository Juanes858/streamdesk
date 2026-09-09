import { aUsuarioDTO, type UsuarioDTO } from '../../dominio/modelo/Usuario'
import type { UsuarioDAO } from '../../dominio/puertos'

export class ListarUsuarios {
  constructor(private readonly usuarios: UsuarioDAO) {}

  async ejecutar(): Promise<UsuarioDTO[]> {
    const todos = await this.usuarios.listarTodos()
    return todos.map(aUsuarioDTO)
  }
}