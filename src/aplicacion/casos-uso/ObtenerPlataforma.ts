import { aPlataformaDTO, type PlataformaDTO } from '../../dominio/modelo/Plataforma'
import type { PlataformaDAO } from '../../dominio/puertos'

export class PlataformaNoEncontrada extends Error {
  constructor(id: string) {
    super(`No existe una plataforma con id ${id}`)
  }
}

export class ObtenerPlataforma {
  constructor(private readonly plataformas: PlataformaDAO) {}

  async ejecutar(id: string): Promise<PlataformaDTO> {
    const plataforma = await this.plataformas.porId(id)
    if (!plataforma) throw new PlataformaNoEncontrada(id)
    return aPlataformaDTO(plataforma)
  }
}
