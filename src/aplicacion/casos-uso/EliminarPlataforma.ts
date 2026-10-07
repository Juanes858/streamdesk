import type { PlataformaDAO } from '../../dominio/puertos'
import { PlataformaNoEncontrada } from './ObtenerPlataforma'

export class EliminarPlataforma {
  constructor(private readonly plataformas: PlataformaDAO) {}

  async ejecutar(id: string): Promise<void> {
    const existente = await this.plataformas.porId(id)
    if (!existente) throw new PlataformaNoEncontrada(id)
    await this.plataformas.eliminar(id)
  }
}
