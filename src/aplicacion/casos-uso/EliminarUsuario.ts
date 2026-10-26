import type { UsuarioDAO } from '../../dominio/puertos'
import { UsuarioNoEncontrado } from './ObtenerUsuario'

export class AutoEliminacionNoPermitida extends Error {
  constructor() {
    super('Un administrador no puede eliminarse a sí mismo')
    this.name = 'AutoEliminacionNoPermitida'
  }
}

export class EliminarUsuario {
  constructor(private readonly usuarios: UsuarioDAO) {}

  async ejecutar(idTarget: string, idEjecutor: string): Promise<void> {
    if (idTarget === idEjecutor) {
      throw new AutoEliminacionNoPermitida()
    }

    const existente = await this.usuarios.porId(idTarget)
    if (!existente) throw new UsuarioNoEncontrado(idTarget)

    await this.usuarios.eliminar(idTarget)
  }
}