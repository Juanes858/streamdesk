import type { UsuarioDAO } from '../../dominio/puertos'
import { UsuarioNoEncontrado } from './ObtenerUsuario'

export class EliminarUsuario {
  constructor(private readonly usuarios: UsuarioDAO) {}

  async ejecutar(id: string): Promise<void> {
    const existente = await this.usuarios.porId(id)
    if (!existente) throw new UsuarioNoEncontrado(id)
    await this.usuarios.eliminar(id)
  }
}